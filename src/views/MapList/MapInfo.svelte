<script lang="ts">
    import MapPreview from "./MapPreview.svelte";
    import type { MapCardProps, MapId } from "../MapList";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import Button from "src/components/Button.svelte";

    import { MapEditorContext } from "../MapEditor";
    import OffsetLabel, {
        prettyOffset,
    } from "src/components/OffsetLabel.svelte";
    import { config } from "src/systems/global";
    import { tooltip } from "src/systems/tooltip";
    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import { weatherIconMap } from "src/systems/consts";
    import { mapNames } from "src/systems/data/map_names";

    export let selectedMaps: MapId[];

    const data: Writable<MapCardProps[]> = getContext("data");

    let selectedMap: MapId = null;
    $: selectedMap = selectedMaps.length === 1 ? selectedMaps[0] : null;
    let selectedProps: MapCardProps = null;
    $: selectedProps = selectedMap
        ? $data.find(
              (p) =>
                  p.group === selectedMap.group && p.index === selectedMap.index
          )
        : null;
</script>

<div class="info-container">
    <div class="preview" class:selected={selectedMap !== null}>
        {#if selectedMaps.length === 1}
            {#key selectedMap}
                <MapPreview
                    windowScroll={false}
                    group={selectedProps.group}
                    index={selectedProps.index}
                    name={$mapNames[selectedProps.mapsec]}
                />
            {/key}
        {:else}
            <div class="no-preview">
                {selectedMaps.length === 0
                    ? "No map Selected"
                    : `Preview not available for multiple maps (${selectedMaps.length})`}
            </div>
        {/if}
    </div>
    <div class="actions">
        {#if selectedMap}
            <Button
                theme="secondary"
                on:click={() => {
                    new MapEditorContext(selectedMap).create().select();
                }}
            >
                <iconify-icon icon="typcn:export" />
                Go to Map Editor
            </Button>
            <Button>
                <iconify-icon icon="typcn:export" />
                Go to Tileset Editor
            </Button>
        {/if}
    </div>

    <div class="info">
        {#if selectedMap}
            <span class="title">id</span>
            <span class="value">
                {selectedProps.group}.{selectedProps.index}
            </span>
            <span class="title">name</span>
            <span class="value">
                {$mapNames[selectedProps.mapsec]}
                {#if selectedProps.floorNum}
                    {selectedProps.floorNum}F
                {/if}

                <span class="more" use:tooltip tooltip="Map Section Id">
                    ({selectedProps.mapsec})
                </span>
            </span>
            <span class="title">offset</span>
            <span class="value">
                <OffsetLabel offset={selectedProps.offset} />
                <ClickableIcons
                    vertical_alignment="bottom"
                    icons={[
                        {
                            text: "Copy Number",
                            icon: "mdi:clipboard-edit-outline",
                            onclick: () =>
                                navigator.clipboard.writeText(
                                    selectedProps.offset.toString()
                                ),
                        },
                        {
                            text: "Copy",
                            icon: "mdi:clipboard-outline",
                            onclick: () =>
                                navigator.clipboard.writeText(
                                    prettyOffset(selectedProps.offset)
                                ),
                        },
                    ]}
                />
            </span>
            <span class="title">Layout</span>
            <span class="value">
                <i>{$config.layout_names[selectedProps.layout] ?? "Unnamed"}</i>
            </span>
            <span class="title">tilesets</span>
            <span class="value">
                <div class="tileset">
                    <i
                        >{$config.tileset_names[selectedProps.tileset1] ??
                            "Unnamed"}</i
                    ><br />
                    <OffsetLabel offset={selectedProps.tileset1} /><br />
                    <ClickableIcons
                        vertical_alignment="top"
                        icons={[
                            {
                                text: "Copy Number",
                                icon: "mdi:clipboard-edit-outline",
                                onclick: () =>
                                    navigator.clipboard.writeText(
                                        selectedProps.tileset1.toString()
                                    ),
                            },
                            {
                                text: "Copy",
                                icon: "mdi:clipboard-outline",
                                onclick: () =>
                                    navigator.clipboard.writeText(
                                        prettyOffset(selectedProps.tileset1)
                                    ),
                            },
                        ]}
                    />
                </div>
                <div class="tileset">
                    <i
                        >{$config.tileset_names[selectedProps.tileset2] ??
                            "Unnamed"}</i
                    ><br />
                    <OffsetLabel offset={selectedProps.tileset2} />
                    <ClickableIcons
                        vertical_alignment="top"
                        icons={[
                            {
                                text: "Copy Number",
                                icon: "mdi:clipboard-edit-outline",
                                onclick: () =>
                                    navigator.clipboard.writeText(
                                        selectedProps.tileset2.toString()
                                    ),
                            },
                            {
                                text: "Copy",
                                icon: "mdi:clipboard-outline",
                                onclick: () =>
                                    navigator.clipboard.writeText(
                                        prettyOffset(selectedProps.tileset2)
                                    ),
                            },
                        ]}
                    />
                </div>
            </span>
            <span class="title">Music</span>
            <span class="value">
                {#if selectedProps.music === 0xffff}
                    No track
                {:else if selectedProps.music === 0x7fff}
                    Plays last track
                {:else}
                    {selectedProps.music}
                {/if}
            </span>
            <span class="title">Weather</span>
            <span class="value">
                {#if weatherIconMap[selectedProps.weather]?.[1]}
                    <iconify-icon
                        inline
                        icon={weatherIconMap[selectedProps.weather][1]}
                    />
                {/if}
                {#if weatherIconMap[selectedProps.weather]?.[0]}
                    {weatherIconMap[selectedProps.weather][0]}
                {/if}
                {#if !(weatherIconMap[selectedProps.weather]?.[0] || weatherIconMap[selectedProps.weather]?.[1])}
                    {selectedProps.weather}
                {:else}
                    ({selectedProps.weather})
                {/if}
            </span>
        {/if}
    </div>
</div>

<style lang="scss">
    .info-container {
        margin: 0;
        padding: 1em;
        overflow-y: scroll;
        display: grid;
        align-items: baseline;
        align-content: baseline;
        gap: 1em;

        .preview {
            display: grid;
            justify-self: center;

            margin: 4px;
            width: 100%;
            max-height: 200px;
            aspect-ratio: 1;

            &.selected {
                border: 1px solid var(--light-shadow);

                background: var(--light-shadow);
            }

            .no-preview {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                font-size: 1.5em;
            }
        }

        .actions {
            display: grid;

            iconify-icon {
                transform: scale(1.5);
            }

            :global(button) {
                display: grid;
                grid-template-columns: minmax(0, min-content) minmax(0, 1fr);
                justify-content: center;
                gap: 0.5em;
                padding: 6px 12px;
            }
        }

        .info {
            display: grid;
            grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
            row-gap: 0.5em;
            column-gap: 1em;

            .title {
                color: var(--weak-fg);
                text-transform: capitalize;
                text-align: right;

                &::after {
                    content: ":";
                }
            }

            .value {
                align-self: center;
                position: relative;

                :global(.icons-container) {
                    top: 0;
                }

                .tileset {
                    position: relative;

                    &:first-child {
                        margin-bottom: 0.5em;
                    }
                }
            }

            .more {
                cursor: help;
            }
        }
    }
</style>
