<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        showContextMenu,
    } from "src/systems/context_menu";
    import { MapEditorContext } from "../MapEditor";
    import { showTooltip } from "src/systems/tooltip";

    import intersection from "src/systems/intersection";

    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import MapPreview from "./MapPreview.svelte";
    import { createEventDispatcher } from "svelte";
    import type { MapSelectionEvent } from "../MapList";
    import OffsetLabel from "src/components/OffsetLabel.svelte";

    export let group: number;
    export let index: number;
    export let name: string = null;
    export let offset: number;
    export let selected = false;
    export let lastSelected = false;

    const dispatch = createEventDispatcher();

    function selectCard(e: MouseEvent) {
        if (e.ctrlKey || e.shiftKey) e.preventDefault();

        // Get if the control button is pressed
        dispatch("select", {
            group,
            index,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
        } as MapSelectionEvent);
    }

    let loaded = false;

    let cardEl: HTMLDivElement;

    let ctxMenu = new Menu([
        new IconOption("Duplicate", "mdi:content-copy", () => {}),
        new IconOption("Delete", "mdi:delete", () => {}),
        new Separator("Edit"),
        new IconOption("Map", "material-symbols:edit-outline", () => {
            new MapEditorContext({ group, index }).create().select();
        }),
        new IconOption("Tilesets", "material-symbols:edit-outline", () => {}),
        new Separator("Preview"),
        new IconOption("Map", "material-symbols:visibility-outline", () => {
            openTooltip();
        }),
        new IconOption(
            "Tilesets",
            "material-symbols:visibility-outline",
            () => {}
        ),
    ]);

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
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    bind:this={cardEl}
    class:selected
    class:last-selected={lastSelected}
    class="card"
    on:click={selectCard}
    on:dblclick={(e) => {
        if (e.ctrlKey || e.shiftKey) return;
        new MapEditorContext({ group, index }).create().select();
    }}
    on:contextmenu={(e) => {showContextMenu(e, ctxMenu)}}
    use:intersection
    on:enterViewport={async () => {
        await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100)
        );
        loaded = true;
    }}
    on:exitViewport={() => {
        loaded = false;
    }}
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
                { text: "Delete", icon: "mdi:delete" },
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

        &:hover {
            background: var(--card-hover-bg);
            border-color: var(--card-hover-border);

            :global(.container) {
                display: flex;
            }
        }
        :global(.container) {
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
