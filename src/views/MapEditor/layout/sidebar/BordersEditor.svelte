<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import { getContext, onMount } from "svelte";
    import ToolButton from "../../ToolButton.svelte";
    import MapCanvas from "../../editor/MapCanvas.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;
    let mapCanvas: MapCanvas;

    const context: MapEditorContext = getContext("context");
    const data = context.data;
    const borders = $data.layout.border_data;

    onMount(() => {
        context.map.bordersCanvas = mapCanvas;
    });
</script>

<div
    class="borders-view"
    class:hidden={levelMode || state !== SidebarState.Borders}
    use:resizeY={{
        minHeight: () => window.innerHeight * 0.1,
        maxHeight: () => window.innerHeight * 0.33,
        startHeight: 200,
    }}
>
    <div class="topbar">
        <div class="center">Map Border</div>
        <div class="right">
            <ToolButton
                icon="mdi:close"
                title="Close"
                on:click={() => (state = SidebarState.Palette)}
                theme="transparent"
            />
        </div>
    </div>
    <div class="borders-container">
        <MapCanvas
            bind:this={mapCanvas}
            allowAnimations={true}
            blocks={borders}
            centerOnResize={true}
            allowPan={false}
            allowZoom={false}
        />
    </div>
    <div class="resize-handle top" />
</div>

<style lang="scss">
    .borders-view {
        display: grid;
        grid-template-rows: max-content minmax(0, 1fr) 0;

        .borders-container {
            display: grid;
            position: relative;
            padding: 16px;
            width: calc(100% - 32px);
            height: calc(100% - 32px);
        }
    }
</style>
