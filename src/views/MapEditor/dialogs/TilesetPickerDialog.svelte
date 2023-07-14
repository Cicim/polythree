<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import Button from "src/components/Button.svelte";
    import ErrorDiv from "src/components/ErrorDiv.svelte";
    import Select from "src/components/Select.svelte";
    import { config } from "src/systems/global";
    import { onMount } from "svelte";

    export let close: (value: any) => void;
    export let reason: string | null = null;

    let tileset1Options: [number, string][];
    let tileset2Options: [number, string][];
    let tileset1: number = null;
    let tileset2: number = null;

    onMount(async () => {
        const tilesets: { offset: number; is_primary: boolean }[] =
            await invoke("get_tilesets");

        tileset1Options = Object.values(tilesets)
            .filter((v) => v.is_primary)
            .map((v) => [
                v.offset,
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset1Options.sort((a, b) => a[0] - b[0]);
        tileset1 = tileset1Options[0][0];

        tileset2Options = Object.values(tilesets)
            .filter((v) => !v.is_primary)
            .map((v) => [
                v.offset,
                $config.tileset_names[v.offset] ?? "Unnamed",
            ]);
        tileset2Options.sort((a, b) => a[0] - b[0]);
        tileset2 = tileset2Options[0][0];
    });
</script>

<div class="dialog-content">
    <div class="title">Pick the Tilesets</div>
    <div class="content">
        {#if reason}
            <div class="reason">
                <ErrorDiv>{reason}</ErrorDiv>
            </div>
        {/if}

        {#if tileset1Options}
            Choose Primary Tileset:
            <Select
                showValue="offset"
                bind:value={tileset1}
                options={tileset1Options}
            />
        {/if}

        {#if tileset2Options}
            Choose Secondary Tileset:
            <Select
                showValue="offset"
                bind:value={tileset2}
                options={tileset2Options}
            />
        {/if}
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Cancel</Button>
        <Button
            disabled={tileset1 === null || tileset2 === null}
            color="secondary"
            on:click={() => close([tileset1, tileset2])}
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
