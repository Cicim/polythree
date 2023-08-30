<!-- A library input element -->
<script lang="ts">
    import { createEventDispatcher, getContext, onDestroy } from "svelte";
    import r, { type NavigatePath } from "src/systems/navigate";
    import type { Unsubscriber, Writable } from "svelte/store";
    import type { EditorContext } from "src/systems/contexts";

    type InputType = "text" | "number";

    /** The type of the input, used for type inference */
    export let type: InputType = "text";
    export let spellcheck: boolean = false;
    /** The store this input updates */
    export let store: Writable<any> = null;
    /** The path to the object this input updates */
    export let edits: NavigatePath = null;
    const path = r.getPath(edits);

    /** The bindable value of the input */
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
                context.changes.setValue(store, path, number);
            } else {
                value = number;
            }
        } else {
            if (edits !== null) {
                context.changes.setValue(store, path, newValue);
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
    on:keydown
    on:change={onChange}
    on:keyup={onKeyUp}
    {spellcheck}
    {...$$restProps}
    autocomplete="no"
    class="input"
/>

<style lang="scss">
</style>
