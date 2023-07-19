<script lang="ts">
    import { getContext, onMount } from "svelte";
    import MapEditor from "../editor/MapEditor.svelte";
    import type { BlockData } from "../editor/brushes";
    import type { MapEditorData } from "src/views/MapEditor";
    import type { Writable } from "svelte/store";

    export let editLevels: boolean = false;

    let data: Writable<MapEditorData> = getContext("data");
    let blocks = $data.layout.map_data;
    console.log($data);
</script>

<div class="container">
    <MapEditor {editLevels} {blocks} />
</div>

<style lang="scss">
    .container {
        display: grid;
        height: 100%;
    }
</style>
