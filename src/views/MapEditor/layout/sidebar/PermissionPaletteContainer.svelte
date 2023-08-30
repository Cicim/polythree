<script lang="ts">
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import PermissionPalette from "../PermissionPalette.svelte";

    export let permissionMode: boolean;
    export let state: SidebarState;

    let permPalette: PermissionPalette;

    export function moveOnPalette(dirX: number, dirY: number, select: boolean) {
        permPalette.moveOnPalette(dirX, dirY, select);
    }
</script>

<div
    class="permission-palette-view"
    class:flexed={!permissionMode}
    class:hidden={!permissionMode && state !== SidebarState.BrushPermissions}
    use:resizeY={{
        maxHeight: () => Math.min(176, window.innerHeight * 0.33),
        minHeight: () => window.innerHeight * 0.1,
        startHeight: 176,
    }}
>
    <div class="permission-palette-container">
        <PermissionPalette bind:this={permPalette} />
    </div>
    <div class="resize-handle top" class:hidden={!permissionMode} />
</div>

<style lang="scss">
    .permission-palette-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
        overflow: hidden;

        &.flexed {
            flex: 1;
        }

        .permission-palette-container {
            overflow-y: auto;
        }
    }
</style>
