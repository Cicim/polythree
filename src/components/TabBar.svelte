<script lang="ts">
    import Tab from "./Tab.svelte";
    import { draggingId, openViews } from "../systems/views";

    /**
     * Scroll event handler
     * Implements these behaviors
     * - Simple scroll moves the scroll horizontally
     * - Shift scroll selects the next tab in the given direction
     * - Alt scroll moves the scroll to the beginning or the end
     */
    function onWheel(e: WheelEvent) {
        const delta = e.deltaY;

        // Choose next tab
        if (e.shiftKey) {
            // const current = selectedTab();
            // const index = tabs.indexOf(current);
            // const next = tabs[index + (delta > 0 ? 1 : -1)];
            // if (next) {
            //     current.selected = false;
            //     next.selected = true;
            // }
        }
        // Beginning or end
        else if (e.altKey) {
            this.scrollLeft = delta > 0 ? this.scrollWidth : 0;
        }
        // Horizontal scroll
        else {
            this.scrollLeft += delta;
        }
    }

    // Saves whether the mouse is over the tabs
    let activeDropzone = false;

    function onDragOver(e: DragEvent) {
        e.preventDefault();
        const tabId = $draggingId;
        activeDropzone = e.target === this && tabId !== $openViews.length - 1;
    }
    function onDragLeave(e: DragEvent) {
        e.preventDefault();
        activeDropzone = false;
    }
    function onDrop(e: DragEvent) {
        if (e.target !== this) return;

        // Move the tab at the end of the list
        openViews.update((views) => {
            const newViews = [...views];
            const dragId = $draggingId;
            const dragTab = newViews.splice(dragId, 1)[0];
            newViews.push(dragTab);
            return newViews;
        });

        activeDropzone = false;
        draggingId.set(null);
    }
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
    class="tabs-view"
    on:wheel|passive={onWheel}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
    class:dropzone={activeDropzone}
>
    <!-- Tabs container -->
    <div class="tabs-container">
        {#each $openViews as view}
            <Tab {view} />
        {/each}
    </div>
</div>

<style type="scss">
    .tabs-view {
        width: 100vw;
        height: 40px;
        overflow-y: hidden;
        scroll-behavior: auto;
        user-select: none;

        &.dropzone {
            background: var(--accent-shadow);
        }

        &::-webkit-scrollbar {
            height: 5px;
            background: transparent;
        }

        &::-webkit-scrollbar-track-piece {
            display: none;
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

        &:not(:hover) {
            &::-webkit-scrollbar {
                display: none;
            }
            &::-webkit-scrollbar-thumb {
                background: transparent;
            }
        }
    }

    .tabs-container {
        display: flex;
        width: max-content;
        height: 40px;
        overflow-x: hidden;
        overflow-y: hidden;
        background: var(--tabs-bg);
        color: var(--tabs-fg);
    }
</style>
