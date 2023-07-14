<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { MapEditorContext } from "./MapEditor";
    import LoadingScreen from "../components/LoadingScreen.svelte";
    import VerticalTabs from "./MapEditor/VerticalTabs.svelte";
    import LayoutEditor from "./MapEditor/LayoutEditor.svelte";
    import LevelEditor from "./MapEditor/LevelEditor.svelte";
    import ScriptsEditor from "./MapEditor/ScriptsEditor.svelte";
    import EncountersEditor from "./MapEditor/EncountersEditor.svelte";
    import ConnectionsEditor from "./MapEditor/ConnectionsEditor.svelte";
    import HeaderEditor from "./MapEditor/HeaderEditor.svelte";

    export let context: MapEditorContext;
    setContext("context", context);
    setContext("data", context.data);

    $: isLoading = context.isLoading;

    let activeTab = context.selectedTab;

    // ANCHOR Bindings
    export function selectLayoutEditor() {
        context.changeTab("layout");
    }
    export function selectLevelEditor() {
        context.changeTab("level");
    }
    export function selectScriptsEditor() {
        context.changeTab("scripts");
    }
    export function selectEncountersEditor() {
        context.changeTab("encounters");
    }
    export function selectConnectionsEditor() {
        context.changeTab("connections");
    }
    export function selectHeaderEditor() {
        context.changeTab("header");
    }

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
            class:hidden={$activeTab !== "layout"}
        >
            <LayoutEditor />
        </div>
        <div
            class="editor-container level"
            class:hidden={$activeTab !== "level"}
        >
            <LevelEditor />
        </div>
        <div
            class="editor-container scripts"
            class:hidden={$activeTab !== "scripts"}
        >
            <ScriptsEditor />
        </div>
        <div
            class="editor-container encounters"
            class:hidden={$activeTab !== "encounters"}
        >
            <EncountersEditor />
        </div>
        <div
            class="editor-container connections"
            class:hidden={$activeTab !== "connections"}
        >
            <ConnectionsEditor />
        </div>
        <div
            class="editor-container header"
            class:hidden={$activeTab !== "header"}
        >
            <HeaderEditor />
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
        grid-template-columns: 36px 1fr;
        grid-template-areas: "tabs editor";
    }
    .editor-container {
        display: flex;
        overflow: hidden;
    }
</style>
