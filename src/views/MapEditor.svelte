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
    import { openViews } from "src/systems/views";
    import { get, type Writable } from "svelte/store";

    export let context: MapEditorContext;
    const data = context.data;
    setContext("context", context);
    setContext("data", data);

    const isLoading = context.isLoading;
    const layoutLocked = context.layoutLocked;

    function updateLayoutLock() {
        if ($isLoading) return;

        $layoutLocked = context.anyOtherViewWhere($openViews, (view) => {
            const thisLayoutIndex = $data.layout.index;

            if (get(view.isLoading)) return false;

            const viewLayoutIndex = get(view.data as Writable<any>).layout
                .index;
            const viewUnlocked = !get(view.layoutLocked);

            return thisLayoutIndex === viewLayoutIndex && viewUnlocked;
        });
    }

    // Update the lock as soon as the
    $: $isLoading === false, updateLayoutLock();
    $: $openViews, updateLayoutLock();

    $: context.tabs.layout.isLocked = $layoutLocked;
    $: context.tabs.level.isLocked = $layoutLocked;

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
