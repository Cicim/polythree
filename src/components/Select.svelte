<script context="module" lang="ts">
    export type SelectValueType = string | number;
    export enum ScrollingMode {
        Keyboard = 0,
        Mouse = 1,
    }
</script>

<script lang="ts">
    import Option from "./Option.svelte";
    import {
        createEventDispatcher,
        getContext,
        onDestroy,
        setContext,
    } from "svelte";
    import type { NavigatePath } from "src/systems/navigate";
    import type { EditorContext } from "src/systems/contexts";
    import { writable, type Writable } from "svelte/store";
    import r from "src/systems/navigate";
    import { tooltip } from "src/systems/tooltip";
    import type { EditorChanges } from "src/systems/changes";

    // ANCHOR Consts
    /** Margin from the top and bottom of the screen */
    const MARGIN_V = 10;
    /** Margin from the left and right of the screen */
    const MARGIN_H = 0;
    /** Number of options that should be visibile in the container */
    const OPTIONS_COUNT = 10;

    const dispatch = createEventDispatcher();

    // ANCHOR Exports
    /** An ordered array of [key, value] options */
    export let options: [key: SelectValueType, name: string][] = [];
    /** The current value of the select */
    export let value: SelectValueType = options[0][0];
    /** The store that contains the data to edit */
    export let store: Writable<any> = null;
    /** The path in the store to the data you're editing */
    export let edits: NavigatePath = null;
    const path = r.getPath(edits);
    /** A style to put before the options */
    export let valueTag: "off" | "number" | "offset" = "off";
    /** The preferred vertical spawning position */
    export let biasedSpawn: "top" | "bottom" | "auto" = "auto";
    /** True if the value is not a valid value */
    export let invalid: boolean = false;

    // ANCHOR Variables
    /** The element of the select */
    let selectEl: HTMLButtonElement;
    /** The options list container */
    let optionsContainerEl: HTMLDialogElement;
    /** The element containing the list of options */
    let optionsListEl: HTMLDivElement;
    /** The selected key */
    let selectedValue: SelectValueType = value;

    // ANCHOR Maps
    /** Map of key => key's index in options */
    $: optionMap = new Map(options.map(([key], i) => [key, i]));

    /** The index of the selected option */
    function getOptionIndex(key: SelectValueType): number {
        const index = optionMap.get(key);
        return index;
    }

    /** The name of the selected option */
    function getOptionName(key: SelectValueType): string {
        const index = getOptionIndex(key);
        invalid = index === undefined;
        return (
            options[getOptionIndex(key)]?.[1] ??
            key?.toString() ??
            (key === null ? "null" : "undefined")
        );
    }

    // ANCHOR Select Functions
    /** The current vertical spawn direction */
    let direction: "top" | "bottom" =
        biasedSpawn !== "auto" ? biasedSpawn : "bottom";

    /** True if the optionsContainer modal is shown */
    let isOpen: boolean = false;

    /** Places the options on the screen based on the select's position */
    function resizeAndPlaceOptions() {
        const selectRect = selectEl.getBoundingClientRect();
        const containerRect = optionsContainerEl.getBoundingClientRect();
        // Get an option
        const optionEl = optionsListEl.children[0] as HTMLButtonElement;
        if (!optionEl) throw new Error("No options found");
        const optionRect = optionEl.getBoundingClientRect();
        // Add a small margin (better than having to scroll on less that OPTIONS_COUNT options)
        const optionHeight = 29; // optionRect.height + 1;

        // -- Choose a width that is the max between the width
        // of the select and the width of the longest option
        const width = Math.max(
            selectRect.width,
            Math.min(containerRect.width, window.innerWidth - MARGIN_H * 2)
        );
        // Apply the width to the container
        optionsContainerEl.style.width = `${width}px`;

        // - Get the most optimal horizontal position
        let left: number;
        if (selectRect.left + width > window.innerWidth - MARGIN_H) {
            left = window.innerWidth - MARGIN_H - width;
        } else {
            left = selectRect.left;
        }
        // Apply the left to the container
        optionsContainerEl.style.left = `${left}px`;

        // -- Get the best vertical spawn direction and position
        let top: number;
        let height: number;
        const optionsViewed = Math.min(OPTIONS_COUNT, options.length);

        if (biasedSpawn === "auto") {
            direction =
                selectRect.top > window.innerHeight / 2 ? "top" : "bottom";
        }

        // -- Get the optimal height of the container
        if (direction === "top") {
            const maxHeight = selectRect.top - MARGIN_V;
            // Get the size
            height = Math.min(optionHeight * optionsViewed, maxHeight);
            top = selectRect.top - height;
        } else if (direction === "bottom") {
            const maxHeight = window.innerHeight - selectRect.bottom - MARGIN_V;
            // Get the size
            height = Math.min(optionHeight * optionsViewed, maxHeight);
            top = selectRect.bottom;
        }
        // Apply the height and top to the container
        optionsContainerEl.style.height = `${height}px`;
        optionsContainerEl.style.top = `${top}px`;
    }
    /** Shows the dialog */
    function showOptions() {
        optionsContainerEl.showModal();
        isOpen = true;
        resizeAndPlaceOptions();
        scrollToIndex(getOptionIndex(selectedValue));
    }
    /** Hides the dialog  */
    function closeOptions() {
        optionsContainerEl.close();
        isOpen = false;
    }
    /** Updates the value and dispatches the events/changes */
    function updateValue(key: SelectValueType) {
        dispatchOnChange(key);
        // If the changes aren't null, create a new change
        if (changes !== null) {
            changes.setValue(store, path, key);
        }
    }

    function dispatchOnChange(key: SelectValueType) {
        value = key;
        selectedValue = key;
        // Dispatch a change event
        dispatch("change", key);
    }

    // ANCHOR Options Functions
    /** Set to true if scrolling with the mouse, false if scrollign with the keyboard */
    const scrollingMode: Writable<ScrollingMode> = writable(
        ScrollingMode.Mouse
    );
    setContext("scrollingMode", scrollingMode);
    function selectOption(key: SelectValueType) {
        selectedValue = key;
    }
    setContext("select", selectOption);

    /** Closes the Options and doesn't update the value */
    function closeWithoutUpdating() {
        selectOption(value);
        closeOptions();
    }

    /** Close the options and set the value to the value to the key arg */
    function closeAndUpdate(key: SelectValueType) {
        updateValue(key);
        closeOptions();
    }
    setContext("close", closeAndUpdate);

    /** When you click out of bounds of the optionContainer's boundingRect */
    function onClickOutside(event: MouseEvent) {
        // Get the containerEl's bounding rect
        const containerRect = optionsContainerEl.getBoundingClientRect();
        // If the click is outside of the container
        if (
            event.clientX < containerRect.left ||
            event.clientX > containerRect.right ||
            event.clientY < containerRect.top ||
            event.clientY > containerRect.bottom
        ) {
            closeWithoutUpdating();
        }
        // Focus the select event
        selectEl.focus();
    }

    function scrollToIndex(index: number) {
        // Find the selected option
        const selected = optionsListEl.children[index];
        // If the selected option doesn't exist, return
        if (selected === undefined) return new Error("Option not found");

        // Place the scrolling position so that the selected
        // option is in the middle of the options list
        optionsContainerEl.scrollTop =
            selected.getBoundingClientRect().top -
            optionsListEl.getBoundingClientRect().top -
            optionsListEl.getBoundingClientRect().height / 2 +
            selected.getBoundingClientRect().height / 2;
    }

    // ANCHOR Search Functions
    /** The search string */
    let searchString: string = "";
    /** The search timout until it clears */
    let searchTimeout: NodeJS.Timeout = null;
    /** The index the search starts from */
    let searchStart: number = -1;

    function selectNextInstance(string: string) {
        for (let i = searchStart + 1; i < options.length; i++) {
            const optionName = options[i][1];

            if (optionName.toLowerCase().startsWith(string)) {
                // Select the option
                if (isOpen) {
                    selectOption(options[i][0]);
                    scrollToIndex(i);
                } else updateValue(options[i][0]);

                // Update the searchStart
                return i;
            }
        }

        // If you have found nothing, loop
        for (let i = 0; i < searchStart + 1; i++) {
            const optionName = options[i][1];

            if (optionName.toLowerCase().startsWith(string)) {
                // Select the option
                if (isOpen) {
                    selectOption(options[i][0]);
                    scrollToIndex(i);
                } else updateValue(options[i][0]);

                // Update the searchStart
                return i;
            }
        }

        return -1;
    }

    function handleSearch(key: string) {
        // Match the valid characters
        if (!key.match(/^[a-zA-Z0-9\-\s]$/)) return;

        scrollingMode.set(ScrollingMode.Keyboard);

        // If the option you're on starts with the same letter you pressed
        if (
            selectedValue !== null &&
            searchString.length <= 1 &&
            key.toLowerCase() === getOptionName(selectedValue)[0].toLowerCase()
        ) {
            // Go to the next instance of a string starting with the key
            const index = selectNextInstance(key.toLowerCase());
            // If the index is -1, reset the search
            if (index === -1) searchStart = -1;
            else searchStart = index;
            searchString = key.toLowerCase();

            // Start the timeout
            if (searchTimeout !== null) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => clearSearch, 1000);
        } else {
            // Append the key to the searchString
            searchString += key.toLowerCase();
            // Find a match for the searchString
            const index = selectNextInstance(searchString);
            // Start the timeout
            if (searchTimeout !== null) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(clearSearch, 1000);

            if (index < 0) searchString = searchString.slice(0, -1);
        }
    }

    function clearSearch() {
        searchString = "";
        searchStart = -1;
        searchTimeout = null;
    }

    // ANCHOR Component Listeners
    function onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            case "Escape":
                if (searchTimeout !== null) {
                    event.stopPropagation();
                    event.preventDefault();
                    clearTimeout(searchTimeout);
                    clearSearch();
                } else if (isOpen) {
                    event.stopPropagation();
                    event.preventDefault();
                    closeWithoutUpdating();
                }
                break;
            case "Enter":
                if (isOpen) event.preventDefault();
                closeAndUpdate(selectedValue);
                break;
            case "Space":
                if (searchTimeout !== null) {
                    event.preventDefault();
                    handleSearch(" ");
                } else if (isOpen) event.preventDefault();
                closeAndUpdate(selectedValue);
                break;
            case "ArrowUp": {
                // Get the option's index
                const index = getOptionIndex(selectedValue);
                // If the index is 0, return
                if (index === 0) return;
                event.preventDefault();

                if (!isOpen) {
                    updateValue(options[index - 1][0]);
                } else {
                    // Set the scrollingMode to Keyboard
                    scrollingMode.set(ScrollingMode.Keyboard);
                    // Select the previous option
                    selectOption(options[index - 1][0]);
                    // Scroll to the option's position
                    scrollToIndex(index - 1);
                }
                break;
            }
            case "ArrowDown": {
                // Get the option's index
                const index = getOptionIndex(selectedValue);
                // If the index is 0, return
                if (index === options.length - 1) return;
                event.preventDefault();

                if (!isOpen) {
                    updateValue(options[index + 1][0]);
                } else {
                    // Set the scrollingMode to Keyboard
                    scrollingMode.set(ScrollingMode.Keyboard);
                    // Select the previous option
                    selectOption(options[index + 1][0]);
                    // Scroll to the option's position
                    scrollToIndex(index + 1);
                }
                break;
            }
            default:
                // Try to handle the search
                handleSearch(event.key);
        }
    }

    // ANCHOR Edits
    let changes: EditorChanges = null;
    if (edits !== null) {
        /** The editor context */
        const context: EditorContext = getContext("context");
        changes = context.changes;

        /** Listen to the data, and update the select when it changes */
        const unsubscribeFromData = store.subscribe((store) => {
            // Update the value with the new data
            dispatchOnChange(r.get(store, path));
        });

        onDestroy(() => {
            unsubscribeFromData();
        });
    }
</script>

<svelte:window
    on:resize={closeWithoutUpdating}
    on:blur|stopPropagation={closeWithoutUpdating}
/>

<!-- Select Element -->
<button
    class:open={isOpen}
    class:top={direction === "top"}
    class:bottom={direction === "bottom"}
    class="select"
    bind:this={selectEl}
    on:click|stopPropagation={showOptions}
    on:keydown={onKeyDown}
>
    <!-- Selected Options's Display -->
    <div
        class="selected-option"
        class:invalid
        tooltip={invalid ? "Invalid value" : ""}
        use:tooltip
    >
        {getOptionName(value)}
    </div>
    {#if searchTimeout !== null}
        <span class="search-string"
            ><iconify-icon
                class="icon-search"
                icon="mdi-search"
            />{searchString}</span
        >
    {:else}
        <!-- Dropdown chevron -->
        <iconify-icon class="icon-dropdown" icon="mdi:chevron-down" inline />
    {/if}
</button>

<dialog
    class:top={direction === "top"}
    class:bottom={direction === "bottom"}
    class="options-container modal"
    bind:this={optionsContainerEl}
    on:mousedown|stopPropagation
    on:keydown={onKeyDown}
    on:click|stopPropagation={onClickOutside}
>
    <div class="options-list" bind:this={optionsListEl}>
        {#each options as [key, name], i (i)}
            <Option
                showValue={valueTag}
                value={key}
                selected={key === selectedValue}
            >
                {name}
            </Option>
        {/each}
    </div>
</dialog>

<style lang="scss">
    .select {
        min-width: 30px;
        max-width: 100%;
        max-height: calc(1em + 4px);
        overflow: hidden;
        border-radius: 4px;
        padding: 4px;
        padding-left: 12px;
        margin: 2px;

        box-sizing: content-box;

        display: grid;
        grid-template-columns: 1fr min-content;

        background: var(--sel-bg);
        color: var(--sel-fg);
        border: 1px solid var(--sel-border);

        transition: outline 0.1s ease-in-out;
        cursor: pointer;
        user-select: none;

        &:focus {
            outline: 1px solid var(--outline);
            outline-offset: 1px;
        }
        &.open {
            border-color: var(--outline);

            .icon-dropdown {
                transform: rotate(180deg);
            }

            &.top {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
            &.bottom {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }
        }

        .search-string {
            display: grid;
            grid-template-columns: auto 1fr;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: right;
            max-width: 11em;
        }

        .icon-dropdown {
            align-self: center;
            transition: transform 0.1s ease-in-out;
        }
    }

    .selected-option {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: left;

        &.invalid {
            color: var(--error-fg);
            text-decoration: underline;
        }
    }

    .options-container {
        position: fixed;
        top: 0;
        left: 0;

        margin: 0;
        border: 0;
        padding: 0;

        background: var(--sel-bg);
        box-sizing: border-box;
        border: 1px solid var(--sel-border);
        border-radius: 4px;

        &.top {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            transform-origin: 0 100%;
            animation: cubic-bezier(0.075, 0.82, 0.165, 1) 0.1s openUp;
        }
        &.bottom {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            transform-origin: 0 0;
            animation: cubic-bezier(0.075, 0.82, 0.165, 1) 0.1s openDown;
        }

        &::backdrop {
            background: transparent;
        }

        &:focus {
            outline: none;
        }

        &::-webkit-scrollbar {
            width: 8px;
            background: var(--sel-bg);
        }

        &::-webkit-scrollbar-thumb {
            background: var(--light-shadow);
        }
        &::-webkit-scrollbar-thumb:hover {
            background: var(--medium-shadow);
        }
        &::-webkit-scrollbar-thumb:active {
            background: var(--accent-shadow);
        }
    }

    .options-list {
        display: flex;
        flex-direction: column;

        user-select: none;
        width: 100%;
        height: 100%;
    }
</style>
