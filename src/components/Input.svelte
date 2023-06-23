<!-- A library input element -->
<script lang="ts">
    import { getContext } from "svelte";
    import r from "src/systems/navigate";
    import type { Writable } from "svelte/store";
    import type { EditorContext } from "src/systems/editors";
    import { ValueChange } from "src/systems/changes";

    type InputType = "text" | "number";

    /** The type of the input, used for type inference */
    export let type: InputType = "text";
    /** The path to the object this input updates */
    export let edits: string;

    let data: Writable<any> = getContext("data");
    let context: EditorContext = getContext("context");

    function update(
        event: Event & { currentTarget: EventTarget & HTMLInputElement }
    ) {
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

<input {type} value={r.get($data, edits)} on:change={(e) => update(e)} />

<style type="scss">
</style>
