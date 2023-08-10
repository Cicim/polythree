<script lang="ts">
    import ImagePreview from "src/components/ImagePreview.svelte";
    import type { TilesetsData } from "src/views/MapEditor";
    import type { BrushMaterial } from "src/views/MapEditor/editor/brushes";

    export let editingBrush: BrushMaterial;
    export let tilesetData: TilesetsData;

    async function load() {
        return editingBrush.createPreviewImage(tilesetData);
    }
</script>

<ImagePreview saveFileName="brush-preview" loadFunction={load} />
