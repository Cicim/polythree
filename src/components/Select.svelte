<script lang="ts">
    import "iconify-icon";
    import Option from "./Option.svelte";
    import {
        createEventDispatcher,
        getContext,
        onDestroy,
        onMount,
        setContext,
        tick,
    } from "svelte";
    import type { NavigatePath } from "src/systems/navigate";
    import type { EditorContext } from "src/systems/contexts";
    import { writable, type Unsubscriber, type Writable } from "svelte/store";
    import r from "src/systems/navigate";

    /** The options list as a record of `(value => text)` */
    export let options: [string, string][];
    /** The currently selected value */
    export let value: string = options[0][0];
    /** The path to the object this select updates */
    export let edits: NavigatePath = null;

    export let invalid: boolean = false;

    export let showValue: "off" | "number" | "offset" = "off";

    const dispatcher = createEventDispatcher();

    $: invalid = O.findIndex((o) => value === o.value) === -1;

    let context: EditorContext = getContext("context");
    let data: Writable<any> = getContext("data");

    export const MAX_OPTIONS_HEIGHT = 10;

    // Extract the options into an object
    $: O = options.map(([key, v]) => {
        return {
            value: key,
            text: v,
            selected: key === value,
        };
    });

    let open = false;

    /** The select element */
    let selectEl: HTMLButtonElement;
    /** The options modal element that contains the container */
    let optionsEl: HTMLDialogElement;
    /** The options container */
    let optionsContainer: HTMLDivElement;

    /** True if scrolling with the mouse */
    let scrollingMode = writable(true);

    /** The last value recorded before opening the options */
    let lastValue = value;
    /** The current search string */
    let searchString = "";
    /** The current search timeout */
    let searchTimeout: NodeJS.Timeout = null;

    /** To trigger the custom change event */
    function triggerChange(previousValue: string) {
        // If the value is unchanged, don't trigger a change
        if (previousValue === value) return;

        // If this select edits some property, update it
        if (edits !== null) {
            context.changes.setValue(edits as NavigatePath, value);
        }

        // Dispatch the change event
        dispatcher("change", { value });
        // Update the previous value
        lastValue = value;
    }

    /** Scrolls the seledcted option into view */
    function scrollToSelected() {
        // Move the selected button into view
        const selected =
            optionsContainer.children[O.findIndex((option) => option.selected)];

        if (selected === undefined) return;

        // Place the scrolling position so that the selected
        // option is in the middle of the options list
        optionsEl.scrollTop =
            selected.getBoundingClientRect().top -
            optionsContainer.getBoundingClientRect().top -
            optionsContainer.getBoundingClientRect().height / 2 +
            selected.getBoundingClientRect().height / 2;
    }

    /** For opening the modal options */
    function openOptions() {
        if (open) return;

        optionsEl.showModal();
        open = true;

        // Get the width of the select element
        const width = selectEl.getBoundingClientRect().width;
        // Set height of a single option
        const buttonHeight =
            optionsContainer.children[0].getBoundingClientRect().height;

        // Set the width of the options list to the width of the select element
        optionsEl.style.minWidth = `${width}px`;
        // Get the height of an option element
        const optionsHeight = Math.min(O.length, MAX_OPTIONS_HEIGHT);
        // Set the height of the options list to a minumum between
        // the number of options and the max options height
        optionsEl.style.height = `${buttonHeight * optionsHeight + 2}px`;

        // Place the options list below the select element if there is enough space
        // Otherwise, place it above the select element

        // Get the direction that has the most space
        const topSpace = selectEl.getBoundingClientRect().top;
        const bottomSpace =
            window.innerHeight - selectEl.getBoundingClientRect().bottom;

        // Place the options in the largest of the two
        if (topSpace > bottomSpace) {
            const buttonsThatFit = Math.min(
                MAX_OPTIONS_HEIGHT,
                O.length,
                Math.floor(topSpace / buttonHeight)
            );
            optionsEl.style.height = `${buttonHeight * buttonsThatFit + 2}px`;

            optionsEl.style.top = `${
                selectEl.getBoundingClientRect().top -
                optionsEl.getBoundingClientRect().height
            }px`;
        } else {
            optionsEl.style.top = `${
                selectEl.getBoundingClientRect().bottom
            }px`;
            const buttonsThatFit = Math.min(
                MAX_OPTIONS_HEIGHT,
                O.length,
                Math.floor(bottomSpace / buttonHeight)
            );
            optionsEl.style.height = `${buttonHeight * buttonsThatFit + 2}px`;
        }

        // See if there is enough space to place the options to the right
        // of the select element
        if (
            selectEl.getBoundingClientRect().right +
                optionsEl.getBoundingClientRect().width <
            window.innerWidth
        ) {
            optionsEl.style.left = `${selectEl.getBoundingClientRect().left}px`;
        }
        // The select couldn't fit in any place
        else if (
            optionsEl.getBoundingClientRect().width +
                selectEl.getBoundingClientRect().width >
            window.innerWidth
        ) {
            optionsEl.style.left = `${selectEl.getBoundingClientRect().left}px`;
            optionsEl.style.width = `${
                window.innerWidth - 2 * selectEl.getBoundingClientRect().left
            }px`;
        } else {
            optionsEl.style.left = `${
                selectEl.getBoundingClientRect().right -
                optionsEl.getBoundingClientRect().width
            }px`;
        }

        stopSearch();

        selectValue(value);
        // Move the selected button into view
        scrollToSelected();
        lastValue = value;
    }

    /** For closing the modal options */
    function onClickOutside(event: MouseEvent) {
        if (!open) return;

        // Get the options list's bounding box
        const optionsRect = optionsEl.getBoundingClientRect();
        // Get the mouse's position
        const mousePos = { x: event.clientX, y: event.clientY };

        // Check if the click was outside the select element
        if (
            mousePos.x < optionsRect.left ||
            mousePos.x > optionsRect.right ||
            mousePos.y < optionsRect.top ||
            mousePos.y > optionsRect.bottom
        ) {
            // Check if the click was outside the options list
            // Close the options list
            optionsEl.close();
            open = false;

            // Trigger a change if the value was changed
            triggerChange(lastValue);
        }
    }

    /** Handles search */
    function handleSearch(key: string) {
        if (key.length !== 1 && key !== "Backspace") return;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchString = "";
            searchTimeout = null;
        }, 1000);

        // Handle backspace
        if (key === "Backspace") searchString = searchString.slice(0, -1);
        // Add the key
        else searchString += key.toLowerCase();

        if (searchString === " ") {
            if (!open) return openOptions();
        }

        if (searchString === "") return;

        // Look for the search string in the options
        const index = O.findIndex((option) =>
            option.text.toLowerCase().startsWith(searchString)
        );

        if (index === -1) return;

        // Select the option
        selectValue(O[index].value);
        scrollToSelected();

        let previousValue = value;
        value = O[index].value;

        if (document.activeElement === selectEl) triggerChange(previousValue);
    }

    /** Stops the search timeout */
    function stopSearch() {
        searchString = "";
        searchTimeout = null;
        clearTimeout(searchTimeout);
    }

    /** Handles keydown */
    function onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            // Check if the escape key was pressed
            case "Escape": {
                if (!open) return;

                event.preventDefault();
                event.stopPropagation();
                // Close the options list
                optionsEl.close();
                open = false;
                break;
            }
            case "ArrowDown": {
                if (
                    document.activeElement !== selectEl &&
                    !optionsEl.contains(document.activeElement)
                )
                    return;
                event.preventDefault();

                // Set the scrolling mode to keyboard
                scrollingMode.set(false);

                // Select the next option
                const nextOption = O.findIndex((option) => option.selected) + 1;
                if (nextOption >= O.length) return;

                O = O.map((option, i) => ({
                    ...option,
                    selected: i === nextOption,
                }));

                // Move the selected button into view
                scrollToSelected();

                const previousValue = value;
                value = O[nextOption].value;

                // If the active Element is the select, trigger a change
                if (document.activeElement === selectEl)
                    triggerChange(previousValue);

                break;
            }
            case "ArrowUp": {
                if (
                    document.activeElement !== selectEl &&
                    !optionsEl.contains(document.activeElement)
                )
                    return;
                event.preventDefault();

                // Set the scrolling mode to keyboard
                scrollingMode.set(false);
                // Select the previous option
                const prevOption = O.findIndex((option) => option.selected) - 1;
                if (prevOption < 0) return;

                selectValue(O[prevOption].value);

                O = O.map((option, i) => ({
                    ...option,
                    selected: i === prevOption,
                }));

                // Move the selected button into view
                scrollToSelected();

                const previousValue = value;
                value = O[prevOption].value;

                // If the active Element is the select, trigger a change
                if (document.activeElement === selectEl)
                    triggerChange(previousValue);

                break;
            }
            case "Enter": {
                let selected = O.find((option) => option.selected);
                if (!selected) return;
                closeWithValue(selected.value);
                break;
            }
            default: {
                if (
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.code === "Tab"
                )
                    return;

                if (
                    document.activeElement !== selectEl &&
                    !optionsEl.contains(document.activeElement)
                )
                    return;

                event.preventDefault();
                handleSearch(event.key);
            }
        }
    }

    /** Closes the options, sets the selected to the
     * given value and dispatches an event */
    function closeWithValue(v: string) {
        if (!open) return;

        // Close the options list
        optionsEl.close();
        open = false;

        // Set the value of the select element
        value = v;
        triggerChange(lastValue);
    }

    /** Closes the options without changing the current value */
    function closeWithoutValue() {
        if (!open) return;

        // Close the options list
        optionsEl.close();
        open = false;

        value = lastValue;
    }

    /** Sets the option with the given value as selected */
    function selectValue(v: string) {
        // Modify the O element
        O = O.map((option) => ({
            ...option,
            selected: option.value === v,
        }));
    }

    // Set the context for the options
    setContext("close", closeWithValue);
    setContext("select", selectValue);
    setContext("scrollingMode", scrollingMode);

    // Set the subscriber for outside changes to the data
    let unsub: Unsubscriber;
    if (edits !== null) {
        // Subscribe to changes
        unsub = data.subscribe((d) => {
            value = r.get(d, edits as NavigatePath) as string;
        });
    }

    // Destroy the subscriber and the search timeout
    onDestroy(() => {
        stopSearch();
        if (unsub) unsub();
    });
</script>

<svelte:window
    on:click={onClickOutside}
    on:resize={closeWithoutValue}
    on:blur|stopPropagation={closeWithoutValue}
/>

<button
    {...$$restProps}
    bind:this={selectEl}
    class="select"
    class:open
    on:click|stopPropagation={openOptions}
    on:keydown={onKeyDown}
>
    <span class="selected-option">
        {#if !invalid}
            {O.find((o) => value === o.value).text}
        {:else}
            <span
                class="invalid"
                title="This is not a valid value for this Select">{value}</span
            >
        {/if}
    </span>
    {#if searchTimeout === null}
        <iconify-icon class="icon-dropdown" icon="mdi:chevron-down" />
    {:else}
        <span class="search-string"
            ><iconify-icon
                class="icon-search"
                icon="mdi-search"
            />{searchString}</span
        >
    {/if}
</button>

<dialog
    bind:this={optionsEl}
    class="options-list modal"
    on:mousedown|stopPropagation
    on:keydown={onKeyDown}
>
    <div class="options-container" bind:this={optionsContainer}>
        {#each O as option}
            <Option {showValue} value={option.value} selected={option.selected}>
                {option.text}
            </Option>
        {/each}
    </div>
</dialog>

<style lang="scss">
    .select {
        min-width: 30px;
        max-width: 100%;
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

        &:focus {
            outline: 1px solid var(--accent-fg);
            outline-offset: 1px;
        }
        &.open {
            outline: none;

            .icon-dropdown {
                transform: rotate(180deg);
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
            cursor: pointer;
            align-self: center;
            transition: transform 0.1s ease-in-out;
        }
    }

    .selected-option {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: left;

        .invalid {
            color: var(--error-fg);
            text-decoration: underline;
        }
    }

    .options-list {
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

    .options-container {
        display: flex;
        flex-direction: column;

        user-select: none;
        width: 100%;
        height: 100%;
    }
</style>
