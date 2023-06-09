<script lang="ts">
    import "iconify-icon";
    import { onMount, setContext, tick } from "svelte";
    import {
        GroupCriteria,
        groupCriteriaTable,
        type CreateMapOptions,
        type MapCardProps,
        type MapGroup,
        type MapId,
        type MapListContext,
        type MapSelectionEvent,
    } from "./MapList";
    import LoadingScreen from "src/components/LoadingScreen.svelte";
    import Input from "src/components/Input.svelte";
    import Button from "src/components/Button.svelte";
    import MapsContainer from "./MapList/MapsContainer.svelte";
    import {
        IconOption,
        Menu,
        Separator,
        TextOption,
        showContextMenu,
    } from "src/systems/context_menu";
    import MapInfo from "./MapList/MapInfo.svelte";
    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import { spawnDialog } from "src/systems/dialogs";
    import DeleteMapDialog from "./MapList/DeleteMapDialog.svelte";
    import { openViews } from "src/systems/views";
    import { MapEditorContext } from "./MapEditor";
    import CloseViewsDialog from "../components/dialog/CloseViewsDialog.svelte";
    import CreateMapDialog from "./MapList/CreateMapDialog.svelte";

    export let context: MapListContext;
    let data = context.data;

    setContext("data", context.data);
    setContext("context", context);

    $: isLoading = context.isLoading;
    $: mapInfoOpen = true;

    /** The content of the searchbar */
    let searchString = "";
    /** The current grouping criteria */
    let criteria: GroupCriteria = GroupCriteria.Group;
    let allCards: MapCardProps[];
    /** The list of selected cards */
    let selectedCards: { [group: number]: { [index: number]: boolean } } = {};
    let selectedMaps: MapId[] = [];
    let selectedCount: number = 0;
    let lastSelected: MapId = null;
    let groups: MapGroup[] = [];

    /** The submit method for applying a search */
    function submitSearch() {
        mapsContainer.doSearch(searchString);
    }

    let contextMenu: Menu;

    function addMapToSelection(group: number, index: number) {
        if (!selectedCards[group]) selectedCards[group] = {};
        selectedCards[group][index] = true;
        selectedMaps.push({ group, index });
        selectedCount++;
    }
    function removeMapFromSelection(group: number, index: number) {
        if (!selectedCards[group]) selectedCards[group] = {};
        selectedCards[group][index] = false;
        selectedMaps = selectedMaps.filter(
            (m) => m.group !== group || m.index !== index
        );

        // If the last selected card was removed, set the last selected to null
        if (lastSelected?.group === group && lastSelected?.index === index)
            lastSelected = null;

        selectedCount--;
    }
    function clearMapSelection() {
        selectedCards = {};
        selectedCount = 0;
        selectedMaps = [];
    }
    function selectInStraightLine(group: number, index: number) {
        if (lastSelected === null) return;

        const [from, to] = [lastSelected, { group, index }].sort(
            (a, b) => a.group - b.group || a.index - b.index
        );

        // Find the `from` maps from the from group and index
        const fromGroup = groups.find((g) =>
            g.maps.find((m) => m.group === from.group && m.index === from.index)
        );
        const fromGroupIndex = groups.findIndex((g) =>
            g.maps.find((m) => m.group === from.group && m.index === from.index)
        );
        const fromMapIndex = fromGroup.maps.findIndex(
            (m) => m.group === from.group && m.index === from.index
        );
        // Find the `to` maps from the to group and index
        const toGroup = groups.find((g) =>
            g.maps.find((m) => m.group === to.group && m.index === to.index)
        );
        const toGroupIndex = groups.findIndex((g) =>
            g.maps.find((m) => m.group === to.group && m.index === to.index)
        );
        const toMapIndex = toGroup.maps.findIndex(
            (m) => m.group === to.group && m.index === to.index
        );

        // Select all the maps in between
        for (let i = fromGroupIndex; i <= toGroupIndex; i++) {
            const group = groups[i];
            const start = i === fromGroupIndex ? fromMapIndex : 0;
            const end = i === toGroupIndex ? toMapIndex : group.maps.length - 1;

            for (let j = start; j <= end; j++) {
                addMapToSelection(group.maps[j].group, group.maps[j].index);
            }
        }
    }

    function selectMap({
        detail: { group, index, ctrlKey, shiftKey },
    }: {
        detail: MapSelectionEvent;
    }) {
        /** True if the clicked card is currently selected */
        let selected = selectedCards[group]?.[index] ?? false;
        let inMultiselection = selectedCount > 1;

        // If no extra key is pressed
        if (ctrlKey) {
            if (selected) removeMapFromSelection(group, index);
            else addMapToSelection(group, index);
            lastSelected = { group, index };
            selectedMaps = [...selectedMaps];
        } else if (shiftKey) {
            clearMapSelection();
            selectInStraightLine(group, index);
        } else {
            if (!selected || (selected && inMultiselection)) {
                clearMapSelection();
                addMapToSelection(group, index);
            } else {
                removeMapFromSelection(group, index);
            }
            lastSelected = { group, index };
        }
    }

    export async function deleteCards(cards: MapId[]) {
        if (cards.length === 0) return;

        // Check if any MapId is an open MapEditor
        const viewsToClose = [];
        for (const view of $openViews) {
            if (view instanceof MapEditorContext) {
                const map = view.identifier;
                if (
                    cards.find(
                        (m) => m.group === map.group && m.index === map.index
                    )
                ) {
                    viewsToClose.push(view);
                }
            }
        }

        if (viewsToClose.length > 0) {
            const res = await spawnDialog(CloseViewsDialog, {
                title: "Close open Map Editors",
                views: viewsToClose,
            });

            if (!res) return;
        }
        await spawnDialog(DeleteMapDialog, {
            toDelete: cards,
            all: allCards,
            context,
        });
    }
    export async function createMap(options: CreateMapOptions = {}) {
        const res = await spawnDialog(CreateMapDialog, {
            options,
            all: allCards,
            context,
        });
    }

    let mapsContainer: MapsContainer;
    /** Removes the last deleted cards from the container */
    export function removeDeleted(deleted: MapId[]) {
        mapsContainer.remove(deleted);
    }
    /** Adds a card into the contaienr once it's created for the first time */
    export async function addCreated(card: MapCardProps) {
        clearMapSelection();
        mapsContainer.add(card);
        // Select the card
        addMapToSelection(card.group, card.index);
    }

    export function deleteSelected() {
        deleteCards(selectedMaps);
    }

    export async function deleteCard(group: number, index: number) {
        deleteCards([{ group, index }]);
    }

    let searchBarEl: HTMLDivElement;
    export function focusSearch(clear: boolean = false) {
        const input = searchBarEl.querySelector("input");
        if (input) input.focus();
        if (clear) {
            searchString = "";
            submitSearch();
        }
    }

    export function getMultiOptions() {
        if (selectedCount < 1) return [];
        return [
            new Separator("All Selected Maps (" + selectedCount + ")"),
            new IconOption("Delete", "mdi:delete", "maplist/delete_selected"),
        ];
    }

    export async function refresh() {
        await context.load();
        await tick();
        allCards = $data;
        mapsContainer.init(allCards, criteria);
    }

    let containerEl: HTMLDivElement;
    function onClickOutsideCard(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (
            event.ctrlKey ||
            event.shiftKey ||
            (target !== containerEl && target !== containerEl.children[0])
        )
            return;

        clearMapSelection();
    }

    onMount(async () => {
        await context.load();
        await tick();
        allCards = $data;

        contextMenu = new Menu([
            new IconOption("Refresh View", "mdi:refresh", "maplist/refresh"),
            new Separator(),
            new TextOption("Create Map", "maplist/new_map"),
        ]);

        mapsContainer.init(allCards, criteria);
    });
</script>

{#key $data}
    {#if $isLoading}
        <LoadingScreen />
    {:else}
        <div
            class="view"
            class:show-info={mapInfoOpen}
            on:contextmenu={(e) => showContextMenu(e, contextMenu)}
        >
            <div class="topbar">
                <ClickableIcons
                    size="1em"
                    vertical_alignment="bottom"
                    icons={[
                        {
                            text: "Toggle Map Info",
                            onclick: () => {
                                mapInfoOpen = !mapInfoOpen;
                            },
                            icon: mapInfoOpen
                                ? "material-symbols:visibility-off"
                                : "material-symbols:visibility",
                        },
                    ]}
                />

                <div class="searchbar" bind:this={searchBarEl}>
                    <Input
                        on:submit={submitSearch}
                        bind:value={searchString}
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
                                mapsContainer.doGrouping(criteria);
                            }}
                        >
                            {groupCriteria.name}
                        </Button>
                    {/each}
                    <!-- <Button><iconify-icon icon="mingcute:down-line" /></Button> -->
                </div>
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="list"
                bind:this={containerEl}
                on:click={onClickOutsideCard}
            >
                <MapsContainer
                    on:select={selectMap}
                    removeFromSelection={removeMapFromSelection}
                    bind:this={mapsContainer}
                    bind:groups
                    bind:allCards
                    bind:selectedCards
                    bind:lastSelected
                />
            </div>
            {#if mapInfoOpen}
                <div class="sidebar">
                    <MapInfo bind:selectedMaps />
                </div>
            {/if}
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

        user-select: none;

        grid-template-areas:
            "top"
            "list";

        &.show-info {
            @media (min-width: 720px) {
                grid-template-columns: minmax(420px, 1fr) minmax(0, 400px);
                grid-template-rows: min-content 1fr;

                grid-template-areas:
                    "top top"
                    "list sidebar";

                .sidebar {
                    display: block;
                    box-shadow: -2px 0 2px 0 var(--light-shadow);
                }
            }
        }
    }

    .topbar {
        display: grid;
        grid-area: top;
        position: relative;

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

        > :global(.icons-container) {
            margin-right: 5px;
            margin-bottom: 5px;
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
        container-type: inline-size;

        &::-webkit-scrollbar {
            background: transparent;
            width: 10px;
        }
    }

    .sidebar {
        display: none;
        grid-area: sidebar;
        overflow-y: auto;
        overflow-x: hidden;

        &::-webkit-scrollbar {
            background: transparent;
            width: 10px;
        }
    }
</style>
