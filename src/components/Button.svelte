<script lang="ts">
    import { tooltip } from "src/systems/tooltip";

    type ButtonTheme = "primary" | "secondary" | "warning";

    export let theme: ButtonTheme = "primary";
    export let disabled: boolean = false;
    export let pressed: boolean = false;
    export let title: string = "";
</script>

<button
    use:tooltip
    tooltip={title}
    {disabled}
    on:click
    class:pressed
    class="button {theme}"
    {...$$restProps}
>
    <slot />
</button>

<style lang="scss">
    .button {
        background: var(--btn-bg);
        color: var(--btn-fg);
        border: 1px solid var(--btn-border);
        box-shadow: 0 1px 2px var(--btn-border);
        font-family: "Rubik";

        cursor: pointer;
        user-select: none;

        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border-radius: 4px;
        padding: 4px 12px;
        margin: 2px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        transition: background 100ms ease-in-out, transform 0.1s ease-out,
            box-shadow 0.1s ease-out, outline 0.2s ease-out,
            color 100ms ease-in-out;

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
                outline: 1px solid var(--outline);
                outline-offset: 1px;
            }
            &:active,
            &.pressed {
                background: var(--btn-bg-hover);
                color: var(--btn-fg-hover);
                border-color: var(--btn-border-hover);
                box-shadow: 0 1px 2px var(--btn-border-hover);
                box-shadow: none;
                transform: translateY(2px);
            }
            &:active {
                outline: none !important;
            }
        }
    }
</style>
