<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type { MapEditorData } from "src/views/MapEditor";
    import MapCanvas from "../editor/MapCanvas.svelte";

    export let editLevels: boolean;

    let data: Writable<MapEditorData> = getContext("data");
    let blocks = $data.layout.map_data;
</script>

<div class="container">
    <MapCanvas
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
