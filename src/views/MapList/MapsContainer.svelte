<script lang="ts">
    import {
        groupCriteriaTable,
        type GroupCriteria,
        type MapCardProps,
        type MapGroup,
        type SelectedCards,
        type MapId,
    } from "../MapList";
    import GroupSeparator from "./GroupSeparator.svelte";
    import MapCard from "./MapCard.svelte";

    /** The data from which this component gets the info about the cards */
    export let allCards: MapCardProps[];
    /** Maps separated by group from the output of a search or filter operation */
    export let groups: MapGroup[];
    /** The cards as were filtered since the last search */
    let filteredCards: MapCardProps[] = [];

    let filter: string = "";
    let criteria: GroupCriteria;
    export let selectedCards: SelectedCards;
    export let lastSelected: { group: number; index: number };
    export let removeFromSelection: (group: number, index: number) => void;

    /** Filters the cards based on the current filter string */
    function filterCards() {
        let match = filter.match(/#(\d+)(\.(\d+))?/);

        filteredCards = allCards.filter((card) => {
            // If the filter is empty, return all cards
            if (filter === "") return true;

            let valid = false;

            // If the text is an hashtag
            if (filter.startsWith("#")) {
                if (!match) return false;

                const group = +match[1];
                const index = +match[3];

                valid ||=
                    card.group === group &&
                    (isNaN(index) || card.index === index);
            }

            // If the card has a name, check if it matches the filter
            if (!valid && card.name) {
                valid ||= card.name
                    .toLowerCase()
                    .includes(filter.toLowerCase());
            }

            // If the text is a number, match the card's group
            if (!valid && !isNaN(parseInt(filter))) {
                valid ||= card.group === +filter;
            }

            return valid;
        });
    }

    /** Groups the cards into MapGroups depending on the predicate
        which returns the group name each map belongs to */
    function groupTogether(
        cards: MapCardProps[],
        predicate: (card: MapCardProps) => string
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

        return groups;
    }

    /** Returns true if the given (group, index) pair can be found
     * anywhere within the `groups`
     */
    function inGroup(card: { group: number; index: number }) {
        if (!card) return false;
        return groups.some((group) =>
            group.maps.some(
                (c) => c.group === card.group && c.index === card.index
            )
        );
    }

    /** Updates the groups based on the current grouping criteria
     * and updates the selection to match the new groups
     */
    export function update() {
        groups = groupTogether(
            filteredCards,
            groupCriteriaTable[criteria].predicate
        );

        // Keep only the cards in the selection that are in the results
        for (let group in selectedCards) {
            for (let index in selectedCards[group]) {
                if (!inGroup({ group: +group, index: +index })) {
                    removeFromSelection(+group, +index);
                }
            }
        }
        // If the last selected card is not in the results, reset it
        if (!inGroup(lastSelected)) lastSelected = null;
    }

    export function doGrouping(group: GroupCriteria) {
        criteria = group;
        update();
    }

    export function doSearch(filterString: string) {
        filter = filterString;
        filterCards();
        update();
    }

    export function remove(toRemove: MapId[]) {
        // Remove the deleted cards from the selection
        for (let { group, index } of toRemove) {
            removeFromSelection(group, index);
        }
        // Remove the deleted cards from all the cards
        allCards = allCards.filter(
            (c) =>
                !toRemove.find(
                    (r) => r.group === c.group && r.index === c.index
                )
        );
        // Remove the deleted cards from the filtered cards
        filteredCards = filteredCards.filter(
            (c) =>
                !toRemove.find(
                    (r) => r.group === c.group && r.index === c.index
                )
        );
        // Update the groups
        update();
    }

    export function add(card: MapCardProps) {
        allCards.push(card);
        filterCards();
        update();
    }

    export function init(cards: MapCardProps[], groupCriteria: GroupCriteria) {
        allCards = cards;
        filteredCards = allCards;
        criteria = groupCriteria;
        update();
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="maps-container">
    {#each groups as group}
        <GroupSeparator id={group.name} {criteria} />
        {#each group.maps as card ((card.group << 8) + card.index)}
            <MapCard
                on:select
                {...card}
                lastSelected={lastSelected !== null
                    ? lastSelected.group === card.group &&
                      lastSelected.index === card.index
                    : false}
                selected={selectedCards[card.group]?.[card.index] ?? false}
            />
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
        margin-top: 1em;
        margin-bottom: 2em;
        padding: 0 1em;

        .empty {
            grid-column: 1 / -1;
            text-align: center;
            margin-top: 2em;

            color: var(--weak-fg);
        }

        @container (min-width: 800px) {
            grid-template-columns: 1fr 1fr;
        }

        @container (min-width: 1200px) {
            grid-template-columns: 1fr 1fr 1fr;
        }

        @container (min-width: 1600px) {
            grid-template-columns: 1fr 1fr 1fr 1fr;
        }
    }
</style>
