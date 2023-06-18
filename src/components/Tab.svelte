<script lang="ts">
    import "iconify-icon";
    import type { EditorContext } from "../systems/editors";
    import { ViewContext, draggingId, openViews } from "../systems/views";
    import {
        IconButton,
        Menu,
        Separator,
        TextButton,
        showContextMenu,
    } from "../systems/context_menu";
    import { writable } from "svelte/store";
    import { Bindings } from "../systems/bindings";

    export let view: ViewContext | EditorContext;
    // Whether the tab needs to be saved
    $: needsSave = (<EditorContext>view)?.needsSave ?? writable(false);

    // ANCHOR TabMenu
    function closeOthers() {
        openViews.update((views) => {
            const newViews = [...views];
            const index = newViews.indexOf(view);
            const left = newViews.splice(
                index + 1,
                newViews.length - index - 1
            );
            const right = newViews.splice(0, index);
            // Close all the tabs that were removed
            left.concat(right).forEach((v) => v.close());
            view.select();
            return newViews;
        });
    }
    function closeToRight() {
        openViews.update((views) => {
            const newViews = [...views];
            const index = newViews.indexOf(view);
            const other = newViews.splice(index + 1, newViews.length - index);
            // Close all the tabs that were removed
            other.forEach((v) => v.close());
            return newViews;
        });
    }
    function closeToLeft() {
        openViews.update((views) => {
            const newViews = [...views];
            const index = newViews.indexOf(view);
            const other = newViews.splice(0, index);
            // Close all the tabs that were removed
            other.forEach((v) => v.close());
            return newViews;
        });
    }

    const tabMenu = new Menu([
        new IconButton("Close", "ic:round-close", view.close),
        new TextButton("Close Others", closeOthers),
        new TextButton("Close To Left", closeToLeft),
        new TextButton("Close To Right", closeToRight),
        new Separator(),
        new TextButton("Close All", "tabbar/close_all"),
        new TextButton("Reopen Last", "tabbar/reopen_last"),
    ]);

    // ANCHOR Drag and drop functionality
    function onDragStart() {
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
    class:selected={view.selected}
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
    </span>
    <!-- Close Buttom -->
    <button
        tabindex="-1"
        class="close"
        class:busy-dragging={$draggingId !== null}
        on:click|stopPropagation|preventDefault={() => view.close()}
        draggable="true"
        on:dragstart|stopPropagation={(e) => e.preventDefault()}
        on:dragover|stopPropagation={(e) => e.preventDefault()}
        on:dragleave|stopPropagation={(e) => e.preventDefault()}
        on:drop|stopPropagation={(e) => e.preventDefault()}
    >
        {#if $needsSave}
            <iconify-icon icon="healthicons:circle-small" />
        {:else}
            <iconify-icon icon="ic:round-close" />
        {/if}
    </button>
</div>

<style lang="scss">
    .tab {
        display: flex;
        place-items: center;
        padding: 0 4px;
        min-width: 100px;
        height: 40px;
        cursor: pointer;
        background-color: var(--tabs-bg);

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
            box-shadow: inset 0 2px var(--accent-shadow);
        }
    }
</style>
