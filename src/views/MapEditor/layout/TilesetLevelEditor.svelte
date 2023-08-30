<script lang="ts">
    import { getContext, onMount } from "svelte";
    import type { BlocksChangedEvent, BlocksData } from "../editor/blocks_data";
    import type { MapEditorContext } from "src/views/MapEditor";
    import MapCanvas from "../editor/MapCanvas.svelte";

    let component: MapCanvas;

    const context: MapEditorContext = getContext("context");
    const blocksStore = context.palette.blocks;

    function onBlocksChanged({
        detail: { blocks, anyChanges },
    }: BlocksChangedEvent) {
        // Synchronize the changes with the other editors
        if (anyChanges) context.palette.synchronizeChanges(blocks);
    }

    onMount(() => {
        // Update the mapCanvas for the tilesetPermissions
        context.palette.mapCanvas.set(component);
    });
</script>

<div class="palette">
    <div class="canvas-container">
        <MapCanvas
            blocks={$blocksStore}
            changes={context.palette.changes}
            editPermissions={true}
            nullPermissions={true}
            chunkSize={8}
            allowPan={false}
            allowZoom={false}
            constantWidth={512}
            nullBlocks={true}
            on:blockschanged={onBlocksChanged}
            bind:this={component}
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
