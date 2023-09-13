<script lang="ts">
    import ContextMenuItem from "./ContextMenuItem.svelte";
    import {
        MenuOption,
        closeContextMenu,
        ctxMenu,
        ctxMenuRecreated,
    } from "src/systems/context_menu";

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

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") closeContextMenu();
        if (event.key === "Tab") event.preventDefault();
        if (event.key === "Enter")
            (<MenuOption>$ctxMenu.$selectedOption)?.callAction?.();

        if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            $ctxMenu.navigate(event.key.slice(5).toLowerCase() as any);
        }
    }
</script>

<svelte:window
    on:contextmenu|preventDefault={() => null}
    on:resize={() => closeContextMenu()}
    on:mousedown={onClickOutside}
    on:keydown={handleKeydown}
/>

<dialog id="ctx-menu" class="ctx-menu">
    {#key $ctxMenuRecreated}
        <div id="ctx-list">
            {#each $ctxMenu.items as item (item.id)}
                <ContextMenuItem
                    {item}
                    selectedOption={$ctxMenu.selectedOption}
                />
            {/each}
        </div>
    {/key}
</dialog>

<style lang="scss">
    :global(.ctx-menu) {
        background: var(--ctx-bg);
        color: var(--ctx-fg);

        margin: 0;
        padding: var(--chonkiness) var(--chonkiness);
        border-radius: var(--chonkiness);
        border: 1px solid var(--light-shadow);
        box-shadow: 1px 1px 0 var(--light-shadow);
        user-select: none;
    }

    @keyframes open {
        from {
            transform: scaleY(0.8);
            opacity: 0;
        }
        to {
            transform: scaleY(1);
            opacity: 1;
        }
    }

    #ctx-menu {
        --chonkiness: 4px;

        position: fixed;
        top: 0;
        left: 0;

        animation: ease-in-out 0.1s open;
        transform-origin: 0 0;
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
