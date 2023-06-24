<script lang="ts">
    import Tab from "./Tab.svelte";

    import {
        draggingId,
        openViews,
        reopenLastClosedView,
    } from "src/systems/views";
    import {
        IconButton,
        Menu,
        Separator,
        SubMenuButton,
        TextButton,
        showContextMenu,
    } from "src/systems/context_menu";
    import { Bindings } from "src/systems/bindings";

    import { MapEditorContext } from "src/views/MapEditor";
    import { HomePageContext } from "src/views/HomePage";
    import type { EditorContext } from "src/systems/editors";

    // Add the actions to the global keybindings
    Bindings.register({
        "tabbar/close_all": async () => {
            let views = [...$openViews];
            for (const view of views.reverse()) {
                await view.askClose();
            }
        },
        "tabbar/reopen_last": () => reopenLastClosedView(),
        "tabbar/close_saved": () =>
            [...$openViews].reverse().forEach((view) => {
                if (!(<EditorContext>view)?.needsSaveNow) view.close();
            }),
        // Goes to the next tab to the right
        // Wraps around if it's the last tab
        "tabbar/next": () => {
            const current = $openViews.find((view) => view.selected);
            const index = $openViews.indexOf(current);
            const next = $openViews[index + 1] ?? $openViews[0];
            next.select();
        },
        "tabbar/prev": () => {
            const current = $openViews.find((view) => view.selected);
            const index = $openViews.indexOf(current);
            const prev = $openViews[index - 1] ?? $openViews[$openViews.length - 1];
            prev.select();
        },
    });

    let barMenu = new Menu([
        new SubMenuButton(
            "New editor",
            new Menu([
                new IconButton("Home Page", "material-symbols:home", () => {
                    new HomePageContext().create().select();
                }),
                new TextButton("Map Editor", () => {
                    new MapEditorContext({
                        group: 0,
                        index: 0,
                    }).create().select();
                }),
            ])
        ),
        new Separator(),
        new IconButton("Close All", "ic:round-close", "tabbar/close_all"),
        new TextButton("Close Saved", "tabbar/close_saved"),
        new TextButton("Reopen Last", "tabbar/reopen_last"),
    ]);
    // onMount(() => {
    //     barMenu = ;
    // });

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
            const current = $openViews.find((view) => view.selected);
            const index = $openViews.indexOf(current);
            const next = $openViews[index + (delta > 0 ? 1 : -1)];
            if (next) {
                next.select();
                // Scroll to the new tab
                const tab = document.getElementById(`tab-${index}`);
                if (!tab) return;
                this.scrollLeft =
                    tab.offsetLeft - (delta > 0 ? 0 : tab.offsetWidth);
            }
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

<!-- Tabs -->
<!-- svelte-ignore missing-declaration -->
<div
    class="tabs-view"
    class:dropzone={activeDropzone}
    on:wheel|preventDefault={onWheel}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
    on:contextmenu={(e) => showContextMenu(e, barMenu)}
>
    <!-- Tabs container -->
    <div class="tabs-container">
        {#each $openViews as view}
            <Tab {view} />
        {/each}
    </div>
</div>

<svelte:window on:mouseout={() => draggingId.set(null)} />

<style lang="scss">
    .tabs-view {
        height: 40px;
        overflow-y: hidden;
        scroll-behavior: auto;
        user-select: none;

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

        &.dropzone {
            background: var(--accent-shadow);
        }
    }

    .tabs-container {
        width: max-content;
        display: flex;
        height: 40px;
        overflow-x: auto;
        overflow-y: hidden;
        background: var(--tabs-bg);
        color: var(--tabs-fg);
    }
</style>
