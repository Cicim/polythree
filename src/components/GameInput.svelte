<script lang="ts" context="module">
    const inputCharacterMatch = /^[a-zA-z0-9\s.,/]$/g;
    const wholeStringMatch = /^[a-zA-z0-9\s.,/]*$/g;
</script>

<script lang="ts">
    import type { NavigatePath } from "src/systems/navigate";
    import type { Writable } from "svelte/store";
    import Input from "./Input.svelte";

    /** The store this input updates */
    export let store: Writable<any> = null;
    /** The path to the object this input updates */
    export let edits: NavigatePath = null;
    /** The input's bound value */
    export let value: string = "";
    /** Value is true if the value doesn't match the regexp */
    export let invalid: boolean = false;

    $: invalid = !value.match(wholeStringMatch);

    export let maxLength: number = 10;

    function handleKeydown(event: KeyboardEvent) {
        // If the user tries to input something that isn't allowed, don't let them
        if (event.key.length === 1) {
            // If the character isn't allowed
            if (!event.key.match(inputCharacterMatch)) event.preventDefault();
            // If the string exceeds the maxLength
            if (value.length + 1 >= maxLength) event.preventDefault();
        }
    }
</script>

<div class="gameinput">
    <Input bind:value {edits} {store} on:keydown={handleKeydown} />
    <div
        class="info"
        title={`This text box edits an in-game string.
The use of some characters will be restrictred.`}
    >
        i
    </div>
</div>

<style lang="scss">
    .gameinput {
        display: flex;
        flex-direction: column;
        position: relative;

        &:not(:hover) .info {
            display: none;
        }

        .info {
            display: flex;
            position: absolute;
            top: calc(50% - 0.5em);
            right: 8px;

            width: 1em;
            height: 1em;
            display: grid;
            place-content: center;
            font-weight: 600;
            border-radius: 1em;
            background: var(--light-shadow);

            color: var(--weak-fg);
            cursor: help;
        }

        :global(.input) {
            font-family: monospace;
        }
    }
</style>
