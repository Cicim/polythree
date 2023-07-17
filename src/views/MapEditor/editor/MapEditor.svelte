<script lang="ts">
    import { watchResize } from "svelte-watch-resize";
    import { getContext, onDestroy, onMount, tick } from "svelte";
    import type { Writable } from "svelte/store";
    import type { MapEditorContext, MapEditorData } from "src/views/MapEditor";

    /**
     * The size of the chunks in which to divide the map for caching.
     * `0` means no caching.
     */
    export let chunkSize: number = 32;

    /** Zoom levels the user can scroll through */
    const ZOOM_LEVELS = [1, 1.5, 2, 3, 4, 5, 6, 8, 16];

    // ANCHOR Helpers
    type ChunkData = HTMLCanvasElement;
    interface Point {
        x: number;
        y: number;
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

    // ANCHOR Properties
    let containerEl: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    /** Width of the canvas in pixels */
    let canvasWidth: number;
    /** Height of the canvas in pixels */
    let canvasHeight: number;

    // Zooming and panning
    /** Zoom index */
    let zoomIndex: number = 3;
    /** Zoom factor */
    let zoom: number = ZOOM_LEVELS[zoomIndex];
    /** Canvas offset (in map coordinates) */
    let offset: Point = point();
    /** Mouse position before the start of the frame */
    let mousePosition: Point = point();
    /** If the user is panning */
    let isPanning: boolean = false;
    /** Mouse coordinates when the pan starts */
    let mousePanStart: Point = point();
    /** Canvas offset when the pan starts */
    let mapPanStart: Point = point();

    /** Canvases containing the chunks in which the map is divided */
    let cachedChunks: [ChunkData, ChunkData][][] = null;

    let context: MapEditorContext = getContext("context");
    let data: Writable<MapEditorData> = getContext("data");

    let tilesetImages = $data.tilesets;
    let mapData = $data.layout.map_data;

    const unsubscribeFromData = data.subscribe((value) => {
        tilesetImages = value.tilesets;
        buildChunks();
    });

    // ANCHOR Draw
    /**
     * Draw a full frame of the canvas from scratch.
     */
    function draw() {
        const frameStart = performance.now();

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx.imageSmoothingEnabled = false;

        // Find how many squares of size 16x16 can fit in the canvas
        const [start, end] = visibleBlocks();

        let drawnImages = 0;
        // If caching is disabled, draw the whole map
        if (chunkSize === 0) {
            for (let x = start.x; x < end.x; x++) {
                for (let y = start.y; y < end.y; y++) {
                    const tile = mapData[y]?.[x];

                    // If the tile is undefined, it's an empty tile
                    if (tile === undefined) continue;

                    // Draw the tile
                    drawTile(x, y);
                    drawnImages++;
                }
            }
        } else {
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
                    const chunk = cachedChunks[y]?.[x];
                    // If the chunk is undefined, it's an empty chunk
                    if (chunk === undefined) continue;
                    const [bottom, top] = chunk;

                    // Draw the chunk
                    const drawPosition = mapToCanvas(
                        point(x * chunkSize * 16, y * chunkSize * 16)
                    );
                    ctx.drawImage(
                        bottom,
                        drawPosition.x,
                        drawPosition.y,
                        bottom.width * zoom,
                        bottom.height * zoom
                    );
                    ctx.drawImage(
                        top,
                        drawPosition.x,
                        drawPosition.y,
                        top.width * zoom,
                        top.height * zoom
                    );
                    drawnImages++;
                }
            }
        }

        const frameTime = performance.now() - frameStart;
        debugValues({ frameTime, drawnImages });
    }

    /**
     * Return the coordinates (in blocks) of the topleft and bottomright block
     * that appears (even in part) on the canvas.
     */
    function visibleBlocks(): [Point, Point] {
        // Get the visible points (in map coordinates)
        const topLeft = canvasToMap(point(0, 0));
        const bottomRight = canvasToMap(point(canvasWidth, canvasHeight));

        // Get the map size in blocks
        const mapWidth = mapData[0].length;
        const mapHeight = mapData.length;

        // Get the lower bound tile-wise
        let x0 = clamp(Math.floor(topLeft.x / 16), 0, mapWidth);
        let y0 = clamp(Math.floor(topLeft.y / 16), 0, mapHeight);

        // Get the upper bound tile-wise
        let x1 = clamp(Math.ceil(bottomRight.x / 16), 0, mapWidth);
        let y1 = clamp(Math.ceil(bottomRight.y / 16), 0, mapHeight);

        return [point(x0, y0), point(x1, y1)];
    }

    function drawTile(x: number, y: number) {
        const images = getTileImagesAt(x, y);
        if (images === null) return;

        const [bottomImage, topImage] = images;

        // Compute the actual coordinates
        ({ x, y } = mapToCanvas({ x: x * 16, y: y * 16 }));

        // Draw the bottom image
        ctx.drawImage(bottomImage, x, y, 16 * zoom, 16 * zoom);

        // Draw the top image
        ctx.drawImage(topImage, x, y, 16 * zoom, 16 * zoom);
    }

    /**
     * Retuns [top, bottom] images for the metatile at a given block
     * coordinates, or null if it is wrong.
     */
    function getTileImagesAt(x: number, y: number): HTMLImageElement[] {
        const block = mapData[y]?.[x];
        if (block === undefined) return null;

        // FIXME Get the right mask for the job
        const tileIndex = block & 0x3ff;

        if (
            tilesetImages[tileIndex] === undefined ||
            tilesetImages[tileIndex].length !== 2
        )
            return null;

        return tilesetImages[tileIndex];
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
    /**
     * Build the chunks from the map data.
     */
    function buildChunks() {
        if (chunkSize === 0) return;

        // Get the map size in blocks
        const mapWidth = mapData[0].length;
        const mapHeight = mapData.length;

        // Get the number of chunks in each direction
        const chunksX = Math.ceil(mapWidth / chunkSize);
        const chunksY = Math.ceil(mapHeight / chunkSize);

        // Create the chunks
        cachedChunks = new Array(chunksY);

        // Fill the chunks
        for (let y = 0; y < chunksY; y++) {
            cachedChunks[y] = new Array(chunksX);
            for (let x = 0; x < chunksX; x++) {
                // Get the chunk data
                const chunk = getChunk(x, y);
                // Save the chunk
                cachedChunks[y][x] = chunk;
            }
        }
    }

    function getChunk(x: number, y: number): [ChunkData, ChunkData] {
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
                const images = getTileImagesAt(
                    x * chunkSize + i,
                    y * chunkSize + j
                );
                if (images === null) continue;
                const [bottomImage, topImage] = images;

                // Compute the actual coordinates
                botCtx.drawImage(bottomImage, i * 16, j * 16, 16, 16);
                topCtx.drawImage(topImage, i * 16, j * 16, 16, 16);
            }
        }

        return [botCanvas, topCanvas];
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

    // ANCHOR Mouse Event handlers
    function onMouseDown(event: MouseEvent) {
        // If the user is already panning, ignore this event, even for other buttons
        if (isPanning) return;

        // Panning starts with the middle mouse button (1)
        if (event.button === 1) {
            isPanning = true;
            // Save the mouse coordinates for computing the offset
            mousePanStart.x = event.offsetX;
            mousePanStart.y = event.offsetY;
            // Save the real coordinates for applying the difference
            mapPanStart.x = offset.x;
            mapPanStart.y = offset.y;
        }
    }

    function onMouseUp(event: MouseEvent) {
        if (event.button === 1 && isPanning) {
            isPanning = false;
        }
    }
    function onMouseMove(event: MouseEvent) {
        // Save the mouse position for the next frame
        mousePosition.x = event.offsetX;
        mousePosition.y = event.offsetY;

        if (isPanning) pan(event.offsetX, event.offsetY);
    }
    function onMouseWheel(event: WheelEvent) {
        if (isPanning) return;

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

    // ANCHOR Other Event handlers
    function updateSize() {
        canvasWidth = containerEl.clientWidth;
        canvasHeight = containerEl.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        draw();
    }

    // ANCHOR Exported actions
    export function zoomIn() {
        zoomIndex = Math.min(zoomIndex + 1, ZOOM_LEVELS.length - 1);
        zoom = ZOOM_LEVELS[zoomIndex];
        draw();
    }
    export function zoomOut() {
        zoomIndex = Math.max(zoomIndex - 1, 0);
        zoom = ZOOM_LEVELS[zoomIndex];
        draw();
    }

    onMount(async () => {
        ctx = canvas.getContext("2d");
        await tick();
        updateSize();

        // Add the zoomIn and zoomOut function to the context
        context.zoomIn = zoomIn;
        context.zoomOut = zoomOut;
    });
    onDestroy(() => {
        unsubscribeFromData();
    });
</script>

<svelte:window on:resize={updateSize} on:mouseup={onMouseUp} />

<div
    class="canvas-container"
    bind:this={containerEl}
    use:watchResize={updateSize}
>
    <canvas
        bind:this={canvas}
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
    }
</style>
