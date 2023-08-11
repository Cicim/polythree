<script lang="ts">
    import ImagePreview from "src/components/ImagePreview.svelte";
    import type { MapEditorContext, TilesetsData } from "src/views/MapEditor";
    import type { BrushMaterial } from "src/views/MapEditor/editor/brushes";
    import { getContext } from "svelte";

    export let editingBrush: BrushMaterial;
    const context: MapEditorContext = getContext("context");

    async function load() {
        return editingBrush.createPreviewImage(
            context.botTiles,
            context.topTiles
        );
    }
</script>

<ImagePreview saveFileName="brush-preview" loadFunction={load} />
