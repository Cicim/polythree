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
                    id: "tab-connections",
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
        />
        <LayoutEditor />
        <LevelEditor />
        <ScriptsEditor />
        <ConnectionsEditor />
        <HeaderEditor />
    </div>
{/if}

<style lang="scss">
    .loading {
        height: 100%;
    }
    .view {
        height: 100%;

        display: grid;
        grid-template-columns: min-width 1fr;
        grid-template-areas: "tabs editor";
    }
</style>
