<script lang="ts">
    import type { MapEditorContext } from "../MapEditor";
    import { getContext } from "svelte";
    import TextToolButton from "./TextToolButton.svelte";
    import Select from "src/components/Select.svelte";
    import ToolButton from "./ToolButton.svelte";
    import { mapTypeNames, weatherIconMap } from "src/systems/consts";
    import CheckBoxRow from "./header/CheckBoxRow.svelte";
    import LongRow from "./header/LongRow.svelte";
    import LongNotchedRow from "./header/LongNotchedRow.svelte";
    import Input from "src/components/Input.svelte";
    import MapNameSelect from "./header/MapNameSelect.svelte";
    import { tooltip } from "src/systems/tooltip";
    import { rom } from "src/systems/global";
    import { spawnRenameMapSectionDialog } from "./dialogs/RenameMapSectionDialog.svelte";
    import { getMapNames } from "src/systems/data/map_names";

    const context: MapEditorContext = getContext("context");

    const headerData = context.data.header;

    const weatherOptions: [number, string][] = Object.values(
        weatherIconMap
    ).map(([name], i) => [i, name]);

    const mapTypeOptions: [number, string][] = mapTypeNames.map((name, i) => [
        i,
        name,
    ]);

    /** Opens a dialog to select a new name for the mapsec */
    async function renameMapSection() {
        const names = await getMapNames();
        spawnRenameMapSectionDialog({
            mapsec: $headerData.header.mapsec_id,
            originalName: names[$headerData.header.mapsec_id],
        });
    }

    const frlg = $rom.type === "Fire Red" || $rom.type === "Leaf Green";
</script>

<div class="editor">
    <div class="toolbar">
        <div class="buttons">
            <TextToolButton
                text="Change Layout"
                title="Change Layout"
                icon="mdi:grid"
                action="map_editor/change_layout"
            />
        </div>
    </div>
    <div class="area">
        <div class="editable form">
            <!-- ANCHOR Music -->
            <LongNotchedRow
                title="The default music<br> for this map"
                text="Music"
            >
                <Input
                    store={headerData}
                    edits="header.music"
                    type="number"
                    max={65536}
                    min={0}
                />
                <!-- <Select
                    edits="header.music"
                    valueTag="number"
                    options={[
                        [0, "Hello"],
                        [1, "World"],
                    ]}
                /> -->
                <ToolButton
                    icon="mdi:play"
                    title="Pause/Play Background Music"
                />
            </LongNotchedRow>
            <!-- ANCHOR Location -->
            <LongNotchedRow
                title="The map's section id.<br> Also determines the map's<br> display name"
                text="Location"
            >
                <MapNameSelect store={headerData} edits="header.mapsec_id" />
                <ToolButton
                    icon="mdi:edit"
                    title="Change the mapsec's string"
                    on:click={renameMapSection}
                />
            </LongNotchedRow>
            <!-- ANCHOR Floor Number -->
            {#if frlg}
                <LongNotchedRow
                    text="Floor Number"
                    title="Floor number that appears<br> after the map name. <br>(e.g. Silph Co)"
                >
                    <Input
                        store={headerData}
                        edits="header.floor_num"
                        type="number"
                        min={-128}
                        max={127}
                    />
                    <div
                        use:tooltip
                        tooltip="In-game Appearance"
                        class="row subtitle dark"
                        style="width: 4rem;"
                    >
                        <span>
                            {#if $headerData.header.floor_num !== 0}
                                {$headerData.header.floor_num}F
                            {:else}
                                &nbsp;
                            {/if}
                        </span>
                    </div>
                </LongNotchedRow>
            {/if}
            <!-- ANCHOR Weather -->
            <LongNotchedRow
                title="The map's weather effect. <br>Affects battles too."
                text="Weather"
            >
                <Select
                    valueTag="number"
                    store={headerData}
                    edits="header.weather"
                    options={weatherOptions}
                />
                <div class="weather-icon">
                    {#key $headerData.header.weather}
                        <iconify-icon
                            icon={weatherIconMap[$headerData.header.weather][1]}
                        />
                    {/key}
                </div>
            </LongNotchedRow>
            <!-- ANCHOR Type -->
            <LongRow
                title="An attribute which<br> determines many things"
                text="Type"
            >
                <Select
                    valueTag="number"
                    store={headerData}
                    edits="header.map_type"
                    options={mapTypeOptions}
                />
            </LongRow>
            <!-- ANCHOR Battle Scene -->
            <LongRow
                title="Determines the<br> graphics of <br>the battle scene"
                text="Battle Scene"
            >
                <Select
                    valueTag="number"
                    store={headerData}
                    edits="header.battle_type"
                    options={[
                        [0, "Hello"],
                        [1, "World"],
                    ]}
                />
            </LongRow>
            <!-- ANCHOR Show Name -->
            <CheckBoxRow
                title="If a box containing the <br>Map name should appear <br>when entering the map"
                text="Show Name"
                store={headerData}
                edits="header.show_map_name"
            />
            <!-- ANCHOR Flash -->
            <CheckBoxRow
                title="Limited visibility,<br> needs Flash to see better"
                text="Needs Flash"
                store={headerData}
                edits="header.cave"
            />
            <!-- ANCHOR Running -->
            <CheckBoxRow
                title="Allows the use<br> of Running Shoes<br> in this map"
                text="Allow Running"
                store={headerData}
                edits="header.allow_running"
            />
            <!-- ANCHOR Biking -->
            <CheckBoxRow
                title="Allows the use<br> of a bike in this map"
                text="Allow Biking"
                store={headerData}
                edits="header.biking_allowed"
            />
            <!-- ANCHOR Biking -->
            <CheckBoxRow
                title="Allows the use of Dig<br> and Escape Ropes"
                text="Allow Escaping"
                store={headerData}
                edits="header.allow_escaping"
            />
        </div>
    </div>
</div>

<style lang="scss">
    .editor {
        height: 100%;

        display: grid;
        grid-template-rows: 36px minmax(0, 1fr);
        grid-template-areas: "toolbar" "area";

        overflow: hidden;

        .area {
            grid-area: area;
            display: grid;
            padding: 0.5em;

            justify-items: center;
            overflow-y: scroll;

            .editable {
                margin: 0.5em;
                padding: 0.5em;
                border-radius: 0.5em;
                width: 90%;

                max-width: 600px;

                &.form {
                    gap: 8px;
                }
                :global(.select) {
                    font-size: 1em;
                }
                .weather-icon {
                    width: 32px;
                    height: 32px;
                    font-size: 1.5em;
                    display: grid;
                    place-content: center;
                }
            }
        }
    }
</style>
