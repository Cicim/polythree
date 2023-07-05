import { EditorContext } from "../systems/contexts";
import MapEditor from "./MapEditor.svelte";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export interface MapEditorData {
    name: string;
    width: number;
    height: number;
    tileset: number;
    tilemap: number[][];
};

export class MapEditorContext extends EditorContext {
    public name = "Map Editor";
    public singularTab = true;
    declare public identifier: MapEditorProperties;

    public actions = {
        "map_editor/print_group": () => {
            console.log("Printing group", this.identifier.group);
        }
    }

    public async save(): Promise<boolean> {
        if (this.startSaving()) return;
        // Wait 1 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));

        return this.doneSaving();
    }

    public async load() {
        this.isLoading.set(true);
        const data = await invokeMapData("test", {});
        this.data.set(data);
        this.isLoading.set(false);
    }

    public constructor(id: MapEditorProperties) {
        // Create the editor element
        super(MapEditor, { ...id });
    }
}

async function invokeMapData(msg: string, props: Object) {
    // Wait 20 millisecs, then return the data
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
        name: "Test Map",
        width: 100,
        height: 100,
        tileset: "of",
        tilemap: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]
    };
}