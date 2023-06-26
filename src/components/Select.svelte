<script lang="ts">
    import "iconify-icon";
    import Option from "./Option.svelte";
    import { getContext, onDestroy, onMount, setContext, tick } from "svelte";
    import type { NavigatePath } from "src/systems/navigate";
    import type { EditorContext } from "src/systems/editors";
    import type { Unsubscriber, Writable } from "svelte/store";
    import r from "src/systems/navigate";

    /** The options list as a record of `(value => text)` */
    export let options: [string, string][];
    /** The currently selected value */
    export let value: string = options[0][0];
    /** The path to the object this select updates */
    export let edits: NavigatePath | null = null;

    let context: EditorContext = getContext("context");
    let data: Writable<any> = getContext("data");

    export const MAX_OPTIONS_HEIGHT = 10;

    // Extract the options into an object
    let O = options.map(([key, v]) => {
        return {
            value: key,
            text: v,
            selected: key === value,
        };
    });

    let open = false;

    /** The select element */
    let selectEl: HTMLButtonElement;
    /** The options container */
    let optionsEl: HTMLDialogElement;

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
            context.changes.setValue(edits, value);
        }

        // Dispatch the change event
        selectEl.dispatchEvent(new Event("change"));
        // Update the previous value
        lastValue = value;
    }

    /** Scrolls the seledcted option into view */
    function scrollToSelected() {
        // Move the selected button into view
        optionsEl.children[0].children[
            O.findIndex((option) => option.selected)
        ]?.scrollIntoView();
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
            optionsEl.children[0].children[0].getBoundingClientRect().height;

        // Set the width of the options list to the width of the select element
        optionsEl.style.width = `${width}px`;
        // Get the height of an option element
        const optionsHeight = Math.min(O.length, MAX_OPTIONS_HEIGHT);
        // Set the height of the options list to a minumum between
        // the number of options and the max options height
        optionsEl.style.height = `${buttonHeight * optionsHeight + 2}px`;

        // Place the options list below the select element if there is enough space
        // Otherwise, place it above the select element
        if (
            selectEl.getBoundingClientRect().bottom +
                optionsEl.getBoundingClientRect().height >
            window.innerHeight
        )
            optionsEl.style.top = `${
                selectEl.getBoundingClientRect().top -
                optionsEl.getBoundingClientRect().height
            }px`;
        else
            optionsEl.style.top = `${
                selectEl.getBoundingClientRect().bottom
            }px`;

        // Place the options list to the left of the select element if there is enough space
        // Otherwise, place it to the right of the select element
        if (
            selectEl.getBoundingClientRect().right +
                optionsEl.getBoundingClientRect().width >
            window.innerWidth
        )
            optionsEl.style.left = `${
                selectEl.getBoundingClientRect().right -
                optionsEl.getBoundingClientRect().width
            }px`;
        else
            optionsEl.style.left = `${selectEl.getBoundingClientRect().left}px`;

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
                if (!optionsEl.contains(document.activeElement)) return;
                closeWithValue(value);
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
    setContext("close", closeWithValue);
    setContext("select", selectValue);

    let unsub: Unsubscriber;
    if (edits !== null) {
        // Subscribe to changes
        unsub = data.subscribe((d) => {
            value = r.get(d, edits) as string;
        });
    }

    onDestroy(() => {
        stopSearch();
        if (unsub) unsub();
    });

    let loading = true;
    function getMaxOption() {
        let maxString = "";
        for (const option of O)
            if (option.text.length > maxString.length) maxString = option.text;
        return maxString;
    }

    function onPageShow() {
        // if (!loading) return;
        // // Check if the browser supports computed style maps
        // if (selectEl.parentElement.computedStyleMap !== undefined) {
        //     // Get if the element is part of a grid
        //     const isGrid =
        //         // @ts-ignore
        //         selectEl.parentElement.computedStyleMap().get("display")
        //             .value === "grid";
        //     if (isGrid) return (loading = false);
        // }
        // // Set the width of the selectEl to its current width
        // selectEl.style.width = `${selectEl.getBoundingClientRect().width}px`;
        // loading = false;
    }

    onMount(() => {
        loading = false;
    });
</script>

<svelte:window
    on:click={onClickOutside}
    on:resize={closeWithoutValue}
    on:blur|stopPropagation={closeWithoutValue}
    on:keydown={onKeyDown}
/>

<button
    {...$$restProps}
    bind:this={selectEl}
    class="select"
    class:open
    on:click|stopPropagation={openOptions}
>
    <span class="selected-option">
        {#if loading}
            {getMaxOption()}
        {:else if O.find((o) => value === o.value)}
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

<dialog bind:this={optionsEl} class="options-list modal">
    <div class="options-container">
        {#each O as option}
            <Option value={option.value} selected={option.selected}>
                {option.text}
            </Option>
        {/each}
    </div>
</dialog>

<style lang="scss">
    .select {
        position: relative;
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
