<svelte:options accessors />

<script lang="ts">
    import Button from "src/components/Button.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import type MapCanvas from "../editor/MapCanvas.svelte";
    import type { BlocksData } from "../editor/blocks_data";
    import { onMount } from "svelte";
    import Input from "src/components/Input.svelte";
    import WarningDiv from "src/components/WarningDiv.svelte";
    import { MapResizeChange } from "../editor/MapCanvas.svelte";

    export let MAX_WIDTH = 1000;
    export let MAX_HEIGHT = 1000;
    export let MAX_MAP_AREA = 0x2800;

    export let close: (value: any) => void;
    export let noEscapeClose: boolean;
    export let noOutsideClose: boolean;

    /** Canvas identifier for the user */
    export let layoutName: string;
    export let canvas: MapCanvas;
    export let blocks: BlocksData;
    export let context: MapEditorContext;
    let data = context.data;

    // The input's bound values
    let width: number;
    let height: number;
    // The starting values
    let initialWidth: number;
    let initialHeight: number;
    /** True if you're currently resizing */
    let resizing = false;
    // Cannot exit while resizing
    $: noEscapeClose = resizing;
    $: noOutsideClose = resizing;

    async function addResizeChange() {
        if (initialWidth === width && initialHeight === height)
            return close(null);

        const change = new MapResizeChange(
            canvas.resizeChangeApplied,
            blocks,
            data,
            width,
            height,
            0
        );
        // Prevent the user from clicking away
        this.resizing = true;
        // Await for the change to be applied
        await context.changes.push(change);
        // Close the dialog
        close(true);
    }

    onMount(() => {
        initialWidth = width = blocks.width;
        initialHeight = height = blocks.height;
    });
</script>

<div class="dialog-content">
    <div class="title">Resize {layoutName} Layout</div>
    <div class="content form">
        <div class="row dark">
            <div class="row title">Insert the new size for the map</div>
            <div class="hr" />
            <div class="half-row">
                <div class="row">
                    <div class="row subtitle">Width</div>
                    <div class="row">
                        <Input
                            bind:value={width}
                            type="number"
                            min={1}
                            max={MAX_WIDTH}
                        />
                    </div>
                </div>
                <div class="row">
                    <div class="row subtitle">Height</div>
                    <div class="row">
                        <Input
                            bind:value={height}
                            type="number"
                            min={1}
                            max={MAX_HEIGHT}
                        />
                    </div>
                </div>
            </div>
        </div>
        {#if width * height > MAX_MAP_AREA}
            <div class="row">
                <WarningDiv
                    ><i>(width * height)</i>
                    cannot exceed {MAX_MAP_AREA}</WarningDiv
                >
            </div>
        {:else if width === initialWidth && height === initialHeight}
            <div class="row subtitle dark">
                Size is the same as the original,<br /> no changes will be applied
            </div>
        {/if}
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Cancel</Button>
        <Button
            color="secondary"
            on:click={addResizeChange}
            disabled={width * height > MAX_MAP_AREA || resizing}
        >
            Resize Map
        </Button>
    </div>
</div>

<style lang="scss">
    .dialog-content {
        max-width: 400px;
        min-height: 240px;
        max-height: 320px;
    }
    .content {
        display: grid;
    }
</style>
