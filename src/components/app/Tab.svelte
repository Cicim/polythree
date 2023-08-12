<script lang="ts">
    import type { ViewContext, EditorContext } from "src/systems/contexts";
    import { activeView, draggingId, openViews } from "src/systems/views";

    import {
        IconOption,
        Menu,
        Separator,
        TextOption,
        showContextMenu,
    } from "src/systems/context_menu";
    import { writable } from "svelte/store";

    export let view: ViewContext | EditorContext;
    // Whether the tab needs to be saved
    $: needsSave = (<EditorContext>view)?.changes?.unsaved ?? writable(false);
    $: isSaving = (<EditorContext>view)?.changes?.saving ?? writable(false);
    $: subtitle = view.subtitle;

    // ANCHOR TabMenu
    // Closes all tabs except the current tab
    async function closeOthers() {
        const index = $openViews.indexOf(view);
        const toTheLeft = $openViews.slice(0, index);
        const toTheRight = $openViews.slice(index + 1, $openViews.length);
        // Close all the tabs that were removed
        for (const view of [...toTheLeft, ...toTheRight]) {
            await view.askClose();
        }
    }
    // Closes all tabs to the right of the current tab
    async function closeToRight() {
        const index = $openViews.indexOf(view);
        const toTheRight = $openViews.slice(index + 1, $openViews.length);
        // Close all the tabs that were removed
        for (const view of toTheRight) {
            await view.askClose();
        }
    }
    // Closes all tabs to the left of the current tab
    async function closeToLeft() {
        const index = $openViews.indexOf(view);
        let toTheLeft: ViewContext[] = $openViews.slice(0, index);
        // Close all the tabs that were removed
        for (const view of toTheLeft.reverse()) {
            await view.askClose();
        }
    }

    const tabMenu = new Menu([
        new Separator("This tab"),
        new IconOption("Close", "ic:round-close", () => view.close()),
        new TextOption("Close Others", closeOthers),
        new TextOption("Close To Left", closeToLeft),
        new TextOption("Close To Right", closeToRight),
        new Separator("Other tabs"),
        new TextOption("Close All", "tabbar/close_all"),
        new TextOption("Reopen Last", "tabbar/reopen_last"),
        new TextOption("Close Saved", "tabbar/close_saved"),
    ]);

    // ANCHOR Drag and drop functionality
    function onDragStart(e: DragEvent) {
        // We need to set it for some browsers
        e.dataTransfer?.setData("text/plain", "");

        view.select();
        draggingId.set($openViews.indexOf(view));
    }
    function onDragOver(e: DragEvent) {
        e.preventDefault();
        // Get the tab id of the tab you are hovering over
        const hoverId = parseInt((<HTMLElement>e.target).id.split("-")[1]);
        // Set the tab you're over as the active dropzone
        $openViews[hoverId].activeDropzone = hoverId !== $draggingId;
    }
    function onDragLeave(e: DragEvent) {
        e.preventDefault();
        // Get the tab id of the tab you are hovering over
        const hoverId = parseInt((<HTMLElement>e.target).id.split("-")[1]);
        // Set the tab you're over as the active dropzone
        $openViews[hoverId].activeDropzone = false;
    }
    function onDrop(e: DragEvent) {
        e.preventDefault();
        // Get the tab id of the tab you are hovering over
        const hoverId = parseInt((<HTMLElement>e.target).id.split("-")[1]);
        // Skip if you're dropping on yourself
        if (hoverId === $draggingId) return draggingId.set(null);

        // Set the tab you're over as the active dropzone
        $openViews[hoverId].activeDropzone = false;
        // Place the tab you're dragging to the left of the tab you're hovering over
        openViews.update((views) => {
            const newViews = [...views];
            const dragId = $draggingId;
            const dragTab = newViews.splice(dragId, 1)[0];
            newViews.splice(hoverId, 0, dragTab);
            return newViews;
        });

        draggingId.set(null);
    }
    // ANCHOR Other handlers
    function handleSelect(e: MouseEvent) {
        if (e.button === 1) e.preventDefault();
        if (e.button === 0) view.select();
    }
    function handleClose(e: MouseEvent) {
        if (e.button === 1) view.close();
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    id="tab-{$openViews.indexOf(view)}"
    class="tab"
    class:selected={view === $activeView}
    class:show-anyway={!$needsSave}
    class:dropzone={view.activeDropzone}
    draggable="true"
    on:mousedown={handleSelect}
    on:mouseup={handleClose}
    on:dragstart={onDragStart}
    on:dragleave={onDragLeave}
    on:dragover|preventDefault={onDragOver}
    on:drop|preventDefault={onDrop}
    on:contextmenu={(e) => {
        showContextMenu(e, tabMenu);
    }}
>
    <!-- Text -->
    <span class="text">
        {view.name}
        <span class="subtitle">{$subtitle}</span>
    </span>
    <!-- Close Buttom -->
    <button
        tabindex="-1"
        class="close"
        class:busy-dragging={$draggingId !== null}
        on:click|stopImmediatePropagation|preventDefault={() => view.close()}
        draggable="true"
        on:dragstart|stopPropagation={(e) => e.preventDefault()}
        on:dragover|stopPropagation={(e) => e.preventDefault()}
        on:dragleave|stopPropagation={(e) => e.preventDefault()}
        on:drop|stopPropagation={(e) => e.preventDefault()}
    >
        {#if $needsSave}
            {#if $isSaving}
                <iconify-icon icon="eos-icons:loading" />
            {:else}
                <iconify-icon icon="healthicons:circle-small" />
            {/if}
        {:else}
            <iconify-icon icon="ic:round-close" />
        {/if}
    </button>
</div>

<style lang="scss">
    .tab {
        display: flex;
        place-items: center;
        padding: 0 8px;
        height: 40px;
        cursor: pointer;

        &.dropzone {
            background: var(--accent-shadow);
        }

        .text {
            padding: 0 5px 0 16px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;

            .subtitle {
                color: var(--weak-fg);
            }
        }

        .close {
            display: flex;
            justify-content: center;
            align-items: center;
            border: none;
            width: 20px;
            height: 20px;
            font-size: 1em;
            color: var(--strong-fg);
            font-weight: bold;
            background: transparent;
            border-radius: 25%;
            cursor: pointer;

            transition: opacity 100ms ease-out;

            &:hover {
                background: var(--light-shadow);
            }
            &.busy-dragging {
                pointer-events: none;
            }
        }

        &:not(.selected) {
            .close {
                color: var(--weak-fg);
                font-weight: normal;
            }
            &:not(:hover) {
                &.show-anyway .close {
                    opacity: 0;
                    pointer-events: none;
                }
            }
        }
        &.selected {
            background: var(--tab-selected-bg);
            box-shadow: inset 0 var(--tab-border-width)
                    var(--tab-selected-border),
                calc(var(--tab-border-width) * -1) 0 var(--tab-border-width) 0
                    var(--tab-selected-border),
                var(--tab-border-width) 0 var(--tab-border-width) 0
                    var(--tab-selected-border);
        }
    }
</style>
