<script lang="ts">
    import Select from "src/components/Select.svelte";
    import type {
        CreateMapOptions,
        MapCardProps,
        MapListContext,
    } from "../MapList";
    import { config } from "src/systems/global";
    import Input from "src/components/Input.svelte";
    import Button from "src/components/Button.svelte";
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api";
    import CheckBox from "src/components/CheckBox.svelte";

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
    $: index: +indexValue;
    $: layout: +layoutValue;
    $: tileset1: +tileset1Value;
    $: tileset2: +tileset2Value;
    let width: number = 10;
    let height: number = 10;
    let openInEditor: boolean = true;

    $: notAllGood = width * height > 0x2800;

    let usingLayout = true;

    let tileset1Options: [string, string][];
    let tileset2Options: [string, string][];
    let tilesetOptionsReady = false;

    onMount(async () => {
        const tilesets = await invoke("get_tilesets");

        tileset1Options = Object.values(tilesets)
            .filter((v) => v.is_primary)
            .map((v) => [v.offset, $config.tileset_names[v.offset] ?? "Unnamed"]);

        tileset2Options = Object.values(tilesets)
            .filter((v) => !v.is_primary)
            .map((v) => [v.offset, $config.tileset_names[v.offset] ?? "Unnamed"]);

        tilesetOptionsReady = true;
    });
</script>

<div class="dialog-content">
    <div class="title">Create Map</div>
    <div class="content">
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
            <div class="title cols2">Layout</div>
            <div class="select cols2">
                <Select
                    showValue="number"
                    bind:value={layoutValue}
                    options={Object.entries($config.layout_names)}
                />
            </div>
        </div>
        <div class="mode" class:closed={usingLayout}>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="header cols2" on:click={() => (usingLayout = false)}>
                Creating a new Layout
            </div>
            <div class="title cols2">Primary Tileset</div>
            <div class="select cols2">
                {#if tilesetOptionsReady}
                    <Select
                        showValue="offset"
                        bind:value={tileset1Value}
                        options={tileset1Options}
                    />
                {/if}
            </div>
            <div class="title cols2">Secondary Tileset</div>
            <div class="select cols2">
                {#if tilesetOptionsReady}
                    <Select
                        showValue="offset"
                        bind:value={tileset2Value}
                        options={tileset2Options}
                    />
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
        </div>
        <div class="select">
            <CheckBox bind:checked={openInEditor}>Open in Map Editor</CheckBox>
        </div>
    </div>
    <div class="buttons">
        <Button color="secondary" disabled={notAllGood}>Create Map</Button>
    </div>
</div>

<style lang="scss">
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
            overflow: hidden;

            :global(.select) {
                font-size: 16px;
            }
        }
    }
</style>
