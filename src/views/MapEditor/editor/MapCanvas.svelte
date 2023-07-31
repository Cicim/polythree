<script lang="ts">
    import { watchResize } from "svelte-watch-resize";
    import { getContext, onDestroy, onMount, tick } from "svelte";
    import type { Writable } from "svelte/store";
    import type { MapEditorContext, MapEditorData } from "src/views/MapEditor";
    import { SelectionMaterial, type PaintingMaterial } from "./materials";
    import {
        PainterState,
        type PainterMethods,
        PaintChange,
    } from "./painter_state";
    import type { Tool } from "./tools";
    import { LEVEL_COLORS, LAYER_CHARS } from "./consts";
    import type { EditorChanges } from "src/systems/changes";

    interface MapCanvasText {
        text: string;
        x: number;
        y: number;
        maxWidth?: number;
    }

    /** Blocks to edit */
    export let blocks: BlockData[][];
    /** The size of the chunks in which to divide the map for caching */
    export let chunkSize: number = 32;
    /** Whether or not to print the levels on top of the tiles */
    export let editLevels: boolean = false;
    $: editLevels, draw();
    /** Whether or not this map allows having null levels */
    export let nullLevels: boolean = false;
    /** Allows inserting null tiles in place of BlockData to draw empty slots */
    export let nullBlocks: boolean = false;

    /** Texts to print on top of the map */
    export let texts: MapCanvasText[] = [];

    /** Whether zooming is allowed */
    export let allowZoom: boolean = true;
    /** Whether panning is allowed */
    export let allowPan: boolean = true;
    /** Center and zoom the map when the canvas is resized */
    export let centerOnResize: boolean = false;

    /** Debug mode */
    export let debug: boolean = false;

    /**
     * The width the canvas should always have.
     * If set to anything but null, automatic resizing will be disabled.
     */
    export let constantWidth: number = null;

    // Update the size when the blocks update
    let blocksWidth: number = blocks[0].length;
    let blocksHeight: number = blocks.length;
    $: blocksWidth = blocks[0].length;
    $: blocksHeight = blocks.length;

    // ANCHOR Constants
    /** Zoom levels the user can scroll through */
    const ZOOM_LEVELS = [1, 1.5, 2, 3, 4, 5, 6, 8, 16];

    /**
     * Zoom level to render the level cache with text in.
     * If we used 1, the text would look pixelated at any
     * zoom level higher than 1.
     *
     * Consider memory limitations if updating this constant.
     */
    const LEVEL_CACHE_ZOOM = 8;
    /** Zoom level before which only colors are rendered for layers */
    const LEVEL_ZOOM_WITH_TEXT = 2;
    /** Transparency level for the level background */
    const LEVEL_BACKGROUND_ALPHA = 0.33;

    // ANCHOR Helpers
    type ChunkData = CanvasRenderingContext2D;

    enum State {
        Idle,
        Panning,
        Painting,
        Selecting,
    }

    /** Function to easily construct a point */
    const point = (x: number = 0, y: number = 0): Point => ({ x, y });
    /** Function for clamping a value between two extremes */
    const clamp = (value: number, min: number, max: number): number =>
        Math.min(Math.max(value, min), max);

    /** Converts a point in map coordinates to a position on the canvas */
    const mapToCanvas = ({ x, y }: Point): Point => ({
        x: x * zoom + offset.x,
        y: y * zoom + offset.y,
    });
    /** Converts a point on a canvas to map coordinates */
    const canvasToMap = ({ x, y }: Point): Point => ({
        x: (x - offset.x) / zoom,
        y: (y - offset.y) / zoom,
    });
    /** Get the coordinates of the tile you're hovering over */
    const hoveredTile = () => {
        const mouseMapPos = canvasToMap(mousePosition);
        const tileX = Math.floor(mouseMapPos.x / 16);
        const tileY = Math.floor(mouseMapPos.y / 16);
        return point(tileX, tileY);
    };
    /**
     * Returns whether you can start an action from this tile.
     * Starting an action like painting or selecting on a tile
     * requires it to be within the bounds of the map and not null.
     */
    const canPaintOnTile = (x: number, y: number): boolean =>
        x >= 0 &&
        x < blocksWidth &&
        y >= 0 &&
        y < blocksHeight &&
        blocks[y][x] !== null;

    // ANCHOR Properties
    let containerEl: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    let context: MapEditorContext = getContext("context");
    let data: Writable<MapEditorData> = getContext("data");
    let tilesetImages = $data.tilesets;

    /** The object that will contain all the changes applied to this editor */
    export let changes: EditorChanges = context.changes;

    /** Width of the canvas in pixels */
    let canvasWidth: number = null;
    /** Height of the canvas in pixels */
    let canvasHeight: number = null;

    /** `true` if everything is ready to draw. */
    let initialized: boolean = false;

    // Mouse state
    /** Action the user is performing with the mouse */
    let state: State = State.Idle;
    /** Mouse position before the start of the frame */
    let mousePosition: Point = point();

    // Zooming and panning
    /** Zoom index */
    let zoomIndex: number = 3;
    /** Zoom factor */
    let zoom: number = ZOOM_LEVELS[zoomIndex];
    /** Canvas offset (in map coordinates) */
    let offset: Point = point();
    /** Mouse coordinates when the pan starts */
    let mousePanStart: Point = point();
    /** Canvas offset when the pan starts */
    let mapPanStart: Point = point();

    // Selection
    /** The tile where the selection starts */
    let selectionStart: Point = point();
    /** Actual selection rectangle */
    let selection: TileSelection = null;

    // Painting tiles
    /** Selected material */
    let material: Writable<PaintingMaterial> = context.material;
    /** Instance of the tool with which you're drawing */
    let tool: Tool = null;

    /** The painting state for reverting and committing */
    let paintingState: PainterState = null;

    /** Canvases containing the chunks in which the metatile map is divided */
    let metatileChunks: [ChunkData, ChunkData][][] = null;
    /** Canvases containing the chunks for rendering the level data with colors and text. */
    let textLevelChunks: ChunkData[][] = null;
    /** Canvases containing the chunks for rendering the level data with colors only. */
    let colorLevelMap: CanvasRenderingContext2D = null;

    const unsubscribeFromData = data.subscribe((value) => {
        initialized = false;
        tilesetImages = value.tilesets;
        buildChunks();
        buildLevelChunks();
        initialized = true;
        draw();
    });

    // ANCHOR Draw
    /** Draw a full frame of the canvas from scratch. */
    function draw() {
        if (!initialized || canvasWidth === null || canvasHeight === null)
            return;

        const frameStart = performance.now();

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Find how many squares of size 16x16 can fit in the canvas
        drawBottomLayer();
        drawTopLayer();
        if (editLevels) drawLevels();

        // Draw the texts on the canvas
        for (const text of texts) drawText(text);
        // Draw the selection on top of everything
        drawSelection();

        // Debug printing
        if (!debug) return;
        const frameTime = performance.now() - frameStart;
        const hovered = hoveredTile();

        debugValues({
            frameTime,
            state: State[state],
            brushName: `${$material?.name}`,
            position: `${hovered.x}, ${hovered.y}`,
            zoom,
            selection:
                selection === null
                    ? "null"
                    : `${selection.x}:${selection.y}-${selection.width}x${selection.height}`,
        });
    }

    // ANCHOR Tile and lavel drawing functions
    /** Draws the bottom layer of the blocks */
    const drawBottomLayer = () => drawTileLayer(true);
    /** Draws the top layer of the blocks */
    const drawTopLayer = () => drawTileLayer(false);

    function drawTileLayer(bottomLayer: boolean) {
        const [start, end] = getVisibleBlocks();

        // Compute the chunk coordinates that are visible in the map
        const chunkStart = point(
            Math.floor(start.x / chunkSize),
            Math.floor(start.y / chunkSize)
        );

        const chunkEnd = point(
            Math.ceil(end.x / chunkSize),
            Math.ceil(end.y / chunkSize)
        );

        // Draw the chunks
        for (let x = chunkStart.x; x < chunkEnd.x; x++) {
            for (let y = chunkStart.y; y < chunkEnd.y; y++) {
                const chunk = metatileChunks[y]?.[x];
                // If the chunk is undefined, it's an empty chunk
                if (chunk === undefined) continue;
                const [bottom, top] = chunk;

                // Draw the chunk
                const pos = mapToCanvas(
                    point(x * chunkSize * 16, y * chunkSize * 16)
                );
                if (bottomLayer)
                    ctx.drawImage(
                        bottom.canvas,
                        pos.x,
                        pos.y,
                        bottom.canvas.width * zoom,
                        bottom.canvas.height * zoom
                    );
                else
                    ctx.drawImage(
                        top.canvas,
                        pos.x,
                        pos.y,
                        top.canvas.width * zoom,
                        top.canvas.height * zoom
                    );
            }
        }
    }

    /** Draws the level data on top of the canvas. */
    function drawLevels() {
        // Get the visible map
        const [start, end] = getVisibleBlocks();

        // Draw the chunks if the zoom requires it
        if (zoom >= LEVEL_ZOOM_WITH_TEXT) {
            const [chunkStart, chunkEnd] = getVisibleChunks(start, end);

            // Draw the chunks
            for (let x = chunkStart.x; x < chunkEnd.x; x++) {
                for (let y = chunkStart.y; y < chunkEnd.y; y++) {
                    // Get the chunk data
                    const chunk = textLevelChunks[y]?.[x];
                    if (chunk === undefined) continue;

                    // Draw the chunk
                    const pos = mapToCanvas(
                        point(x * chunkSize * 16, y * chunkSize * 16)
                    );
                    ctx.drawImage(
                        chunk.canvas,
                        pos.x,
                        pos.y,
                        chunkSize * 16 * zoom,
                        chunkSize * 16 * zoom
                    );
                }
            }

            return;
        }

        // Otherwise just draw the color level map
        const pos = mapToCanvas(point(0, 0));
        ctx.drawImage(
            colorLevelMap.canvas,
            pos.x,
            pos.y,
            blocksWidth * zoom * 16,
            blocksHeight * zoom * 16
        );
    }

    /**
     * Return the coordinates (in blocks) of the topleft and bottomright block
     * that appears (even in part) on the canvas.
     */
    function getVisibleBlocks(): [Point, Point] {
        // Get the visible points (in map coordinates)
        const topLeft = canvasToMap(point(0, 0));
        const bottomRight = canvasToMap(point(canvasWidth, canvasHeight));

        // Get the lower bound tile-wise
        let x0 = clamp(Math.floor(topLeft.x / 16), 0, blocksWidth);
        let y0 = clamp(Math.floor(topLeft.y / 16), 0, blocksHeight);

        // Get the upper bound tile-wise
        let x1 = clamp(Math.ceil(bottomRight.x / 16), 0, blocksWidth);
        let y1 = clamp(Math.ceil(bottomRight.y / 16), 0, blocksHeight);

        return [point(x0, y0), point(x1, y1)];
    }
    /** Returns the visible chunk coordinates in the map. */
    function getVisibleChunks(start: Point, end: Point): [Point, Point] {
        const chunkStart = point(
            Math.floor(start.x / chunkSize),
            Math.floor(start.y / chunkSize)
        );
        const chunkEnd = point(
            Math.ceil(end.x / chunkSize),
            Math.ceil(end.y / chunkSize)
        );

        return [chunkStart, chunkEnd];
    }

    /** Convert a level information to its color and text */
    function levelToColorAndString(index: number): [string, string] {
        if (index === null) return ["#888888", ""];

        const color = LEVEL_COLORS[index] ?? "#FFFFFF";
        const layer = index & 0xff;
        const obstacle = index >> 8;

        if (obstacle === 0) return [color, layer.toString()];

        // Obtain the boxed variant of the layer number
        return [color, LAYER_CHARS[layer]];
    }

    // ANCHOR Text drawing function
    function drawText({ text, x, y, maxWidth }: MapCanvasText) {
        // Get the actual position of the text on the canvas
        const pos = mapToCanvas({ x: x * 16, y: y * 16 });

        const fontSize = 12 * zoom;

        // Draw the text starting from there
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = fontSize + "px Rubik";
        ctx.fillText(
            text,
            pos.x,
            pos.y,
            maxWidth === undefined ? undefined : maxWidth * 16 * zoom
        );
    }

    // ANCHOR Debug drawing functions
    /** Function to draw some values in the top-right corner for debugging */
    function debugValues(values: Record<string, any>) {
        // Draw a tall-enough rectangle behind it
        const rows = Object.keys(values).length;
        ctx.fillStyle = "#000000";
        ctx.fillRect(canvasWidth - 316, 0, 300, 16 * rows);

        // Draw the values
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        let i = 0;
        for (const [key, value] of Object.entries(values)) {
            // Format with "{:>10}:{:<16}"
            let valueString = `${value}`;
            if (typeof value === "number") {
                valueString = value.toFixed(2);
            }
            valueString = valueString.substring(0, 16);
            const res = key.padStart(10) + ":" + valueString.padEnd(16);

            ctx.fillText(`${res}`, canvasWidth - 16, 16 * i++);
        }
    }
    /** Draws the window size with a border around it */
    function debugDrawWindowSize() {
        ctx.fillStyle = "#181818";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw a gray outline
        ctx.strokeStyle = "#1122AA";
        ctx.lineWidth = 20;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

        // Construct a size string with \times (but Unicode)
        const sizeString = `${canvasWidth} \u00D7 ${canvasHeight}`;
        // Draw the size string
        ctx.font = `${canvasWidth / 8}px Rubik`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#D8D8D8";
        ctx.fillText(sizeString, canvasWidth / 2, canvasHeight / 2);
    }

    // ANCHOR Chunking
    /** Build the chunks from the blocks data. */
    function buildChunks() {
        if (chunkSize === 0) return;

        // Get the number of chunks in each direction
        const chunksX = Math.ceil(blocksWidth / chunkSize);
        const chunksY = Math.ceil(blocksHeight / chunkSize);

        // Create the chunks
        metatileChunks = new Array(chunksY);

        // Fill the chunks
        for (let cy = 0; cy < chunksY; cy++) {
            metatileChunks[cy] = new Array(chunksX);
            for (let cx = 0; cx < chunksX; cx++) {
                // Get the chunk data
                const chunk = getChunk(cx, cy);
                // Save the chunk
                metatileChunks[cy][cx] = chunk;
            }
        }
    }

    /** Renders the chunk at the given chunk coordinates */
    function getChunk(cx: number, cy: number): [ChunkData, ChunkData] {
        // Create the canvases for this chunk
        const botCanvas = document.createElement("canvas");
        const topCanvas = document.createElement("canvas");

        // Set the size of the canvas
        botCanvas.width = chunkSize * 16;
        botCanvas.height = chunkSize * 16;
        topCanvas.width = chunkSize * 16;
        topCanvas.height = chunkSize * 16;

        // Get the context
        const botCtx = botCanvas.getContext("2d");
        const topCtx = topCanvas.getContext("2d");

        // Draw the chunks
        for (let j = 0; j < chunkSize; j++) {
            for (let i = 0; i < chunkSize; i++) {
                // Get the tile images
                const block =
                    blocks[cy * chunkSize + j]?.[cx * chunkSize + i]?.[0];
                if (block === undefined) continue;

                const images = tilesetImages[block];
                if (images === null || images === undefined) continue;

                const [bottomImage, topImage] = images;

                // Compute the actual coordinates
                botCtx.drawImage(bottomImage, i * 16, j * 16, 16, 16);
                topCtx.drawImage(topImage, i * 16, j * 16, 16, 16);
            }
        }

        return [botCtx, topCtx];
    }

    /** Build the chunks for caching the level data. */
    function buildLevelChunks() {
        if (chunkSize === 0) return;

        // Get the number of chunks in each direction
        const chunksX = Math.ceil(blocksWidth / chunkSize);
        const chunksY = Math.ceil(blocksHeight / chunkSize);

        // Create the chunks
        textLevelChunks = new Array(chunksY);

        // Fill the chunks
        for (let cy = 0; cy < chunksY; cy++) {
            textLevelChunks[cy] = new Array(chunksX);
            for (let cx = 0; cx < chunksX; cx++) {
                // Get the chunk data
                const chunk = getLevelChunk(cx, cy);
                // Save the chunk
                textLevelChunks[cy][cx] = chunk;
            }
        }

        // Build the color level map
        const canvas = document.createElement("canvas");
        canvas.width = blocksWidth;
        canvas.height = blocksHeight;
        colorLevelMap = canvas.getContext("2d");
        colorLevelMap.globalAlpha = LEVEL_BACKGROUND_ALPHA;

        for (let j = 0; j < blocksHeight; j++)
            for (let i = 0; i < blocksWidth; i++) updateLevelPixel(i, j);
    }

    /** Renders the chunk at the given coordinates containing the render levels */
    function getLevelChunk(cx: number, cy: number): ChunkData {
        // Build the canvas for the version with text
        const lvCanvas = document.createElement("canvas");
        lvCanvas.width = chunkSize * 16 * LEVEL_CACHE_ZOOM;
        lvCanvas.height = chunkSize * 16 * LEVEL_CACHE_ZOOM;
        const lvCtx = lvCanvas.getContext("2d");
        lvCtx.font = `${12 * LEVEL_CACHE_ZOOM}px Rubik`;
        lvCtx.textAlign = "center";
        lvCtx.textBaseline = "middle";

        // Draw the levels in this chunk
        for (let j = 0; j < chunkSize; j++) {
            for (let i = 0; i < chunkSize; i++) {
                // Get the level
                const level =
                    blocks[cy * chunkSize + j]?.[cx * chunkSize + i]?.[1];
                if (level === undefined) continue;

                // Draw the level with text
                drawLevelSquare(lvCtx, level, i, j);
            }
        }

        return lvCtx;
    }

    /**
     * Draws the given level data to a canvas context with the given offset,
     * width a background and a text.
     */
    function drawLevelSquare(
        chunkCtx: CanvasRenderingContext2D,
        level: number,
        ox: number,
        oy: number
    ) {
        // Get the coordinates in the chunk
        const x = ox * 16 * LEVEL_CACHE_ZOOM;
        const y = oy * 16 * LEVEL_CACHE_ZOOM;

        // Get the color and text
        const [color, text] = levelToColorAndString(level);

        // Draw a rectangle
        chunkCtx.globalAlpha = LEVEL_BACKGROUND_ALPHA;
        chunkCtx.fillStyle = color;
        chunkCtx.fillRect(x, y, 16 * LEVEL_CACHE_ZOOM, 16 * LEVEL_CACHE_ZOOM);

        // Draw the text
        chunkCtx.globalAlpha = 1;
        chunkCtx.fillStyle = "white";
        chunkCtx.font = `200 ${12 * LEVEL_CACHE_ZOOM}px Rubik`;
        chunkCtx.fillText(
            text,
            x + 8 * LEVEL_CACHE_ZOOM,
            y + 8 * LEVEL_CACHE_ZOOM
        );
    }

    /** Prints a pixel to the colorLevelMap corresponding to the level at the given offset */
    function updateLevelPixel(x: number, y: number) {
        // Get the level
        const level = blocks[y]?.[x]?.[1];
        if (level === undefined) return;

        // Get the color
        const [color, _] = levelToColorAndString(level);

        // Draw a rectangle
        colorLevelMap.fillStyle = color;
        colorLevelMap.clearRect(x, y, 1, 1);
        colorLevelMap.fillRect(x, y, 1, 1);
    }

    // ANCHOR Panning
    function pan(x: number, y: number) {
        // Compute the offset
        const xOffset = x - mousePanStart.x;
        const yOffset = y - mousePanStart.y;

        // Apply the offset
        offset.x = mapPanStart.x + xOffset;
        offset.y = mapPanStart.y + yOffset;

        draw();
    }

    // ANCHOR Selection
    /** Computes the selection rectangle */
    function computeSelectionRectangle() {
        const oldSel = selection;

        let { x: sx, y: sy } = selectionStart;
        let { x: ex, y: ey } = hoveredTile();

        // Modify both all elements so that they are in bounds
        sx = clamp(sx, 0, blocksWidth - 1);
        sy = clamp(sy, 0, blocksHeight - 1);
        ex = clamp(ex, 0, blocksWidth - 1);
        ey = clamp(ey, 0, blocksHeight - 1);

        const x = Math.min(sx, ex);
        const y = Math.min(sy, ey);
        const width = Math.abs(sx - ex) + 1;
        const height = Math.abs(sy - ey) + 1;

        // If nothing changed since last time
        if (
            oldSel !== null &&
            oldSel.x == x &&
            oldSel.y == y &&
            oldSel.width == width &&
            oldSel.height == height
        )
            return;

        // If null blocks are allowed, we need more checks to make sure
        // that no null tile can be selected when selecting an area
        if (nullBlocks) {
            for (let i = y; i < y + height; i++)
                for (let j = x; j < x + width; j++)
                    if (blocks[i]?.[j] === null) return;
        }

        // Update the selection
        selection = {
            x,
            y,
            width,
            height,
        };

        // TODO Change for event selection
        createSelectionMaterial(selection);
    }
    /** Creates a material based on the selection rectangle */
    function createSelectionMaterial(selection: TileSelection) {
        const selCanvas = document.createElement("canvas");
        selCanvas.width = selection.width * 16;
        selCanvas.height = selection.height * 16;
        const ctx = selCanvas.getContext("2d");

        // Draw the blocks on this ctx
        const csx = Math.floor(selection.x / chunkSize);
        const csy = Math.floor(selection.y / chunkSize);
        const cex = csx + Math.ceil(selection.width / chunkSize);
        const cey = csy + Math.ceil(selection.height / chunkSize);

        // Get the offset in the first chunk
        const ox = selection.x % chunkSize;
        const oy = selection.y % chunkSize;

        // Build the metatile canvas
        for (let cy = 0; cy <= cey - csy; cy++) {
            for (let cx = 0; cx <= cex - csx; cx++) {
                // Get the chunk
                const chunk = metatileChunks[csy + cy]?.[csx + cx];
                if (chunk === undefined) continue;

                // Draw the chunk (subtracting the offset)
                const rx = cx * chunkSize * 16 - ox * 16;
                const ry = cy * chunkSize * 16 - oy * 16;
                ctx.drawImage(chunk[0].canvas, rx, ry);
                ctx.drawImage(chunk[1].canvas, rx, ry);
            }
        }

        // Build the levels canvas
        const lvCanvas = document.createElement("canvas");
        lvCanvas.width = selection.width * 32;
        lvCanvas.height = selection.height * 32;
        const lvCtx = lvCanvas.getContext("2d");

        // Build the levels canvas
        for (let cy = 0; cy <= cey - csy; cy++) {
            for (let cx = 0; cx <= cex - csx; cx++) {
                // Get the chunk
                const chunk = textLevelChunks[csy + cy]?.[csx + cx];
                if (chunk === undefined) continue;

                // Draw the chunk (subtracting the offset)
                const rx = cx * chunkSize * 16 - ox * 16;
                const ry = cy * chunkSize * 16 - oy * 16;

                lvCtx.drawImage(
                    chunk.canvas,
                    rx * 2,
                    ry * 2,
                    chunkSize * 32,
                    chunkSize * 32
                );
            }
        }

        // Copy the selection
        const selBlockData = [];
        for (let y = 0; y < selection.height; y++) {
            selBlockData[y] = [];
            for (let x = 0; x < selection.width; x++) {
                const block = blocks[selection.y + y]?.[selection.x + x];
                if (block === undefined) continue;
                selBlockData[y][x] = [...block];
            }
        }

        // Save the material
        $material = new SelectionMaterial(selBlockData, selCanvas, lvCanvas);
    }
    /** Draws the selection if present */
    function drawSelection() {
        if (selection === null) return;

        const { x, y, width, height } = selection;

        // Find the position on the canvas
        const { x: px, y: py } = mapToCanvas({ x: x * 16, y: y * 16 });
        // Draw the rectangle
        ctx.strokeStyle = "red";
        ctx.lineWidth = zoom;
        ctx.strokeRect(px, py, width * 16 * zoom, height * 16 * zoom);
    }

    // ANCHOR Painting with brushes
    const PAINTER_METHODS: PainterMethods = {
        nullLevels,
        update: () => draw(),
        canPaint: (x, y) => canPaintOnTile(x, y),
        get: (x: number, y: number) => blocks[y][x],

        forEach(callback) {
            for (let y = 0; y < blocksHeight; y++)
                for (let x = 0; x < blocksWidth; x++)
                    callback(x, y, blocks[y][x]);
        },

        set(x: number, y: number, value: BlockData) {
            // Get the old value and for maximum efficiency, draw only what changes
            const [oldMetatile, oldLevel] = blocks[y][x];
            // Update the data with the new value
            const [metatile, level] = value;
            blocks[y][x] = [oldMetatile, oldLevel];

            // Get the correct chunk to update
            const cx = Math.floor(x / chunkSize);
            const cy = Math.floor(y / chunkSize);
            const ox = x % chunkSize;
            const oy = y % chunkSize;

            if (
                oldMetatile !== metatile &&
                !(editLevels && state === State.Painting)
            ) {
                blocks[y][x][0] = metatile;
                // Get the metattile chunks
                const metatileChunk = metatileChunks[cy][cx];
                const botCtx = metatileChunk[0];
                const topCtx = metatileChunk[1];

                // Get the tile images
                const images = tilesetImages[metatile];
                if (images === null) return;
                const [bottomImage, topImage] = images;

                // Just draw the new tile on the bottom canvas
                botCtx.drawImage(bottomImage, ox * 16, oy * 16, 16, 16);
                // For the top canvas, you first need to clear the spot
                topCtx.clearRect(ox * 16, oy * 16, 16, 16);
                topCtx.drawImage(topImage, ox * 16, oy * 16, 16, 16);
            }

            if (oldLevel !== level) {
                blocks[y][x][1] = level;
                // Get the level chunks
                const levelChunk = textLevelChunks[cy][cx];
                levelChunk.clearRect(
                    ox * 16 * LEVEL_CACHE_ZOOM,
                    oy * 16 * LEVEL_CACHE_ZOOM,
                    16 * LEVEL_CACHE_ZOOM,
                    16 * LEVEL_CACHE_ZOOM
                );
                // Draw the layer on the canvas with text
                drawLevelSquare(levelChunk, level, ox, oy);
                // Update the canvas without text
                updateLevelPixel(x, y);
            }
        },
    };

    // ANCHOR Mouse Event handlers
    function onMouseDown(event: MouseEvent) {
        // If the user is already doing something, ignore this event
        if (state !== State.Idle) return;

        // Painting starts with the left mouse button (0)
        if (event.button === 0 && material !== null) {
            // Get the current tile coordinates
            const { x, y } = hoveredTile();
            // If the tile are not in bounds, don't start anything
            if (!canPaintOnTile(x, y)) return;
            state = State.Painting;

            // Create the painting state
            paintingState = new PainterState(PAINTER_METHODS);
            tool = new context.toolClass(paintingState, $material);
            changes.locked++;
            tool.startStroke(x, y);
        }

        // Panning starts with the middle mouse button (1)
        if (event.button === 1 && allowPan) {
            state = State.Panning;
            // Save the mouse coordinates for computing the offset
            mousePanStart.x = event.offsetX;
            mousePanStart.y = event.offsetY;
            // Save the real coordinates for applying the difference
            mapPanStart.x = offset.x;
            mapPanStart.y = offset.y;
        }

        // Selection starts with the right mouse button (2)
        if (event.button === 2) {
            const { x, y } = hoveredTile();
            if (!canPaintOnTile(x, y)) return;

            state = State.Selecting;
            // Save the tile where the selection starts
            selectionStart.x = x;
            selectionStart.y = y;
            changes.locked++;
            // Compute the selection without drawing it
            computeSelectionRectangle();
        }
    }
    function onMouseMove(event: MouseEvent) {
        // Save the mouse position for the next frame
        mousePosition.x = event.offsetX;
        mousePosition.y = event.offsetY;

        // If there is another factor involved
        if (constantWidth !== null) {
            const rect = canvas.getBoundingClientRect();
            const factor = constantWidth / rect.width;
            mousePosition.x = Math.floor(mousePosition.x * factor);
            mousePosition.y = Math.floor(mousePosition.y * factor);
        }

        switch (state) {
            case State.Panning:
                pan(event.offsetX, event.offsetY);
                break;
            case State.Selecting:
                // Compute the selection
                computeSelectionRectangle();
                draw();
                break;
            case State.Painting:
                // Get the current tile coordinates
                const { x, y } = hoveredTile();
                // If the tile are not in bounds, don't do anything
                if (!canPaintOnTile(x, y)) return;

                tool.moveStroke(x, y);
                break;
            case State.Idle:
                break;
        }
    }
    function onMouseUp(event: MouseEvent | { button: number }) {
        if (event.button === 0 && state === State.Painting) {
            // Get the current tile coordinates
            const { x, y } = hoveredTile();
            // Don't care if the tile is in bounds, the stroke should always end
            changes.locked--;
            tool.endStroke(x, y);

            // Create a brush edit
            changes.push(new PaintChange(paintingState));

            state = State.Idle;
        } else if (event.button === 1 && state === State.Panning) {
            state = State.Idle;
        } else if (event.button === 2 && state === State.Selecting) {
            // Hide the selection
            selection = null;
            draw();
            changes.locked--;

            state = State.Idle;
        }
    }
    function onMouseWheel(event: WheelEvent) {
        if (!allowZoom || state !== State.Idle) return;

        let scroll = event.deltaY;
        if (scroll === 0) return;
        // Normalize the scroll value
        scroll = scroll > 0 ? -1 : 1;
        // Compute the new zoom factor
        zoomIndex = Math.max(
            0,
            Math.min(zoomIndex + scroll, ZOOM_LEVELS.length - 1)
        );
        const newZoom = ZOOM_LEVELS[zoomIndex];

        // Compute the new offset so that the mouse points to the same point
        const newOffsetX =
            mousePosition.x - (newZoom / zoom) * (mousePosition.x - offset.x);
        const newOffsetY =
            mousePosition.y - (newZoom / zoom) * (mousePosition.y - offset.y);

        // Apply the new zoom and offset
        offset.x = Math.round(newOffsetX);
        offset.y = Math.round(newOffsetY);
        zoom = newZoom;

        draw();
    }

    // ANCHOR Cursor Updating
    let cursorStyle = "default";
    /** Returns a cursor based on the state */
    function getCursor(): string {
        switch (state) {
            case State.Panning:
                return "grabbing";
            case State.Selecting:
                return "crosshair";
            default:
                return "default";
        }
    }
    $: state, (cursorStyle = getCursor());

    // ANCHOR Other Event handlers
    /** Updates the canvas size and redraws the canvas. */
    function updateSize() {
        if (constantWidth !== null) return;
        // Stop updating if the containerEl was destroyed
        if (!containerEl) return;

        // Set it to the container size
        canvasWidth = containerEl.clientWidth;
        canvasHeight = containerEl.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        if (centerOnResize) {
            const mapWidth = blocksWidth * 16;
            const mapHeight = blocksHeight * 16;

            // Compute the biggest zoom that will make the whole map fit
            const biggestZoom = Math.min(
                canvasWidth / mapWidth,
                canvasHeight / mapHeight
            );
            // Set the zoom to the closest one to biggestZoom
            zoomIndex = ZOOM_LEVELS.findIndex((zoom) => zoom > biggestZoom);
            if (zoomIndex === -1) zoomIndex = ZOOM_LEVELS.length - 1;
            else zoomIndex--;
            if (zoomIndex < 0) zoomIndex = 0;
            zoom = ZOOM_LEVELS[zoomIndex];
            // Center the map
            offset.x = Math.round((canvasWidth - mapWidth * zoom) / 2);
            offset.y = Math.round((canvasHeight - mapHeight * zoom) / 2);
        }

        draw();
    }

    // ANCHOR Exported actions
    export function zoomIn() {
        if (!allowZoom) return;

        zoomIndex = Math.min(zoomIndex + 1, ZOOM_LEVELS.length - 1);
        zoom = ZOOM_LEVELS[zoomIndex];
        draw();
    }
    export function zoomOut() {
        if (!allowZoom) return;

        zoomIndex = Math.max(zoomIndex - 1, 0);
        zoom = ZOOM_LEVELS[zoomIndex];
        draw();
    }

    onMount(async () => {
        ctx = canvas.getContext("2d");
        await tick();

        if (constantWidth === null) updateSize();
        // If the width is static, then check if this is a resize.
        // Since the width is static, we only want to update it once,
        // and not on every resize (if they ever happen).
        else {
            canvasWidth = constantWidth;
            // Compute the height based on the width
            canvasHeight = canvasWidth * (blocksHeight / blocksWidth);
            // Change the zoom so that the whole map width fits in the canvas
            zoomIndex = null;
            zoom = canvasWidth / (blocksWidth * 16);

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            draw();
        }

        // Add the zoomIn and zoomOut function to the context
        context.zoomIn = zoomIn;
        context.zoomOut = zoomOut;
    });
    onDestroy(() => {
        unsubscribeFromData();
        initialized = false;

        // Unset all things that could use memory
        context = null;
        for (const row of metatileChunks)
            for (const chunk of row)
                for (const ctx of chunk) ctx.canvas.remove();
        metatileChunks = null;

        for (const row of textLevelChunks)
            for (const ctx of row) ctx.canvas.remove();
        textLevelChunks = null;
        colorLevelMap.canvas.remove();
        colorLevelMap = null;
        canvas.remove();
        canvas = null;
        ctx = null;
    });
</script>

<svelte:window
    on:resize={updateSize}
    on:mouseup={onMouseUp}
    on:blur={() => onMouseUp({ button: 0 })}
/>

<div
    class="canvas-container"
    bind:this={containerEl}
    use:watchResize={updateSize}
    style="cursor: {cursorStyle}"
>
    <canvas
        bind:this={canvas}
        class:fit={constantWidth === null}
        on:mousedown={onMouseDown}
        on:mouseup={onMouseUp}
        on:mousemove={onMouseMove}
        on:wheel={onMouseWheel}
    />
</div>

<style lang="scss">
    .canvas-container {
        display: grid;
        height: 100%;
        overflow: hidden;
        max-height: 100%;

        canvas {
            image-rendering: optimizeSpeed;

            &.fit {
                width: min-content;
                height: min-content;
            }
        }
    }
</style>
