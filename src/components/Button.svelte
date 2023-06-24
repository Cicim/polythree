<script lang="ts">
    type ButtonColor = "primary" | "secondary";

    export let color: ButtonColor = "primary";

    let element: HTMLButtonElement;
</script>

<button
    bind:this={element}
    on:click
    class="button {color}"
    {...$$restProps}
>
    <slot />
</button>

<style lang="scss">
    .button.secondary {
        --btn-bg: var(--btn-secondary-bg);
        --btn-bg-hover: var(--btn-secondary-bg-hover);
        --btn-border: var(--btn-secondary-border);
        --btn-border-hover: var(--btn-secondary-border-hover);
        --btn-fg: var(--btn-secondary-fg);
        --btn-fg-hover: var(--btn-secondary-fg-hover);
        --btn-bg-disabled: var(--btn-secondary-bg-disabled);
        --btn-fg-disabled: var(--btn-secondary-fg-disabled);
        --btn-border-disabled: var(--btn-secondary-border-disabled);
    }

    .button.primary {
        --btn-bg: var(--btn-primary-bg);
        --btn-bg-hover: var(--btn-primary-bg-hover);
        --btn-border: var(--btn-primary-border);
        --btn-border-hover: var(--btn-primary-border-hover);
        --btn-fg: var(--btn-primary-fg);
        --btn-fg-hover: var(--btn-primary-fg-hover);
        --btn-bg-disabled: var(--btn-primary-bg-disabled);
        --btn-fg-disabled: var(--btn-primary-fg-disabled);
        --btn-border-disabled: var(--btn-primary-border-disabled);
    }

    .button {
        background: var(--btn-bg);
        color: var(--btn-fg);
        border: 1px solid var(--btn-border);
        box-shadow: 0 1px 2px var(--btn-border);

        cursor: pointer;
        user-select: none;

        border-radius: 4px;
        padding: 4px 12px;
        margin: 2px;

        transition: background 50ms ease-in-out, transform 0.1s ease-out,
            box-shadow 0.1s ease-out, outline 0.2s ease-out;

        &[disabled] {
            --btn-bg: var(--btn-bg-disabled);
            --btn-fg: var(--btn-fg-disabled);
            --btn-border: var(--btn-border-disabled);
            cursor: not-allowed;
        }

        &:not([disabled]) {
            &:hover,
            &:focus {
                background: var(--btn-bg-hover);
                color: var(--btn-fg-hover);
                border-color: var(--btn-border-hover);
                box-shadow: 0 1px 2px var(--btn-border-hover);
            }
            &:hover {
                outline: none !important;
            }
            &:focus {
                outline: 1px solid var(--accent-fg);
                outline-offset: 1px;
            }
            &:active {
                outline: none !important;
                box-shadow: none;
                transform: translateY(2px);
            }
        }
    }
</style>
