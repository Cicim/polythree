<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        showContextMenu,
    } from "src/systems/context_menu";
    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import type { BrushMaterial } from "../editor/materials";
    import { getContext, onMount } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";

    const context: MapEditorContext = getContext("context");
    const material = context.material;
    const data = context.data;
    const editingBrush = context.editingBrush;

    export let small: boolean = false;
    export let index: number;
    export let brush: BrushMaterial;

    let name = brush.name;
    let pinned = brush.pinned;
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

    let previewContainer: HTMLDivElement;
    function updateThumbnail() {
        if (!previewContainer) return;
        previewContainer.innerHTML = "";
        previewContainer.appendChild(brush.exportThumbnail($data.tilesets));
    }

    $: updateThumbnail();

    $: contextMenu = new Menu([
        new Separator(name),
        new IconOption("Edit", "mdi:edit", editBrush),
        $pinned
            ? new IconOption("Unpin", "mdi:pin", setUnpinned)
            : new IconOption("Pin", "mdi:pin", setPinned),
        new Separator(),
        new IconOption("Delete", "mdi:trash", () => {}),
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
            icons={$pinned
                ? [{ icon: "mdi:pin", text: "Unpin", onclick: setUnpinned }]
                : [{ icon: "mdi:pin", text: "Pin", onclick: setPinned }]}
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
    >
        <div class="preview" bind:this={previewContainer} />
        <div class="name">{name}</div>
        <ClickableIcons
            vertical_alignment="bottom"
            icons={[
                // { icon: "mdi:trash", text: "Delete", onclick: () => {} },
                // { icon: "mdi:edit", text: "Edit", onclick: () => {} },
                $pinned
                    ? { icon: "mdi:pin", text: "Unpin", onclick: setUnpinned }
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

        .preview :global(canvas) {
            border-radius: 4px;
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
</style>
