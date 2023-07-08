<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        SubMenuOption,
        showContextMenu,
    } from "src/systems/context_menu";
    import { MapEditorContext } from "../MapEditor";
    import { showTooltip } from "src/systems/tooltip";

    import intersection from "src/systems/intersection";

    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import MapPreview from "./MapPreview.svelte";
    import { createEventDispatcher, getContext } from "svelte";
    import type { MapListContext, MapSelectionEvent } from "../MapList";
    import OffsetLabel from "src/components/OffsetLabel.svelte";

    export let group: number;
    export let index: number;
    export let name: string = null;
    export let offset: number;
    export let selected = false;
    export let lastSelected = false;
    
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
        new IconOption("New in Group", "mdi:plus", () => {context.component.createMap({group})}),
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
        showTooltip({
            target: cardEl,
            width: 400,
            height: 400,
            slot: {
                component: MapPreview,
                props: {
                    group,
                    index,
                    name,
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
        <div class="left">
            <span class="group">{group}</span>.<span class="index">{index}</span
            >
        </div>
        <div class="right" {...$$restProps}>
            {#if name !== null}
                <div class="pair">
                    <span class="title">Name: </span>
                    <span class="value">{name}</span>
                </div>
            {/if}
            <div class="pair">
                <span class="title">Offset: </span>
                <span class="value">
                    <OffsetLabel {offset} />
                </span>
            </div>
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
            outline: 1px solid var(--accent-fg);
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
        flex-shrink: 1;
        padding: 0 0.5em;

        .group {
            color: var(--accent-fg);
            font-size: 32pt;
            font-weight: bold;
        }
        .index {
            font-size: 16pt;
        }
    }

    .right {
        align-self: center;
        display: flex;
        flex-direction: column;
        gap: 0.2em;

        .pair {
            .title {
                color: var(--weak-fg);
                font-size: 11pt;
            }

            .value {
                color: var(--strong-fg);
                overflow: hidden;
            }
        }
    }
</style>
