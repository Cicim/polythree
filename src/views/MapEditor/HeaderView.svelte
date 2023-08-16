<script lang="ts">
    import type { MapEditorContext } from "../MapEditor";
    import { getContext } from "svelte";
    import Input from "src/components/Input.svelte";

    const context: MapEditorContext = getContext("context");

    const data = context.data;
</script>

<div class="editor">
    <Input readonly value={$data.layout.map_data.width} />
    <Input readonly value={$data.layout.map_data.height} />
</div>

<style lang="scss">
    .editor {
        height: 100%;
        overflow: hidden;
    }
</style>
