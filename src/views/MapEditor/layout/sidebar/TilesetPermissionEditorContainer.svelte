<script lang="ts">
    import { getContext } from "svelte";
    import TilesetLevelEditor from "../TilesetLevelEditor.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";

    export let permissionMode: boolean;

    const context: MapEditorContext = getContext("context");
    const loading = context.palette.loading;
</script>

{#if $loading}
    Loading...
{:else}
    <div class="tileset-level-editor-view" class:hidden={!permissionMode}>
        <TilesetLevelEditor />
    </div>
{/if}

<style lang="scss">
    .tileset-level-editor-view {
        display: grid;
        flex: 4;
        border-bottom: none !important;
        overflow: hidden;
    }
</style>
