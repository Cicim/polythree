<script lang="ts">
    import "iconify-icon";
    import { onMount, setContext } from "svelte";
    import type { MapListContext } from "./MapList";
    import LoadingScreen from "src/components/LoadingScreen.svelte";
    import Input from "src/components/Input.svelte";
    import Button from "src/components/Button.svelte";
    import { writable, type Writable } from "svelte/store";

    export let context: MapListContext;

    setContext("data", context.data);
    setContext("context", context);

    $: data = context.data;
    $: isLoading = context.isLoading;

    let search: Writable<"primary"> = writable("primary");

    function resetSearchbar() {
        search.set("primary");
    }

    onMount(async () => {
        await context.load();
    });
</script>

{#if $isLoading}
    <LoadingScreen />
{:else}
    <div class="view">
        <div class="searchbar">
            <Input edits={search} placeholder="Search" />
            <Button bind:color={$search} on:click={resetSearchbar}>
                Search
            </Button>
            {$search}
        </div>
    </div>
{/if}

<style lang="scss">
    .view {
        display: grid;
        width: 100%;
        height: 100%;
        grid-template-columns: 1fr;
        grid-template-rows: min-content 1fr;

        grid-template-areas:
            "search"
            "list";
    }

    .searchbar {
        grid-area: search;
        display: grid;
        flex-direction: column;
        grid-template-columns: 1fr minmax(0, min-content);

        padding: 20px 40px;

        :global(> *) {
            padding: 0.5em 1em;
            font-size: inherit;
        }
    }
</style>
