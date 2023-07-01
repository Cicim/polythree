<script lang="ts">
    import "iconify-icon";
    import { onMount, setContext } from "svelte";
    import type { MapListContext } from "./MapList";
    import LoadingScreen from "src/components/LoadingScreen.svelte";
    import Input from "src/components/Input.svelte";
    import Button from "src/components/Button.svelte";
    import { writable } from "svelte/store";
    import MapsContainer from "./MapList/MapsContainer.svelte";

    export let context: MapListContext;

    setContext("data", context.data);
    setContext("context", context);

    $: data = context.data;
    $: isLoading = context.isLoading;

    /** The content of the searchbar */
    let searchString = writable("");
    /** The container element for the map cards */
    let container: MapsContainer;
    /** The submit method for applying a search */
    function submitSearch() {
        container.setFilter($searchString);
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
            <Input
                on:submit={submitSearch}
                edits={searchString}
                placeholder="Search"
            />
            <Button on:click={submitSearch}>Search</Button>
        </div>
        <div class="list">
            <MapsContainer bind:this={container} filter="" />
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
        align-self: center;

        grid-template-areas:
            "search"
            "list";
    }

    .searchbar {
        grid-area: search;
        display: grid;
        flex-direction: column;
        grid-template-columns: 1fr minmax(0, min-content);

        z-index: 10;
        padding: 0.5em 1em;

        :global(> *) {
            padding: 0.5em 1em;
            font-size: inherit;
        }

        box-shadow: 0 2px 2px 0 var(--light-shadow);
    }

    .list {
        grid-area: list;
        overflow-y: auto;
        margin: 0 1em;
        &::-webkit-scrollbar {
            background: transparent;
            width: 10px;
        }
    }
</style>
