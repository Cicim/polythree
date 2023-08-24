<script lang="ts">
    import { getActionsShortcut } from "src/systems/bindings";
    import { showContextMenu, Menu } from "src/systems/context_menu";
    import { tooltip } from "src/systems/tooltip";
    import type { EditorContext } from "src/systems/views";
    import { getContext } from "svelte";

    const context: EditorContext = getContext("context");

    export let smallChevron: boolean = false;
    export let text: string = "";
    export let title: string = "";
    export let moreActionString: string = "More actions...";
    export let theme: "primary" | "secondary" | "transparent" | "warning" =
        "primary";
    export let icon: string = null;
    export let menu: Menu = null;
    export let action: string = null;
    export let shortcut: string = null;
    let actionCallback: (context: EditorContext) => void = null;

    if (action) {
        const actionData = getActionsShortcut(action);
        if (!action) console.error(`No action found for shortcut ${action}`);
        else {
            [actionCallback, shortcut] = actionData;
        }
    }

    let chevronButton: HTMLButtonElement;

    function openContextMenu() {
        showContextMenu(chevronButton, menu);
    }
</script>

<div class="large tool-button {theme}" class:small-chevron={smallChevron}>
    <button
        class="text"
        use:tooltip
        tooltip={`${title} ${
            shortcut ? `<span class=binding>(${shortcut})</span>` : ""
        }`}
        on:click
        on:click={() => (actionCallback ? actionCallback(context) : null)}
    >
        {#if icon}
            <iconify-icon {icon} class="icon" inline />
        {/if}
        {text}
    </button>
    {#if menu}
        <div class="separator" />
        <button
            class="more"
            bind:this={chevronButton}
            use:tooltip
            tooltip={moreActionString}
            on:click={openContextMenu}
        >
            <iconify-icon class="icon" icon="mdi:chevron-down" />
        </button>
    {/if}
</div>

<style lang="scss">
    .large.tool-button {
        min-width: max-content;
        height: 32px;
        background: var(--bg);

        display: flex;
        flex-flow: row nowrap;
        border-radius: 2px;

        iconify-icon {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        button {
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--fg) !important;

            display: flex;
            align-items: center;
            gap: 6px;
            color: inherit;
            cursor: pointer;
            border-radius: 2px;

            outline: none !important;

            .icon {
                font-size: 20px !important;
            }
            font-size: 14px;

            &:hover,
            &:focus {
                background: var(--bg-hover);
                border-color: var(--border-hover);
                color: var(--fg-hover) !important;
            }
            &:active {
                background: var(--bg-hover);
                background: var(--bg);
                border-color: var(--border);
            }
        }

        .text {
            padding: 0 10px;
        }

        .more {
            padding: 0 2px;
        }

        .separator {
            background: var(--light-shadow);
            width: 1px;
            height: 75%;
            align-self: center;
        }

        &.small-chevron {
            .text {
                padding-left: 2px;
                padding-right: 6px;
            }
            .more,
            .separator {
                padding: 0;
            }
        }
    }
</style>
