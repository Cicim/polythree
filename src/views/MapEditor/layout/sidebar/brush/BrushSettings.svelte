<script lang="ts">
    import type { BrushMaterial } from "src/views/MapEditor/editor/brushes";
    import Button from "src/components/Button.svelte";
    import type { Writable } from "svelte/store";

    export let brush: Writable<BrushMaterial>;
    export let close: (value: any) => void;

    /** The selected brush's type */
    // let brushType: string = brush.type;
</script>

<div class="dialog-content">
    <div class="title">Brush Settings for <i>{$brush.name}</i></div>
    <div class="content">Brush Settings...</div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Don't Apply</Button>
        <Button color="secondary" on:click={() => close(true)}>Apply</Button>
    </div>
</div>

<style lang="scss">
</style>
