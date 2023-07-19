<script lang="ts">
    import { getContext, onMount } from "svelte";
    import MapCanvas from "../editor/MapCanvas.svelte";
    import type { MapEditorData } from "src/views/MapEditor";
    import type { Writable } from "svelte/store";

    export let editLevels: boolean = false;

    let data: Writable<MapEditorData> = getContext("data");
    let blocks = $data.layout.map_data;
</script>

<div class="container">
    <MapCanvas {editLevels} {blocks} />
</div>

<style lang="scss">
    .container {
        display: grid;
        height: 100%;
    }
</style>
