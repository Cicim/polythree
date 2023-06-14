<script lang="ts">
  import { onMount } from "svelte";
  import { HomePageContext } from "./views/HomePage";
  import TabBar from "./components/TopBar.svelte";
  import FootBar from "./components/FootBar.svelte";

  onMount(() => {
    new HomePageContext().select();
  });
</script>

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

<style type="scss">
  #container {
    display: grid;
    height: 100vh;
    grid-template-rows: 40px 1fr min-content;
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
