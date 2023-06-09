<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import OffsetLabel from "./OffsetLabel.svelte";
    import type { SelectValueType } from "./Select.svelte";

    export let value: SelectValueType;
    export let selected: boolean;
    export let showValue: "off" | "number" | "offset" = "off";

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
        {#if showValue === "number"}
            <div class="tag number">{value}</div>
        {:else if showValue === "offset"}
            <div class="tag offset"><OffsetLabel offset={value} /></div>
        {/if}
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

            .tag {
                display: inline-flex;
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                padding: 0 0.125em;
                margin-right: 0.125em;
                color: var(--weak-fg);
            }
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
