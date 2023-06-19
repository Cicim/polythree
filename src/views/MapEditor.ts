import { EditorContext } from "../systems/editors";
import MapEditor from "./MapEditor.svelte";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export class MapEditorContext extends EditorContext {
    public name = "Map Editor";
    declare public props: MapEditorProperties;
    public actions = {
        "map_editor/print_group": () => {
            console.log("Printing group", this.props.group);
        }
    }

    public async save(): Promise<boolean> {
        this.startSaving();
        // Wait 1 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.doneSaving();
        return true;
    }

    public constructor(props: MapEditorProperties, position: number = null) {
        // Create the editor element
        super(MapEditor, props, position);
        this.needsSave.set(true);
    }
}