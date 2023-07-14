<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import Button from "src/components/Button.svelte";
    import ErrorDiv from "src/components/ErrorDiv.svelte";
    import Select from "src/components/Select.svelte";
    import { config } from "src/systems/global";
    import { onMount } from "svelte";

    export let close: (value: any) => void;
    export let reason: string | null = null;

    let layoutOptions: [number, string][] = null;
    let layout: number = null;

    onMount(async () => {
        const layoutIds: number[] = await invoke("get_layout_ids");

        layoutOptions = layoutIds.map((v) => [
            v,
            $config.layout_names[v] ?? "Unnamed",
        ]);
        layout = layoutOptions[0][0];
    });
</script>

<div class="dialog-content">
    <div class="title">Pick a layout</div>
    <div class="content">
        {#if reason}
        <div class="reason">
            <ErrorDiv>{reason}</ErrorDiv>
        </div>
        {/if}

        {#if layoutOptions}
            Choose:
            <Select
                showValue="number"
                bind:value={layout}
                options={layoutOptions}
            />
        {/if}
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Cancel</Button>
        <Button color="secondary" on:click={() => close(layout)}>Choose</Button>
    </div>
</div>

<style lang="scss">
    .dialog-content {
        width: 400px;
    }

    .content {
        display: grid;
        grid-template-columns: 1fr;

        :global(.select) {
            justify-self: stretch;
            font-size: 16px;
        }
    }

    .reason {
        margin-bottom: 10px;
    }

</style>
