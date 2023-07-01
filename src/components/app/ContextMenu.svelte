<script lang="ts">
    import ContextMenuItem from "./ContextMenuItem.svelte";
    import { closeContextMenu, ctxMenu } from "src/systems/context_menu";

    function onClickOutside(event: MouseEvent) {
        // Get the dialog element's bounding rectangle
        const rect = (event.target as HTMLElement).getBoundingClientRect();

        // Check if the click was outside the dialog
        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        ) {
            closeContextMenu();
        }
    }
</script>

<svelte:window
    on:contextmenu|preventDefault={() => null}
    on:resize={() => closeContextMenu()}
    on:mousedown={(e) => onClickOutside(e)}
/>

<dialog id="ctx-menu" class="ctx-menu">
    <div id="ctx-list">
        {#each $ctxMenu.items as item}
            <ContextMenuItem {item} />
        {/each}
    </div>
</dialog>

<style lang="scss">
    #ctx-menu {
        --chonkiness: 4px;

        position: fixed;
        top: 0;
        left: 0;

        z-index: 1000000;

        &::backdrop {
            background: transparent;
        }

        &:focus {
            outline: none;
        }
    }
    #ctx-list {
        display: flex;
        flex-direction: column;
    }
</style>
