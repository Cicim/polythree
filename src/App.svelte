<script lang="ts">
    import { onMount } from "svelte";
    import { handleKeydown } from "./systems/bindings";
    import { HomePageContext } from "./views/HomePage";

    import TabBar from "./components/app/TopBar.svelte";
    import FootBar from "./components/app/FootBar.svelte";
    import ContextMenu from "./components/app/ContextMenu.svelte";
    import PreviewWindow from "./components/app/PreviewWindow.svelte";
    import Tooltip from "./components/app/Tooltip.svelte";

    onMount(() => {
        setTimeout(() => {
            new HomePageContext().create().select();
        }, 100);
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
<Tooltip />

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
