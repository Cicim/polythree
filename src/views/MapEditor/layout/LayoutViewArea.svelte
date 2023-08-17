<script lang="ts">
    import { getContext, onMount } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import MapCanvas from "../editor/MapCanvas.svelte";

    export let editLevels: boolean;
    let mapCanvas: MapCanvas;
    const context: MapEditorContext = getContext("context");
    const data = context.data;
    const blocks = $data.layout.map_data;

    onMount(() => {
        // Update the map canvas
        context.map.mainCanvas = mapCanvas;
    });
</script>

<div class="container">
    <MapCanvas
        bind:this={mapCanvas}
        {editLevels}
        {blocks}
        mainCanvas={true}
        resizeOptions={{
            border: 4,
            maxWidth: 255,
            maxHeight: 255,
            maxArea: 0x2800,
        }}
        debug={true}
    />
</div>

<style lang="scss">
    .container {
        display: grid;
        height: 100%;
    }
</style>
