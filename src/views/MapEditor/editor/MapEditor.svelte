<script lang="ts">
    import { watchResize } from "svelte-watch-resize";
    import { onMount, tick } from "svelte";

    let containerEl: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    /** Width of the canvas in pixels */
    let canvasWidth: number;
    /** Height of the canvas in pixels */
    let canvasHeight: number;

    // ANCHOR Draw
    /**
     * Draw a full frame of the canvas from scratch.
     */
    function draw() {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw a gray outline
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

        // Construct a size string with \times (but Unicode)
        const sizeString = `${canvasWidth} \u00D7 ${canvasHeight}`;

        // Draw the size string
        ctx.font = "36px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "black";
        ctx.fillText(sizeString, canvasWidth / 2, canvasHeight / 2);
    }

    function updateSize() {
        canvasWidth = containerEl.clientWidth;
        canvasHeight = containerEl.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        draw();
    }

    // ANCHOR Event handlers
    onMount(() => {
        ctx = canvas.getContext("2d");
        updateSize();
    });
</script>

<svelte:window on:resize={updateSize} />

<div
    class="canvas-container"
    bind:this={containerEl}
    use:watchResize={updateSize}
>
    <canvas on:click={updateSize} bind:this={canvas} />
</div>

<style lang="scss">
    .canvas-container {
        display: grid;
        height: 100%;
        overflow: hidden;
        max-height: 100%;
    }
</style>
