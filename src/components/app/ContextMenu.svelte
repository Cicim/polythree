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
    :global(.ctx-menu) {
        background: var(--ctx-bg);
        color: var(--ctx-fg);

        margin: 0;
        padding: var(--chonkiness) var(--chonkiness);
        border-radius: var(--chonkiness);
        border: 1px solid var(--light-shadow);
        box-shadow: 2px 2px 0 var(--light-shadow);
        user-select: none;
    }
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
