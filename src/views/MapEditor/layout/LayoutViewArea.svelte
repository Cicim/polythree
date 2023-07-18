<script lang="ts">
    import { getContext, onMount } from "svelte";
    import MapEditor from "../editor/MapEditor.svelte";
    import type { BlockData } from "../editor/brushes";
    import type { MapEditorData } from "src/views/MapEditor";
    import type { Writable } from "svelte/store";

    export let editLevels: boolean = false;

    let data: Writable<MapEditorData> = getContext("data");
    let mapData = $data.layout.map_data;

    let blocks: BlockData[][] = new Array(mapData.length);

    // Convert blocks from mapData
    for (let y = 0; y < mapData.length; y++) {
        blocks[y] = new Array(mapData[y].length);

        for (let x = 0; x < mapData[y].length; x++) {
            const block = mapData[y][x];

            // Extract the tile and level data with bitwise operations
            const tileBits = block & 0x3ff;
            const levelBits = (block >> 10) & 0x3f;

            // Extract the level and obstacle bits from the level to reformat it
            const level = levelBits >> 1;
            const obstacle = levelBits & 0x1;

            // Push the block data to the blocks array
            blocks[y][x] = [tileBits, (obstacle << 8) | level];
        }
    }

    blocks = blocks;
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
