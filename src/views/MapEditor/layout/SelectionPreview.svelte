<script lang="ts">
    import { onMount } from "svelte";
    import type { SelectionMaterial } from "../editor/materials";

    export let selection: SelectionMaterial;
    export let showPermissions: boolean = false;

    $: showPermissions, redraw();

    let canvas: HTMLCanvasElement;

    function redraw() {
        if (!canvas) return;

        const { width, height } = selection.metatileCanvas;
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        if (showPermissions) {
            ctx.drawImage(
                selection.permissionCanvas,
                0,
                0,
                width * 2,
                height * 2
            );
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
    <canvas bind:this={canvas} />
</div>

<style lang="scss">
    $padding: 8px;

    .selection-preview {
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
</style>
