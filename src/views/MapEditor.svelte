<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type { MapEditorContext } from "./MapEditor";
    import MapEditorTabs from "./MapEditor/MapEditorTabs.svelte";
    import LoadingScreen from "../components/LoadingScreen.svelte";

    export let context: MapEditorContext;
    setContext("data", context.data);

    $: isLoading = context.isLoading;

    onMount(async () => {
        await context.load();
    });
</script>

{#if $isLoading}
    <LoadingScreen />
{:else}
    <MapEditorTabs />
{/if}

<style type="scss">
</style>
