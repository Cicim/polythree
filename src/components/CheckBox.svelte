<script lang="ts">
    import type { NavigatePath } from "src/systems/navigate";
    import type { Writable } from "svelte/store";

    type IconTypes = "tick" | "cross" | "line" | "plus";

    export let checked: boolean = false;
    export let disabled: boolean = false;
    export let icon: IconTypes = "tick";
    // export let edits: NavigatePath | Writable<boolean | number> = null;
</script>

<label class={`component icon-${icon}`}>
    <input {disabled} type="checkbox" bind:checked on:change />
    <span class={`checkmark ${disabled ? "disabled" : ""}`} />
    <slot />
</label>

<style lang="scss">
    .component {
        box-sizing: content-box;
        display: inline-block;
        position: relative;
        padding-left: 1.5em;
        width: fit-content;
        margin: 4px;

        input {
            display: block;
            position: absolute;
            width: 0;
            height: 0;
        }

        &:hover input ~ .checkmark {
            background: var(--check-bg-hover);
            border-color: var(--check-border-hover);
        }
        input:checked ~ .checkmark {
            background-color: var(--check-checked-bg);
            border-color: var(--check-checked-border);
            color: var(--check-checked-fg);
        }
        input:checked:hover ~ .checkmark {
            background-color: var(--check-checked-bg-hover);
            border-color: var(--check-checked-border-hover);
        }
        input:focus ~ .checkmark {
            outline: 1px solid var(--outline);
            outline-offset: 1px;
        }
    }

    .checkmark {
        position: absolute;

        bottom: 0;
        left: 0;
        border-radius: 4px;
        border: 2px solid var(--check-border);

        background: var(--check-bg);

        transition: background 0.1s ease-out;

        height: 1em;
        width: 1em;

        &.disabled {
            background: var(--check-bg-disabled) !important;
            color: var(--check-color-disabled) !important;
            border-color: var(--check-border-disabled) !important;
        }
    }

    /* Create the checkmark/indicator (hidden when not checked) */
    .checkmark:after {
        content: "";
        position: relative;
        display: none;
    }

    .component input:checked ~ .checkmark:after {
        display: block;
        font-size: 1em;
        border-color: var(--cx-checked-color);
        color: var(--cx-checked-color);
    }
    .component input:checked ~ .checkmark:after {
        border-color: var(--cx-checked-color-disabled);
        color: var(--cx-checked-color-disabled);
    }
    .component.icon-tick .checkmark:after {
        left: 34%;
        top: 10%;
        width: 24%;
        height: 50%;
        border-style: solid;

        border-width: 0 0.1em 0.1em 0;
        transform: rotate(45deg);
    }
    .component.icon-line .checkmark:after {
        left: 16.6%;
        top: 45%;
        width: 66.6%;
        border-bottom-style: solid;
        border-width: 0 0 0.1em 0;
    }
    .component.icon-cross .checkmark:after {
        top: -22%;
        bottom: 0;
        left: 0;
        right: 0;
        content: "\00D7";

        text-align: center;
        position: relative;
    }
    .component.icon-plus .checkmark:after {
        top: -22%;
        bottom: 0;
        left: 4%;
        right: 0;
        content: "\00D7";

        transform: rotate(45deg);
        text-align: center;
        position: relative;
    }
</style>
