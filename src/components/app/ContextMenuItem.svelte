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
    } from "src/systems/context_menu";
    import { tick } from "svelte";
    import { Bindings } from "src/systems/bindings";

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
        onButtonEnter();

        // Show the submenu
        (<SubMenuButton>item).isVisible = true;
        submenu.style.top = "0px";
        submenu.style.left = "0px";
        await tick();

        // Get the element's bounding rect
        let rect = element.getBoundingClientRect();

        // Get the value of the css chonkiness variable
        let chonkiness = parseInt(
            getComputedStyle(element).getPropertyValue("--chonkiness").trim()
        );

        // Set the submenu's position
        submenu.style.top = `${rect.top - chonkiness}px`;
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

    function onButtonEnter() {
        // Shake the menu
        closeSubMenus();
        // Focus the element
        element.focus();
    }

    function closeSubMenus() {
        // Close all submenus
        ctxMenu.update((menu) => menu.shake(level));
    }

    function runAction() {
        $ctxMenu.shake(0);
        // @ts-ignore
        item.action();
        // Close the context menu
        closeContextMenu();
    }

    function keyboardHandler(event: KeyboardEvent) {
        switch (event.key) {
            case "Tab":
                event.preventDefault();
                break;
        }
    }
</script>

<!-- Separator -->
{#if item instanceof Separator}
    <span class="ctx-item ctx-separator" bind:this={element}>
        {#if item.text}
            <span class="ctx-separator-caption">{item.text}</span>
        {/if}
        <hr class="ctx-separator-hr" bind:this={element} />
    </span>
    <!-- Text Button -->
{:else if item instanceof TextButton}
    <button
        bind:this={element}
        on:keydown={keyboardHandler}
        on:mouseenter={onButtonEnter}
        class="ctx-item ctx-text-item"
        on:click={runAction}
    >
        <span>{item.text}</span>
        {#if item.keybinding !== ""}
            <span class="keybinding"
                >{#if item.keybinding}{Bindings.formatBinding(
                        item.keybinding
                    )}{/if}</span
            >{/if}
    </button>
    <!-- Icon Button -->
{:else if item instanceof IconButton}
    <button
        bind:this={element}
        on:keydown={keyboardHandler}
        on:mouseenter={onButtonEnter}
        class="ctx-item ctx-icon-item"
        on:click={runAction}
    >
        <iconify-icon icon={item.icon} height="20px" />
        <span>{item.text}</span>
        {#if item.keybinding !== ""}
            <span class="keybinding"
                >{Bindings.formatBinding(item.keybinding)}</span
            >{/if}
    </button>
    <!-- Sub Menu Button -->
{:else if item instanceof SubMenuButton}
    <button
        bind:this={element}
        on:keydown={keyboardHandler}
        on:mouseenter={openSubMenu}
        class="ctx-item ctx-submenu-item"
    >
        <span>{item.text}</span>
        <iconify-icon icon="eva:arrow-ios-forward-fill" height="16px" />
        <!-- Submenu -->
        <div
            class:hidden={!item.isVisible}
            class="submenu ctx-menu hidden"
            bind:this={submenu}
        >
            {#each item.menu.items as subitem}
                <svelte:self item={subitem} level={level + 1} />
            {/each}
        </div>
    </button>
{/if}

<style lang="scss">
    .ctx-item {
        &:not(.ctx-separator) {
            min-width: 160px;
            max-width: 400px;
            padding: 0.5em 8px;
            padding-left: 32px;
            border-radius: 4px;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            text-align: left;
            background: var(--ctx-bg);
            color: var(--ctx-fg);

            &:hover {
                background: var(--main-bg);
                outline: 1px solid var(--strong-bg);
                color: var(--accent-fg);
            }
            &:focus {
                outline: none;
            }
        }
    }

    .keybinding {
        float: right;
        text-align: right;
        min-width: 80px;
        color: var(--weak-fg);
        padding-left: 20px;
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

        & .ctx-separator-hr {
            border: 1px solid var(--light-shadow);
            border-top: none;
            margin: 0.4em;

            &:not(:only-child) {
                margin-top: 0.2em;
            }
        }

        & .ctx-separator-caption {
            color: var(--weak-fg);
            font-size: 1.2em;
            margin: 0.4em;
            margin-bottom: 0.2em;
        }
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
