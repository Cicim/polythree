<!-- A library input element -->
<script lang="ts">
    import { createEventDispatcher, getContext, onDestroy } from "svelte";
    import r from "src/systems/navigate";
    import { get, type Unsubscriber, type Writable } from "svelte/store";
    import type { EditorContext } from "src/systems/editors";

    type InputType = "text" | "number";

    /** The type of the input, used for type inference */
    export let type: InputType = "text";
    export let spellcheck: boolean = false;
    /** The path to the object this input updates or the writable store */
    export let edits: string | Writable<string> = null;
    /** Whether the data from the context is being edited */
    let editingData = typeof edits === "string";

    export let min: number = Number.MIN_SAFE_INTEGER;
    export let max: number = Number.MAX_SAFE_INTEGER;

    let data: Writable<any>, context: EditorContext, unsub: Unsubscriber;

    const dispatch = createEventDispatcher();

    // Initalize the data and context variables
    // for the data editing
    if (editingData) {
        data = getContext("data");
        context = getContext("context");
    }
    // Create the subscriber for updating the value from the store
    else if (edits !== null) {
        unsub = (edits as Writable<string>).subscribe((newValue) => {
            value = newValue;
        });
    }

    // The value of the input
    // Changes depending on the type of the input
    $: value =
        edits === null
            ? ""
            : editingData
            ? r.get($data, edits as string)
            : get(edits as Writable<string>);

    function onChange(
        event: Event & { currentTarget: EventTarget & HTMLInputElement }
    ) {
        if (edits === null) return;
        if (editingData) {
            const value = event.currentTarget.value;

            if (type === "number") {
                let number = parseInt(value);

                if (number < min) number = min;
                if (number > max) number = max;

                if (isNaN(number)) number = 0;

                context.changes.setValue(edits as string, number);
            } else {
                context.changes.setValue(edits as string, value);
            }
        } else {
            (edits as Writable<string>).set(event.currentTarget.value);
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
    }

    function onKeyUp(event: KeyboardEvent) {
        if (event.code === "Enter") {
            dispatch("submit", {
                value: (event.currentTarget as HTMLInputElement).value,
            });
        }
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
