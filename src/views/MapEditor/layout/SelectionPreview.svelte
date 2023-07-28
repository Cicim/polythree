<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { SelectionMaterial } from "../editor/materials";

    export let selection: SelectionMaterial;
    export let showLevels: boolean = false;

    let canvas: HTMLCanvasElement;

    onMount(() => {
        const { width, height } = selection.metatileCanvas;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(selection.metatileCanvas, 0, 0);

        if (showLevels)
            ctx.drawImage(selection.levelCanvas, 0, 0, width, height);
    });
</script>

<div class="selection-preview">
    <div class="title">Selected Blocks</div>
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
        grid-template-rows: 1em 1fr;

        .title {
            padding-left: $padding;
            font-size: 1rem;
        }

        .container {
            padding: $padding;
            overflow: hidden;
            text-align: center;

            :global(canvas) {
                max-width: 100%;
                max-height: calc(256px - 4 * $padding - 1em);
            }
        }
    }
</style>
