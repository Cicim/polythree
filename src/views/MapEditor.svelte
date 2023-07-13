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

    let layoutComponent: LayoutEditor;
    let levelComponent: LevelEditor;
    let scriptsComponent: ScriptsEditor;
    let encountersComponent: EncountersEditor;
    let connectionsComponent: ConnectionsEditor;
    let headerComponent: HeaderEditor;

    let activeTab = "tab-layout";
    let tabsComponent: VerticalTabs;
    let tabs: any;

    // ANCHOR Bindings
    export function selectLayoutEditor() {
        tabsComponent.changeTab("tab-layout");
    }
    export function selectLevelEditor() {
        tabsComponent.changeTab("tab-level");
    }
    export function selectScriptsEditor() {
        tabsComponent.changeTab("tab-scripts");
    }
    export function selectEncountersEditor() {
        tabsComponent.changeTab("tab-encounters");
    }
    export function selectConnectionsEditor() {
        tabsComponent.changeTab("tab-connections");
    }
    export function selectHeaderEditor() {
        tabsComponent.changeTab("tab-header");
    }

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
            "tab-encounters": {
                title: "Encounters",
                icon: "mdi:account-group",
                component: encountersComponent,
            },
            "tab-connections": {
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
    });
</script>

{#if $isLoading}
    <div class="loading">
        <LoadingScreen />
    </div>
{:else}
    <div class="view">
        <VerticalTabs bind:this={tabsComponent} {tabs} bind:activeTab />
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
            class="editor-container encounters"
            class:hidden={activeTab !== "tab-encounters"}
        >
            <EncountersEditor bind:this={encountersComponent} />
        </div>
        <div
            class="editor-container connections"
            class:hidden={activeTab !== "tab-connections"}
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
        overflow: hidden;
    }
</style>
