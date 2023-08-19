<script lang="ts">
    import { handleKeydown } from "src/systems/bindings";
    import { createEventDispatcher } from "svelte";

    /** The innerText of the search bar */
    export let value = "";
    /** If true will dispatch submit search on:input */
    export let submitOnInput = false;

    const dispatch = createEventDispatcher();
    // The search bar input
    let searchBar: HTMLDivElement;

    function handlePaste(event: ClipboardEvent) {
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            if (!submitOnInput) dispatch("submit");
        }
    }

    function handleInput(event: InputEvent) {
        searchHTML = searchBar.innerHTML;
        value = searchBar.innerText;
        if (submitOnInput) dispatch("submit");
    }

    function onClearClick() {
        searchBar.innerHTML = "";
        searchHTML = "";
        value = "";
    }

    let searchHTML = "";
    // Strip the html tags from the search bar
    $: searchHTML = searchHTML.replaceAll(/(<([^>]+)>)/gi, "");
</script>

<div class="searchbar">
    <div class="search-icon">
        <iconify-icon icon="mdi:search" inline />
    </div>
    <div
        class="input search-input"
        bind:this={searchBar}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        on:paste|preventDefault={handlePaste}
        contenteditable="true"
    />
    <div class="clear-icon" class:hidden={value === ""} on:click={onClearClick}>
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

            border: none;
            padding: 4px 2px;
            padding-left: 8px;
            margin: 0 8px;
            white-space: nowrap;
        }
    }
</style>
