<script lang="ts">
    import { getContext } from "svelte";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import SelectionPreview from "../SelectionPreview.svelte";
    import { SelectionMaterial } from "../../editor/materials";

    export let levelMode: boolean;
    export let state: SidebarState;

    const context: MapEditorContext = getContext("context");
    const material = context.material;

    $: selection =
        $material instanceof SelectionMaterial
            ? $material.isSingular
                ? null
                : $material
            : null;
</script>

<div
    class:hidden={selection === null ||
        (!levelMode && state === SidebarState.BrushList)}
    class="multi-selection-view"
>
    {#key selection}
        {#if selection !== null}
            <SelectionPreview {selection} showLevels={levelMode} />
        {/if}
    {/key}
</div>

<style lang="scss">
    .multi-selection-view {
        max-height: 25%;
        min-height: 20px;
    }
</style>
