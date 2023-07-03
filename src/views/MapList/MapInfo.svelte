<script lang="ts">
    import MapPreview from "./MapPreview.svelte";
    import type { MapCardProps, MapId, SelectedCards } from "../MapList";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import Button from "src/components/Button.svelte";
    import "iconify-icon";
    import { MapEditorContext } from "../MapEditor";
    import OffsetLabel from "src/components/OffsetLabel.svelte";

    export let selectedMaps: MapId[];

    const data: Writable<MapCardProps[]> = getContext("data");

    const weatherIconMap: Record<number, [name: string, icon: string]> = {
        // none
        0: ["None", ""],
        1: ["Sunny Clouds", "mdi:weather-partly-cloudy"],
        2: ["Sunny", "mdi:weather-sunny"],
        3: ["Rainy", "mdi:weather-rainy"],
        4: ["Snowy", "mdi:weather-snowy"],
        5: ["Thunderstorm", "mdi:weather-lightning"],
        6: ["Foggy hor", "mdi:weather-fog"],
        7: ["Volcanic Ash", "mdi:weather-fog"],
        8: ["Sandstorm", "mdi:weather-fog"],
        9: ["Foggy dia", "mdi:weather-fog"],
        10: ["Underwater", "mdi:weather-fog"],
        11: ["Overcast", "mdi:weather-cloudy"],
        12: ["Drought", "mdi:weather-sunny-alert"],
        13: ["Downpour", "mdi:weather-pouring"],
        14: ["Underwater Bubbles", "ri:bubble-chart-line"],
        15: ["Abnormal", "mdi:weather-cloudy-alert"],
        16: ["???", ""],
        17: ["???", ""],
        18: ["???", ""],
        19: ["???", ""],
        20: ["???", ""],
        21: ["???", ""],
    };

    let selectedMap: MapId = null;
    $: selectedMap = selectedMaps.length === 1 ? selectedMaps[0] : null;
    let selectedProps: MapCardProps = null;
    $: selectedProps = selectedMap
        ? $data.find(
              (p) =>
                  p.group === selectedMap.group && p.index === selectedMap.index
          )
        : null;
    $: console.log(selectedProps);
</script>

<div class="info-container">
    <div class="preview" class:selected={selectedMap !== null}>
        {#if selectedMaps.length === 1}
            {#key selectedMap}
                <MapPreview
                    windowScroll={false}
                    group={selectedProps.group}
                    index={selectedProps.index}
                    name={selectedProps.name}
                />
            {/key}
        {:else}
            <div class="no-preview">
                {selectedMaps.length === 0
                    ? "No map Selected"
                    : "Preview not available for multiple maps"}
            </div>
        {/if}
    </div>
    <div class="actions">
        {#if selectedMap}
            <Button
                color="secondary"
                on:click={() => {
                    new MapEditorContext(selectedMap).create().select();
                }}
            >
                <iconify-icon icon="fluent-mdl2:edit" />
                Go to Map Editor
            </Button>
            <Button>
                <iconify-icon icon="fluent-mdl2:edit" />
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
                {selectedProps.name}
                {#if selectedProps.floorNum}
                    {selectedProps.floorNum}F
                {/if}

                <span class="more" title="Map Section Id">
                    ({selectedProps.mapsec})
                </span>
            </span>
            <span class="title">offset</span>
            <span class="value">
                <OffsetLabel offset={selectedProps.offset} />
            </span>
            <span class="title">tilesets</span>
            <span class="value">
                <OffsetLabel offset={selectedProps.tileset1} /><br />
                <OffsetLabel offset={selectedProps.tileset2} />
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
        overflow: hidden;
        display: grid;
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
            }

            .more {
                cursor: help;
            }
        }
    }
</style>
