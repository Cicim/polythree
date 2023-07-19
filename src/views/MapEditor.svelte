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

    export let context: MapEditorContext;
    setContext("context", context);
    setContext("data", context.data);

    $: isLoading = context.isLoading;

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
        <div
            class="editor-container layout"
            class:hidden={$activeTab !== "layout" &&
                $activeTab !== "level" &&
                $activeTab !== "scripts"}
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
        grid-template-columns: 36px minmax(0, 1fr);
        grid-template-areas: "tabs editor";
    }
    .editor-container {
        height: 100%;
        overflow: hidden;
    }
</style>
