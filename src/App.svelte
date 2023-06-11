<script lang="ts">
  import { onMount } from "svelte";
  import TabBar from "./components/TabBar.svelte";
  import { HomePageContext } from "./views/HomePage";

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
</main>

<style type="scss">
  #container {
    display: grid;
    grid-template-rows: 40px 1fr;
  }
  #tabs {
    height: 40px;
    background: var(--tabs-bg);
    color: var(--tabs-fg);
  }
</style>
