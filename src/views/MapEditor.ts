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

    public save() {
        this.needsSave.set(false);
        return true;
    }

    public constructor(props: MapEditorProperties, position: number = null) {
        // Create the editor element
        super(MapEditor, props, position);
    }
}