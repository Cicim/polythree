<script lang="ts">
    import TilesetLevelEditor from "../TilesetLevelEditor.svelte";

    export let levelMode: boolean;
</script>

<div class="tileset-level-editor-view" class:hidden={!levelMode}>
    <TilesetLevelEditor />
</div>

<style lang="scss">
    .tileset-level-editor-view {
        display: grid;
        flex: 4;
        border-bottom: none !important;
        overflow: hidden;
    }
</style>
