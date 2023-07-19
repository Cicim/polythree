<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let icon: string;
    export let title: string;

    export let value: string;
    export let group: string;

    function onClick(event: MouseEvent) {
        group = value;
        dispatch("click", event);
    }
</script>

<button on:click={onClick} {title} class="toolbar-button">
    <iconify-icon {icon} />
</button>

<style lang="scss">
    .toolbar-button {
        width: 32px;
        height: 32px;
        flex-grow: 0;
        flex-shrink: 0;
        flex: 0 0;

        cursor: pointer;

        transition: 50ms ease-out;

        background: var(--btn-primary-bg);
        border: 1px solid var(--btn-primary-border);
        color: var(--btn-primary-color);

        iconify-icon {
            font-size: 20px;
        }

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
    }
</style>
