<script lang="ts">
    import { getContext, onMount } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import MapCanvas from "../editor/MapCanvas.svelte";

    export let editPermissions: boolean;
    let mapCanvas: MapCanvas;
    const context: MapEditorContext = getContext("context");
    const layoutData = context.data.layout;
    const blocks = $layoutData.map_data;

    onMount(() => {
        // Update the map canvas
        context.map.mainCanvas = mapCanvas;
    });
</script>

<div class="container">
    <MapCanvas
        bind:this={mapCanvas}
        allowAnimations={true}
        {editPermissions}
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
