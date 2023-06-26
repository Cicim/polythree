<script lang="ts">
    import { getContext } from "svelte";

    export let value: string;
    export let selected: boolean;

    // Get the select context
    let close = getContext("close") as Function;
    let select = getContext("select") as Function;

    function onMouseEnter() {
        select(value);
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
    on:mousemove={onMouseEnter}
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
