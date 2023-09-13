<script lang="ts">
    import { getActionEnabledStore } from "src/systems/bindings";
    import {
        type MenuItem,
        MenuOption,
        Separator,
        IconOption,
        SubMenuOption,
        TextOption,
        ctxMenu,
        closeContextMenu,
    } from "src/systems/context_menu";
    import { activeView } from "src/systems/views";
    import { tick } from "svelte";
    import { readable, type Writable } from "svelte/store";

    /** The original menuitem this button or separator is created from */
    export let item: MenuItem;
    /** How deep in submenus this item is in */
    export let level: number = 0;
    item.level = level;
    /** The top level menu's selected option */
    export let selectedOption: Writable<MenuItem>;
    /** True if the currently selected item is this item */
    $: selected = $selectedOption === item;
    /** The element of this option */
    let optionEl: HTMLElement;
    /** Store that is false if the button is disabled */
    let enabled = readable(true);
    // Get the above store if it exists
    if (item instanceof MenuOption) {
        if (item.actionId !== null) {
            enabled = getActionEnabledStore(item.actionId, $activeView);
        }
    }

    // ANCHOR Methods for submenus

    /** The submenu of this item */
    let submenuEl: HTMLDivElement;
    /** Writable that stores whether the submenu is open or not */
    let isOpen = (<SubMenuOption>item).isOpen;

    /** Opens this option's submenu. Runs only when `item instanceof SubMenuItem` */
    async function openSubMenu() {
        // Show the submenu
        submenuEl.style.top = "0px";
        submenuEl.style.left = "0px";
        await tick();

        // Get the element's bounding rect
        let rect = optionEl.getBoundingClientRect();

        // Get the value of the css chonkiness variable
        let chonkiness = parseInt(
            getComputedStyle(optionEl).getPropertyValue("--chonkiness").trim()
        );

        // Set the submenu's position
        submenuEl.style.top = `${rect.top - chonkiness}px`;
        submenuEl.style.left = `${rect.right}px`;

        // Move back inbounds if it's outside the window
        if (submenuEl.offsetLeft + submenuEl.offsetWidth > window.innerWidth) {
            submenuEl.style.left = `${rect.left - submenuEl.offsetWidth}px`;
        }

        // Move back inbounds if it's outside the window
        if (submenuEl.offsetTop + submenuEl.offsetHeight > window.innerHeight) {
            submenuEl.style.top = `${rect.bottom - submenuEl.offsetHeight}px`;
        }

        // If the submenu is still out of bounds from the top,
        // move it down all you can and resize it to fit
        if (submenuEl.offsetTop < 0) {
            submenuEl.style.top = "20px";
            submenuEl.style.height = `${window.innerHeight - 40}px`;
        }

        // Scroll to the submenu's top
        submenuEl.scrollTop = 0;
    }

    $: {
        // If the submenu is open, open it
        if (isOpen) {
            if ($isOpen) openSubMenu();
        }
    }

    function keyboardHandler(event: KeyboardEvent) {
        event.preventDefault();
    }
</script>

<!-- Separator -->
{#if item instanceof Separator}
    <span
        class="ctx-item ctx-separator"
        class:with-caption={item.text}
        bind:this={optionEl}
    >
        {#if item.text}
            <span class="ctx-separator-caption">{item.text}</span>
        {/if}
        <hr class="ctx-separator-hr" bind:this={optionEl} />
    </span>
    <!-- Text Button -->
{:else if item instanceof TextOption}
    <button
        bind:this={optionEl}
        on:keydown={keyboardHandler}
        on:mouseenter={() => $ctxMenu.select(item)}
        class="ctx-item ctx-text-item"
        class:selected
        on:click={() => item.callAction()}
        disabled={!$enabled}
        tabindex="-1"
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
        bind:this={optionEl}
        on:keydown={keyboardHandler}
        on:mouseenter={() => $ctxMenu.select(item)}
        class="ctx-item ctx-icon-item"
        class:selected
        on:click={() => item.callAction()}
        disabled={!$enabled}
        tabindex="-1"
    >
        <iconify-icon class="ctx-icon" icon={item.icon} />
        <span>{item.text}</span>
        {#if item.keybinding !== ""}
            <span class="keybinding">{item.keybinding}</span>{/if}
    </button>
    <!-- Sub Menu Button -->
{:else if item instanceof SubMenuOption}
    <button
        bind:this={optionEl}
        on:keydown={keyboardHandler}
        on:mouseenter={() => $ctxMenu.select(item)}
        class="ctx-item ctx-submenu-item"
        class:selected={$isOpen || selected}
        tabindex="-1"
    >
        <span />
        <span>{item.text}</span>
        <iconify-icon icon="ep:arrow-right-bold" />
    </button>
    <!-- Submenu -->
    <div
        class:hidden={!$isOpen}
        class="submenu ctx-menu"
        bind:this={submenuEl}
        on:mouseleave={($selectedOption = null)}
    >
        <div class="submenu-container">
            {#each item.menu.items as subitem (subitem.id)}
                <svelte:self
                    item={subitem}
                    level={level + 1}
                    {selectedOption}
                />
            {/each}
        </div>
    </div>
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

            &.selected {
                background: var(--ctx-bg-hover);
                color: var(--ctx-fg-hover);
                box-shadow: inset 0 0 0 1px var(--ctx-outline-hover) !important;
            }

            &[disabled] {
                background: var(--ctx-bg-disabled) !important;
                color: var(--ctx-fg-disabled) !important;
                box-shadow: inset 0 0 0 1px var(--ctx-outline-disabled) !important;
                outline: none;

                &.selected {
                    outline: 2fpx solid var(--ctx-outline-hover) !important;
                    outline-offset: -1px;
                }
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

        .ctx-icon {
            width: 1em;
            height: 1em;
            padding-right: calc(0.5em - 2px);
            transform: scale(1.25) translateY(-0.0625em);
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
