import { invoke } from "@tauri-apps/api";
import { spawnErrorDialog } from "src/components/dialog/ErrorDialog.svelte";
import { EditorContext } from "src/systems/contexts";
import MapList from "src/views/MapList.svelte";
import { writable, type Writable } from "svelte/store";
import { redefineBindings } from "src/systems/bindings";
import { getMapNames, getMapNamesStore } from "src/systems/data/map_names";

export interface MapCardProps {
    group: number;
    index: number;
    offset: number;
    tileset1?: number;
    tileset2?: number;
    mapsec: number;
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

export interface CreateMapOptions {
    /** The group to create the map in, starts at first available
     *  if unspecified or group is full */
    group?: number;
}

export interface MapGroup {
    /** The group's identifier string */
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
}

export const groupCriteriaTable: Record<GroupCriteria, GroupCriteriaMethods> = {
    [GroupCriteria.Group]: {
        name: "Group",
        predicate: (card: MapCardProps) => card.group.toString(),
    },
    [GroupCriteria.Name]: {
        name: "Name",
        predicate: (card: MapCardProps) => card.mapsec.toString() ?? "",
    },
    [GroupCriteria.Tilesets]: {
        name: "Tilesets",
        predicate: (card: MapCardProps) => {
            return `${card.tileset1}+${card.tileset2}`;
        },
    },
    [GroupCriteria.Layout]: {
        name: "Layout",
        predicate: (card: MapCardProps) => card.layout.toString(),
    },
}

export interface MapHeaderDump {
    group: number,
    index: number,
    offset: number,
    tileset1: number,
    tileset2: number,
    header: MapHeader,
}


export function mapDumpToCardProps(map: MapHeaderDump): MapCardProps {
    return {
        group: map.group,
        index: map.index,
        offset: map.offset,
        tileset1: map.tileset1,
        tileset2: map.tileset2,
        layout: map.header.map_layout_id,
        mapsec: map.header.region_map_section_id,

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
    };

}

export class MapListContext extends EditorContext {
    public static icon = "ph:list-magnifying-glass";
    public name: string = "Map List";
    declare public component: MapList;
    declare public data: Writable<MapCardProps[]>;
    public singularTab = true;

    public async save(): Promise<boolean> {
        return true;
    }

    public async load(): Promise<void> {
        this.loading.set(true);

        // Preload the names
        await getMapNamesStore();

        // Load the map list from the backend
        try {
            const res: MapHeaderDump[] = await invoke("get_map_list");

            let mapCards: MapCardProps[] = [];
            for (const map of res) {
                mapCards.push(mapDumpToCardProps(map));
            }

            this.data.set(mapCards);
        } catch (err) {
            await spawnErrorDialog(err, "Could not retrieve map list");

            // Close the view on failure
            this.close();
        }
        finally {
            this.loading.set(false);
        }
    }

    constructor() {
        super(MapList, {});
        this.data = writable(null);
    }
}

redefineBindings({
    "maplist/refresh": (view: MapListContext) =>
        view.component.refresh(),
    "maplist/delete_selected": (view: MapListContext) =>
        view.component.deleteSelected(),
    "maplist/focus_search": (view: MapListContext) =>
        view.component.focusSearch(),
    "maplist/clear_and_focus_search": (view: MapListContext) =>
        view.component.focusSearch(true),
    "maplist/new_map": (view: MapListContext) =>
        view.component.createMap(),
});