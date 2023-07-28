<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { getContext, onDestroy } from "svelte";
    import MapCanvas from "../editor/MapCanvas.svelte";

    const context: MapEditorContext = getContext("context");
    const data = context.data;

    let blocks: BlockData[][] = null;

    const unsubscribeFromData = data.subscribe((value) => {
        const numTiles = value.tilesets.length;

        // Generate the block data for this tileset
        const blockData = [];
        for (let y = 0; y < Math.ceil(numTiles / 8); y++) {
            blockData[y] = [];
            for (let x = 0; x < 8; x++) {
                const metatile = y * 8 + x;
                if (metatile > numTiles) continue;
                blockData[y][x] = [metatile, (x + y) % 8];
            }
        }

        blocks = blockData;
    });

    onDestroy(() => {
        unsubscribeFromData();
    });
</script>

<div class="palette">
    <div class="canvas-container">
        <MapCanvas
            {blocks}
            editLevels={true}
            nullLevels={true}
            chunkSize={8}
            allowPan={false}
            allowZoom={false}
            constantWidth={512}
        />
    </div>
</div>

<style lang="scss">
    .palette {
        padding: 18px;
        overflow-y: auto;
    }

    :global(canvas) {
        width: 100%;
        image-rendering: pixelated;
    }
</style>
