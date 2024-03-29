<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { getContext, onMount } from "svelte";
    import { watchResize } from "svelte-watch-resize";
    import { PaletteMaterial, SelectionMaterial } from "../editor/materials";
    import {
        BlocksData,
        NULL_METATILE,
        NULL_PERMISSION,
    } from "../editor/blocks_data";

    export let hoveringTile: number = null;
    export let selectedTile: number | [number, number, number] = null;
    export let fitToContainer: boolean = true;
    export let showEraserOverlay: boolean = false;

    const context: MapEditorContext = getContext("context");
    // Get the data
    const material = context.material;
    // Get the block data for this map
    const tilesetBlocksStore = context.palette.blocks;
    // Get the number of tiles that are valid from the end of the tileset
    const lastRowLength = context.palette.lastRowLength;
    /** Height of the tileset in blocks */
    let tilesetHeight: number = 0;

    /** Palette canvas with the drawn tiles. */
    let canvas: HTMLCanvasElement;
    let selectionDiv: HTMLDivElement;
    let paletteContainer: HTMLDivElement;
    let hiderElement: HTMLDivElement;

    // Currently selected tile
    let selectionStart: Point = { x: 0, y: 0 },
        selectionEnd: Point = { x: 0, y: 0 },
        // If you are multi selecting
        rightClicking: boolean = false;

    /** The first tile that was selected. Doesn't change after selection start */
    let firstSelection: Point = { x: 0, y: 0 };
    /** The last side length of a tile in the canvas, aka `var(--size)` */
    let lastTileSize: number;

    // Code to run every time the material changes
    $: $material,
        (() => {
            if (
                $material instanceof SelectionMaterial &&
                $material.isSingular
            ) {
                // Update the selection
                const tile = $material.blocks.getMetatile(0, 0);
                const x = tile % 8,
                    y = Math.floor(tile / 8);
                selectionStart = { x, y };
                selectionEnd = { x, y };
                updateSelection();
                scrollToTile(y);
                selectedTile = tile;
            } else if (
                $material instanceof PaletteMaterial &&
                $material.isSingular &&
                $material.blocks.metatiles[0] === NULL_METATILE
            ) {
                // Update the selection
                hideSelection();
            } else if (
                !(
                    $material instanceof PaletteMaterial &&
                    $material.isPaletteMaterial
                )
            ) {
                hideSelection();
                selectedTile = null;
            }
        })();

    /** Compose the canvas image for the palette */
    function drawPalette() {
        // Get the blocks to draw
        const blocks: BlocksData = $tilesetBlocksStore;

        const ctx = canvas.getContext("2d");
        // Set the canvas size
        canvas.width = blocks.width * 16;
        canvas.height = blocks.height * 16;
        // Save the tileset height
        tilesetHeight = blocks.height;

        for (let j = 0; j < blocks.height; j++) {
            ctx.drawImage(
                context.map.botTiles.canvas,
                j * 16 * 8,
                0,
                16 * 8,
                16,
                0,
                j * 16,
                16 * 8,
                16
            );
            ctx.drawImage(
                context.map.topTiles.canvas,
                j * 16 * 8,
                0,
                16 * 8,
                16,
                0,
                j * 16,
                16 * 8,
                16
            );
        }
    }

    /** Reorders the selection so that
     * + `selectionStart` is on the top left corner
     * + `selectionEnd` is on the top right */
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

    /** Updates the css variables of the selection div to reposition the selection */
    function updateSelection() {
        if (!selectionDiv) return;

        const { x, y, width, height } = sortSelection();

        selectionDiv.style.setProperty("--x", `${x}`);
        selectionDiv.style.setProperty("--y", `${y}`);
        selectionDiv.style.setProperty("--width", `${width}`);
        selectionDiv.style.setProperty("--height", `${height}`);

        // Get the left offset if fitToContainer is set
        const rect = canvas.getBoundingClientRect();
        // Get the container's width
        const containerWidth = canvas.parentElement.clientWidth;
        // Get the left offset
        const left = (containerWidth - rect.width) / 2;
        paletteContainer.style.setProperty("--left", `${left}px`);
    }

    /** Updates the selection start and end so that it
     * is way off screen and hidden from view */
    function hideSelection() {
        selectionStart = { x: -100, y: 0 };
        selectionEnd = { x: -100, y: 0 };
        updateSelection();
    }

    /** Scrolls the container to the specified tile's height */
    function scrollToTile(tileY: number) {
        const scrollableElement =
            canvas?.parentElement?.parentElement?.parentElement;
        if (!scrollableElement) return;

        const rect = canvas.getBoundingClientRect();
        const height = rect.height;
        const tileSize = height / tilesetHeight;
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

        let blocks = new BlocksData(width, height);

        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                const tileIndex = blocks.index(x + i, y + j);

                if (tileIndex >= context.palette.fullLength) {
                    blocks.set(i, j, NULL_METATILE, NULL_PERMISSION);
                } else {
                    blocks.set(
                        i,
                        j,
                        tilesetBlocks.getMetatile(x + i, y + j),
                        tilesetBlocks.getPermission(x + i, y + j)
                    );
                }
            }
        }
        $material = new PaletteMaterial(blocks);
    }

    /** Checks if the selection is 1x1 */
    function isSingleSelection() {
        return (
            selectionStart.x === selectionEnd.x &&
            selectionStart.y === selectionEnd.y
        );
    }

    /** Gets the coordinates of the clicked tile on the canvas */
    function getTile(event: MouseEvent): Point {
        // Get the pixel coordinates
        const x = Math.floor(event.offsetX);
        const y = Math.floor(event.offsetY);
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Get the tile index
        const tileX = Math.floor((x / width) * 8);
        const tileY = Math.floor((y / height) * tilesetHeight);

        return {
            x: tileX,
            y: tileY,
        };
    }

    // ANCHOR Listeners
    function onMouseDown(event: MouseEvent) {
        selectionStart = getTile(event);
        firstSelection = { ...selectionStart };
        selectionEnd = { ...selectionStart };
        updateSelection();

        if (event.buttons === 2) {
            rightClicking = true;
        }
        if (isSingleSelection()) {
            selectedTile = hoveringTile;
        }
    }
    function onMouseMove(event: MouseEvent) {
        if (rightClicking) {
            selectionEnd = getTile(event);
            updateSelection();

            const { x, y, width, height } = sortSelection();
            // Update the multiselection tile
            const selectedStartTile = x + y * 8;
            if (isSingleSelection()) selectedTile = selectedStartTile;
            else selectedTile = [selectedStartTile, width, height];
        }
        hoveringTile = getTile(event).x + getTile(event).y * 8;
    }
    function onMouseUp() {
        rightClicking = false;
        buildMaterial();
    }
    function onMouseLeave() {
        hoveringTile = null;
        if (rightClicking) {
            onMouseUp();
        }
    }

    /** Recalculates the tileSize every time the sidebar's size changes */
    function onResized() {
        if (!canvas || !selectionDiv) return;
        // Get the canvas's rect width
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        // Calculate the new tile size
        lastTileSize = width / 8;
        // Update the selection's position and size
        paletteContainer.style.setProperty("--size", `${lastTileSize}px`);

        updateSelection();
    }

    // ANCHOR External functions
    /** Moves the selection on the palette in the specified direction.
     * If select is set to true it creates a multiselection in the specified direction */
    export function moveOnPalette(dirX: number, dirY: number, select: boolean) {
        if (selectionStart.x === -100) {
            selectionStart.x = 0;
            selectionStart.y = 0;
            selectionEnd.x = 0;
            selectionEnd.y = 0;
            updateSelection();
            selectionDiv.scrollIntoView({ block: "center" });
            buildMaterial();
            return;
        }

        const multiselection = !isSingleSelection();
        if (select) {
            if (!multiselection) {
                firstSelection = { ...selectionStart };
            }
        }

        // Moving Right
        if (dirX > 0) {
            if (multiselection && selectionStart.x < firstSelection.x) {
                selectionStart.x++;
            } else {
                // Get the current selectionEnd's x + 1
                if (selectionEnd.x !== 7) selectionEnd.x++;
            }

            if (!select) {
                if (!multiselection) selectionStart.x = selectionEnd.x;
                else {
                    selectionStart = { ...firstSelection };
                    if (selectionStart.x !== 7) selectionStart.x++;
                    selectionEnd = { ...selectionStart };
                }
            }
        }
        // Moving Left
        else if (dirX < 0) {
            if (multiselection && selectionEnd.x > firstSelection.x) {
                selectionEnd.x--;
            } else {
                // Get the current selectionStart's x - 1
                if (selectionStart.x !== 0) selectionStart.x--;
            }

            if (!select) {
                if (!multiselection) selectionEnd.x = selectionStart.x;
                else {
                    selectionStart = { ...firstSelection };
                    if (selectionStart.x !== 0) selectionStart.x--;
                    selectionEnd = { ...selectionStart };
                }
            }
        }
        // Moving Down
        else if (dirY > 0) {
            if (multiselection && selectionStart.y < firstSelection.y) {
                selectionStart.y++;
            } else {
                if (selectionEnd.y !== tilesetHeight - 1) selectionEnd.y++;
            }

            if (!select) {
                if (!multiselection) selectionStart.y = selectionEnd.y;
                else {
                    selectionStart = { ...firstSelection };
                    if (selectionStart.y !== tilesetHeight - 1)
                        selectionStart.y++;
                    selectionEnd = { ...selectionStart };
                }
            }
        }
        // Moving Up
        else if (dirY < 0) {
            if (multiselection && selectionEnd.y > firstSelection.y) {
                selectionEnd.y--;
            } else {
                if (selectionStart.y !== 0) selectionStart.y--;
            }

            if (!select) {
                if (!multiselection) selectionEnd.y = selectionStart.y;
                else {
                    selectionStart = { ...firstSelection };
                    if (selectionStart.y !== 0) selectionStart.y--;
                    selectionEnd = { ...selectionStart };
                }
            }
        }

        // If the selection is out of bounds, scroll to it
        const selRect = selectionDiv.getBoundingClientRect();
        const container = paletteContainer.parentElement;
        const conRect = container.getBoundingClientRect();
        updateSelection();
        buildMaterial();

        if (
            selRect.bottom > conRect.bottom - lastTileSize ||
            selRect.y < conRect.top + lastTileSize
        ) {
            // If it's too big for the screen, focus on the bottom or top, depending on the direction you were going
            if (selRect.height > conRect.height) {
                if (dirY > 0) {
                    selectionDiv.scrollIntoView({ block: "end" });
                } else {
                    selectionDiv.scrollIntoView({ block: "start" });
                }
            } else {
                selectionDiv.scrollIntoView({ block: "center" });
            }
        }
    }

    onMount(() => {
        drawPalette();
        updateSelection();

        // Update the hider's data
        hiderElement.style.setProperty(
            "--hider-width",
            (8 - lastRowLength).toString()
        );
        hiderElement.style.setProperty(
            "--hider-left",
            lastRowLength.toString()
        );
    });
</script>

<div
    class="palette"
    use:watchResize={onResized}
    on:mouseleave={onMouseLeave}
    bind:this={paletteContainer}
>
    <div class="canvas-container">
        <div
            class="null-hider"
            class:hidden={lastRowLength === 0}
            bind:this={hiderElement}
        />
        <div
            class="selection"
            bind:this={selectionDiv}
            class:stretch={fitToContainer}
        />
        <div class="eraser-overlay" class:hidden={!showEraserOverlay}>
            <iconify-icon icon="mdi:eraser" />
        </div>
        <canvas
            class:stretch={fitToContainer}
            class="palette-canvas"
            bind:this={canvas}
            on:mousedown={onMouseDown}
            on:mouseup={onMouseUp}
            on:mousemove={onMouseMove}
        />
    </div>
</div>

<style lang="scss">
    .palette {
        --size: 32px;
        --left: 182px;
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
        display: flex;
        flex-flow: column nowrap;
        width: 100%;
        align-items: center;
    }

    .palette-canvas {
        box-shadow: 0 0 1px 1px var(--medium-shadow);
        width: 256px;
        &.stretch {
            width: 100%;
        }
        image-rendering: pixelated;
    }

    .selection {
        --x: 0;
        --y: 0;
        --width: 1;
        --height: 1;
        &.stretch {
            --left: 0px;
        }
        position: absolute;

        left: calc(var(--size) * var(--x) + var(--left));
        top: calc(var(--size) * var(--y));
        width: calc(var(--size) * var(--width));
        height: calc(var(--size) * var(--height));

        outline: 2px solid red;
        box-shadow: 0 0 4px 4px black;
        pointer-events: none;
    }

    .eraser-overlay {
        position: absolute;
        left: var(--left);
        top: 0;
        width: var(--size);
        height: var(--size);
        pointer-events: none;
        display: grid;
        place-content: center;

        iconify-icon {
            font-size: calc(var(--size) * 0.75);
            color: var(--weak-fg);
        }
    }

    .null-hider {
        position: absolute;
        background: var(--medium-bg);

        left: calc(var(--left) + (var(--size) * var(--hider-left)));
        bottom: -1px;

        width: calc(var(--size) * var(--hider-width) + 1px);
        height: calc(var(--size) + 2px);
        box-shadow: inset 1px 1px 1px 0 var(--medium-shadow);

        pointer-events: none;
    }
</style>
