<script lang="ts">
    import type { BrushMaterial } from "src/views/MapEditor/editor/materials";
    import Button from "src/components/Button.svelte";

    export let brush: BrushMaterial;
    export let close: (value: any) => void;
</script>

<div class="dialog-content">
    <div class="title">Brush Settings for <i>{brush.name}</i></div>
    <div class="content">Brush Settings...</div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Don't Apply</Button>
        <Button color="secondary" on:click={() => close(true)}>Apply</Button>
    </div>
</div>

<style lang="scss">
</style>
