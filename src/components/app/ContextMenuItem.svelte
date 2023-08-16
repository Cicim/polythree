<script lang="ts">
    import {
        type MenuItem,
        Separator,
        IconOption,
        SubMenuOption,
        TextOption,
        ctxMenu,
        closeContextMenu,
    } from "src/systems/context_menu";
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
        onButtonEnter();

        // Show the submenu
        (<SubMenuOption>item).isVisible = true;
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

        // If the submenu is still out of bounds from the top,
        // move it down all you can and resize it to fit
        if (submenu.offsetTop < 0) {
            submenu.style.top = "20px";
            submenu.style.height = `${window.innerHeight - 40}px`;
        }

        // Scroll to the submenu's top
        submenu.scrollTop = 0;
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
    <span
        class="ctx-item ctx-separator"
        class:with-caption={item.text}
        bind:this={element}
    >
        {#if item.text}
            <span class="ctx-separator-caption">{item.text}</span>
        {/if}
        <hr class="ctx-separator-hr" bind:this={element} />
    </span>
    <!-- Text Button -->
{:else if item instanceof TextOption}
    <button
        bind:this={element}
        on:keydown={keyboardHandler}
        on:mouseenter={onButtonEnter}
        class="ctx-item ctx-text-item"
        on:click={runAction}
    >
        <span />
        <span>{item.text}</span>
        {#if item.keybinding !== ""}
            <span class="keybinding"
                >{#if item.keybinding}{item.keybinding}{/if}</span
            >{/if}
    </button>
    <!-- Icon Button -->
{:else if item instanceof IconOption}
    <button
        bind:this={element}
        on:keydown={keyboardHandler}
        on:mouseenter={onButtonEnter}
        class="ctx-item ctx-icon-item"
        on:click={runAction}
    >
        <iconify-icon class="ctx-icon" icon={item.icon} />
        <span>{item.text}</span>
        {#if item.keybinding !== ""}
            <span class="keybinding">{item.keybinding}</span>{/if}
    </button>
    <!-- Sub Menu Button -->
{:else if item instanceof SubMenuOption}
    <button
        bind:this={element}
        on:keydown={keyboardHandler}
        on:mouseenter={openSubMenu}
        class="ctx-item ctx-submenu-item"
    >
        <span />
        <span>{item.text}</span>
        <iconify-icon icon="ep:arrow-right-bold" />
        <!-- Submenu -->
        <div
            class:hidden={!item.isVisible}
            class="submenu ctx-menu hidden"
            bind:this={submenu}
        >
            <div class="submenu-container">
                {#each item.menu.items as subitem}
                    <svelte:self item={subitem} level={level + 1} />
                {/each}
            </div>
        </div>
    </button>
{/if}

<style lang="scss">
    .ctx-item {
        font-size: 14px;
        font-family: "Rubik";

        &:not(.ctx-separator) {
            --padding: 0.5em 8px;
            --left-padding: 28px;

            min-width: 160px;
            max-width: 400px;
            border-radius: 4px;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            text-align: left;
            background: var(--ctx-bg);
            color: var(--ctx-fg);
            cursor: pointer;

            &:hover {
                background: var(--ctx-bg-hover);
                color: var(--ctx-fg-hover);
                box-shadow: inset 0 0 0 1px var(--ctx-outline-hover) !important;
            }
            &:focus {
                outline: none;
            }
        }
    }

    .keybinding {
        color: var(--weak-fg);
        padding-left: var(--left-padding) !important;
    }

    .ctx-text-item {
        border: none;
        padding: var(--padding);
        display: grid;
        grid-template-columns: var(--left-padding) 1fr min-content;
    }

    .ctx-icon-item {
        border: none;
        padding: var(--padding);
        display: grid;
        grid-template-columns: var(--left-padding) 1fr min-content;

        & iconify-icon.ctx-icon {
            width: 1em;
            height: 1em;
            padding-right: calc(0.5em - 2px);
            transform: scale(1.4);
            place-self: center;
        }
    }

    .ctx-submenu-item {
        display: grid;
        padding: var(--padding);
        grid-template-columns: var(--left-padding) 1fr min-content;
        border: none;

        align-items: center;
    }

    .ctx-separator {
        width: 100%;
        min-width: 100px;

        &.with-caption {
            margin-top: var(--chonkiness);
        }

        & .ctx-separator-hr {
            border: 1px solid var(--light-shadow);
            border-top: none;
            margin: 0.3em;
        }

        & .ctx-separator-caption {
            color: var(--weak-fg);
            font-style: italic;
            margin: 0.4em;
        }
    }

    .submenu {
        position: fixed;

        display: flex;
        flex-direction: column;

        overflow: auto;

        &::-webkit-scrollbar {
            width: 6px;
            background: var(--sel-bg);
        }
        &::-webkit-scrollbar-thumb {
            background: var(--light-shadow);

            &:hover {
                background: var(--medium-shadow);
            }
            &:active {
                background: var(--accent-shadow);
            }
        }

        &.hidden {
            display: none;
        }
    }
</style>
