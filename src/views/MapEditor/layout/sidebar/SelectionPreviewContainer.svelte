<script lang="ts">
    import { getContext } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import SelectionPreview from "../SelectionPreview.svelte";
    import { SelectionMaterial } from "../../editor/materials";

    export let permissionMode: boolean;

    const context: MapEditorContext = getContext("context");
    const material = context.material;
    const loadingPalette = context.palette.loading;
    let expanded = true;

    $: selection =
        $material instanceof SelectionMaterial
            ? $material.isSingular
                ? null
                : $material
            : null;

    $: $loadingPalette === true
        ? ($material = context.palette.getMetatileZeroBrush())
        : null;
</script>

<div class="multiselection" class:hidden={selection === null}>
    <div class="multiselection-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="title" on:click={() => (expanded = !expanded)}>
            <span class="text">
                {#if permissionMode}
                    Selected Permissions
                {:else}
                    Selected Blocks
                {/if}
            </span>
            <iconify-icon
                class:flipped={expanded}
                icon="mdi:chevron-down"
                class="icon"
            />
        </div>

        {#key selection}
            {#if selection !== null && expanded}
                <SelectionPreview
                    {selection}
                    showPermissions={permissionMode}
                />
            {/if}
        {/key}
    </div>
</div>

<style lang="scss">
    .multiselection {
        position: absolute;

        max-width: 25%;
        min-width: 100px;
        top: 0;

        display: flex;
        background: var(--main-bg);
        border-right: 1px solid var(--light-shadow);
        border-bottom: 1px solid var(--light-shadow);
        box-shadow: 1px 1px 2px var(--light-shadow);

        pointer-events: none;

        .multiselection-container {
            max-height: 25%;
            min-height: 20px;

            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: calc(1em + 4px) 1fr;

            .title {
                padding: 2px 4px;
                display: grid;
                gap: 4px;
                grid-template-columns: 1fr min-content;
                align-items: center;

                .text {
                    text-wrap: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }

                font-size: 13px;
                text-align: center;
                text-transform: uppercase;

                color: var(--weak-fg);
                background: var(--main-bg);
                border-bottom: 1px solid var(--light-shadow);

                cursor: pointer;
                pointer-events: all;

                iconify-icon {
                    transition: transform 100ms;
                    transform: rotateZ(0);
                    &.flipped {
                        transform: rotateZ(180deg);
                    }
                }
            }
        }
    }
</style>
