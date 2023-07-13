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

    export let options: CreateMapOptions;
    export let context: MapListContext;
    export let all: MapCardProps[];
    export let close: (value: any) => void;

    let groupValue: string;
    let indexValue: string;
    let layoutValue: string;
    let tileset1Value: string;
    let tileset2Value: string;
    let freeGroups: Record<number, number[]> = {};
    let groupOptions: [string, string][];
    let indexOptions: [string, string][];

    // Transform all into a map of group to its indexes
    const groupToIndex = all.reduce((acc, cur) => {
        if (!acc[cur.group]) acc[cur.group] = {};
        acc[cur.group][cur.index] = true;
        return acc;
    }, {});

    // Loop though all the groups
    for (let i = 0; i <= 255; i++) {
        let indexes = [];
        // If the group exists
        if (groupToIndex[i]) {
            for (let j = 0; j <= 255; j++) {
                // If the index doesn't exist
                if (!groupToIndex[i][j]) {
                    indexes.push(j);
                }
            }
        } else {
            indexes = Array.from({ length: 256 }, (_, i) => i);
        }
        freeGroups[i] = indexes;
    }

    // Create the group options once
    groupOptions = Object.entries(freeGroups).map(([k]) => [k, k]);
    // Initialize the group value, which will change with the select
    groupValue = groupOptions[0][0];
    if (
        options?.group !== undefined &&
        Object.keys(freeGroups).includes(options.group.toString())
    ) {
        groupValue = options.group.toString();
    }
    // Initialize the indexes
    updateIndexes();

    // Update the indexes when the group changes
    function updateIndexes() {
        indexOptions = freeGroups[groupValue].map((i: number) => [
            i.toString(),
            i.toString(),
        ]);
        indexValue = indexOptions[0][0];
    }

    // Useful values
    $: group = +groupValue;
    $: index = +indexValue;
    $: layout = +layoutValue;
    $: tileset1 = +tileset1Value;
    $: tileset2 = +tileset2Value;
    let width: number = 20;
    let height: number = 20;
    let openInEditor: boolean = true;

    let usingLayout = true;
    let creating = false;
    let errored = false;
    let errorString = "";

    $: notAllGood = width * height > 0x2800 || creating;

    async function createMap() {
        creating = true;
        try {
            let options = usingLayout
                ? { Use: { layout } }
                : {
                      New: { tileset1, tileset2, width, height },
                  };
            let res: MapHeaderDump = await invoke("create_map", {
                group,
                index,
                layoutOptions: options,
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
        } catch (err) {
            errored = true;
            errorString = err;
        }
        creating = false;
    }

    let tileset1Options: [string, string][];
    let tileset2Options: [string, string][];
    let layoutOptions: [string, string][];
    let optionsReady = false;

    onMount(async () => {
        const tilesets: { offset: number; is_primary: boolean }[] =
            await invoke("get_tilesets");
        const layoutIds: number[] = await invoke("get_layout_ids");

        tileset1Options = Object.values(tilesets)
            .filter((v) => v.is_primary)
            .map((v) => [
                v.offset.toString(),
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset1Options.sort((a, b) => a[0].localeCompare(b[0]));

        tileset2Options = Object.values(tilesets)
            .filter((v) => !v.is_primary)
            .map((v) => [
                v.offset.toString(),
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset2Options.sort((a, b) => a[0].localeCompare(b[0]));

        layoutOptions = layoutIds.map((v) => [
            v.toString(),
            $config.layout_names[v] ?? "Unnamed",
        ]);

        optionsReady = true;
    });
</script>

<div class="dialog-content">
    {#if creating}
        <div class="icon-title">
            <iconify-icon icon="eos-icons:loading" />
            <span>Creating...</span>
        </div>
    {:else}
        <div class="title">Create Map</div>
    {/if}
    <div class="content">
        {#if creating}
            <div class="cols2">
                <WarningDiv>
                    Creating Map, do not close this program or data may be
                    corrupted!
                </WarningDiv>
            </div>
        {:else if errored}
            <div class="cols2">
                <ErrorDiv>{errorString}</ErrorDiv>
            </div>
        {:else}
            <div class="title">Group</div>
            <div class="title">Index</div>
            <div class="select">
                <Select
                    bind:value={groupValue}
                    on:change={updateIndexes}
                    options={groupOptions}
                />
            </div>
            <div class="select">
                <Select bind:value={indexValue} options={indexOptions} />
            </div>
            <div class="mode" class:closed={!usingLayout}>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class="header cols2" on:click={() => (usingLayout = true)}>
                    Using a preexisting Layout
                </div>
                {#if usingLayout}
                    <div class="title cols2">Layout</div>
                    <div class="select cols2">
                        {#if optionsReady}
                            <Select
                                showValue="number"
                                bind:value={layoutValue}
                                options={layoutOptions}
                            />
                        {:else}
                            <div class="placeholder" />
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="mode" class:closed={usingLayout}>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="header cols2"
                    on:click={() => (usingLayout = false)}
                >
                    Creating a new Layout
                </div>
                {#if !usingLayout}
                    <div class="title cols2">Name</div>
                    <div class="select cols2">
                        <Input />
                    </div>
                    <div class="title cols2">Primary Tileset</div>
                    <div class="select cols2">
                        {#if optionsReady}
                            <Select
                                showValue="offset"
                                bind:value={tileset1Value}
                                options={tileset1Options}
                            />
                        {:else}
                            <div class="placeholder" />
                        {/if}
                    </div>
                    <div class="title cols2">Secondary Tileset</div>
                    <div class="select cols2">
                        {#if optionsReady}
                            <Select
                                showValue="offset"
                                bind:value={tileset2Value}
                                options={tileset2Options}
                            />
                        {:else}
                            <div class="placeholder" />
                        {/if}
                    </div>
                    <div class="title">Width</div>
                    <div class="title">Height</div>
                    <div class="select">
                        <Input type="number" bind:value={width} />
                    </div>
                    <div class="select">
                        <Input type="number" bind:value={height} />
                    </div>
                {/if}
            </div>
            <div class="select cols2">
                <CheckBox bind:checked={openInEditor}
                    >Open in Map Editor</CheckBox
                >
            </div>
        {/if}
    </div>
    <div class="buttons">
        {#if errored}
            <Button on:click={() => close(null)}>Ok</Button>
        {:else}
            <Button on:click={() => close(null)} disabled={creating}
                >Cancel</Button
            >
            <Button color="secondary" on:click={createMap} disabled={notAllGood}
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
        min-height: 0;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.25em;

        .title {
            display: flex;
            flex-direction: column;
            place-items: center;
            padding: 8px;
        }

        .cols2 {
            grid-column: span 2;
        }

        .mode {
            transition: height 1s;
            display: grid;
            grid-template-rows: 1fr 1fr;

            &:not(.closed) {
                background: var(--medium-bg);
            }

            &.closed {
                height: 26px;
                overflow: hidden;
                .header {
                    color: var(--weak-fg);
                }
            }

            .header {
                display: flex;
                flex-direction: column;
                place-items: center;
                padding: 0.5em;
                border-bottom: 1px solid var(--light-shadow);
                cursor: pointer;
            }

            grid-column: span 2;
            place-self: stretch;
            background: var(--main-bg);
            padding: 0.5em 1em;
            padding-top: 0;
            border-radius: 8px;
            margin-bottom: 0.5em;
        }

        .select {
            display: flex;
            flex-direction: column;
            place-items: stretch;

            .placeholder {
                height: 28px;
                background: var(--sel-bg);
                margin: 2px;
            }

            :global(.select) {
                font-size: 16px;
            }
        }
    }
</style>
