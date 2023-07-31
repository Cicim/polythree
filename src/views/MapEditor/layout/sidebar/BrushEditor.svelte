<script lang="ts">
    import type { MapEditorContext, MapEditorData } from "src/views/MapEditor";
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import { getContext } from "svelte";
    import ToolButton from "../../ToolButton.svelte";
    import MapCanvas from "../../editor/MapCanvas.svelte";
    import Input from "src/components/Input.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;

    const context: MapEditorContext = getContext("context");
    const editingBrush = context.editingBrush;
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
                        icon="quill:meatballs-v"
                        theme="transparent"
                        title="Brush Type"
                    />
                </div>
                <div
                    class="center"
                    style="place-content: stretch; place-items: stretch;"
                >
                    <Input
                        placeholder="Brush Name"
                        bind:value={$editingBrush.name}
                    />
                </div>
                <div class="right">
                    <ToolButton
                        icon="mdi:close"
                        theme="transparent"
                        title="close"
                        on:click={() => {
                            $editingBrush = null;
                            state = SidebarState.Palette;
                        }}
                    />
                </div>
            </div>
            <div class="brush-body">
                <MapCanvas
                    blocks={$editingBrush.blocks}
                    centerOnResize={true}
                />
            </div>
            <div class="brush-settings">Settings</div>
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
            grid-template-rows: min-content minmax(0, 1fr) min-content;

            .topbar .center {
                align-items: stretch;

                :global(input) {
                    width: 100%;
                }
            }

            .brush-body {
                :global(canvas) {
                    max-width: 100%;
                }
            }

            .brush-settings {
                box-shadow: 0 -1px 1px var(--light-shadow);
            }
        }
    }
</style>
