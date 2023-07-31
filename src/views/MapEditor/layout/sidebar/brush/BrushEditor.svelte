<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../../LayoutSidebar.svelte";
    import { getContext } from "svelte";
    import { tooltip } from "src/systems/tooltip";
    import { showPreviewWindow } from "src/components/app/PreviewWindow.svelte";
    import { spawnDialog } from "src/systems/dialogs";
    import ToolButton from "../../../ToolButton.svelte";
    import MapCanvas from "../../../editor/MapCanvas.svelte";
    import BrushPreview from "./BrushPreview.svelte";
    import BrushSettings from "./BrushSettings.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;

    let bodyEl: HTMLDivElement;

    const context: MapEditorContext = getContext("context");
    const editingBrush = context.editingBrush;
    const data = context.data;
    const tilesetData = $data.tilesets;
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
                                brush: $editingBrush,
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
                        icon="mdi:close"
                        theme="transparent"
                        title="Close"
                        on:click={() => {
                            $editingBrush = null;
                            state = SidebarState.Palette;
                        }}
                    />
                </div>
            </div>
            <div class="editor" bind:this={bodyEl}>
                <MapCanvas
                    blocks={$editingBrush.blocks}
                    centerOnResize={true}
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
