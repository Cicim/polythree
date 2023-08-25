<script lang="ts" context="module">
    import {
        BrushType,
        SimpleBrush,
        NinePatchBrush,
        BrushMaterial,
    } from "src/views/MapEditor/editor/brushes";
    import { Change } from "src/systems/changes";
    import type { Writable } from "svelte/store";
    import type MapCanvas from "src/views/MapEditor/editor/MapCanvas.svelte";
    import {
        spawnDialog,
        type DialogOptions,
    } from "src/components/dialog/Dialog.svelte";
    import BrushSettings from "./BrushSettings.svelte";

    export class BrushSettingsChange extends Change {
        constructor(
            public editingBrush: Writable<BrushMaterial>,
            private brushCanvas: MapCanvas,
            private oldBrush: BrushMaterial,
            private newBrush: BrushMaterial
        ) {
            super();
        }

        public updatePrev(): boolean {
            return this.oldBrush.equals(this.newBrush);
        }
        public async revert(): Promise<void> {
            this.editingBrush.set(this.oldBrush.clone());
            this.brushCanvas.buildAllChunks(false);
            this.brushCanvas.resizeChangeApplied.set(new BlocksData(1, 1));
        }
        public async apply(): Promise<void> {
            this.editingBrush.set(this.newBrush.clone());
            this.brushCanvas.buildAllChunks(false);
            this.brushCanvas.resizeChangeApplied.set(new BlocksData(1, 1));
        }
    }

    export interface BrushSettingsOptions extends DialogOptions {
        context: MapEditorContext;
    }

    export async function spawnBrushSettings(
        options: BrushSettingsOptions
    ): Promise<null> {
        return await spawnDialog(BrushSettings, {
            animation: "slide-left",
            ...options,
        });
    }
</script>

<script lang="ts">
    import Button from "src/components/Button.svelte";
    import Select from "src/components/Select.svelte";
    import Input from "src/components/Input.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import { PaletteMaterial } from "src/views/MapEditor/editor/materials";
    import { BlocksData } from "src/views/MapEditor/editor/blocks_data";

    const MAX_WIDTH = SimpleBrush.MAX_WIDTH;
    const MAX_HEIGHT = SimpleBrush.MAX_HEIGHT;

    export let context: MapEditorContext;
    const editingBrush = context.brushes.editing;
    const brushChanges = context.brushes.editingChanges;
    const brushCanvas = context.brushes.editingCanvas;
    const material = context.material;

    export let close: (value: any) => void;

    /** A clone of the current brush */
    let brush = $editingBrush.clone();
    /** The selected brush's type */
    let brushType: BrushType = brush.type;
    /** The selected brush's name */
    let brushName: string = brush.name;

    let isDisabled = true;
    $: {
        if (!brushName.match(/^([\w|\d]+[\s]*\b)+$/) || brushName.length > 32)
            isDisabled = true;
        else if (brushType === BrushType.Simple)
            isDisabled =
                brushSettings.width < 1 ||
                brushSettings.height < 1 ||
                brushSettings.width > MAX_WIDTH ||
                brushSettings.height > MAX_HEIGHT;
        else if (brushType === BrushType.NinePatch) isDisabled = false;
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
        [BrushType.NinePatch]: {},
    };

    let brushSettings: any;
    $: brushSettings = typeBrushSettings[brushType];

    const brushOptions: [BrushType, string][] = [
        [BrushType.Simple, "Simple"],
        [BrushType.NinePatch, "Nine Patch"],
    ];

    function apply() {
        let oldBrush = brush.clone();
        let newBrush: BrushMaterial;

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
            $editingBrush.name = brushName;
            // Update the current brush
            newBrush = $editingBrush.clone();
        } else {
            // Create a new brush
            const recreatedBrush = new brushToTypeClass[brushType](
                context.tileset1Offset
            );
            // Copy the name
            recreatedBrush.name = brushName;
            // Apply all the properties
            for (const [key, value] of Object.entries(brushSettings)) {
                if (key === "width" || key === "height") continue;
                recreatedBrush[key] = value;
            }
            // Update the current brush
            newBrush = recreatedBrush;
        }

        // Apply the change
        $brushChanges.push(
            new BrushSettingsChange(
                editingBrush,
                $brushCanvas,
                oldBrush,
                newBrush
            )
        );

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
            <Input bind:value={brushName} />
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
                <div class="row" />
            {/if}
        </div>
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Don't Apply</Button>
        <Button theme="secondary" on:click={apply} disabled={isDisabled}>
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
