<script lang="ts">
    import ImagePreview from "src/components/ImagePreview.svelte";
    import type { TilesetData } from "src/views/MapEditor";
    import type { BrushMaterial } from "src/views/MapEditor/editor/brushes";

    export let editingBrush: BrushMaterial;
    export let tilesetData: TilesetData;

    async function load() {
        return editingBrush.createPreviewImage(tilesetData);
    }
</script>

<ImagePreview saveFileName="brush-preview" loadFunction={load} />
