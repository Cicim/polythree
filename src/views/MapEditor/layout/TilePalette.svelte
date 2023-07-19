<script lang="ts">
    import type { MapEditorContext, TilesetData } from "src/views/MapEditor";
    import { getContext, onMount } from "svelte";
    import { watchResize } from "svelte-watch-resize";

    const context: MapEditorContext = getContext("context");
    // Get the data
    const data = context.data;
    // Get the tilesets
    const tilesets: TilesetData = $data.tilesets;

    // Get the canvas
    let paletteCanvas: HTMLCanvasElement;
    let selectionDiv: HTMLDivElement;

    // Currently selected tile
    let selectedTile = 0;

    $: selectedTile;

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

    function updateSelection() {
        const x = selectedTile % 8;
        selectionDiv.style.setProperty("--x", `${x}`);
        const y = Math.floor(selectedTile / 8);
        selectionDiv.style.setProperty("--y", `${y}`);
        const width = 1;
        selectionDiv.style.setProperty("--width", `${width}`);
        const height = 1;
        selectionDiv.style.setProperty("--height", `${height}`);
    }

    /** Handles selection of tiles */
    function onClick(event: MouseEvent) {
        // Get the pixel coordinates
        const x = Math.floor(event.offsetX);
        const y = Math.floor(event.offsetY);
        const rect = paletteCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Get the tile index
        const tileX = Math.floor((x / width) * 8);
        const tileY = Math.floor((y / height) * Math.ceil(tilesets.length / 8));
        const tileIndex = tileX + tileY * 8;

        // Set the current tile
        selectedTile = tileIndex;
        updateSelection();
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
    }

    onMount(() => {
        drawPalette();
        updateSelection();
    });
</script>

<div class="palette" use:watchResize={onResized}>
    <div class="canvas-container">
        <div class="selection" bind:this={selectionDiv} />
        <canvas
            class="palette-canvas"
            bind:this={paletteCanvas}
            on:click={onClick}
        />
    </div>
</div>

<style lang="scss">
    .palette {
        padding: 18px;
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
