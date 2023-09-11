<script lang="ts" context="module">
    import {
        spawnDialog,
        type DialogOptions,
    } from "src/components/dialog/Dialog.svelte";
    import LayoutPickerDialog from "./LayoutPickerDialog.svelte";
    export interface LayoutPickerDialogOptions extends DialogOptions {
        reason: string;
        isReasonError?: boolean;
        initialLayout?: number;
    }

    export async function spawnLayoutPickerDialog(
        options: LayoutPickerDialogOptions
    ): Promise<null | number> {
        return await spawnDialog(LayoutPickerDialog, options);
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
    export let isReasonError = true;
    export let initialLayout: number = null;

    let layout: number;
    let layoutOptions: [number, string][] = null;

    onMount(async () => {
        const layoutIds = await invoke(RustFn.get_layout_ids);

        layoutOptions = layoutIds.map((v) => [
            v,
            $config.layout_names[v] ?? "Unnamed",
        ]);
        // If the given layout is not in the list, default to the first one
        if (!layoutOptions.some((v) => v[0] === initialLayout))
            layout = layoutOptions[0][0];
    });
</script>

<div class="dialog-content">
    <div class="title">Pick a layout</div>
    <div class="content form">
        {#if reason}
            <div class="reason">
                {#if isReasonError}
                    <ErrorDiv>{reason}</ErrorDiv>
                {:else}
                    <div class="row subtitle dark">
                        {reason}
                    </div>
                {/if}
            </div>
        {/if}

        {#if layoutOptions}
            Choose:
            <Select
                valueTag="number"
                bind:value={layout}
                options={layoutOptions}
            />
        {/if}
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Cancel</Button>
        <Button
            disabled={layout === null}
            theme="secondary"
            on:click={() => close(layout === initialLayout ? null : layout)}
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
