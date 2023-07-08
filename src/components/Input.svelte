<!-- A library input element -->
<script lang="ts">
    import { createEventDispatcher, getContext, onDestroy } from "svelte";
    import r from "src/systems/navigate";
    import type { Unsubscriber, Writable } from "svelte/store";
    import type { EditorContext } from "src/systems/contexts";

    type InputType = "text" | "number";

    /** The type of the input, used for type inference */
    export let type: InputType = "text";
    export let spellcheck: boolean = false;
    /** The path to the object this input updates or the writable store */
    export let edits: string = null;
    export let value: string | number = "";

    export let min: number = Number.MIN_SAFE_INTEGER;
    export let max: number = Number.MAX_SAFE_INTEGER;

    let data: Writable<any>, context: EditorContext, unsub: Unsubscriber;

    const dispatch = createEventDispatcher();

    // Initalize the data and context variables
    // for the data editing
    if (edits !== null) {
        data = getContext("data");
        context = getContext("context");
        value = r.get($data, edits) as string | number;
    }

    function onChange(
        event: Event & { currentTarget: EventTarget & HTMLInputElement }
    ) {
        const newValue = event.currentTarget.value;

        if (type === "number") {
            let number = parseInt(newValue);

            if (number < min) number = min;
            if (number > max) number = max;

            if (isNaN(number)) number = 0;

            if (edits !== null) {
                context.changes.setValue(edits as string, number);
            } else {
                value = number;
            }
        } else {
            if (edits !== null) {
                context.changes.setValue(edits as string, newValue);
            } else {
                value = newValue;
            }
        }
    }

    function onKeyDown(event: KeyboardEvent) {
        // Is a Dot
        if (
            type === "number" &&
            (event.code === "Period" ||
                event.code === "KeyE" ||
                event.code === "Comma")
        ) {
            event.preventDefault();
        }

        if (event.code === "Delete") event.stopPropagation();
    }

    function onKeyUp(event: KeyboardEvent) {
        if (event.code === "Enter") {
            dispatch("submit", {
                value: (event.currentTarget as HTMLInputElement).value,
            });
        }
    }

    // If the data is being edited, update the value
    // when the data changes
    if (edits !== null) {
        unsub = data.subscribe((newData) => {
            value = r.get(newData, edits) as string | number;
        });
    }

    onDestroy(() => {
        if (unsub) unsub();
    });
</script>

<!-- svelte-ignore a11y-autocomplete-valid -->
<input
    {type}
    {value}
    {min}
    {max}
    on:keydown={onKeyDown}
    on:change={onChange}
    on:keyup={onKeyUp}
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

        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border-radius: 4px;
        padding: 4px 6px;
        margin: 2px;

        &::-webkit-input-placeholder {
            color: var(--input-placeholder);
        }

        &:focus {
            outline: 1px solid var(--accent-fg);
            outline-offset: 1px;
        }
    }
</style>
