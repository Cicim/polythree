<script lang="ts">
    import { getContext, onMount } from "svelte";
    import type { Writable } from "svelte/store";

    import type { MapCardProps } from "../MapList";
    import MapCard from "./MapCard.svelte";

    /** The data from which this component gets the info about the cards */
    const allCards: Writable<MapCardProps[]> = getContext("data");
    /** Maps separated by group from the output of a search or filter operation */
    let groups: MapGroup[] = [];

    interface MapGroup {
        name: string;
        maps: MapCardProps[];
    }

    export let filter: string;

    export function setFilter(value: string) {
        filter = value;
        updateCards();
    }

    // Groups the cards into MapGroups depending on the predicate
    // which returns the group name each map belongs to
    function groupTogether(
        cards: MapCardProps[],
        predicate: (card: MapCardProps) => string,
        nameTransform?: (name: string) => string
    ) {
        let groups: MapGroup[] = [];

        for (let card of cards) {
            let groupName = predicate(card);
            let group = groups.find((g) => g.name === groupName);

            if (group) {
                group.maps.push(card);
            } else {
                groups.push({
                    name: groupName,
                    maps: [card],
                });
            }
        }

        if (nameTransform) {
            for (let group of groups) {
                group.name = nameTransform(group.name);
            }
        }

        return groups;
    }

    function updateCards() {
        groups = groupTogether(
            $allCards,
            (card) => card.group.toString(),
            (group) => `Group #${group}`
        );
    }

    onMount(() => {
        updateCards();
    });
</script>

<div class="maps-container">
    {#each groups as group (group.name)}
        <h2 class="separator">{group.name}</h2>
        {#each group.maps as card}
            <MapCard {...card} />
        {/each}
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
