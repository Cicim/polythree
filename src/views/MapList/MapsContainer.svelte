<script lang="ts">
    import { getContext, onMount } from "svelte";
    import MapCard from "./MapCard.svelte";

    /** The arguments to pass down to a MapCard */
    interface Card {
        /** The map group */
        group: number;
        /** The map index */
        index: number;
        /** The map name */
        name: string;
        // TODO Offset or other data
    }
    /** The filtered list of MapCards, interlaced with titles */
    let cards: Array<Card | string> = [
        "Group #0",
        { group: 0, index: 0, name: "Pallet Town" },
        { group: 0, index: 1, name: "Viridian Forest 1F" },
        "Group #1",
        { group: 1, index: 0, name: "Map 4" },
        { group: 1, index: 1, name: "Map 5" },
        { group: 1, index: 2, name: "Map 6" },
        "Group #2",
        { group: 2, index: 0, name: "Map 7" },
        { group: 2, index: 1, name: "Map 8" },
        { group: 2, index: 2, name: "Map 9" },
        "Group #3",
        { group: 3, index: 0, name: "Map 10" },
        { group: 3, index: 1, name: "Map 11" },
        { group: 3, index: 2, name: "Map 12" },
        "Group #4",
        { group: 4, index: 0, name: "Map 13" },
        { group: 4, index: 1, name: "Map 14" },
        { group: 4, index: 2, name: "Map 15" },
        "Group #5",
        { group: 5, index: 0, name: "Map 16" },
        { group: 5, index: 1, name: "Map 17" },
        { group: 5, index: 2, name: "Map 18" },
        "Group #6",
        { group: 6, index: 0, name: "Map 19" },
        { group: 6, index: 1, name: "Map 20" },
        { group: 6, index: 2, name: "Map 21" },
        "Group #7",
        { group: 7, index: 0, name: "Map 22" },
        { group: 7, index: 1, name: "Map 23" },
        { group: 7, index: 2, name: "Map 24" },
        "Group #8",
        { group: 8, index: 0, name: "Map 25" },
        { group: 8, index: 1, name: "Map 26" },
    ];

    /** The data from which this component gets the info about the cards */
    const data = getContext("data");

    export let filter: string;

    export function setFilter(value: string) {
        filter = value;
        updateCards();
    }

    function updateCards() {
        console.log("Updated the research", `'${filter}'`);
        // Update the cards
        cards = cards.filter((card) => {
            if (typeof card === "string") return true;
            return card.name.toLowerCase().includes(filter.toLowerCase());
        });
    }

    onMount(() => {
        updateCards();
    });
</script>

<div class="maps-container">
    {#each cards as card}
        {#if typeof card === "string"}
            <h2 class="separator">{card}</h2>
        {:else}
            <MapCard {...card} />
        {/if}
    {:else}
        <div class="empty">No maps found</div>
    {/each}
</div>

<style lang="scss">
    .maps-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1em;
        margin-right: 1em;
        margin-bottom: 2em;

        .empty {
            grid-column: 1 / -1;
            text-align: center;
            margin-top: 2em;

            color: var(--weak-fg);
        }

        .separator {
            font-weight: 400;
            color: var(--weak-fg);
            margin-left: 0.5em;

            grid-column: 1 / -1;
        }

        @media (min-width: 800px) {
            grid-template-columns: 1fr 1fr;
        }
        @media (min-width: 1200px) {
            grid-template-columns: 1fr 1fr 1fr;
        }
        @media (min-width: 1600px) {
            grid-template-columns: 1fr 1fr 1fr;
        }
    }
</style>
