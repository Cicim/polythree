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
    import { Bindings } from "src/systems/bindings";

    export let context: MapEditorContext;
    setContext("context", context);
    setContext("data", context.data);

    $: isLoading = context.isLoading;

    let layoutComponent: LayoutEditor;
    let levelComponent: LevelEditor;
    let scriptsComponent: ScriptsEditor;
    let connectionsComponent: ConnectionsEditor;
    let headerComponent: HeaderEditor;

    let activeTab = "tab-layout";
    let tabs: any;

    export function getActiveBinding() {
        return tabs?.[activeTab]?.component?.bindings;
    }

    onMount(async () => {
        await context.load();

        tabs = {
            "tab-header": {
                title: "Header",
                icon: "mdi:file-document-edit-outline",
                component: headerComponent,
            },
            "tab-conns": {
                title: "Connections",
                icon: "mdi:link",
                component: connectionsComponent,
            },
            "tab-scripts": {
                title: "Scripts",
                icon: "mdi:script-text",
                component: scriptsComponent,
            },
            "tab-level": {
                title: "Level",
                icon: "mdi:map",
                component: levelComponent,
            },
            "tab-layout": {
                title: "Layout",
                icon: "mdi:grid",
                component: layoutComponent,
            },
        };

        // Register the bindings of the active tab the first time it's laoded
        Bindings.register(tabs[activeTab].component.bindings);
    });
</script>

{#if $isLoading}
    <div class="loading">
        <LoadingScreen />
    </div>
{:else}
    <div class="view">
        <VerticalTabs {tabs} bind:activeTab />
        <div
            class="editor-container layout"
            class:hidden={activeTab !== "tab-layout"}
        >
            <LayoutEditor bind:this={layoutComponent} />
        </div>
        <div
            class="editor-container level"
            class:hidden={activeTab !== "tab-level"}
        >
            <LevelEditor bind:this={levelComponent} />
        </div>
        <div
            class="editor-container scripts"
            class:hidden={activeTab !== "tab-scripts"}
        >
            <ScriptsEditor bind:this={scriptsComponent} />
        </div>
        <div
            class="editor-container conns"
            class:hidden={activeTab !== "tab-conns"}
        >
            <ConnectionsEditor bind:this={connectionsComponent} />
        </div>
        <div
            class="editor-container header"
            class:hidden={activeTab !== "tab-header"}
        >
            <HeaderEditor bind:this={headerComponent} />
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
