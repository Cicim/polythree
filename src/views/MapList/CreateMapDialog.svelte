<script lang="ts">
    import Select from "src/components/Select.svelte";
    import {
        mapDumpToCardProps,
        type CreateMapOptions,
        type MapCardProps,
        type MapHeaderDump,
        type MapListContext,
    } from "../MapList";
    import { config, mapNames } from "src/systems/global";
    import Input from "src/components/Input.svelte";
    import Button from "src/components/Button.svelte";
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api";
    import CheckBox from "src/components/CheckBox.svelte";
    import ErrorDiv from "src/components/ErrorDiv.svelte";
    import WarningDiv from "src/components/WarningDiv.svelte";
    import { MapEditorContext } from "../MapEditor";

    enum State {
        /** When the dialog loads, before it's finished loading */
        Loading,
        /** When the use layout option is selected */
        Use,
        /** When the new layout option is selected */
        New,
        /** When the new map is being created */
        Creating,
        /** When the creation has terminated with an error */
        DoneError,
        /** When the creation has terminated with a success */
        Done,
    }

    /** The close function */
    export let close: (value: any) => void;

    /** The input options when you create the map */
    export let options: CreateMapOptions;
    /** The map list context from which the dialog was opened */
    export let context: MapListContext;
    /** The list of all mapcard data */
    export let all: MapCardProps[];

    /** The state */
    let state: State = State.Loading;
    /** The string of the error */
    let errorMessage: string;

    // ANCHOR Bound values
    /** Group of the new map */
    let group: number;
    /** Index of the new map */
    let index: number;
    // If building by layout
    /** Layout of the new map */
    let layout: string;
    // If creating new layout as well
    /** Name of new layout */
    let layoutName: string = "";
    /** Tileset 1 offset of new layout */
    let tileset1: number;
    /** Tileset 2 offset of new layout */
    let tileset2: number;
    /** Width of the new layout */
    let width: number = 20;
    /** Height of the new layout */
    let height: number = 20;
    /** If the user wants to open the map in the editor after creating it */
    let openInEditor: boolean = false;

    // ANCHOR Calculated values
    /** List of free indexes in each group */
    let availableIndexesForGroups: Record<number, number[]> = {};
    /** The group select's option */
    let groupOptions: [number, string][];
    /** The index select's option */
    let indexOptions: [number, string][];

    // From all maps, extract the used indexes from each group
    const usedIndexesForGroups: Record<
        number,
        Record<number, boolean>
    > = all.reduce((res, mapCard) => {
        // If the res doesn't have the group, create an empty object for it
        if (!res[mapCard.group]) res[mapCard.group] = {};
        // Add the index to the group
        res[mapCard.group][mapCard.index] = true;
        return res;
    }, {});

    // Loop though all the groups and add the inexces that
    // aren't being used to the list of available inexces
    for (let i = 0; i <= 255; i++) {
        let indexes = [];
        // If the group is used, add the unused inexces
        if (usedIndexesForGroups[i]) {
            for (let j = 0; j <= 255; j++) {
                if (!usedIndexesForGroups[i][j]) {
                    indexes.push(j);
                }
            }
        } else indexes = Array.from({ length: 256 }, (_, i) => i);

        availableIndexesForGroups[i] = indexes;
    }

    // Create the group options once
    groupOptions = Object.entries(availableIndexesForGroups).map(([group]) => [
        +group,
        group,
    ]);
    // Initialize the group value
    group = groupOptions[0][0];
    // Update it if the options specifies a group that is in the list of available ones
    if (
        options?.group !== undefined &&
        Object.keys(availableIndexesForGroups).includes(
            options.group.toString()
        )
    ) {
        group = options.group;
    }
    // Initialize the indexes
    updateIndexes();
    // Update the indexes when the group changes
    function updateIndexes() {
        indexOptions = availableIndexesForGroups[group].map((i: number) => [
            i,
            i.toString(),
        ]);
        index = indexOptions[0][0];
    }

    /** Condition for the OK button to become disabled */
    $: notAllGood =
        width * height > 0x2800 ||
        state === State.Creating ||
        (state === State.New && !layoutName.match(/^([\w|\d]+[\s]*\b)+$/));

    /** OK Button onclick */
    async function createMap() {
        const usingLayout = state === State.Use;
        // Start creating
        state = State.Creating;

        try {
            let options = usingLayout
                ? { Use: { layout } }
                : {
                      New: {
                          tileset1,
                          tileset2,
                          width,
                          height,
                          name: layoutName,
                      },
                  };
            let res: MapHeaderDump = await invoke("create_map", {
                group,
                index,
                layoutOptions: options,
            });

            // If you use a new layout, update the name too
            if (!usingLayout)
                config.update((config) => {
                    config.layout_names[res.header.map_layout_id + ""] =
                        layoutName;
                    return config;
                });

            // Get the map card's data
            let cardProps = mapDumpToCardProps(res, $mapNames);
            // Update the list
            context.component.addCreated(cardProps);
            // Close
            close(true);

            // Open the Map Editor if specified
            if (openInEditor) {
                new MapEditorContext({ group, index }).create().select();
            }

            state = State.Done;
        } catch (err) {
            state = State.DoneError;
            errorMessage = err;
        }
    }

    /** Switches the state (between creating and using) */
    function switchToCreationState(newState: State) {
        if (state === State.Loading || state === State.Creating) return;
        state = newState;
    }

    /** The options for the tileset1 select */
    let tileset1Options: [number, string][];
    /** The options for the tileset2 select */
    let tileset2Options: [number, string][];
    /** The options layout select */
    let layoutOptions: [number, string][];

    onMount(async () => {
        const tilesets: { offset: number; is_primary: boolean }[] =
            await invoke("get_tilesets");
        const layoutIds: number[] = await invoke("get_layout_ids");

        tileset1Options = Object.values(tilesets)
            .filter((v) => v.is_primary)
            .map((v) => [
                v.offset,
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset1Options.sort((a, b) => a[0] - b[0]);

        tileset2Options = Object.values(tilesets)
            .filter((v) => !v.is_primary)
            .map((v) => [
                v.offset,
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset2Options.sort((a, b) => a[0] - b[0]);

        layoutOptions = layoutIds.map((v) => [
            v,
            $config.layout_names[v] ?? "Unnamed",
        ]);

        state = State.Use;
    });
</script>

<div class="dialog-content">
    {#if state === State.Creating}
        <div class="icon-title">
            <iconify-icon icon="eos-icons:loading" inline />
            <span>Creating...</span>
        </div>
    {:else}
        <div class="title">Create Map</div>
    {/if}
    <div class="content form">
        <!-- While creating the map -->
        {#if state === State.Creating}
            <div class="row">
                <WarningDiv>
                    Creating Map, do not close this program or data may be
                    corrupted!
                </WarningDiv>
            </div>
            <!-- If creation was unsuccessful -->
        {:else if state === State.DoneError}
            <div class="row">
                <ErrorDiv>{errorMessage}</ErrorDiv>
            </div>
            <!-- At the beginning -->
        {:else}
            <div class="half-row">
                <div class="subtitle">Group</div>
                <div class="subtitle">Index</div>
                <Select
                    bind:value={group}
                    on:change={updateIndexes}
                    options={groupOptions}
                />
                <Select bind:value={index} options={indexOptions} />
            </div>
            {#if state !== State.Loading}
                <div class="row dark mode" class:closed={state !== State.Use}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="title"
                        on:click={() => switchToCreationState(State.Use)}
                    >
                        Using a preexisting Layout
                    </div>
                    {#if state === State.Use}
                        <div class="hr" />
                        <div class="subtitle">Layout</div>
                        <Select
                            valueTag="number"
                            bind:value={layout}
                            options={layoutOptions}
                        />
                    {/if}
                </div>
                <div class="row dark mode" class:closed={state !== State.New}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="row title"
                        on:click={() => switchToCreationState(State.New)}
                    >
                        Creating a new Layout
                    </div>
                    {#if state === State.New}
                        <div class="hr" />
                        <div class="subtitle">Name</div>
                        <Input
                            bind:value={layoutName}
                            placeholder="Name for the layout"
                        />
                        <div class="subtitle">Primary Tileset</div>
                        <Select
                            valueTag="offset"
                            bind:value={tileset1}
                            options={tileset1Options}
                        />
                        <div class="subtitle">Secondary Tileset</div>
                        <Select
                            valueTag="offset"
                            bind:value={tileset2}
                            options={tileset2Options}
                        />
                        <div class="half-row">
                            <div class="subtitle">Width</div>
                            <div class="subtitle">Height</div>
                            <Input type="number" bind:value={width} />
                            <Input type="number" bind:value={height} />
                        </div>
                    {/if}
                </div>
            {/if}
            <div class="select cols2">
                <CheckBox bind:checked={openInEditor}
                    >Open in Map Editor</CheckBox
                >
            </div>
        {/if}
    </div>
    <div class="buttons">
        {#if state === State.DoneError}
            <Button on:click={() => close(null)}>Ok</Button>
        {:else}
            <Button
                on:click={() => close(null)}
                disabled={state === State.Creating}>Cancel</Button
            >
            <Button theme="secondary" on:click={createMap} disabled={notAllGood}
                >Create Map</Button
            >
        {/if}
    </div>
</div>

<style lang="scss">
    .dialog-content {
        min-width: 434px;
        max-width: 434px;
    }
    .content {
        user-select: none;

        .mode {
            .title {
                cursor: default;
            }
            &.closed {
                .title:hover {
                    text-decoration: underline;
                    color: var(--main-fg);
                }
                .title {
                    cursor: pointer;
                }
            }
        }
    }
</style>
