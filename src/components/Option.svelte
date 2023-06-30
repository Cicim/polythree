<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    export let value: string;
    export let selected: boolean;

    // Get the select context
    let close = getContext("close") as Function;
    let select = getContext("select") as Function;
    let scrollingMode = getContext("scrollingMode") as Writable<boolean>;

    function onMouseEnter() {
        if (!$scrollingMode) return;
        select(value);
    }

    function onMouseMove() {
        scrollingMode.set(true);
    }

    function onClick() {
        close(value);
    }
</script>

<button
    tabindex="-1"
    class="option"
    class:selected
    on:click={onClick}
    on:mousemove|preventDefault={onMouseMove}
    on:mouseenter|preventDefault={onMouseEnter}
    on:keydown|preventDefault={() => {}}
>
    <span>
        <slot />
    </span>
</button>

<style lang="scss">
    .option {
        padding: 4px;
        padding-left: 12px;

        display: grid;
        grid-template-columns: 1fr min-content;

        cursor: pointer;

        background: var(--opt-bg);
        color: var(--opt-fg);
        border: none;

        span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: left;
        }

        &.selected {
            background: var(--opt-bg-hover);
            color: var(--opt-fg-hover);
        }
        &:focus {
            outline: none;
        }
    }
</style>
