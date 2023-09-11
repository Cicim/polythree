<script lang="ts" context="module">
    import {
        spawnDialog,
        type DialogOptions,
    } from "src/components/dialog/Dialog.svelte";
    import TilesetPickerDialog from "./TilesetPickerDialog.svelte";
    export interface TilesetPickerDialogOptions extends DialogOptions {
        reason: string;
        isReasonError?: boolean;
        primaryTileset?: number;
        secondaryTileset?: number;
    }

    export async function spawnTilesetPickerDialog(
        options: TilesetPickerDialogOptions
    ): Promise<[number, number] | null> {
        return await spawnDialog(TilesetPickerDialog, options);
    }
</script>

<script lang="ts">
    import { invoke, RustFn } from "src/systems/invoke";
    import Button from "src/components/Button.svelte";
    import ErrorDiv from "src/components/ErrorDiv.svelte";
    import Select from "src/components/Select.svelte";
    import { config } from "src/systems/global";
    import { onMount } from "svelte";

    export let close: (value: any) => void;
    export let reason: string | null = null;
    export let isReasonError: boolean;
    export let primaryTileset: number = null;
    export let secondaryTileset: number = null;

    let tileset1Options: [number, string][];
    let tileset2Options: [number, string][];
    let tileset1: number = null;
    let tileset2: number = null;

    onMount(async () => {
        const tilesets = await invoke(RustFn.get_tilesets);

        tileset1Options = Object.values(tilesets)
            .filter((v) => v.is_primary)
            .map((v) => [
                v.offset,
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset1Options.sort((a, b) => a[0] - b[0]);
        // Look for the primary tileset's index in the options
        const primaryIndex = tileset1Options.findIndex(
            (v) => v[0] === primaryTileset
        );
        // If it's not there, set it to the first option
        if (primaryIndex === -1) {
            tileset1 = tileset1Options[0][0];
        } else {
            tileset1 = primaryTileset;
        }

        tileset2Options = Object.values(tilesets)
            .filter((v) => !v.is_primary)
            .map((v) => [
                v.offset,
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset2Options.sort((a, b) => a[0] - b[0]);
        // Look for the primary tileset's index in the options
        const secondaryIndex = tileset2Options.findIndex(
            (v) => v[0] === secondaryTileset
        );
        // If it's not there, set it to the first option
        if (secondaryIndex === -1) {
            tileset2 = tileset2Options[0][0];
        } else {
            tileset2 = secondaryTileset;
        }
    });
</script>

<div class="dialog-content">
    <div class="title">Pick the Tilesets</div>
    <div class="content form">
        {#if reason}
            {#if isReasonError}
                <div class="reason">
                    <ErrorDiv>{reason}</ErrorDiv>
                </div>
            {:else}
                <div class="row dark subtitle">{reason}</div>
            {/if}
        {/if}

        {#if tileset1Options}
            Choose Primary Tileset:
            <Select
                valueTag="offset"
                bind:value={tileset1}
                options={tileset1Options}
            />
        {/if}

        {#if tileset2Options}
            Choose Secondary Tileset:
            <Select
                valueTag="offset"
                bind:value={tileset2}
                options={tileset2Options}
            />
        {/if}
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Cancel</Button>
        <Button
            disabled={tileset1 === null || tileset2 === null}
            theme="secondary"
            on:click={() =>
                close(
                    tileset1 === primaryTileset && tileset2 === secondaryTileset
                        ? null
                        : [tileset1, tileset2]
                )}
        >
            Choose
        </Button>
    </div>
</div>

<style lang="scss">
    .dialog-content {
        width: 400px;
    }

    .content {
        display: grid;
        gap: 4px;
        grid-template-columns: 1fr;

        :global(.select) {
            justify-self: stretch;
            font-size: 16px;
        }
    }

    .reason {
        margin-bottom: 6px;
    }
</style>
