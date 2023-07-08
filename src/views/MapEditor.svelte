<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { MapEditorContext } from "./MapEditor";
    import LoadingScreen from "../components/LoadingScreen.svelte";
    import VerticalTabs from "./MapEditor/VerticalTabs.svelte";
    import LayoutEditor from "./MapEditor/LayoutEditor.svelte";
    import LevelEditor from "./MapEditor/LevelEditor.svelte";
    import ScriptsEditor from "./MapEditor/ScriptsEditor.svelte";
    import ConnectionsEditor from "./MapEditor/ConnectionsEditor.svelte";
    import HeaderEditor from "./MapEditor/HeaderEditor.svelte";

    export let context: MapEditorContext;
    setContext("context", context);
    setContext("data", context.data);

    $: isLoading = context.isLoading;

    let activeTab = "tab-layout";

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
        <VerticalTabs
            tabs={[
                {
                    title: "Header",
                    id: "tab-header",
                    icon: "mdi:file-document-edit-outline",
                },
                {
                    title: "Connections",
                    id: "tab-conns",
                    icon: "mdi:link",
                },
                {
                    title: "Scripts",
                    id: "tab-scripts",
                    icon: "mdi:script-text",
                },
                { title: "Level", id: "tab-level", icon: "mdi:map" },
                { title: "Layout", id: "tab-layout", icon: "mdi:grid" },
            ]}
            bind:activeTab
        />
        <div class="editor-container layout" class:hidden={activeTab !== "tab-layout"}>
            <LayoutEditor />
        </div>
        <div class="editor-container level" class:hidden={activeTab !== "tab-level"}>
            <LevelEditor />
        </div>
        <div class="editor-container scripts" class:hidden={activeTab !== "tab-scripts"}>
            <ScriptsEditor />
        </div>
        <div class="editor-container conns" class:hidden={activeTab !== "tab-conns"}>
            <ConnectionsEditor />
        </div>
        <div class="editor-container header" class:hidden={activeTab !== "tab-header"}>
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
        grid-template-columns: 32px 1fr;
        grid-template-areas: "tabs editor";
    }
    .editor-container {
        display: flex;
    }
    
</style>
