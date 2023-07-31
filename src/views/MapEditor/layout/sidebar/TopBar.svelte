<script lang="ts">
    import Button from "src/components/Button.svelte";
    import { SidebarState } from "../LayoutSidebar.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;
</script>

<div
    class:hidden={levelMode || state !== SidebarState.Palette}
    class="topbar-view"
>
    <Button on:click={() => (state = SidebarState.Borders)}>
        <iconify-icon icon="mdi:border-all" width="1.5em" />
        Borders
    </Button>
    <Button on:click={() => (state = SidebarState.BrushList)}>
        <iconify-icon icon="mdi:format-list-bulleted" width="1.5em" />
        Brush List
    </Button>
    <Button>
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
