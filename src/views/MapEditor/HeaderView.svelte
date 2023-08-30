<script lang="ts">
    import type { MapEditorContext } from "../MapEditor";
    import { getContext } from "svelte";
    import Input from "src/components/Input.svelte";
    import TextToolButton from "./TextToolButton.svelte";

    const context: MapEditorContext = getContext("context");

    const data = context.data;
</script>

<div class="editor">
    <div class="toolbar">
        <div class="buttons">
            <TextToolButton
                text="Change Layout"
                title="Change Layout"
                icon="mdi:grid"
                action="map_editor/change_layout"
            />
        </div>
    </div>
    <div class="area">
        <div class="readonly-info">Readonly</div>
        <div class="editable-fields">Editable</div>
    </div>
</div>

<style lang="scss">
    .editor {
        height: 100%;

        display: grid;
        grid-template-rows: 36px minmax(0, 1fr);
        grid-template-areas: "toolbar" "area";

        overflow: hidden;

        .area {
            grid-area: area;
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding: 0.5em;
        }
    }
</style>
