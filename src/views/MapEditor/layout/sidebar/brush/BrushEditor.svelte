<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../../LayoutSidebar.svelte";
    import { getContext, onMount } from "svelte";
    import { tooltip } from "src/systems/tooltip";
    import { showPreviewWindow } from "src/components/app/PreviewWindow.svelte";
    import { spawnDialog } from "src/systems/dialogs";
    import ToolButton from "../../../ToolButton.svelte";
    import MapCanvas from "../../../editor/MapCanvas.svelte";
    import BrushPreview from "./BrushPreview.svelte";
    import BrushSettings from "./BrushSettings.svelte";
    import { EditorChanges } from "src/systems/changes";

    export let state: SidebarState;
    export let levelMode: boolean;

    let bodyEl: HTMLDivElement;
    let mapCanvas: MapCanvas;

    const context: MapEditorContext = getContext("context");
    const data = context.data;
    const tilesetData = $data.tilesets;
    const editingBrush = context.brushes.editing;
    const editingBrushClone = context.brushes.editingClone;
    const editingBrushChanges = context.brushes.editingChanges;
    const brushCanvas = context.brushes.editingCanvas;
    const primaryBrushes = context.brushes.primary;
    const secondaryBrushes = context.brushes.secondary;
    const loading = context.brushes.loading;

    /** Modifies the brush currently being edited and updates the state */
    function applyChanges() {
        // Notify that the clone is now free
        context.brushes.notifyBrushEditingDone($editingBrushClone);

        // If the brush was originally primary
        if ($editingBrushClone.onlyUsesPrimaryTiles(context.tileset1Length)) {
            // If it is still primary, update the brush
            if ($editingBrush.onlyUsesPrimaryTiles(context.tileset1Length)) {
                primaryBrushes.update((brushes) => {
                    brushes[context.brushes.editingIndex] =
                        $editingBrush.clone();
                    return brushes;
                });
            } else {
                // Remove the brush from the primary brushes
                primaryBrushes.update((brushes) => {
                    brushes.splice(context.brushes.editingIndex, 1);
                    return brushes;
                });
                // Add to the secondary brushes
                secondaryBrushes.update((brushes) => {
                    brushes.push($editingBrush.clone());
                    return brushes;
                });
            }
        }
        // Otherwise if the brush was secondary
        else {
            // If the new brush is still secondary
            if (!$editingBrush.onlyUsesPrimaryTiles(context.tileset1Length)) {
                secondaryBrushes.update((brushes) => {
                    brushes[context.brushes.editingIndex] =
                        $editingBrush.clone();
                    return brushes;
                });
            } else {
                // Remove the brush from the secondary brushes
                secondaryBrushes.update((brushes) => {
                    brushes.splice(context.brushes.editingIndex, 1);
                    return brushes;
                });
                // Add to the primary brushes
                primaryBrushes.update((brushes) => {
                    brushes.push($editingBrush.clone());
                    return brushes;
                });
            }
        }

        $editingBrushChanges = null;
        $editingBrush = null;
        context.brushes.editingIndex = null;
        state = context.brushes.editingEnteredFromState;
    }

    /** Starts editing the brushes if you are not editing a brush already */
    function startEditing() {
        if (
            !$editingBrush ||
            state === SidebarState.BrushLevel ||
            state === SidebarState.Brush
        )
            return;

        // Here you have just started editing the brush
        // so create a clone of the brush
        $editingBrushClone = $editingBrush.clone();
        // Save the index of the current brush
        if ($editingBrush.onlyUsesPrimaryTiles(context.tileset1Length))
            context.brushes.editingIndex = $primaryBrushes.findIndex(
                (brush) => $editingBrush === brush
            );
        else
            context.brushes.editingIndex = $secondaryBrushes.findIndex(
                (brush) => $editingBrush === brush
            );
        // Create a change for the brush's tiles
        $editingBrushChanges = new EditorChanges(null);
        // Save the original state
        context.brushes.editingEnteredFromState = state;
        // Update the state
        state = SidebarState.Brush;
        // Notify all other MapEditors
        context.brushes.notifyBrushEditingStarted($editingBrushClone);
    }

    // Start editing if the editingBrush has changed
    $: $editingBrush, startEditing();
    $: $editingBrush, brushCanvas.set(mapCanvas);

    // Apply the changes to the brush if you were start reloading the brushes
    $: $loading,
        (() => {
            if ($loading && $editingBrush) applyChanges();
        })();
</script>

<div
    class="brush-view"
    class:hidden={levelMode ||
        (state !== SidebarState.Brush && state !== SidebarState.BrushLevel)}
    use:resizeY={{
        minHeight: () => Math.min(100, window.innerHeight * 0.2),
        maxHeight: () => window.innerHeight * 0.5,
        startHeight: 200,
    }}
>
    <div class="brush-editor">
        {#if $editingBrush !== null}
            <div class="topbar">
                <div class="left">
                    <ToolButton
                        icon="mdi:gear"
                        theme="transparent"
                        title="Brush Settings"
                        on:click={() => {
                            spawnDialog(BrushSettings, {
                                context,
                            });
                        }}
                    />
                    <ToolButton
                        icon="mdi:eye"
                        theme="transparent"
                        title="Brush Preview"
                        on:click={() => {
                            showPreviewWindow({
                                target: bodyEl,
                                minWidth: 200,
                                maxWidth: 400,
                                minHeight: 200,
                                maxHeight: 400,
                                slot: {
                                    component: BrushPreview,
                                    props: {
                                        editingBrush: $editingBrush,
                                        tilesetData,
                                    },
                                },
                            });
                        }}
                    />
                </div>
                <div class="center" use:tooltip tooltip={$editingBrush.name}>
                    {$editingBrush.name}
                </div>
                <div class="right">
                    {#if state === SidebarState.Brush}
                        <ToolButton
                            icon="gis:map-edit"
                            theme="transparent"
                            title="Edit Levels"
                            on:click={() => (state = SidebarState.BrushLevel)}
                        />
                    {:else if state === SidebarState.BrushLevel}
                        <ToolButton
                            icon="bxs:edit"
                            theme="transparent"
                            title="Edit Tiles"
                            on:click={() => (state = SidebarState.Brush)}
                        />
                    {/if}
                    <ToolButton
                        icon="mdi:tick"
                        theme="transparent"
                        title="Done Editing"
                        on:click={applyChanges}
                    />
                </div>
            </div>
            <div class="editor" bind:this={bodyEl}>
                <MapCanvas
                    bind:this={mapCanvas}
                    images={$editingBrush.canvasImages}
                    allowAnimations={true}
                    blocks={$editingBrush.blocks}
                    centerOnResize={true}
                    editLevels={state === SidebarState.BrushLevel}
                    changes={$editingBrushChanges}
                    nullLevels={true}
                />
            </div>
        {/if}
    </div>
    <div class="resize-handle top" />
</div>

<style lang="scss">
    .brush-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;

        .brush-editor {
            display: grid;
            grid-template-rows: min-content minmax(0, 1fr);

            .topbar .center {
                display: flex;
                justify-content: center;
                text-overflow: ellipsis;
            }

            .editor {
                :global(canvas) {
                    max-width: 100%;
                }
            }
        }
    }
</style>
