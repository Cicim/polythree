<script lang="ts">
    import type { MapEditorContext, TilesetData } from "src/views/MapEditor";
    import { getContext, onMount } from "svelte";
    import { watchResize } from "svelte-watch-resize";
    import { PaletteMaterial, SelectionMaterial } from "../editor/materials";
    import { BlocksData, NULL } from "../editor/blocks_data";

    export let hoveringTile: number = null;
    export let selectedTile: number | [number, number, number] = null;
    export let fitToContainer: boolean = true;

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
    let paletteContainer: HTMLDivElement;

    // Currently selected tile
    let selectionStart: Point = { x: 0, y: 0 },
        selectionEnd: Point = { x: 0, y: 0 },
        // If you are multi selecting
        rightClicking: boolean = false;

    /** The first tile that was selected. Doesn't change after selection start */
    let firstSelection: Point = { x: 0, y: 0 };

    let lastTileSize: number;

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
                drawSelection();
                scrollToTile(y);
                selectedTile = tile;
            } else if (
                $material instanceof PaletteMaterial &&
                $material.isSingular &&
                $material.blocks.metatiles[0] === NULL
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

        // Get the left offset if fitToContainer is set
        const rect = paletteCanvas.getBoundingClientRect();
        // Get the container's width
        const containerWidth = paletteCanvas.parentElement.clientWidth;
        // Get the left offset
        const left = (containerWidth - rect.width) / 2;
        selectionDiv.style.setProperty("--left", `${left}px`);
    }

    function hideSelection() {
        selectionStart = { x: -100, y: 0 };
        selectionEnd = { x: -100, y: 0 };
        drawSelection();
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

        let blocks = new BlocksData(width, height);

        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                const tileIndex = blocks.index(x + i, y + j);

                if (tileIndex >= tilesets.length) {
                    blocks.set(i, j, NULL, NULL);
                } else {
                    blocks.set(
                        i,
                        j,
                        tilesetBlocks.getMetatile(x + i, y + j),
                        tilesetBlocks.getLevel(x + i, y + j)
                    );
                }
            }
        }
        $material = new PaletteMaterial(blocks);
    }

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
        firstSelection = { ...selectionStart };
        selectionEnd = { ...selectionStart };
        drawSelection();

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
            drawSelection();

            const { x, y, width, height } = sortSelection();
            // Update the multiselection tile
            const selectedStartTile = x + y * 8;
            if (isSingleSelection()) selectedTile = selectedStartTile;
            else selectedTile = [selectedStartTile, width, height];
        }
        hoveringTile = getTile(event).x + getTile(event).y * 8;
    }
    function onMouseUp(event: MouseEvent) {
        rightClicking = false;
        buildMaterial();
    }
    function onMouseLeave() {
        hoveringTile = null;
    }

    function onResized() {
        if (!paletteCanvas || !selectionDiv) return;
        // Get the canvas's rect width
        const rect = paletteCanvas.getBoundingClientRect();
        const width = rect.width;
        // Calculate the new tile size
        lastTileSize = width / 8;
        // Update the selection's position and size
        selectionDiv.style.setProperty("--size", `${lastTileSize}px`);

        drawSelection();
    }

    export function moveOnPalette(dirX: number, dirY: number, select: boolean) {
        if (selectionStart.x === -100) {
            selectionStart.x = 0;
            selectionStart.y = 0;
            selectionEnd.x = 0;
            selectionEnd.y = 0;
            drawSelection();
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
                if (selectionEnd.y !== Math.ceil(tilesets.length / 8) - 1)
                    selectionEnd.y++;
            }

            if (!select) {
                if (!multiselection) selectionStart.y = selectionEnd.y;
                else {
                    selectionStart = { ...firstSelection };
                    if (selectionStart.y !== Math.ceil(tilesets.length / 8) - 1)
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
        drawSelection();
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
        drawSelection();
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
            class="selection"
            bind:this={selectionDiv}
            class:stretch={fitToContainer}
        />
        <canvas
            class:stretch={fitToContainer}
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
        display: flex;
        flex-flow: column nowrap;
        width: 100%;
        align-items: center;
    }

    .palette-canvas {
        width: 256px;
        &.stretch {
            width: 100%;
        }
        image-rendering: pixelated;
    }

    .selection {
        --size: 32px;
        --x: 0;
        --y: 0;
        --width: 1;
        --height: 1;
        --left: 182px;
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
</style>
