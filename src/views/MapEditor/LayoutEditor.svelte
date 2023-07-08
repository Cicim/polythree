<script lang="ts">
    import { getContext } from "svelte";
    import type { MapEditorContext } from "../MapEditor";
    import MapPreview from "../MapList/MapPreview.svelte";

    export const bindings: Record<string, Function> = {
        "layout_editor/pick_pencil": () => {
            console.log("Pencil");
        },
    };
    const context: MapEditorContext = getContext("context");
</script>

<div class="editor">
    <MapPreview group={context.identifier.group} index={context.identifier.index} />
</div>

<style lang="scss">
    .editor {
        display: grid;
        width: 100%;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
    }
</style>
