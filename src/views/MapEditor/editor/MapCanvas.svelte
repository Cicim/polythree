<script lang="ts" context="module">
    interface MapCanvasText {
        text: string;
        x: number;
        y: number;
        maxWidth?: number;
    }

    export interface MapCanvasImage {
        image: HTMLImageElement;
        x: number;
        y: number;
        scale?: number;
    }

    interface MapResizingOptions {
        border: number;
        maxWidth: number;
        maxHeight: number;
        maxArea: number;
    }
</script>

<script lang="ts">
    import { watchResize } from "svelte-watch-resize";
    import {
        createEventDispatcher,
        getContext,
        onDestroy,
        onMount,
        tick,
    } from "svelte";
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
    import { Change, type EditorChanges } from "src/systems/changes";
    import { BlocksData, NULL } from "./blocks_data";

    /** Blocks to edit */
    export let blocks: BlocksData;
    /** The size of the chunks in which to divide the map for caching */
    export let chunkSize: number = 16;
    /** Whether or not to print the levels on top of the tiles */
    export let editLevels: boolean = false;
    $: editLevels, draw();

    /** Whether this is the main map canvas */
    export let mainCanvas: boolean = false;

    /** Whether or not this map allows having null levels */
    export let nullLevels: boolean = false;
    /** Allows inserting null tiles in place of BlockData to draw empty slots */
    export let nullBlocks: boolean = false;

    /** Texts to print on top of the map */
    export let texts: MapCanvasText[] = [];
    /** Images to print behind the map */
    export let images: MapCanvasImage[] = [];

    /** Whether zooming is allowed */
    export let allowZoom: boolean = true;
    /** Whether panning is allowed */
    export let allowPan: boolean = true;
    /** Whether resizing is allowed */
    export let resizeOptions: MapResizingOptions = null;
    /** Center and zoom the map when the canvas is resized */
    export let centerOnResize: boolean = false;

    /** Debug mode */
    export let debug: boolean = false;

    /**
     * The width the canvas should always have.
     * If set to anything but null, automatic resizing will be disabled.
     */
    export let constantWidth: number = null;

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
        Resizing,
    }

    enum ResizeDirection {
        None,
        Right,
        Bottom,
        BottomRight,
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
        x < blocks.width &&
        y >= 0 &&
        y < blocks.height &&
        !blocks.isNull(x, y);

    // ANCHOR Properties
    let containerEl: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    let context: MapEditorContext = getContext("context");
    let data: Writable<MapEditorData> = getContext("data");
    let dispatch = createEventDispatcher();

    /** If this var is true, switching to Painting, Selecting or Resizing mode is prohibited */
    const editingLocked = context.layoutLocked;

    /** The object that will contain all the changes applied to this editor */
    export let changes: EditorChanges<any> = context.changes;

    /** Width of the canvas in pixels */
    let canvasWidth: number = null;
    /** Height of the canvas in pixels */
    let canvasHeight: number = null;

    /** `true` if everything is ready to draw. */
    let initialized: boolean = false;

    // Mouse state
    /** Action the user is performing with the mouse */
    let state: State = State.Idle;
    /** Updates the state with checks */
    function updateState(newState: State) {
        if (
            $editingLocked &&
            (newState === State.Painting ||
                newState === State.Resizing ||
                newState === State.Selecting)
        )
            return;
        state = newState;
    }

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

    // Resizing
    /** Mouse coordinates when the resizing starts */
    let mouseResizeStart = point();
    /** Map size computed while resizing */
    let resizedMapSize: { width: number; height: number } = {
        width: 0,
        height: 0,
    };
    /** What border you're hovering on */
    let resizeDirection: ResizeDirection = ResizeDirection.None;

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

    /** Chunks for the bottom metatile layer */
    let botMetatileChunks: ChunkData[][] = null;
    /** Chunks for the top metatile layer */
    let topMetatileChunks: ChunkData[][] = null;
    /** Canvases containing the chunks for rendering the level data with colors and text. */
    let textLevelChunks: ChunkData[][] = null;
    /** Canvases containing the chunks for rendering the level data with colors only. */
    let colorLevelMap: CanvasRenderingContext2D = null;

    const unsubscribeFromData = data.subscribe((value) => {
        initialized = false;
        buildAllChunks();
        buildLevelMinimap();
        initialized = true;
        draw();
    });

    const unsubscribeFromAnimations = context.animations.changeStore.subscribe(
        () => {
            if (!mainCanvas) return;
            initialized = false;
            redrawAllMetatileChunks();
            initialized = true;
            draw();
        }
    );

    // ANCHOR Draw
    /** Draw a full frame of the canvas from scratch. */
    function draw() {
        if (!initialized || canvasWidth === null || canvasHeight === null)
            return;

        const frameStart = performance.now();

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw the background images
        for (const image of images) drawImage(image);

        const [startBlock, endBlock] = getVisibleBlocks();
        const [startChunk, endChunk] = getVisibleChunks(startBlock, endBlock);

        drawMetatiles(botMetatileChunks, startChunk, endChunk);
        drawMetatiles(topMetatileChunks, startChunk, endChunk);
        if (editLevels) drawLevels(startChunk, endChunk);

        drawResizeBorder();

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
    /** Draws a visible layer of metatile chunks */
    function drawMetatiles(layer: ChunkData[][], sc: Point, ec: Point) {
        for (let x = sc.x; x < ec.x; x++) {
            for (let y = sc.y; y < ec.y; y++) {
                // Get the chunk data
                const chunk = layer[y]?.[x];
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
    }

    /** Draws the level data on top of the canvas. */
    function drawLevels(sc: Point, ec: Point) {
        // Draw the chunks if the zoom requires it
        if (zoom >= LEVEL_ZOOM_WITH_TEXT) {
            // Draw the chunks
            for (let x = sc.x; x < ec.x; x++) {
                for (let y = sc.y; y < ec.y; y++) {
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
            blocks.width * zoom * 16,
            blocks.height * zoom * 16
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
        let x0 = clamp(Math.floor(topLeft.x / 16), 0, blocks.width);
        let y0 = clamp(Math.floor(topLeft.y / 16), 0, blocks.height);

        // Get the upper bound tile-wise
        let x1 = clamp(Math.ceil(bottomRight.x / 16), 0, blocks.width);
        let y1 = clamp(Math.ceil(bottomRight.y / 16), 0, blocks.height);

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
    function levelToColorAndString(level: number): [string, string] {
        if (level === NULL) return ["#888888", ""];

        const color = LEVEL_COLORS[level] ?? "#FFFFFF";
        const layer = level & 0xff;
        const obstacle = level >> 8;

        if (obstacle === 0) return [color, layer.toString()];

        // Obtain the boxed variant of the layer number
        return [color, LAYER_CHARS[layer]];
    }

    // ANCHOR Misc drawing function
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

    function drawImage({ image, scale = 1, x, y }: MapCanvasImage) {
        const pos = mapToCanvas({ x: x * 16, y: y * 16 });

        // Draw the image scaled
        ctx.drawImage(
            image,
            pos.x,
            pos.y,
            image.width * scale * zoom,
            image.height * scale * zoom
        );
    }

    function drawResizeBorder() {
        // Draw a border around the whole map
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 5;
        const start = mapToCanvas({ x: 0, y: 0 });

        let width =
            state === State.Resizing ? resizedMapSize.width : blocks.width;
        let height =
            state === State.Resizing ? resizedMapSize.height : blocks.height;

        ctx.strokeRect(start.x, start.y, width * 16 * zoom, height * 16 * zoom);
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
    /** Rebuilds both the metatile and level chunks for when the map is reloaded or resized. */
    function buildAllChunks() {
        // Compute the number of chunks in each direction
        const chunksWidth = Math.ceil(blocks.width / chunkSize);
        const chunksHeight = Math.ceil(blocks.height / chunkSize);

        const oldBotTileChunks = botMetatileChunks;
        const oldTopTileChunks = topMetatileChunks;
        const oldLevelChunks = textLevelChunks;

        botMetatileChunks = new Array(chunksHeight);
        topMetatileChunks = new Array(chunksHeight);
        textLevelChunks = new Array(chunksHeight);

        let unchangedWidth = oldBotTileChunks?.[0]?.length ?? 1;
        unchangedWidth = Math.min(
            unchangedWidth - 1,
            Math.floor(blocks.width / chunkSize)
        );
        let unchangedHeight = oldBotTileChunks?.length ?? 1;
        unchangedHeight = Math.min(
            unchangedHeight - 1,
            Math.floor(blocks.height / chunkSize)
        );

        for (let cy = 0; cy < chunksHeight; cy++) {
            botMetatileChunks[cy] = new Array(chunksWidth);
            topMetatileChunks[cy] = new Array(chunksWidth);
            textLevelChunks[cy] = new Array(chunksWidth);

            for (let cx = 0; cx < chunksWidth; cx++) {
                const bot = oldBotTileChunks?.[cy]?.[cx];
                botMetatileChunks[cy][cx] = bot ?? createMetatileChunkCanvas();
                const top = oldTopTileChunks?.[cy]?.[cx];
                topMetatileChunks[cy][cx] = top ?? createMetatileChunkCanvas();
                const level = oldLevelChunks?.[cy]?.[cx];
                textLevelChunks[cy][cx] = level ?? createLevelChunkCanvas();
            }
        }

        // Redraw only the chunks that have changed in part or in full
        const botData = context.map.botTiles.canvas;
        const topData = context.map.topTiles.canvas;
        for (let cy = 0; cy < unchangedHeight; cy++)
            for (let cx = unchangedWidth; cx < chunksWidth; cx++) {
                drawMetatileChunk(cx, cy, botData, topData);
                redrawLevelChunk(cx, cy);
            }
        for (let cy = unchangedHeight; cy < chunksHeight; cy++)
            for (let cx = 0; cx < chunksWidth; cx++) {
                drawMetatileChunk(cx, cy, botData, topData);
                redrawLevelChunk(cx, cy);
            }
    }

    /** Rebuilds and draws the levels when the blocks are updated */
    export function rebuildLevels() {
        const chunksWidth = Math.ceil(blocks.width / chunkSize);
        const chunksHeight = Math.ceil(blocks.height / chunkSize);

        for (let cy = 0; cy < chunksHeight; cy++)
            for (let cx = 0; cx < chunksWidth; cx++) redrawLevelChunk(cx, cy);

        buildLevelMinimap();
        draw();
    }

    /** Returns a new context for a metatile chunk */
    function createMetatileChunkCanvas(): CanvasRenderingContext2D {
        const canvas = document.createElement("canvas");
        canvas.width = chunkSize * 16;
        canvas.height = chunkSize * 16;
        return canvas.getContext("2d");
    }
    /** Redraws all metatiles in the bottom and top layer of a metatile chunk */
    function drawMetatileChunk(
        cx: number,
        cy: number,
        botData: HTMLCanvasElement,
        topData: HTMLCanvasElement
    ) {
        const bot = botMetatileChunks[cy][cx];
        const top = topMetatileChunks[cy][cx];

        // Clear the top canvas
        top.clearRect(0, 0, top.canvas.width, top.canvas.height);
        bot.clearRect(0, 0, bot.canvas.width, bot.canvas.height);

        // Draw the levels in this chunk
        for (let j = 0; j < chunkSize; j++) {
            for (let i = 0; i < chunkSize; i++) {
                // Get the metatile
                const metatile = blocks.getMetatileInBounds(
                    cx * chunkSize + i,
                    cy * chunkSize + j
                );
                if (metatile === undefined) continue;

                const x = i * 16;
                const y = j * 16;

                // Draw the blocks on each level
                bot.drawImage(botData, metatile * 16, 0, 16, 16, x, y, 16, 16);
                top.drawImage(topData, metatile * 16, 0, 16, 16, x, y, 16, 16);
            }
        }
    }

    function redrawAllMetatileChunks() {
        const botData = context.map.botTiles.canvas;
        const topData = context.map.topTiles.canvas;
        const chunksWidth = Math.ceil(blocks.width / chunkSize);
        const chunksHeight = Math.ceil(blocks.height / chunkSize);

        for (let cy = 0; cy < chunksHeight; cy++)
            for (let cx = 0; cx < chunksWidth; cx++)
                drawMetatileChunk(cx, cy, botData, topData);
    }

    /** Returns a new context for a level chunk*/
    function createLevelChunkCanvas(): CanvasRenderingContext2D {
        const canvas = document.createElement("canvas");
        canvas.width = chunkSize * 16 * LEVEL_CACHE_ZOOM;
        canvas.height = chunkSize * 16 * LEVEL_CACHE_ZOOM;
        const ctx = canvas.getContext("2d");
        ctx.font = `${12 * LEVEL_CACHE_ZOOM}px Rubik`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        return ctx;
    }
    /** Renders the chunk at the given coordinates containing the render levels */
    function redrawLevelChunk(cx: number, cy: number): ChunkData {
        const ctx = textLevelChunks[cy][cx];
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw the levels in this chunk
        for (let j = 0; j < chunkSize; j++) {
            for (let i = 0; i < chunkSize; i++) {
                // Get the level
                const level = blocks.getLevelInBounds(
                    cx * chunkSize + i,
                    cy * chunkSize + j
                );
                if (level === undefined) continue;

                // Draw the level with text
                drawLevelSquare(ctx, level, i, j);
            }
        }

        return ctx;
    }
    /** Draws the given level data (background and text) to a canvas context with the given offset */
    function drawLevelSquare(
        ctx: CanvasRenderingContext2D,
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
        ctx.globalAlpha = LEVEL_BACKGROUND_ALPHA;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 16 * LEVEL_CACHE_ZOOM, 16 * LEVEL_CACHE_ZOOM);

        // Draw the text
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = `200 ${12 * LEVEL_CACHE_ZOOM}px Rubik`;
        ctx.fillText(text, x + 8 * LEVEL_CACHE_ZOOM, y + 8 * LEVEL_CACHE_ZOOM);
    }

    /** Builds the level minimap for when text is not needed. */
    function buildLevelMinimap() {
        // Build the color level map
        const canvas = document.createElement("canvas");
        canvas.width = blocks.width;
        canvas.height = blocks.height;
        colorLevelMap = canvas.getContext("2d");
        colorLevelMap.globalAlpha = LEVEL_BACKGROUND_ALPHA;

        for (let j = 0; j < blocks.height; j++)
            for (let i = 0; i < blocks.width; i++) updateLevelPixel(i, j);
    }

    /** Prints a pixel to the colorLevelMap corresponding to the level at the given offset */
    function updateLevelPixel(x: number, y: number) {
        // Get the level
        const level = blocks.getLevelInBounds(x, y);
        if (level === undefined) return;

        // Get the color
        const [color, _] = levelToColorAndString(level);

        // Draw a rectangle
        colorLevelMap.fillStyle = color;
        colorLevelMap.clearRect(x, y, 1, 1);
        colorLevelMap.fillRect(x, y, 1, 1);
    }

    // ANCHOR Panning and zoom
    function doPanning(x: number, y: number) {
        // Compute the offset
        const xOffset = x - mousePanStart.x;
        const yOffset = y - mousePanStart.y;

        // Apply the offset
        offset.x = mapPanStart.x + xOffset;
        offset.y = mapPanStart.y + yOffset;

        draw();
    }
    /** Zooms in the given direction while centering on the given point*/
    function doZooming(x: number, y: number, direction: 1 | -1) {
        if (!allowZoom) return;

        // Compute the new zoom index and factor
        const newZoomIndex = zoomIndex + direction;
        if (newZoomIndex < 0 || newZoomIndex >= ZOOM_LEVELS.length) return;
        const newZoom = ZOOM_LEVELS[newZoomIndex];

        // Compute the new offset so that the mouse points to the same point
        const newOffsetX = x - (newZoom / zoom) * (x - offset.x);
        const newOffsetY = y - (newZoom / zoom) * (y - offset.y);

        // Apply the new zoom and offset
        offset.x = Math.round(newOffsetX);
        offset.y = Math.round(newOffsetY);
        zoomIndex = newZoomIndex;
        zoom = newZoom;

        draw();
    }

    // ANCHOR Resizing
    class MapResizeChange extends Change {
        constructor(
            private oldBlocks: BlocksData,
            private newBlocks: BlocksData
        ) {
            super();
        }

        public updatePrev(): boolean {
            return false;
        }
        public async revert(): Promise<void> {
            this.redraw(this.oldBlocks);
        }
        public async apply(): Promise<void> {
            this.redraw(this.newBlocks);
        }

        private redraw(_blocks: BlocksData) {
            initialized = false;
            blocks = _blocks;
            blocks.width = blocks.width;
            blocks.height = blocks.height;
            // Update the chunks
            buildAllChunks();
            buildLevelMinimap();
            // Updates the cursor
            resizeDirection = getResizeDirection();
            cursorStyle = getCursor();

            initialized = true;
            draw();
        }
    }

    /** Returns whether the mouse is on a resizing border */
    function getResizeDirection(): ResizeDirection {
        if (!resizeOptions) return ResizeDirection.None;

        // Convert the mouse position to the map position
        const { x, y } = canvasToMap(mousePosition);

        // Right border rectangle
        const rightBorderRect = {
            x: blocks.width * 16,
            y: 0,
            width: resizeOptions.border,
            height: blocks.height * 16,
        };

        if (
            x >= rightBorderRect.x &&
            x <= rightBorderRect.x + rightBorderRect.width &&
            y >= rightBorderRect.y &&
            y <= rightBorderRect.y + rightBorderRect.height
        )
            return ResizeDirection.Right;

        // Bottom border rectangle
        const bottomBorderRect = {
            x: 0,
            y: blocks.height * 16,
            width: blocks.width * 16,
            height: resizeOptions.border,
        };

        if (
            x >= bottomBorderRect.x &&
            x <= bottomBorderRect.x + bottomBorderRect.width &&
            y >= bottomBorderRect.y &&
            y <= bottomBorderRect.y + bottomBorderRect.height
        )
            return ResizeDirection.Bottom;

        // Bottom-right border rectangle
        const bottomRightBorderRect = {
            x: blocks.width * 16,
            y: blocks.height * 16,
            width: resizeOptions.border,
            height: resizeOptions.border,
        };
        if (
            x >= bottomRightBorderRect.x &&
            x <= bottomRightBorderRect.x + bottomRightBorderRect.width &&
            y >= bottomRightBorderRect.y &&
            y <= bottomRightBorderRect.y + bottomRightBorderRect.height
        )
            return ResizeDirection.BottomRight;

        return ResizeDirection.None;
    }
    /** Updates `resizedMapSize` on mouse movement */
    function doResizing() {
        if (!resizeOptions) return;

        // Save the old size for more efficient drawing
        const { width: prevWidth, height: prevHeight } = resizedMapSize;

        // Get the current mouse position
        const { x: mx, y: my } = mousePosition;
        // Get the difference between the start and the end
        const dx = mx - mouseResizeStart.x;
        const dy = my - mouseResizeStart.y;
        // Convert the deltas to tiles
        const dtx = Math.round(dx / 16 / zoom);
        const dty = Math.round(dy / 16 / zoom);

        let newSize = { width: blocks.width, height: blocks.height };

        // Get the new size
        switch (resizeDirection) {
            case ResizeDirection.Bottom:
                newSize.height += dty;
                break;
            case ResizeDirection.Right:
                newSize.width += dtx;
                break;
            case ResizeDirection.BottomRight:
                newSize.width += dtx;
                newSize.height += dty;
                break;
        }

        // Make sure you're still in bounds
        // Min side sizes
        if (newSize.width < 1) newSize.width = 1;
        if (newSize.height < 1) newSize.height = 1;
        // Max side sizes
        if (newSize.width > resizeOptions.maxWidth)
            newSize.width = resizeOptions.maxWidth;
        if (newSize.height > resizeOptions.maxHeight)
            newSize.height = resizeOptions.maxHeight;
        // Max area
        if (newSize.width * newSize.height > resizeOptions.maxArea) {
            // If the width is too big, set it to the max
            if (newSize.width > resizeOptions.maxWidth)
                newSize.width = resizeOptions.maxWidth;
            // Then set the height to the max
            newSize.height = Math.floor(resizeOptions.maxArea / newSize.width);
        }

        if (newSize.width !== prevWidth || newSize.height !== prevHeight) {
            resizedMapSize = newSize;
            // Draw the map with the new size
            draw();
        }
    }
    /** Resizes the map */
    function resizeMap(width: number, height: number) {
        if (width === blocks.width && height === blocks.height) return;

        const oldBlocks = blocks;
        const newBlocks = blocks.resize(width, height, nullLevels ? NULL : 0);

        const change = new MapResizeChange(oldBlocks, newBlocks);
        changes.push(change);
    }

    // ANCHOR Selection
    /** Computes the selection rectangle */
    function computeSelectionRectangle() {
        const oldSel = selection;

        let { x: sx, y: sy } = selectionStart;
        let { x: ex, y: ey } = hoveredTile();

        // Modify both all elements so that they are in bounds
        sx = clamp(sx, 0, blocks.width - 1);
        sy = clamp(sy, 0, blocks.height - 1);
        ex = clamp(ex, 0, blocks.width - 1);
        ey = clamp(ey, 0, blocks.height - 1);

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
                    if (blocks.isNull(i, j)) return;
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

        // Build the levels canvas
        const lvCanvas = document.createElement("canvas");
        lvCanvas.width = selection.width * 32;
        lvCanvas.height = selection.height * 32;
        const lvCtx = lvCanvas.getContext("2d");

        // Build the levels canvas
        for (let cy = 0; cy <= cey - csy; cy++) {
            for (let cx = 0; cx <= cex - csx; cx++) {
                // Get the chunk
                const levelChunk = textLevelChunks[csy + cy]?.[csx + cx];
                if (levelChunk === undefined) continue;

                // Draw the chunk (subtracting the offset)
                const rx = cx * chunkSize * 16 - ox * 16;
                const ry = cy * chunkSize * 16 - oy * 16;

                lvCtx.drawImage(
                    levelChunk.canvas,
                    rx * 2,
                    ry * 2,
                    chunkSize * 32,
                    chunkSize * 32
                );

                // Draw the blocks
                const botChunk = botMetatileChunks[csy + cy]?.[csx + cx];
                if (botChunk === undefined) continue;
                const topChunk = topMetatileChunks[csy + cy]?.[csx + cx];
                if (topChunk === undefined) continue;

                // Draw the chunk (subtracting the offset)
                ctx.drawImage(
                    botChunk.canvas,
                    rx,
                    ry,
                    chunkSize * 16,
                    chunkSize * 16
                );
                ctx.drawImage(
                    topChunk.canvas,
                    rx,
                    ry,
                    chunkSize * 16,
                    chunkSize * 16
                );
            }
        }

        // Copy the selection
        const selBlockData = new BlocksData(selection.width, selection.height);
        for (let y = 0; y < selection.height; y++) {
            for (let x = 0; x < selection.width; x++) {
                selBlockData.set(
                    x,
                    y,
                    blocks.getMetatile(selection.x + x, selection.y + y),
                    blocks.getLevel(selection.x + x, selection.y + y)
                );
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
        getMetatile: (x: number, y: number) =>
            blocks.metatiles[y * blocks.width + x],
        getLevel: (x: number, y: number) => blocks.levels[y * blocks.width + x],
        forEach(callback) {
            for (let y = 0; y < blocks.height; y++)
                for (let x = 0; x < blocks.width; x++)
                    callback(x, y, this.getMetatile(x, y), this.getLevel(x, y));
        },
        set(x: number, y: number, metatile: number, level: number) {
            // Get the old value and for maximum efficiency, draw only what changes
            const oldMetatile = blocks.getMetatile(x, y);
            const oldLevel = blocks.getLevel(x, y);

            if (
                oldMetatile !== metatile &&
                !(editLevels && state === State.Painting)
            ) {
                // Re-render everything
                drawSingleMetatile(x, y, metatile);
                // Update the metatile
                blocks.setMetatile(x, y, metatile);
            }

            if (oldLevel !== level) {
                // Get the correct chunk to update
                const cx = Math.floor(x / chunkSize);
                const cy = Math.floor(y / chunkSize);
                const ox = x % chunkSize;
                const oy = y % chunkSize;

                // Update the level
                blocks.setLevel(x, y, level);
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

    function drawSingleMetatile(x: number, y: number, metatile: number) {
        // Get the chunk where that block is
        const cx = Math.floor(x / chunkSize);
        const cy = Math.floor(y / chunkSize);
        const ox = x % chunkSize;
        const oy = y % chunkSize;

        // Draw the metatile on both chunks
        const botChunk = botMetatileChunks[cy][cx];
        const topChunk = topMetatileChunks[cy][cx];

        // Clear the top chunk
        botChunk.clearRect(ox * 16, oy * 16, 16, 16);
        topChunk.clearRect(ox * 16, oy * 16, 16, 16);

        // Draw the top and bot metatiles from the palette
        botChunk.drawImage(
            context.map.botTiles.canvas,
            metatile * 16,
            0,
            16,
            16,
            ox * 16,
            oy * 16,
            16,
            16
        );
        topChunk.drawImage(
            context.map.topTiles.canvas,
            metatile * 16,
            0,
            16,
            16,
            ox * 16,
            oy * 16,
            16,
            16
        );
    }

    // ANCHOR Mouse Event handlers
    function onMouseDown(event: MouseEvent) {
        // If the user is already doing something, ignore this event
        if (state !== State.Idle) return;

        if (event.button === 0) {
            if ($editingLocked) return;

            // Resizing starts if you are hovering over a border of the map
            if (resizeDirection !== ResizeDirection.None) {
                mouseResizeStart.y = event.offsetY;
                mouseResizeStart.x = event.offsetX;

                // Save the current map size
                resizedMapSize = {
                    width: blocks.width,
                    height: blocks.height,
                };

                changes.locked++;
                updateState(State.Resizing);
                return;
            }

            // Painting starts if a material is present
            if (material !== null) {
                // Get the current tile coordinates
                const { x, y } = hoveredTile();
                // If the tile are not in bounds, don't start anything
                if (!canPaintOnTile(x, y)) return;
                updateState(State.Painting);

                // Create the painting state
                paintingState = new PainterState(PAINTER_METHODS);
                tool = new context.toolClass(paintingState, $material, {
                    shiftKey: event.shiftKey,
                    ctrlKey: event.ctrlKey,
                    editingLevels: editLevels,
                });
                changes.locked++;
                tool.startStroke(x, y);
            }
        }

        // Panning starts with the middle mouse button (1)
        if (event.button === 1 && allowPan) {
            updateState(State.Panning);
            // Save the mouse coordinates for computing the offset
            mousePanStart.x = event.offsetX;
            mousePanStart.y = event.offsetY;
            // Save the real coordinates for applying the difference
            mapPanStart.x = offset.x;
            mapPanStart.y = offset.y;
        }

        // Selection starts with the right mouse button (2)
        if (event.button === 2) {
            if ($editingLocked) return;
            const { x, y } = hoveredTile();
            if (!canPaintOnTile(x, y)) return;

            updateState(State.Selecting);
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
                doPanning(event.offsetX, event.offsetY);
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
            case State.Resizing:
                doResizing();
                break;
            case State.Idle:
                resizeDirection = getResizeDirection();
                break;
        }
    }
    function onMouseUp(event: MouseEvent | { button: number }) {
        if (event.button === 0) {
            if (state === State.Painting) {
                // Get the current tile coordinates
                const { x, y } = hoveredTile();
                // Don't care if the tile is in bounds, the stroke should always end
                changes.locked--;
                tool.endStroke(x, y);

                const change = new PaintChange(paintingState);
                // Create a brush edit
                changes.push(change);
                // Create a new change event
                dispatch("blockschanged", {
                    blocks,
                    newBlocks: paintingState.newBlocks,
                    oldBlocks: paintingState.oldBlocks,
                    anyChanges:
                        Object.values(paintingState.newBlocks).length > 0,
                    timestamp: +Date.now(),
                });
            } else if (state === State.Resizing) {
                const { width, height } = resizedMapSize;
                // Resize the map
                changes.locked--;
                resizeMap(width, height);
                // Reset the resize state
                resizeDirection = ResizeDirection.None;
                resizedMapSize = null;
            }
            updateState(State.Idle);
        } else if (event.button === 1 && state === State.Panning) {
            updateState(State.Idle);
        } else if (event.button === 2 && state === State.Selecting) {
            // Hide the selection
            selection = null;
            draw();
            changes.locked--;

            updateState(State.Idle);
        }
    }
    function onMouseWheel(event: WheelEvent) {
        if (!allowZoom || state !== State.Idle) return;

        let scroll = event.deltaY;
        if (scroll === 0) return;
        // Normalize the scroll value
        const direction = scroll > 0 ? -1 : 1;

        doZooming(mousePosition.x, mousePosition.y, direction);
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
            case State.Idle:
            case State.Resizing:
                switch (resizeDirection) {
                    case ResizeDirection.Bottom:
                        return "ns-resize";
                    case ResizeDirection.Right:
                        return "ew-resize";
                    case ResizeDirection.BottomRight:
                        return "nwse-resize";
                }
            default:
                return "default";
        }
    }
    $: state, (cursorStyle = getCursor());
    $: resizeDirection, (cursorStyle = getCursor());

    // ANCHOR Other Event handlers
    /** Updates the canvas size and redraws the canvas. */
    function updateSize() {
        if (constantWidth !== null) return;
        // Stop updating if the containerEl was destroyed
        if (!containerEl) return;

        if (containerEl.clientWidth === 0 || containerEl.clientHeight === 0)
            return;

        // Set it to the container size
        canvasWidth = containerEl.clientWidth;
        canvasHeight = containerEl.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        if (centerOnResize) {
            const mapWidth = blocks.width * 16;
            const mapHeight = blocks.height * 16;

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
        doZooming(canvasWidth / 2, canvasHeight / 2, 1);
    }
    export function zoomOut() {
        doZooming(canvasWidth / 2, canvasHeight / 2, -1);
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
            canvasHeight = canvasWidth * (blocks.height / blocks.width);
            // Change the zoom so that the whole map width fits in the canvas
            zoomIndex = null;
            zoom = canvasWidth / (blocks.width * 16);

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            draw();
        }

        if (mainCanvas) {
            // Add the zoomIn and zoomOut function to the context
            context.zoomIn = zoomIn;
            context.zoomOut = zoomOut;
        }
    });
    onDestroy(() => {
        unsubscribeFromAnimations();
        unsubscribeFromData();
        initialized = false;

        // Unset all things that could use memory
        context = null;
        for (const row of botMetatileChunks)
            for (const ctx of row) ctx.canvas.remove();
        botMetatileChunks = null;
        for (const row of topMetatileChunks)
            for (const ctx of row) ctx.canvas.remove();
        topMetatileChunks = null;
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
        on:wheel|passive={onMouseWheel}
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
