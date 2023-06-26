<script lang="ts">
    import "iconify-icon";
    import Option from "./Option.svelte";
    import { setContext } from "svelte";

    type OptionText = string;
    type OptionValue = string;

    /** The options list as a record of `(value => text)` */
    export let options: [string, string][] = [];
    /** The currently selected value */
    export let value: string = options[0][0];

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

    /** To trigger the custom change event */
    function triggerChange(previousValue: string) {
        if (previousValue === value) return;
        lastValue = value;
        console.log("Passed");
        selectEl.dispatchEvent(new Event("change"));
    }

    function scrollToSelected() {
        // Move the selected button into view
        optionsEl.children[0].children[
            O.findIndex((option) => option.selected)
        ].scrollIntoView();
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

        const optionsHeight = Math.min(O.length, MAX_OPTIONS_HEIGHT);

        optionsEl.style.height = `${buttonHeight * optionsHeight + 2}px`;

        // Place the options list below the select element
        optionsEl.style.top = `${selectEl.getBoundingClientRect().bottom}px`;
        optionsEl.style.left = `${selectEl.getBoundingClientRect().left}px`;

        // Move the selected button into view
        scrollToSelected();
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
                if (
                    document.activeElement !== selectEl &&
                    !optionsEl.contains(document.activeElement)
                )
                    return;

                // Close the options list
                optionsEl.close();
                open = false;

                // Set the value of the select element
                value = O.find((option) => option.selected).value;
                break;
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
        let previousValue = value;
        value = v;
        triggerChange(previousValue);
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
</script>

<svelte:body on:click={onClickOutside} on:keydown={onKeyDown} />

<button
    bind:this={selectEl}
    class="select"
    class:open
    on:click|stopPropagation={openOptions}
>
    <span class="selected-option">{O.find((o) => value === o.value).text}</span>
    <iconify-icon icon="mdi:chevron-down" />
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

        &:focus {
            outline: 1px solid var(--accent-fg);
            outline-offset: 1px;
        }
        &.open {
            outline: none;

            iconify-icon {
                transform: rotate(180deg);
            }
        }

        iconify-icon {
            cursor: pointer;
        }
    }

    .selected-option {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: left;
    }

    .options-list {
        position: fixed;
        top: 0;
        left: 0;

        margin: 0;
        border: 0;
        padding: 0;

        box-sizing: border-box;
        border: 1px solid var(--sel-border);

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
