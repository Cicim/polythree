<script lang="ts">
    import { handleKeydown } from "src/systems/bindings";
    import { tooltip } from "src/systems/tooltip";
    import { createEventDispatcher } from "svelte";

    /** The innerText of the search bar */
    export let value = "";
    /** If true will dispatch submit search on:input */
    export let submitOnInput = false;
    export let placeholder = "Search...";

    const dispatch = createEventDispatcher();
    // The search bar input
    let searchBar: HTMLInputElement;

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            if (!submitOnInput) dispatch("submit");
        } else if (event.key === "Escape") {
            dispatch("escape");
            searchBar.blur();
        }
    }

    function handleInput() {
        if (submitOnInput) dispatch("submit");
    }

    function onClearClick() {
        value = "";
        dispatch("submit");
    }
</script>

<div class="searchbar">
    <div class="search-icon">
        <iconify-icon icon="mdi:search" inline />
    </div>
    <input
        {placeholder}
        class="input search-input"
        bind:this={searchBar}
        bind:value
        on:input={handleInput}
        on:keydown={handleKeyDown}
    />
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="clear-icon"
        class:hidden={value === ""}
        on:click={onClearClick}
        use:tooltip
        tooltip="Clear Search bar"
    >
        <iconify-icon icon="mdi:close" inline />
    </div>
</div>

<style lang="scss">
    .searchbar {
        position: relative;
        display: flex;
        padding: 6px 0em 6px 0.5em;
        margin: 4px;
        border-radius: 8px;
        align-items: center;
        font-size: inherit;

        background: var(--input-bg);
        border: 1px solid var(--input-border);
        color: var(--input-fg);

        .search-icon {
            color: var(--weak-fg);
        }

        .clear-icon {
            position: absolute;
            right: calc(0.5em + 4px);
            cursor: pointer;
            &:hover {
                color: var(--accent-fg);
                transition: 0.5s;
            }
        }

        .search-input {
            flex: 1;
            font-size: inherit;

            border: none;
            padding: 4px 2px;
            padding-left: 8px;
            margin: 0 8px;
            white-space: nowrap;
        }
    }
</style>
