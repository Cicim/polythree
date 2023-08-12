<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        showContextMenu,
    } from "src/systems/context_menu";
    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import type { BrushMaterial } from "../../../editor/brushes";
    import { getContext, onMount, tick } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import { spawnDialog } from "src/systems/dialogs";
    import BrushSettings from "./BrushSettings.svelte";
    import { tooltip } from "src/systems/tooltip";
    import type { Writable } from "svelte/store";

    const context: MapEditorContext = getContext("context");
    const material = context.material;
    const editingBrush = context.editingBrush;
    const primaryBrushes = context.primaryBrushes;
    const secondaryBrushes = context.secondaryBrushes;

    /** This brush */
    export let brush: BrushMaterial;
    /** If the card should be renders as a small card */
    export let small: boolean = false;
    /** Whether or not to show the card (for filtering) */
    export let show: boolean = true;

    let name = brush.name;
    let pinned = brush.pinned;
    let icon = brush.icon;
    let brushName = brush.brushName;
    $: selected = $material === brush;

    function setPinned() {
        $pinned = true;
    }

    function setUnpinned() {
        $pinned = false;
    }

    function selectBrush() {
        $material = brush;
    }

    function editBrush() {
        $editingBrush = brush;
    }

    async function openSettings() {
        editBrush();
        await tick();
        spawnDialog(BrushSettings, {
            context,
        });
    }

    let deletedList: Writable<BrushMaterial[]>;
    let deletedIndex: number;
    let deletedBrush: BrushMaterial;

    function deleteBrush() {
        deletedList = brush.onlyUsesPrimaryTiles(context.tileset1Length)
            ? primaryBrushes
            : secondaryBrushes;

        deletedIndex = $deletedList.indexOf(brush);
        deletedBrush =
            $deletedList.splice(deletedIndex, 1)?.[0] ??
            (console.error("How come there isn't a brush?!"), null);

        $deletedList = $deletedList;
    }

    let previewContainer: HTMLDivElement;
    function updateThumbnail() {
        if (!previewContainer) return;
        previewContainer.innerHTML = "";
        previewContainer.appendChild(
            brush.renderThumbnail(context.botTiles, context.topTiles)
        );
    }

    $: updateThumbnail();

    $: contextMenu = new Menu([
        new Separator(name),
        new IconOption("Edit", "mdi:edit", editBrush),
        new IconOption("Settings", "mdi:cog", openSettings),
        $pinned
            ? new IconOption("Unpin", "mdi:pin-off", setUnpinned)
            : new IconOption("Pin", "mdi:pin", setPinned),
        new Separator(),
        new IconOption("Delete", "mdi:trash", deleteBrush),
    ]);

    onMount(() => {
        updateThumbnail();
    });
</script>

{#if small}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="brush-card small-brush-card"
        on:contextmenu={(e) => showContextMenu(e, contextMenu)}
        on:click={selectBrush}
        on:dblclick={editBrush}
        class:pinned={$pinned}
        class:selected
    >
        <div class="name">{name}</div>
        <div class="preview" bind:this={previewContainer} />
        <ClickableIcons
            size={small ? "9pt" : "11pt"}
            vertical_alignment="bottom"
            icons={[
                $pinned
                    ? { icon: "mdi:pin", text: "Unpin", onclick: setUnpinned }
                    : { icon: "mdi:pin", text: "Pin", onclick: setPinned },
            ]}
        />
    </div>
{:else}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="brush-card normal-brush-card"
        on:contextmenu={(e) => showContextMenu(e, contextMenu)}
        on:click={selectBrush}
        on:dblclick={editBrush}
        class:pinned={$pinned}
        class:selected
        class:hidden={!show}
    >
        <div class="preview" bind:this={previewContainer} />
        <div class="name">{name}</div>
        <div class="icon">
            <iconify-icon {icon} inline use:tooltip tooltip={brushName} />
            {#if brush.onlyUsesPrimaryTiles(context.tileset1Length)}
                <iconify-icon
                    icon="mdi:dice-one"
                    inline
                    use:tooltip
                    tooltip={"Brush only uses <i>primary</i> tileset"}
                />
            {:else}
                <iconify-icon
                    icon="mdi:dice-two"
                    inline
                    use:tooltip
                    tooltip={"Brush uses <i>primary</i> <br> and <i>secondary</i> tilesets"}
                />
            {/if}
        </div>
        <ClickableIcons
            vertical_alignment="bottom"
            icons={[
                {
                    icon: "mdi:edit",
                    text: "Edit",
                    onclick: () => editBrush(),
                },
                $pinned
                    ? {
                          icon: "mdi:pin-off",
                          text: "Unpin",
                          onclick: setUnpinned,
                      }
                    : { icon: "mdi:pin", text: "Pin", onclick: setPinned },
            ]}
        />
    </div>
{/if}

<style lang="scss">
    .normal-brush-card {
        min-width: 266px;
        height: 100px;
        flex-grow: 0;
        flex: 1 0;
        padding: 4px;
        gap: 12px;
        border-radius: 4px;
        color: var(--hard-shadow);

        display: grid;
        grid-template-areas: "preview name";
        grid-template-columns: 96px 1fr;

        .icon {
            position: absolute;
            top: 80px;
            left: 108px;

            iconify-icon {
                font-size: 20px;
                color: var(--weak-fg);
            }
        }

        .preview :global(canvas) {
            border-radius: 4px;
            filter: drop-shadow(-1px -1px 3px var(--main-bg));
        }

        &:hover {
            border-color: var(--card-hover-border);
            background: var(--card-hover-bg);
            color: var(--main-fg);
        }

        &.selected {
            border-color: var(--accent-fg);
            background: var(--card-selected-bg);
            color: var(--card-selected-fg);
        }
    }

    .small-brush-card {
        width: 75px;
        height: 75px;
        font-size: 13px;

        position: relative;
        text-shadow: 2px 2px 0 var(--main-bg);
        color: white;

        &:not(:hover) {
            .name {
                transition: background 100ms ease-in-out,
                    box-shadow 100ms ease-in-out;
                box-shadow: 0 8px 4px #0005;
                background: #0005;
                text-shadow: none;
                width: 100%;
            }
        }

        &:hover {
            color: white;
            border-color: var(--card-hover-border);
        }

        &.selected {
            border-color: var(--accent-fg);
            outline: 1px solid var(--accent-fg);
        }

        .name {
            position: absolute;
        }

        &:not(.pinned) {
            :global(.icons-container) {
                display: none;
            }
            &:hover {
                :global(.icons-container) {
                    display: flex;
                }
            }
        }

        &.pinned {
            order: -1;
        }
    }

    .brush-card {
        position: relative;

        border: 1px solid var(--card-border);
        background: var(--card-bg);
        cursor: pointer;

        transition: 50ms ease-out;

        .preview {
            width: 100%;
            image-rendering: pixelated;

            :global(canvas) {
                width: 100%;
                height: 100%;
            }
        }
    }
</style>
