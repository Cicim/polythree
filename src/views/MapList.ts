import { invoke } from "@tauri-apps/api";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { spawnDialog } from "src/systems/dialogs";
import { EditorContext } from "src/systems/editors";
import MapList from "src/views/MapList.svelte";
import type { Writable } from "svelte/store";

export interface MapCardProps {
    group: number;
    index: number;
    offset: number;
    tileset1?: number;
    tileset2?: number;
    mapsec: number;
    name?: string;
    layout: number;

    music: number;
    mapLayoutId: number;
    cave: number;
    weather: number;
    mapType: number;
    bikingAllowed: number;
    allowEscaping: number;
    allowRunning: number;
    showMapName: number;
    floorNum: number;
    battleType: number;
}

export interface MapId {
    group: number;
    index: number;
}

export type SelectedCards = { [group: number]: { [index: number]: boolean } };

export interface MapSelectionEvent {
    group: number;
    index: number;
    ctrlKey: boolean;
    shiftKey: boolean;
}

export interface MapGroup {
    name: string;
    maps: MapCardProps[];
}

export enum GroupCriteria {
    Group,
    Name,
    Tilesets,
    Layout,
};

export type GroupCriteriaMethods = {
    name: string;
    predicate: (card: MapCardProps) => string,
    nameTransform: (name: string) => string,
}

export const groupCriteriaTable: Record<GroupCriteria, GroupCriteriaMethods> = {
    [GroupCriteria.Group]: {
        name: "Group",
        predicate: (card: MapCardProps) => card.group.toString(),
        nameTransform: (name: string) => `Group #${name}`,
    },
    [GroupCriteria.Name]: {
        name: "Name",
        predicate: (card: MapCardProps) => card.name ?? "",
        nameTransform: (name: string) => name,
    },
    [GroupCriteria.Tilesets]: {
        name: "Tilesets",
        predicate: (card: MapCardProps) => {
            return `${card.tileset1}+${card.tileset2}`;
        },
        nameTransform: (name: string) => {
            let [t1, t2] = name.split("+");

            t1 = t1 === "null" ? "???" : "$" + parseInt(t1).toString(16).padStart(7, '0').toUpperCase();
            t2 = t2 === "null" ? "???" : "$" + parseInt(t2).toString(16).padStart(7, '0').toUpperCase();

            return `Primary: ${t1}, Secondary: ${t2}`;
        },
    },
    [GroupCriteria.Layout]: {
        name: "Layout",
        predicate: (card: MapCardProps) => card.layout.toString(),
        nameTransform: (name: string) => {
            if (name === "0") return "No Layout";
            return `Layout #${name}`;
        },
    },
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
    tileset1: number,
    tileset2: number,
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
    declare public component: MapList;
    declare public data: Writable<MapCardProps[]>;
    public singularTab = true;
    public actions = {
        "maplist/refresh": () => this.load(),
        "maplist/delete_selected": () => this.component.deleteSelected(),
        "maplist/focus_search": () => this.component.focusSearch(),
        "maplist/clear_and_focus_search": () => this.component.focusSearch(true),
    }

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
                    tileset1: map.tileset1,
                    tileset2: map.tileset2,
                    layout: map.header.map_layout_id,
                    mapsec: map.header.region_map_section_id,
                    name: names[map.header.region_map_section_id],

                    music: map.header.music,
                    mapLayoutId: map.header.map_layout_id,
                    cave: map.header.cave,
                    weather: map.header.weather,
                    mapType: map.header.map_type,
                    bikingAllowed: map.header.biking_allowed,
                    allowEscaping: map.header.allow_escaping,
                    allowRunning: map.header.allow_running,
                    showMapName: map.header.show_map_name,
                    floorNum: map.header.floor_num,
                    battleType: map.header.battle_type,
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