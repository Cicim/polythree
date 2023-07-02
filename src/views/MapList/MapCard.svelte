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

    export let group: number;
    export let index: number;
    export let name: string = null;
    export let offset: number;

    let loaded = false;

    let cardEl: HTMLDivElement;

    let ctxMenu = new Menu([
        new Separator("Edit"),
        new IconOption("Map", "material-symbols:edit-outline", () => {
            new MapEditorContext({ group, index }).create().select();
        }),
        new IconOption("Tilesets", "material-symbols:edit-outline", () => {}),
        new Separator("Selection"),
        new IconOption("Select", "material-symbols:select-sharp", () => {}),
        new IconOption(
            "Select All in Group",
            "fluent-mdl2:select-all",
            () => {}
        ),
        new IconOption(
            "Select All",
            "material-symbols:select-all-sharp",
            () => {}
        ),
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
    class="card"
    on:click={() => new MapEditorContext({ group, index }).create().select()}
    on:contextmenu={(e) => showContextMenu(e, ctxMenu)}
    use:intersection
    on:enterViewport={async () => {
        await new Promise((resolve) =>
            setTimeout(resolve, 100)
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
                <span class="value"
                    >${offset.toString(16).padStart(8, "0").toUpperCase()}</span
                >
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
        height: 50px;

        padding: 0.5em;
        border-radius: 4px;

        background: var(--card-bg);
        border: 1px solid var(--card-border);

        position: relative;
        cursor: pointer;
        user-select: none;

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
