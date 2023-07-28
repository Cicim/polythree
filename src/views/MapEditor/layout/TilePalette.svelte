<script lang="ts">
    import type { MapEditorContext, TilesetData } from "src/views/MapEditor";
    import { getContext, onMount } from "svelte";
    import { watchResize } from "svelte-watch-resize";
    import { PaletteMaterial, SelectionMaterial } from "../editor/materials";

    const context: MapEditorContext = getContext("context");
    // Get the data
    const data = context.data;
    const material = context.material;
    // Get the tilesets
    const tilesets: TilesetData = $data.tilesets;
    // Get the block data for this map
    const tilesetBlocksStore = context.tilesetBlocks;

    // Get the canvas
    let paletteCanvas: HTMLCanvasElement;
    let selectionDiv: HTMLDivElement;

    // Currently selected tile
    let selectionStart: Point = { x: 0, y: 0 },
        selectionEnd: Point = { x: 0, y: 0 },
        // If you are multi selecting
        rightClicking: boolean = false;

    $: $material,
        (() => {
            if (
                $material instanceof SelectionMaterial &&
                $material.isSingular
            ) {
                // Update the selection
                const tile = $material.blocks[0][0][0];
                const x = tile % 8,
                    y = Math.floor(tile / 8);
                selectionStart = { x, y };
                selectionEnd = { x, y };
                drawSelection();
                scrollToTile(y);
            }
        })();

    /** Compose the canvas image for the palette */
    function drawPalette() {
        const ctx = paletteCanvas.getContext("2d");
        // Set the canvas size
        paletteCanvas.width = 8 * 16;
        paletteCanvas.height = Math.ceil(tilesets.length / 8) * 16;

        for (let i = 0; i < tilesets.length; i++) {
            const tileset = tilesets[i];

            // Draw the bottom image
            const x = (i % 8) * 16;
            const y = Math.floor(i / 8) * 16;
            ctx.drawImage(tileset[0], x, y);
            ctx.drawImage(tileset[1], x, y);
        }
    }

    function sortSelection(): TileSelection {
        let minx = Math.min(selectionStart.x, selectionEnd.x);
        let miny = Math.min(selectionStart.y, selectionEnd.y);
        let dx = selectionStart.x - selectionEnd.x;
        let dy = selectionStart.y - selectionEnd.y;

        const width = Math.abs(dx) + 1;
        const height = Math.abs(dy) + 1;
        const x = minx;
        const y = miny;
        return { x, y, width, height };
    }

    function drawSelection() {
        if (!selectionDiv) return;

        const { x, y, width, height } = sortSelection();

        selectionDiv.style.setProperty("--x", `${x}`);
        selectionDiv.style.setProperty("--y", `${y}`);
        selectionDiv.style.setProperty("--width", `${width}`);
        selectionDiv.style.setProperty("--height", `${height}`);
    }

    function scrollToTile(tileY: number) {
        const scrollableElement =
            paletteCanvas?.parentElement?.parentElement?.parentElement;
        if (!scrollableElement) return;

        const rect = paletteCanvas.getBoundingClientRect();
        const height = rect.height;
        const tileSize = height / Math.ceil(tilesets.length / 8);
        const scrollY = tileY * tileSize;
        scrollableElement.scrollTo({
            top: scrollY,
            behavior: "smooth",
        });
    }

    /** Creates the material from the current selection */
    function buildMaterial() {
        const { x, y, width, height } = sortSelection();

        const tilesetBlocks = $tilesetBlocksStore;

        // See if the brush is a single tile
        const blocks = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push(tilesetBlocks[y + i][x + j]);
            }
            blocks.push(row);
        }
        $material = new PaletteMaterial(blocks);
    }

    /** Gets the coordinates of the clicked tile on the canvas */
    function getTile(event: MouseEvent): Point {
        // Get the pixel coordinates
        const x = Math.floor(event.offsetX);
        const y = Math.floor(event.offsetY);
        const rect = paletteCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Get the tile index
        const tileX = Math.floor((x / width) * 8);
        const tileY = Math.floor((y / height) * Math.ceil(tilesets.length / 8));

        return {
            x: tileX,
            y: tileY,
        };
    }

    function onMouseDown(event: MouseEvent) {
        selectionStart = getTile(event);
        selectionEnd = { ...selectionStart };
        drawSelection();

        if (event.buttons === 2) {
            rightClicking = true;
        }
    }
    function onMouseMove(event: MouseEvent) {
        if (rightClicking) {
            selectionEnd = getTile(event);
            drawSelection();
        }
    }
    function onMouseUp(event: MouseEvent) {
        rightClicking = false;
        buildMaterial();
    }

    function onResized() {
        if (!paletteCanvas || !selectionDiv) return;
        // Get the canvas's rect width
        const rect = paletteCanvas.getBoundingClientRect();
        const width = rect.width;
        // Calculate the new tile size
        const tileSize = width / 8;
        // Update the selection's position and size
        selectionDiv.style.setProperty("--size", `${tileSize}px`);

        drawSelection();
    }

    onMount(() => {
        drawPalette();
        drawSelection();
    });
</script>

<div class="palette" use:watchResize={onResized}>
    <div class="canvas-container">
        <div class="selection" bind:this={selectionDiv} />
        <canvas
            class="palette-canvas"
            bind:this={paletteCanvas}
            on:mousedown={onMouseDown}
            on:mouseup={onMouseUp}
            on:mousemove={onMouseMove}
        />
    </div>
</div>

<style lang="scss">
    .palette {
        padding: 18px;

        &:not(:hover) {
            .selection {
                animation: pulse 1s infinite;

                @keyframes pulse {
                    0% {
                        outline-color: red;
                    }
                    50% {
                        outline-color: white;
                    }
                    100% {
                        outline-color: red;
                    }
                }
            }
        }
    }

    .canvas-container {
        position: relative;
    }

    .selection {
        --size: 32px;
        --x: 0;
        --y: 0;
        --width: 1;
        --height: 1;
        position: absolute;

        left: calc(var(--size) * var(--x));
        top: calc(var(--size) * var(--y));
        width: calc(var(--size) * var(--width));
        height: calc(var(--size) * var(--height));

        outline: 2px solid red;
        box-shadow: 0 0 4px 4px black;
        pointer-events: none;
    }

    .palette-canvas {
        width: 100%;
        image-rendering: pixelated;
    }
</style>
