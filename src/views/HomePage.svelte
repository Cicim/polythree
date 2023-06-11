<script lang="ts">
    import type { HomePageContext } from "./HomePage";
    import { MapEditorContext } from "./MapEditor";

    export let context: HomePageContext;
</script>

<h1>Welcome to Polythree!</h1>

<p>
    You can start by
    <!-- svelte-ignore a11y-missing-attribute -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <a on:click={() => new MapEditorContext(0, 0).select()}>opening a map</a>
</p>

<style type="scss">
</style>
