import { invoke } from "@tauri-apps/api";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { spawnDialog } from "src/systems/dialogs";
import { EditorContext } from "src/systems/editors";
import MapList from "src/views/MapList.svelte";

export interface MapCardProps {
    group: number;
    index: number;
    offset: number;
    name?: string;
}

interface MapSectionDump {
    start_index: number,
    none_index: number,
    names: (string | null)[],
}

interface MapHeaderDump {
    group: number,
    index: number,
    offset: number,
    header: MapHeader,
}

// TODO Move to another file
interface MapHeader {
    // TODO Set to pointers
    map_layout: unknown;
    events: unknown;
    map_scripts: unknown;
    connections: unknown;

    music: number;
    map_layout_id: number;
    region_map_section_id: number;
    cave: number;
    weather: number;
    map_type: number;
    biking_allowed: number;
    allow_escaping: number;
    allow_running: number;
    show_map_name: number;
    floor_num: number;
    battle_type: number;
}

export class MapListContext extends EditorContext {
    public name: string = "Map List";
    public singularTab = true;

    public save(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    public async load(): Promise<void> {
        this.isLoading.set(true);

        // Fill the names array with 256 nulls
        let names: string[] = Array(256).fill(null);

        try {
            const mapsecDump: MapSectionDump = await invoke("get_map_names");
            // Copy each name from the dump into the names array
            for (let i = 0; i < mapsecDump.names.length; i++)
                names[i + mapsecDump.start_index] = mapsecDump.names[i];
        } catch (err) {
            await spawnDialog(AlertDialog, {
                title: "Could not retrieve map names",
                message: err + "\nThey will not be shown",
            })
        }

        // Load the map list from the backend
        try {
            const res: MapHeaderDump[] = await invoke("get_map_list");

            let mapCards: MapCardProps[] = [];
            for (const map of res) {
                mapCards.push({
                    group: map.group,
                    index: map.index,
                    offset: map.offset,
                    name: names[map.header.region_map_section_id],
                });
            }

            this.data.set(mapCards);
        } catch (err) {
            await spawnDialog(AlertDialog, {
                title: "Failed to load map list",
                message: err,
            })

            // Close the view on failure
            this.close();
        }
        finally {
            this.isLoading.set(false);
        }
    }

    constructor() {
        super(MapList, {});
    }
}