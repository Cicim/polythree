<script lang="ts">
    import "iconify-icon";
    import {
        type MenuItem,
        Separator,
        IconButton,
        SubMenuButton,
        TextButton,
        ctxMenu,
        closeContextMenu,
    } from "../systems/context_menu";
    import { tick } from "svelte";

    /** The menu item this component represents */
    export let item: MenuItem;
    /** The level of this item */
    export let level: number = 0;
    /** The element of this item */
    let element: HTMLElement;

    // ANCHOR Methods for submenus

    /** The submenu of this item */
    let submenu: HTMLDivElement;

    let openSubMenu = async () => {
        // Shake the menu
        closeSubMenus();

        // Show the submenu
        (<SubMenuButton>item).isVisible = true;
        await tick();

        // Get the element's bounding rect
        let rect = element.getBoundingClientRect();

        // Set the submenu's position
        submenu.style.top = `${rect.top - 8}px`;
        submenu.style.left = `${rect.right}px`;

        // Move back inbounds if it's outside the window
        if (submenu.offsetLeft + submenu.offsetWidth > window.innerWidth) {
            submenu.style.left = `${rect.left - submenu.offsetWidth}px`;
        }

        // Move back inbounds if it's outside the window
        if (submenu.offsetTop + submenu.offsetHeight > window.innerHeight) {
            submenu.style.top = `${rect.bottom - submenu.offsetHeight}px`;
        }
    };

    function closeSubMenus() {
        // Close all submenus
        ctxMenu.update((menu) => menu.shake(level));
    }

    function runAction() {
        ctxMenu.update((menu) => menu.shake(level));
        // @ts-ignore
        item.action();
        // Close the context menu
        closeContextMenu();
    }
</script>

<!-- Separator -->
{#if item instanceof Separator}
    <hr class="ctx-item ctx-separator" bind:this={element} />
    <!-- Text Button -->
{:else if item instanceof TextButton}
    <button
        bind:this={element}
        on:mouseenter={closeSubMenus}
        class="ctx-item ctx-text-item"
        on:click={runAction}>{item.text}</button
    >
    <!-- Icon Button -->
{:else if item instanceof IconButton}
    <button
        bind:this={element}
        on:mouseenter={closeSubMenus}
        class="ctx-item ctx-icon-item"
        on:click={runAction}
    >
        <iconify-icon icon={item.icon} height="20px" />
        <span>{item.text}</span>
    </button>
    <!-- Sub Menu Button -->
{:else if item instanceof SubMenuButton}
    <button
        bind:this={element}
        on:mouseenter={openSubMenu}
        class="ctx-item ctx-submenu-item"
    >
        <span>{item.text}</span>
        <iconify-icon icon="eva:arrow-ios-forward-fill" height="16px" />
    </button>

    <div
        class:hidden={!item.isVisible}
        class="submenu ctx-menu hidden"
        bind:this={submenu}
    >
        {#each item.menu.items as subitem}
            <svelte:self item={subitem} level={level + 1} />
        {/each}
    </div>
{/if}

<style type="scss">
    .ctx-item {
        &:not(.ctx-separator) {
            min-width: 160px;
            max-width: 400px;
            padding: 4px 8px;
            padding-left: 32px;
            border-radius: 4px;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            text-align: left;
            background: var(--ctx-bg);
            color: var(--ctx-fg);

            &:focus,
            &:hover {
                outline: none;
                background: var(--main-bg);
                outline: 1px solid var(--strong-bg);
                color: var(--accent-fg);
            }
        }
    }

    .ctx-text-item {
        border: none;
    }

    .ctx-icon-item {
        border: none;

        & iconify-icon {
            position: absolute;
            transform: translateX(-28px) translateY(-4px);
        }
    }

    .ctx-submenu-item {
        display: grid;
        grid-template-columns: 1fr min-content;
        border: none;

        align-items: center;

        & iconify-icon {
            width: min-content;
        }
    }

    .ctx-separator {
        width: 100%;
        min-width: 100px;
        border: 1px solid var(--light-shadow);
        border-top: none;
    }

    .submenu {
        position: fixed;
        top: 0;
        left: 0;

        display: flex;
        flex-direction: column;

        &.hidden {
            display: none;
        }
    }
</style>
