<script lang="ts">
    import { getContext } from "svelte";
    import type { MapEditorContext } from "../MapEditor";
    import Select from "src/components/Select.svelte";

    export const bindings: Record<string, Function> = {
        "layout_editor/pick_pencil": () => {
            console.log("Pencil");
        },
    };
    const context: MapEditorContext = getContext("context");
</script>

<div class="editor">
    <Select
        options={[
            [1, "One"],
            [2, "Two"],
        ]}
        edits="selectable"
    />
</div>

<style lang="scss">
    .editor {
        width: 100%;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
    }
</style>
