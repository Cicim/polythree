<script lang="ts">
    import { onMount } from "svelte";
    import "iconify-icon";
    import TabBar from "./components/app/TopBar.svelte";
    import FootBar from "./components/app/FootBar.svelte";
    import ContextMenu from "./components/app/ContextMenu.svelte";
    import { handleKeydown } from "./systems/bindings";
    import PreviewWindow from "./components/app/PreviewWindow.svelte";
    import { HomePageContext } from "./views/HomePage";

    onMount(() => {
        new HomePageContext().create().select();
    });
</script>

<svelte:body on:keydown={handleKeydown} />

<!-- Page container -->
<main id="container">
    <!-- Tabs -->
    <header id="tabs">
        <TabBar />
    </header>
    <!-- Editors -->
    <div id="views" />
    <footer id="footbar">
        <FootBar />
    </footer>
</main>
<ContextMenu />
<PreviewWindow />

<style lang="scss">
    #container {
        display: grid;
        height: 100vh;
        grid-template-rows: 40px minmax(0, 1fr) min-content;
    }
    #views {
        height: 100%;
    }
    #tabs {
        height: 40px;
        background: var(--tabs-bg);
        color: var(--tabs-fg);
    }
    #footbar {
        height: 24px;
        background: var(--tabs-bg);
    }
</style>
