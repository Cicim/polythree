<script lang="ts">
    import "iconify-icon";
    import { onMount, setContext } from "svelte";
    import {
        GroupCriteria,
        groupCriteriaTable,
        type MapListContext,
    } from "./MapList";
    import LoadingScreen from "src/components/LoadingScreen.svelte";
    import Input from "src/components/Input.svelte";
    import Button from "src/components/Button.svelte";
    import { writable } from "svelte/store";
    import MapsContainer from "./MapList/MapsContainer.svelte";
    import {
        IconOption,
        Menu,
        showContextMenu,
    } from "src/systems/context_menu";

    export let context: MapListContext;
    let data = context.data;

    setContext("data", context.data);
    setContext("context", context);

    $: isLoading = context.isLoading;

    /** The content of the searchbar */
    let searchString = writable("");
    /** The current grouping criteria */
    let criteria: GroupCriteria = GroupCriteria.Group;
    /** The current filter string */
    let filter: string = "";
    /** The submit method for applying a search */
    function submitSearch() {
        filter = $searchString;
    }

    let contextMenu: Menu;

    onMount(async () => {
        await context.load();

        contextMenu = new Menu([
            new IconOption("Refresh View", "mdi:refresh", "maplist/refresh"),
        ]);
    });
</script>

{#key $data}
    {#if $isLoading}
        <LoadingScreen />
    {:else}
        <div
            class="view"
            on:contextmenu={(e) => showContextMenu(e, contextMenu)}
        >
            <div class="topbar">
                <div class="searchbar">
                    <Input
                        on:submit={submitSearch}
                        edits={searchString}
                        placeholder="Search"
                    />
                    <Button color="secondary" on:click={submitSearch}
                        >Search</Button
                    >
                </div>
                <div class="filters">
                    {#each Object.values(groupCriteriaTable) as groupCriteria, i}
                        <Button
                            pressed={criteria === i}
                            on:click={() => {
                                criteria = i;
                            }}
                        >
                            {groupCriteria.name}
                        </Button>
                    {/each}
                    <!-- <Button><iconify-icon icon="mingcute:down-line" /></Button> -->
                </div>
            </div>
            <div class="list">
                <MapsContainer bind:criteria bind:filter />
            </div>
        </div>
    {/if}
{/key}

<style lang="scss">
    .view {
        display: grid;
        width: 100%;
        height: 100%;
        grid-template-columns: 1fr;
        grid-template-rows: min-content 1fr;
        align-self: center;

        grid-template-areas:
            "top"
            "list";
    }

    .topbar {
        display: grid;
        grid-area: top;

        padding: 0.5em 1em;
        z-index: 10;
        box-shadow: 0 2px 2px 0 var(--light-shadow);

        .searchbar {
            display: grid;
            flex-direction: column;
            grid-template-columns: 1fr minmax(0, min-content);

            :global(> *) {
                padding: 0.5em 1em;
                font-size: inherit;
            }
        }

        .filters {
            place-self: center;
            padding: 0.5em;
            padding-bottom: 0;
            display: flex;
        }
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
