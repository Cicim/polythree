<script lang="ts">
    import { tooltip } from "src/systems/tooltip";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let icon: string;
    export let title: string = "";

    export let disabled: boolean = false;
    export let theme: "primary" | "secondary" | "transparent" = "primary";

    export let value: string = null;
    export let group: string = null;

    function onClick(event: MouseEvent) {
        if (group !== null) group = value;
        dispatch("click", event);
    }
</script>

<button
    on:click={onClick}
    use:tooltip
    tooltip={title}
    class="toolbar-button"
    class:selected={group !== null && group === value}
    class:primary={theme === "primary"}
    class:secondary={theme === "secondary"}
    class:transparent={theme === "transparent"}
    {disabled}
>
    <iconify-icon inline {icon} />
</button>

<style lang="scss">
    .toolbar-button {
        width: 32px;
        height: 32px;

        cursor: pointer;

        transition: 50ms ease-out;

        &.primary {
            --bg: var(--btn-primary-bg);
            --border: var(--btn-primary-border);
            --fg: var(--btn-primary-fg);
            --bg-hover: var(--btn-primary-bg-hover);
            --border-hover: var(--btn-primary-border-hover);
            --fg-hover: var(--btn-primary-fg-hover);
            --fg-active: var(--fg-hover);
            --fg-selected: var(--accent-fg);
            --bg-disabled: var(--btn-primary-bg-disabled);
            --border-disabled: var(--btn-primary-border-disabled);
            --fg-disabled: var(--btn-primary-fg-disabled);
        }
        &.secondary {
            --bg: var(--btn-secondary-bg);
            --border: var(--btn-secondary-border);
            --fg: var(--btn-secondary-fg);
            --bg-hover: var(--btn-secondary-bg-hover);
            --border-hover: var(--btn-secondary-border-hover);
            --fg-hover: var(--btn-secondary-fg-hover);
            --fg-active: var(--fg-hover);
            --fg-selected: var(--btn-primary-bg);
            --bg-disabled: var(--btn-secondary-bg-disabled);
            --border-disabled: var(--btn-secondary-border-disabled);
            --fg-disabled: var(--btn-secondary-fg-disabled);
        }
        &.transparent {
            --bg: transparent;
            --border: transparent;
            --fg: var(--weak-fg);
            --bg-hover: transparent;
            --border-hover: transparent;
            --fg-hover: var(--main-fg);
            --fg-active: var(--accent-fg);
            --bg-disabled: transparent;
            --border-disabled: transparent;
            --fg-disabled: var(--light-shadow);
        }

        background: var(--bg);
        border: 1px solid var(--border);
        color: var(--fg);

        iconify-icon {
            display: flex;
            justify-content: center;
            align-items: center;
            transform: scale(1.4);
        }

        &.selected {
            cursor: default;
            background: var(--bg-hover);
            border: 1px solid var(--border-hover);
            iconify-icon {
                color: var(--fg-selected);
            }
        }

        &:focus {
            outline: 1px solid var(--accent-fg);
            outline-offset: -1px;
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
