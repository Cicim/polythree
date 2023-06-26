<!-- A library input element -->
<script lang="ts">
    import { getContext } from "svelte";
    import r from "src/systems/navigate";
    import type { Writable } from "svelte/store";
    import type { EditorContext } from "src/systems/editors";

    type InputType = "text" | "number";

    /** The type of the input, used for type inference */
    export let type: InputType = "text";
    export let spellcheck: boolean = false;
    /** The path to the object this input updates */
    export let edits: string = null;

    let data: Writable<any>, context: EditorContext;

    if (edits !== null) {
        data = getContext("data");
        context = getContext("context");
    }

    $: value = edits !== null ? r.get($data, edits) : "";

    function update(
        event: Event & { currentTarget: EventTarget & HTMLInputElement }
    ) {
        if (edits === null) return;

        const value = event.currentTarget.value;

        if (type === "number") {
            let number = parseFloat(value);

            if (isNaN(number)) number = 0;

            context.changes.setValue(edits, number);
        } else {
            context.changes.setValue(edits, value);
        }
    }
</script>

<!-- svelte-ignore a11y-autocomplete-valid -->
<input
    {type}
    {value}
    on:change={(e) => update(e)}
    {spellcheck}
    {...$$restProps}
    autocomplete="no"
/>

<style lang="scss">
    input {
        background: var(--input-bg);
        color: var(--input-fg);
        border: 1px solid var(--input-border);

        cursor: text;
        user-select: none;

        border-radius: 4px;
        padding: 4px 6px;
        margin: 2px;

        &[type="number"] {
            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                position: absolute;
                top: 0;
                right: 1px;
                height: 100%;
            }
        }

        &::-webkit-input-placeholder {
            color: var(--input-placeholder);
        }

        &:focus {
            outline: 1px solid var(--accent-fg);
            outline-offset: 1px;
        }
    }
</style>
