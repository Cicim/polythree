<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { MapEditorContext } from "./MapEditor";
    import MapEditorTabs from "./MapEditor/MapEditorTabs.svelte";
    import LoadingScreen from "../components/LoadingScreen.svelte";

    export let context: MapEditorContext;
    setContext("context", context);
    setContext("data", context.data);

    $: isLoading = context.isLoading;

    onMount(async () => {
        await context.load();
    });

    let changes = context.changes;
    setInterval(() => {
        changes = context.changes;
    }, 1);
</script>

<br />
{#if $isLoading}
    <LoadingScreen />
{:else}
    <MapEditorTabs />
{/if}

Stack: {changes.top}
{#each changes.stack as change}
    <div
        style="border-top: {changes.stack.indexOf(change) === changes.top
            ? 1
            : 0}px solid white"
    >
        {change.toString()}
    </div>
{/each}

<style lang="scss">
</style>
