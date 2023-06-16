import { EditorContext } from "../systems/editors";
import MapEditor from "./MapEditor.svelte";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export class MapEditorContext extends EditorContext {
    declare protected component: MapEditor;
    declare public props: MapEditorProperties;
    public name = "Map Editor";

    public save() {
        return true;
    }

    public constructor(props: MapEditorProperties, position: number = null) {
        // Create the editor element
        super(MapEditor, props, position);
    }
}