<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { MapEditorContext } from "./MapEditor";
    import MapEditorTabs from "./MapEditor/MapEditorTabs.svelte";
    import LoadingScreen from "../components/LoadingScreen.svelte";
    import Select from "src/components/Select.svelte";
    import { writable } from "svelte/store";

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

    let value = "1";
</script>

<div class="view">
    <Select
        bind:value
        options={[
            ["0", "Zero"],
            ["1", "One"],
            ["2", "Two"],
            ["3", "Three"],
            ["4", "Four"],
        ]}
    />
    {value}

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
</div>

<style lang="scss">
    .view {
        height: 100%;
    }
</style>
