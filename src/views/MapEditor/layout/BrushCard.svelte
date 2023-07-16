<script lang="ts">
    import {
        IconOption,
        Menu,
        Separator,
        showContextMenu,
    } from "src/systems/context_menu";
    import type { Brush } from "../editor/brushes";
    import ClickableIcons from "src/components/ClickableIcons.svelte";

    export let small: boolean = false;
    export let brush: Brush;
    export let index: number;

    let name = brush.name + index;
    let pinned = index === 0 || index === 1;
    let selected = index === 0;

    function setPinned() {
        pinned = true;
    }

    function setUnpinned() {
        pinned = false;
    }

    $: contextMenu = new Menu([
        new Separator(name),
        new IconOption("Edit", "mdi:edit", () => {}),
        pinned
            ? new IconOption("Unpin", "mdi:pin", setUnpinned)
            : new IconOption("Pin", "mdi:pin", setPinned),
        new Separator(),
        new IconOption("Delete", "mdi:trash", () => {}),
    ]);
</script>

{#if small}
    <div
        class="brush-card small-brush-card"
        on:contextmenu={(e) => showContextMenu(e, contextMenu)}
        class:pinned
        class:selected
    >
        {name}
        <ClickableIcons
            vertical_alignment="bottom"
            icons={pinned
                ? [{ icon: "mdi:pin", text: "Unpin", onclick: setUnpinned }]
                : [{ icon: "mdi:pin", text: "Pin", onclick: setPinned }]}
        />
    </div>
{:else}
    <div
        class="brush-card normal-brush-card"
        on:contextmenu={(e) => showContextMenu(e, contextMenu)}
        class:pinned
        class:selected
    >
        <div class="preview">Preview</div>
        <div class="name">{name}</div>
        <ClickableIcons
            vertical_alignment="bottom"
            icons={[
                // { icon: "mdi:trash", text: "Delete", onclick: () => {} },
                // { icon: "mdi:edit", text: "Edit", onclick: () => {} },
                pinned
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

        display: grid;
        grid-template-areas: "preview name";
        grid-template-columns: 100px 1fr;
    }

    .small-brush-card {
        width: 75px;
        height: 75px;
        font-size: 13px;
    }

    .brush-card {
        position: relative;
        padding: 4px;

        border: 1px solid var(--card-border);
        background: var(--card-bg);
        color: var(--hard-shadow);
        cursor: pointer;

        transition: 50ms ease-out;

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

        &:hover {
            border-color: var(--card-hover-border);
            background: var(--card-hover-bg);
            color: var(--card-hover-fg);
        }

        &.selected {
            border-color: var(--accent-fg);
            background: var(--card-selected-bg);
            color: var(--card-selected-fg);
        }
    }
</style>
