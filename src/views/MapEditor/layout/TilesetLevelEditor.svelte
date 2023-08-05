<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { getContext } from "svelte";
    import MapCanvas from "../editor/MapCanvas.svelte";

    const context: MapEditorContext = getContext("context");
    const blocksStore = context.tilesetBlocks;
</script>

padding-bottom: 100px;
<div class="palette">
    <div class="canvas-container">
        <MapCanvas
            blocks={$blocksStore}
            changes={context.tilesetLevelChanges}
            editLevels={true}
            nullLevels={true}
            chunkSize={8}
            allowPan={false}
            allowZoom={false}
            constantWidth={512}
            nullBlocks={true}
        />
    </div>
</div>

<style lang="scss">
    .palette {
        padding: 18px;
        overflow-y: auto;
    }

    .canvas-container {
        :global(canvas) {
            width: 100%;
            image-rendering: pixelated;
        }
    }
</style>
