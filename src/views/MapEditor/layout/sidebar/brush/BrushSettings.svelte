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
                if (key === "width" || key === "height") continue;
                $editingBrush[key] = value;
            }

            if (brushType === BrushType.Simple) {
                // If the width or height changed
                if (
                    brushSettings.width !==
                        ($editingBrush as SimpleBrush).width ||
                    brushSettings.height !==
                        ($editingBrush as SimpleBrush).height
                ) {
                    // Update the blocks
                    $editingBrush.resizeBlocks(
                        brushSettings.width,
                        brushSettings.height
                    );
                }
            }

            // Change the name
            $editingBrush.name = brush.name;
            // Update the current brush
            $editingBrush = $editingBrush;
        } else {
            // Create a new brush
            const newBrush = new brushToTypeClass[brushType](
                context.tileset1Offset
            );
            // Copy the name
            newBrush.name = brush.name;
            // Apply all the properties
            for (const [key, value] of Object.entries(brushSettings)) {
                if (key === "width" || key === "height") continue;
                newBrush[key] = value;
            }
            // Update the current brush
            $editingBrush = newBrush;
        }
        close(true);
    }

    // To get size from selection
    let selectionWidth = ($material as PaletteMaterial).blocks.width;
    let selectionHeight = ($material as PaletteMaterial).blocks.height;
    function setSizeFromMaterial() {
        brushSettings.width = selectionWidth;
        brushSettings.height = selectionHeight;
    }
</script>

<div class="dialog-content">
    <div class="title">Brush Settings for <i>{$editingBrush.name}</i></div>
    <div class="content form">
        <div class="row">
            <span class="title"> Brush Name </span>
            <Input bind:value={brush.name} />
        </div>
        <div class="row">
            <span class="title"> Brush Type </span>
            <Select bind:value={brushType} options={brushOptions} />
        </div>
        <div class="row dark mode">
            <div class="title">
                <iconify-icon inline icon={brushToTypeClass[brushType].icon} />
                {BrushType[brushType]} Brush Settings
            </div>
            <div class="hr" />
            {#if brushType === BrushType.Simple}
                <div class="half-max-row">
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
                        <div class="subtitle padding">|</div>
                        <Button
                            on:click={() => {
                                [brushSettings.width, brushSettings.height] = [
                                    brushSettings.height,
                                    brushSettings.width,
                                ];
                            }}
                            title="Swap width with height"
                        >
                            <iconify-icon
                                icon="material-symbols:swap-horiz"
                                inline
                            />
                        </Button>
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
    .buttons {
        display: flex;
        justify-content: flex-end;

        :global(.button) {
            flex: none !important;
        }
    }
</style>
