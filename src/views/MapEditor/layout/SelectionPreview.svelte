<script lang="ts">
    import { onMount } from "svelte";
    import type { SelectionMaterial } from "../editor/materials";

    export let selection: SelectionMaterial;
    export let showLevels: boolean = false;

    $: showLevels, redraw();

    let canvas: HTMLCanvasElement;

    function redraw() {
        if (!canvas) return;

        const { width, height } = selection.metatileCanvas;
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        if (showLevels) {
            ctx.drawImage(selection.levelCanvas, 0, 0, width * 2, height * 2);
        } else {
            ctx.drawImage(
                selection.metatileCanvas,
                0,
                0,
                width * 2,
                height * 2
            );
        }
    }

    onMount(redraw);
</script>

<div class="selection-preview">
    <div class="title">
        {#if showLevels}
            Selected Levels
        {:else}
            Selected Blocks
        {/if}
    </div>
    <div class="container">
        <canvas bind:this={canvas} />
    </div>
</div>

<style lang="scss">
    $padding: 8px;

    .selection-preview {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: calc(1em + 4px) 1fr;

        .title {
            padding: 2px;

            font-size: 14px;
            text-align: center;
            text-transform: uppercase;

            color: var(--weak-fg);
            background: var(--main-bg);
            border-bottom: 1px solid var(--light-shadow);
        }

        .container {
            padding: $padding;
            overflow: hidden;
            text-align: center;

            :global(canvas) {
                width: max-content;
                max-width: 100%;
                max-height: calc(256px - 4 * $padding - 1em);
                image-rendering: pixelated;
            }
        }
    }
</style>
