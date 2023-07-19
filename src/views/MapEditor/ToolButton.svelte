<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let icon: string;
    export let title: string;

    export let value: string = "a";
    export let group: string = "b";

    function onClick(event: MouseEvent) {
        group = value;
        dispatch("click", event);
    }
</script>

<button
    on:click={onClick}
    title={`${title}${group === value ? " (selected)" : ""}`}
    class="toolbar-button"
    class:selected={group === value}
>
    <iconify-icon {icon} />
</button>

<style lang="scss">
    .toolbar-button {
        width: 32px;
        height: 32px;

        cursor: pointer;

        transition: 50ms ease-out;

        background: var(--btn-primary-bg);
        border: 1px solid var(--btn-primary-border);
        color: var(--btn-primary-color);

        iconify-icon {
            display: flex;
            justify-content: center;
            align-items: center;
            transform: scale(1.4);
        }

        &.selected {
            cursor: default;
            background: var(--btn-primary-bg-hover);
            border: 1px solid var(--btn-primary-border-hover);
            iconify-icon {
                color: var(--accent-fg);
            }
        }

        &:not(.selected) {
            &:hover {
                background: var(--btn-primary-bg-hover);
                border: 1px solid var(--btn-primary-border-hover);
                iconify-icon {
                    color: var(--btn-primary-color-hover);
                }
            }

            &:active {
                background: var(--btn-primary-bg);
                iconify-icon {
                    color: var(--accent-fg);
                }
            }

            &:focus {
                outline: 1px solid var(--accent-fg);
                outline-offset: -1px;
            }
        }
    }
</style>
