<script lang="ts">
    import { watchResize } from "svelte-watch-resize";
    import { getContext, onDestroy, onMount, tick } from "svelte";
    import type { Writable } from "svelte/store";
    import type { MapEditorContext, MapEditorData } from "src/views/MapEditor";

    const ZOOMS = [1, 1.5, 2, 3, 4, 5, 6, 8, 16];

    interface Point {
        x: number;
        y: number;
    }
    /** Function to easily construct a point */
    const point = (x: number = 0, y: number = 0): Point => ({ x, y });

    let containerEl: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    /** Width of the canvas in pixels */
    let canvasWidth: number;
    /** Height of the canvas in pixels */
    let canvasHeight: number;

    /** Zoom index */
    let zoomIndex: number = 3;
    /** Zoom factor */
    let zoom: number = ZOOMS[zoomIndex];
    /** Canvas offset */
    let offset: Point = point();

    /** Mouse position before the start of the frame */
    let mousePosition: Point = point();

    /** If the user is panning */
    let isPanning: boolean = false;
    /** Mouse coordinates when the pan starts */
    let mousePanStart: Point = point();
    /** Canvas offset when the pan starts */
    let mapPanStart: Point = point();

    let context: MapEditorContext = getContext("context");
    let data: Writable<MapEditorData> = getContext("data");

    let tilesetImages = $data.tilesets;
    let mapData = $data.layout.map_data;

    const unsubscribeFromData = data.subscribe((value) => {
        tilesetImages = value.tilesets;
    });

    // ANCHOR Draw
    /**
     * Draw a full frame of the canvas from scratch.
     */
    function draw() {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx.imageSmoothingEnabled = false;

        // Find how many squares of size 16x16 can fit in the canvas
        const { x, y, width, height } = viewSquare();

        // Draw a checkerboard of all 16x16 tiles that fit entirely into the square
        for (
            let i = Math.floor(x / 16);
            i < Math.ceil(x / 16 + width / 16);
            i++
        ) {
            for (
                let j = Math.floor(y / 16);
                j < Math.ceil(y / 16 + height / 16);
                j++
            ) {
                const tile = mapData[j]?.[i];

                // If the tile is undefined, it's an empty tile
                if (tile === undefined) continue;

                // Draw the tile
                drawTile(tile, i, j);
            }
        }

        // Draw a circle at the point (0, 0) with radius 8
        drawCircle(0, 0, 8, "#FF00FF");
    }

    /** Converts a point in map coordinates to a position on the canvas */
    const mapToCanvas = ({ x, y }: Point): Point => ({
        x: x * zoom + offset.x,
        y: y * zoom + offset.y,
    });

    /** Converts a point on a canvas to map coordinates */
    function canvasToMap(pt: Point): Point {
        return {
            x: (pt.x - offset.x) / zoom,
            y: (pt.y - offset.y) / zoom,
        };
    }

    /** Returns the rectangle in map coordinates that corresponds to the view on the canvas */
    function viewSquare(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        const topLeft = canvasToMap(point(0, 0));
        const bottomRight = canvasToMap(point(canvasWidth, canvasHeight));

        return {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y,
        };
    }

    function drawSquare(
        x: number,
        y: number,
        width: number,
        height: number,
        color: string
    ) {
        // Compute the actual coordinates
        ({ x, y } = mapToCanvas({ x, y }));

        ctx.fillStyle = color;
        ctx.fillRect(x, y, width * zoom, height * zoom);
    }

    function drawTile(tile: number, x: number, y: number) {
        // FIXME Get the right mask for the job
        // Get the image pair
        const tileIndex = tile & 0x3ff;

        if (
            tilesetImages[tileIndex] === undefined ||
            tilesetImages[tileIndex].length !== 2
        )
            return;

        const [bottomImage, topImage] = tilesetImages[tileIndex];

        // Compute the actual coordinates
        ({ x, y } = mapToCanvas({ x: x * 16, y: y * 16 }));

        // Draw the bottom image
        ctx.drawImage(bottomImage, x, y, 16 * zoom, 16 * zoom);

        // Draw the top image
        ctx.drawImage(topImage, x, y, 16 * zoom, 16 * zoom);
    }

    function drawCircle(x: number, y: number, radius: number, color: string) {
        // Compute the actual coordinates
        ({ x, y } = mapToCanvas({ x, y }));

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius * zoom, 0, 2 * Math.PI);
        ctx.fill();
    }

    // ANCHOR Debug drawing functions
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
        else draw();
    }

    function onMouseWheel(event: WheelEvent) {
        if (isPanning) return;

        let scroll = event.deltaY;
        if (scroll === 0) return;
        // Normalize the scroll value
        scroll = scroll > 0 ? -1 : 1;
        // Compute the new zoom factor
        zoomIndex = Math.max(0, Math.min(zoomIndex + scroll, ZOOMS.length - 1));
        const newZoom = ZOOMS[zoomIndex];

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
        zoomIndex = Math.min(zoomIndex + 1, ZOOMS.length - 1);
        zoom = ZOOMS[zoomIndex];
        draw();
    }
    export function zoomOut() {
        zoomIndex = Math.max(zoomIndex - 1, 0);
        zoom = ZOOMS[zoomIndex];
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
        on:click={updateSize}
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
