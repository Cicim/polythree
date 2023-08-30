<script lang="ts">
    import { getContext } from "svelte";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import SelectionPreview from "../SelectionPreview.svelte";
    import { SelectionMaterial } from "../../editor/materials";

    export let permissionMode: boolean;
    export let state: SidebarState;

    const context: MapEditorContext = getContext("context");
    const material = context.material;
    const loadingPalette = context.palette.loading;

    $: selection =
        $material instanceof SelectionMaterial
            ? $material.isSingular
                ? null
                : $material
            : null;

    $: $loadingPalette === true
        ? ($material = context.palette.getMetatileZeroBrush())
        : null;
</script>

<div
    class:hidden={selection === null ||
        (!permissionMode && state === SidebarState.BrushList)}
    class="multi-selection-view"
>
    {#key selection}
        {#if selection !== null}
            <SelectionPreview {selection} showPermissions={permissionMode} />
        {/if}
    {/key}
</div>

<style lang="scss">
    .multi-selection-view {
        max-height: 25%;
        min-height: 20px;
    }
</style>
