<script lang="ts" context="module">
    export interface FilterReason {
        matchesGroup?: [start: number, length: number];
        matchesIndex?: [start: number, length: number];
        matchesName?: [start: number, length: number];
        matchesLayout?: [start: number, length: number];
    }
</script>

<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        SubMenuOption,
        showContextMenu,
    } from "src/systems/context_menu";
    import { MapEditorContext } from "../MapEditor";
    import { showPreviewWindow } from "src/components/app/PreviewWindow.svelte";

    import intersection from "src/systems/intersection";

    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import MapPreview from "./MapPreview.svelte";
    import { createEventDispatcher, getContext } from "svelte";
    import type { MapListContext, MapSelectionEvent } from "../MapList";
    import { fade } from "svelte/transition";
    import { config } from "src/systems/global";
    import UnderLinedReason from "./UnderLinedReason.svelte";
    import { mapNames } from "src/systems/data/map_names";

    export let group: number;
    export let index: number;
    export let mapsec: number = null;
    export let layout: number = 0;
    export let selected = false;
    export let lastSelected = false;
    export let reason: FilterReason;

    $: groupReason = reason?.matchesGroup;
    $: indexReason = reason?.matchesIndex;
    $: nameReason = reason?.matchesName;
    $: layoutReason = reason?.matchesLayout;

    $: selected === true && cardEl?.focus();

    const dispatch = createEventDispatcher();

    function selectCard(e: {
        ctrlKey: boolean;
        shiftKey: boolean;
        preventDefault: () => void;
    }) {
        if (e.ctrlKey || e.shiftKey) e.preventDefault();

        // Get if the control button is pressed
        dispatch("select", {
            group,
            index,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
        } as MapSelectionEvent);
    }

    const context: MapListContext = getContext("context");
    let loaded = false;
    let cardEl: HTMLDivElement;

    let ctxMenu = [
        // new IconOption("Duplicate", "mdi:content-copy", () => {}),
        new IconOption("New in Group", "mdi:plus", () => {
            context.component.createMap(group);
        }),
        new IconOption("Delete", "mdi:delete", () => {
            context.component.deleteCard(group, index);
        }),
        new SubMenuOption(
            "Map",
            new Menu([
                new IconOption("Edit", "material-symbols:edit-outline", () => {
                    new MapEditorContext({ group, index }).create().select();
                }),
                new IconOption(
                    "Preview",
                    "material-symbols:visibility-outline",
                    () => {
                        openTooltip();
                    }
                ),
            ])
        ),
        new SubMenuOption(
            "Tilesets",
            new Menu([
                new IconOption(
                    "Edit",
                    "material-symbols:edit-outline",
                    () => {}
                ),
                new IconOption(
                    "Preview",
                    "material-symbols:visibility-outline",
                    () => {}
                ),
            ])
        ),
    ];

    function openTooltip() {
        showPreviewWindow({
            target: cardEl,
            width: 400,
            height: 400,
            slot: {
                component: MapPreview,
                props: {
                    group,
                    index,
                    name: $mapNames[mapsec],
                },
            },
        });
    }

    function onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case "Space":
            case "Enter":
                event.preventDefault();
                selectCard(event);
                break;
        }
    }

    function onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            case "Space":
            case "Enter":
                event.preventDefault();
                break;
        }
    }

    // Fully load a card in only if it's been on screen for at least X milliseconds
    // X = 50
    let viewportTimer: NodeJS.Timeout;
    function onEnterViewport() {
        if (viewportTimer) return;

        viewportTimer = setTimeout(() => {
            loaded = true;
            viewportTimer = null;
        }, Math.random() * 50 + 50);
    }
    function oneExitViewport() {
        if (viewportTimer) {
            clearTimeout(viewportTimer);
            viewportTimer = null;
        }
        loaded = false;
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
    tabindex={1}
    bind:this={cardEl}
    class:selected
    class:last-selected={lastSelected}
    class="card"
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
    on:click={selectCard}
    on:dblclick={(e) => {
        if (e.ctrlKey || e.shiftKey) return;
        new MapEditorContext({ group, index }).create().select();
    }}
    on:contextmenu={(e) => {
        showContextMenu(
            e,
            new Menu([
                ...context.component.getMultiOptions(),
                new Separator(`This Map (${group}.${index})`),
                ...ctxMenu,
            ])
        );
    }}
    use:intersection
    on:enterViewport={onEnterViewport}
    on:exitViewport={oneExitViewport}
>
    {#if loaded}
        <div class="left" in:fade={{ duration: 100 }}>
            <div class="number">
                <span class="group"
                    ><UnderLinedReason
                        string={group.toString()}
                        reason={groupReason}
                    /></span
                >.<span class="index"
                    ><UnderLinedReason
                        string={index.toString()}
                        reason={indexReason}
                    /></span
                >
            </div>
        </div>
        <div class="right" {...$$restProps} in:fade={{ duration: 100 }}>
            {#if mapsec !== null}
                <span class="title">Name: </span>
                <span class="value">
                    <UnderLinedReason
                        string={$mapNames[mapsec]}
                        reason={nameReason}
                    />
                </span>
            {/if}
            <span class="title">Layout: </span>
            <span class="value">
                {#if !$config.layout_names[layout]}
                    <i>Unnamed</i>
                {:else}
                    <UnderLinedReason
                        string={$config.layout_names[layout]}
                        reason={layoutReason}
                    />
                {/if}
            </span>
        </div>
        <!-- Copy iconify icon -->
        <ClickableIcons
            vertical_alignment="bottom"
            icons={[
                {
                    text: "Delete",
                    icon: "mdi:delete",
                    onclick: () => {
                        context.component.deleteCard(group, index);
                    },
                },
                {
                    text: "Preview",
                    icon: "mdi:eye",
                    onclick: openTooltip,
                },
            ]}
        />
    {/if}
</div>

<style lang="scss">
    .card {
        display: flex;
        gap: 0.25em;

        min-width: 360px;
        height: 50px;

        padding: 0.5em;
        border-radius: 4px;

        background: var(--card-bg);
        border: 1px solid var(--card-border);

        position: relative;
        user-select: none;

        &.last-selected {
            border-style: dashed;
            border-color: var(--card-selected-border);
        }
        &.selected {
            background: var(--card-selected-bg);
            border-color: var(--card-selected-border);

            &:hover {
                background: var(--card-selected-bg-hover);
                border-color: var(--card-selected-border-hover);
            }
        }

        &:focus {
            outline: 1px solid var(--outline);
            outline-offset: 1px;
        }

        &:hover {
            background: var(--card-hover-bg);
            border-color: var(--card-hover-border);

            :global(.icons-container) {
                display: flex;
            }
        }
        :global(.icons-container) {
            display: none;
        }
    }

    .left {
        display: flex;
        flex-flow: row nowrap;
        flex-shrink: 1;
        padding: 0 0.5em;

        place-content: last baseline;
        .number {
            .group {
                color: var(--accent-fg);
                font-size: 32pt;
                font-weight: 600;
            }
            .index {
                font-size: 16pt;
            }
        }
    }

    .right {
        display: flex;
        flex-direction: column;
        gap: 0.2em;
        display: grid;
        grid-template-columns: min-content 1fr;
        align-content: space-evenly;
        // align-content: center;
        align-items: last baseline;

        .title {
            color: var(--weak-fg);
            font-size: 12px;
            text-align: right;
        }

        .value {
            color: var(--strong-fg);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
</style>
