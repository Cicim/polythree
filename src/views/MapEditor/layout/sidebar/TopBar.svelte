<script lang="ts">
    import Button from "src/components/Button.svelte";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import { getContext } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";

    export let state: SidebarState;
    export let permissionMode: boolean;
    const context: MapEditorContext = getContext("context");
    const layoutLocked = context.layoutLocked;
</script>

<div
    class:hidden={permissionMode || state !== SidebarState.Palette}
    class="topbar-view"
>
    <Button theme="secondary" on:click={() => (state = SidebarState.Borders)}>
        <iconify-icon icon="mdi:border-all" width="1.5em" />
        {#if $layoutLocked}
            View Borders
        {:else}
            Borders
        {/if}
    </Button>
    {#if !$layoutLocked}
        <Button
            theme="secondary"
            on:click={() => (state = SidebarState.BrushList)}
        >
            <iconify-icon icon="mdi:format-list-bulleted" width="1.5em" />
            Brush List
        </Button>
    {/if}
    <Button theme="secondary">
        <iconify-icon icon="mdi:puzzle" width="1.5em" />
        Edit Tilesets
    </Button>
</div>

<style lang="scss">
    .topbar-view {
        background: var(--main-bg);
        height: min-content;
        display: flex;
        gap: 8px;
        padding: 8px;
        justify-content: space-evenly;

        > :global(.button) {
            margin: 0;
            padding: 0;
            display: flex;
            gap: 4px;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            flex: 1;
            height: 60px;
            text-align: center;
            white-space: normal;
        }
    }
</style>
