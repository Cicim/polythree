<script lang="ts">
    import {
        getActionEnabledStore,
        getActionBindingAndShortcut,
    } from "src/systems/bindings";
    import { tooltip } from "src/systems/tooltip";
    import { createEventDispatcher, getContext } from "svelte";
    import type { EditorContext } from "src/systems/views";
    import { readable } from "svelte/store";

    const dispatch = createEventDispatcher();

    const context: EditorContext = getContext("context");

    export let icon: string;
    export let title: string = "";

    export let disabled: boolean = false;
    export let theme: "primary" | "secondary" | "transparent" | "warning" =
        "primary";

    export let value: string = null;
    export let group: string = null;
    /** Whether the toolbutton is active or not */
    export let active: boolean = false;
    export let rotateOnActive: boolean = false;

    export let action: string = null;
    export let shortcut: string = null;

    let actionCB: (context: EditorContext) => void = null;
    let enabled = readable(true);

    if (action) {
        const actionData = getActionBindingAndShortcut(action);
        if (!actionData) console.error(`Action ${action} not found`);
        else {
            [actionCB, shortcut] = actionData;
        }
        enabled = getActionEnabledStore(action, context);
    }

    function onClick(event: MouseEvent) {
        if (group !== null) group = value;
        dispatch("click", event);
    }
</script>

<button
    on:click={(e) => (actionCB ? actionCB(context) : onClick(e))}
    use:tooltip
    tooltip="{title}{shortcut
        ? `<span class=binding> (${shortcut})</span>`
        : ''}"
    class="small tool-button {theme}"
    class:selected={(group !== null && group === value) || active === true}
    class:active
    class:rotating={active && rotateOnActive}
    disabled={disabled || !$enabled}
>
    <iconify-icon inline {icon} />
</button>

<style lang="scss">
    .tool-button.small {
        width: 32px;
        height: 32px;

        cursor: pointer;

        transition: 50ms ease-out;

        background: var(--bg);
        border: 1px solid var(--border);
        color: var(--fg);

        iconify-icon {
            display: flex;
            justify-content: center;
            align-items: center;
            transform: scale(1.4);
            pointer-events: none;
        }

        &.selected {
            &:not(.active) {
                cursor: default;
            }
            background: var(--bg-hover);
            border: 1px solid var(--border-hover);
            iconify-icon {
                color: var(--fg-selected);
            }

            @keyframes rotate {
                from {
                    transform: rotate(360deg) scale(1.5);
                }
                to {
                    transform: rotate(0deg) scale(1.5);
                }
            }

            &.rotating {
                transition: rotate 2s;
                iconify-icon {
                    animation: rotate 2s linear infinite;
                }
            }
        }

        &:focus {
            outline: none;
        }
        &:not(.selected) {
            &:hover {
                background: var(--bg-hover);
                border: 1px solid var(--border-hover);
                iconify-icon {
                    color: var(--fg-hover);
                }
            }
            &:active {
                outline: none;
                background: var(--bg);
                iconify-icon {
                    color: var(--fg-active);
                }
            }

            &[disabled] {
                cursor: default;
                background: var(--bg-disabled);
                border: 1px solid var(--border-disabled);
                color: var(--fg-disabled);
                iconify-icon {
                    color: var(--fg-disabled);
                }
            }
        }
    }
</style>
