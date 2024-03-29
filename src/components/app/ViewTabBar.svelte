<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        SubMenuOption,
        TextOption,
        showContextMenu,
    } from "src/systems/context_menu";
    import { redefineBindings } from "src/systems/bindings";
    import { MapEditorContext } from "src/views/MapEditor";
    import { HomePageContext } from "src/views/HomePage";
    import type { EditorContext } from "src/systems/contexts";
    import { MapListContext } from "src/views/MapList";
    import {
        reopenLastClosedView,
        openViews,
        draggingId,
        activeView,
    } from "src/systems/views";
    import ViewTab from "./ViewTab.svelte";

    // Redefine the default keybindings for the TabBar
    redefineBindings({
        "tabbar/close_all": async () => {
            let views = [...$openViews];
            for (const view of views.reverse()) {
                await view.askClose();
            }
        },
        "tabbar/reopen_last": () => reopenLastClosedView(),
        "tabbar/close_saved": () =>
            [...$openViews].reverse().forEach((view) => {
                if (!(<EditorContext>view)?.hasUnsavedChanges) view.close();
            }),
        "tabbar/next": () => {
            const current = $openViews.find((view) => view === $activeView);
            const index = $openViews.indexOf(current);
            const next = $openViews[index + 1] ?? $openViews[0];
            next.select();
        },
        "tabbar/prev": () => {
            const current = $openViews.find((view) => view === $activeView);
            const index = $openViews.indexOf(current);
            const prev =
                $openViews[index - 1] ?? $openViews[$openViews.length - 1];
            prev.select();
        },
    });

    let viewTabbarMenu = new Menu([
        new SubMenuOption(
            "New View",
            new Menu([
                new IconOption("Home Page", HomePageContext.icon, () => {
                    new HomePageContext().create().select();
                }),
                new IconOption("Map Editor", MapEditorContext.icon, () => {
                    new MapEditorContext({
                        group: 0,
                        index: 0,
                    })
                        .create()
                        .select();
                }),
                new IconOption("Map List", MapListContext.icon, () => {
                    new MapListContext().create().select();
                }),
            ])
        ),
        new Separator(),
        new IconOption("Close All", "codicon:close-all", "tabbar/close_all"),
        new TextOption("Close Saved", "tabbar/close_saved"),
        new TextOption("Reopen Last", "tabbar/reopen_last"),
    ]);

    /**
     * Scroll event handler
     * Implements these behaviors
     * - Simple scroll moves the scroll horizontally
     * - Shift scroll selects the next tab in the given direction
     * - Alt scroll moves the scroll to the beginning or the end
     */
    function onWheel(e: WheelEvent) {
        const delta = e.deltaY;

        // Get the container you actually have to scroll
        const element = this.children[0] as HTMLDivElement;

        // Choose next tab
        if (e.shiftKey) {
            // Fix in case the shift key makes the deltaX property update instead of deltaY
            const delta = e.deltaY || e.deltaX;

            const current = $openViews.find((view) => view === $activeView);
            const index = $openViews.indexOf(current);
            const nextIndex = index + (delta > 0 ? 1 : -1);
            const next = $openViews[nextIndex];
            if (next) {
                next.select();
                // Scroll to the new tab
                const tab = document.getElementById(`tab-${nextIndex}`);
                if (!tab) return;

                element.scrollLeft = tab.offsetLeft - tab.offsetWidth / 2;
            }
        }
        // Beginning or end
        else if (e.altKey)
            element.scrollLeft = delta > 0 ? this.scrollWidth : 0;
        // Horizontal scroll
        else element.scrollLeft += delta;
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
    on:wheel|preventDefault={onWheel}
    on:contextmenu={(e) => showContextMenu(e, viewTabbarMenu)}
>
    <!-- Tabs container -->
    <div
        class="tabs-container"
        class:dropzone={activeDropzone}
        on:dragover={onDragOver}
        on:dragleave={onDragLeave}
        on:drop={onDrop}
    >
        {#each $openViews as view}
            <ViewTab {view} />
        {/each}
    </div>
</div>

<svelte:window on:mouseout={() => draggingId.set(null)} />

<style lang="scss">
    .tabs-view {
        height: 40px;
        overflow: hidden;
        scroll-behavior: auto;
        user-select: none;
    }

    .tabs-container {
        padding-left: 2px;
        display: flex;
        flex-flow: row nowrap;
        height: 40px;
        overflow-x: auto;
        overflow-y: hidden;
        background: var(--tabs-bg);
        color: var(--tabs-fg);

        box-shadow: inset 0 calc(var(--tab-border-width) * -1)
            var(--tab-selected-border);

        &.dropzone {
            background: var(--accent-shadow);
            transition: background 100ms ease-in;

            :global(.tab:not(.selected)) {
                background: var(--tabs-bg);
            }
        }

        &:not(:hover) {
            &::-webkit-scrollbar {
                display: none;
            }
            &::-webkit-scrollbar-thumb {
                background: transparent;
            }
        }

        &::-webkit-scrollbar {
            height: 5px;
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
</style>
