<svelte:options accessors />

<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { MapEditorContext } from "./MapEditor";
    import LoadingScreen from "../components/LoadingScreen.svelte";
    import VerticalTabs from "./MapEditor/VerticalTabs.svelte";
    import LayoutView from "./MapEditor/LayoutView.svelte";
    import EncountersView from "./MapEditor/EncountersView.svelte";
    import ConnectionsView from "./MapEditor/ConnectionsView.svelte";
    import HeaderView from "./MapEditor/HeaderView.svelte";
    import MapToolBar from "./MapEditor/MapToolBar.svelte";

    export let context: MapEditorContext;
    setContext("context", context);
    const data = context.data;
    setContext("data", data);

    const isLoading = context.loading;
    const layoutLocked = context.map.isLayoutLocked;

    $: context.tabs.layout.isLocked = $layoutLocked;
    $: context.tabs.permissions.isLocked = $layoutLocked;

    let activeTab = context.selectedTab;

    onMount(async () => {
        await context.load();
    });
</script>

{#if $isLoading}
    <div class="loading">
        <LoadingScreen />
    </div>
{:else}
    <div class="view">
        <VerticalTabs tabs={context.tabs} />
        <MapToolBar />
        <div
            class="editor-container layout"
            class:hidden={$activeTab !== "layout" &&
                $activeTab !== "permissions" &&
                $activeTab !== "events"}
        >
            <LayoutView />
        </div>
        <div
            class="editor-container encounters"
            class:hidden={$activeTab !== "encounters"}
        >
            <EncountersView />
        </div>
        <div
            class="editor-container connections"
            class:hidden={$activeTab !== "connections"}
        >
            <ConnectionsView />
        </div>
        <div
            class="editor-container header"
            class:hidden={$activeTab !== "header"}
        >
            <HeaderView />
        </div>
    </div>
{/if}

<style lang="scss">
    .loading {
        height: 100%;
    }
    .view {
        height: 100%;

        display: grid;
        grid-template-rows: 36px minmax(0, 1fr);
        grid-template-columns: 36px minmax(0, 1fr);
        grid-template-areas: "tabs toolbar" "tabs editor";

        :global(.tabs) {
            grid-area: tabs;
        }

        .editor-container {
            grid-area: editor;
            height: 100%;
            overflow: hidden;
        }
    }
</style>
