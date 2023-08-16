<script lang="ts">
    import type { MapEditorContext } from "../MapEditor";
    import { getContext } from "svelte";
    import Input from "src/components/Input.svelte";

    const context: MapEditorContext = getContext("context");

    const data = context.data;
</script>

<div class="editor">
    <div class="toolbar">
        <div class="buttons" />
    </div>
    <div class="area">
        View
        <Input readonly value={$data.layout.map_data.width} />
        <Input readonly value={$data.layout.map_data.height} />
    </div>
</div>

<style lang="scss">
    .editor {
        height: 100%;

        display: grid;
        grid-template-rows: 36px minmax(0, 1fr);
        grid-template-areas: "toolbar" "area";

        overflow: hidden;

        .toolbar {
        }

        .area {
            grid-area: area;
        }
    }
</style>
