<script lang="ts">
    import {
        BrushType,
        SimpleBrush,
        NinePatchBrush,
    } from "src/views/MapEditor/editor/brushes";
    import Button from "src/components/Button.svelte";
    import Select from "src/components/Select.svelte";
    import Input from "src/components/Input.svelte";
    import CheckBox from "src/components/CheckBox.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import { PaletteMaterial } from "src/views/MapEditor/editor/materials";

    const MAX_WIDTH = SimpleBrush.MAX_WIDTH;
    const MAX_HEIGHT = SimpleBrush.MAX_HEIGHT;

    export let context: MapEditorContext;
    const editingBrush = context.editingBrush;
    const material = context.material;

    export let close: (value: any) => void;

    /** A clone of the current brush */
    let brush = $editingBrush.clone();
    /** The selected brush's type */
    let brushType: BrushType = brush.type;

    let isDisabled = true;
    $: {
        if (brushType === BrushType.Simple)
            isDisabled =
                brushSettings.width < 1 ||
                brushSettings.height < 1 ||
                brushSettings.width > MAX_WIDTH ||
                brushSettings.height > MAX_HEIGHT;
        if (brushType === BrushType.NinePatch) isDisabled = false;
    }

    const brushToTypeClass = {
        [BrushType.Simple]: SimpleBrush,
        [BrushType.NinePatch]: NinePatchBrush,
    };

    const typeBrushSettings = {
        [BrushType.Simple]:
            brushType === BrushType.Simple
                ? {
                      width: ($editingBrush as SimpleBrush).width,
                      height: ($editingBrush as SimpleBrush).height,
                  }
                : { width: 1, height: 1 },
        [BrushType.NinePatch]:
            brushType === BrushType.NinePatch
                ? {
                      hasCorners: ($editingBrush as NinePatchBrush).hasCorners,
                  }
                : {
                      hasCorners: true,
                  },
    };

    let brushSettings: any;
    $: brushSettings = typeBrushSettings[brushType];

    const brushOptions: [BrushType, string][] = [
        [BrushType.Simple, "Simple"],
        [BrushType.NinePatch, "Nine Patch"],
    ];

    function apply() {
        // When you apply to the same brush
        if (brushType === $editingBrush.type) {
            // Apply all the apported changes to the editing brush
            for (const [key, value] of Object.entries(brushSettings)) {
                $editingBrush[key] = value;
            }
            // Change the name
            $editingBrush.name = brush.name;
            // Update the current brush
            $editingBrush = $editingBrush;
        } else {
            // Create a new brush
            const newBrush = new brushToTypeClass[brushType]();
            // Copy the name
            newBrush.name = brush.name;
            // Apply all the properties
            for (const [key, value] of Object.entries(brushSettings)) {
                newBrush[key] = value;
            }
            // Update the current brush
            $editingBrush = newBrush;
        }
        close(true);
    }

    // To get size from selection
    let selectionWidth = ($material as PaletteMaterial)?.blocks[0]?.length;
    let selectionHeight = ($material as PaletteMaterial)?.blocks?.length;
    function setSizeFromMaterial() {
        brushSettings.width = selectionWidth;
        brushSettings.height = selectionHeight;
    }
</script>

<div class="dialog-content">
    <div class="title">Brush Settings for <i>{$editingBrush.name}</i></div>
    <div class="content">
        <div class="row">
            <span class="title"> Brush Name </span>
            <Input bind:value={brush.name} />
        </div>
        <div class="row">
            <span class="title"> Brush Type </span>
            <Select bind:value={brushType} options={brushOptions} />
        </div>
        <div class="row dark">
            <div class="title">
                <iconify-icon inline icon={brushToTypeClass[brushType].icon} />
                {BrushType[brushType]} Brush Settings
            </div>
            <div class="hr" />
            {#if brushType === BrushType.Simple}
                <div class="half-row">
                    <div class="row">
                        <div class="subtitle">Width</div>
                        <Input
                            min={1}
                            max={MAX_WIDTH}
                            type="number"
                            bind:value={brushSettings.width}
                        />
                    </div>
                    <div class="row">
                        <div class="subtitle">Height</div>
                        <Input
                            min={1}
                            max={MAX_HEIGHT}
                            type="number"
                            bind:value={brushSettings.height}
                        />
                    </div>
                </div>
                {#if $material instanceof PaletteMaterial && !$material.isSingular && (brushSettings.width !== selectionWidth || brushSettings.height !== selectionHeight)}
                    <Button on:click={setSizeFromMaterial}
                        ><iconify-icon icon="mdi:selection" inline />
                        &nbsp;Set to Selection Size ({selectionWidth}x{selectionHeight})</Button
                    >
                {/if}
            {:else if brushType === BrushType.NinePatch}
                <div class="row">
                    <CheckBox bind:checked={brushSettings.hasCorners}
                        >Has corners</CheckBox
                    >
                </div>
            {/if}
        </div>
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Don't Apply</Button>
        <Button color="secondary" on:click={apply} disabled={isDisabled}>
            {#if $editingBrush.type !== brushType}
                Change Type
            {:else}
                Apply Changes
            {/if}
        </Button>
    </div>
</div>

<style lang="scss">
    .content {
        display: flex;
        flex-flow: column wrap;
        gap: 8px;

        .row {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: center;
            gap: 4px;
        }

        .half-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
        }

        .hr {
            width: 100%;
            border-bottom: 1px solid var(--light-shadow);
        }

        .title {
            text-transform: uppercase;
            text-align: center;
            color: var(--weak-fg);
        }

        .dark {
            background: var(--medium-bg);
            padding: 8px;
            border-radius: 8px;
        }
        .subtitle {
            text-align: center;
        }
    }

    .buttons {
        display: flex;
        justify-content: flex-end;

        :global(.button) {
            flex: none !important;
        }
    }
</style>
