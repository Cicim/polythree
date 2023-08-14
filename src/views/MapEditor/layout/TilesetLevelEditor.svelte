<script lang="ts">
    import { getContext, onMount } from "svelte";
    import type { BlocksChangedEvent, BlocksData } from "../editor/blocks_data";
    import type { MapEditorContext } from "src/views/MapEditor";
    import MapCanvas from "../editor/MapCanvas.svelte";

    let component: MapCanvas;

    const context: MapEditorContext = getContext("context");
    const blocksStore = context.tilesetBlocks;

    function synchronizeChanges({
        detail: { blocks, anyChanges, timestamp },
    }: BlocksChangedEvent) {
        if (!anyChanges) return;

        let viewsSharingBothTilesets: MapEditorContext[] = [];
        let viewsSharingPrimaryTileset: MapEditorContext[] = [];
        let viewsSharingSecondaryTileset: MapEditorContext[] = [];

        // Loop through each MapEditor layout that shares the same tileset
        for (const view of context.getOtherViews()) {
            if (view.tileset1Offset === context.tileset1Offset) {
                if (view.tileset2Offset === context.tileset2Offset)
                    viewsSharingBothTilesets.push(view);
                else viewsSharingPrimaryTileset.push(view);
            } else if (view.tileset2Offset === context.tileset2Offset)
                viewsSharingSecondaryTileset.push(view);
        }

        // Update each mapEditor with the correct portion of the levels
        for (const view of viewsSharingBothTilesets) {
            view.tilesetBlocks.update((blocksData: BlocksData) => {
                blocksData.updateLevels(blocks.levels);
                return blocksData;
            });
        }
        for (const view of viewsSharingPrimaryTileset) {
            view.tilesetBlocks.update((blocksData: BlocksData) => {
                blocksData.updateLevels(blocks.levels, 0, view.tileset1Length);
                return blocksData;
            });
        }
        for (const view of viewsSharingSecondaryTileset) {
            view.tilesetBlocks.update((blocksData: BlocksData) => {
                blocksData.updateLevels(
                    blocks.levels,
                    view.tileset1Length,
                    view.tileset2Length
                );
                return blocksData;
            });
        }
    }

    onMount(() => {
        // Update the mapCanvas for the tilesetLevels
        context.tilesetMapCanvas.set(component);
    });
</script>

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
            on:blockschanged={synchronizeChanges}
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
