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

    public constructor(group: number, index: number) {
        // Create the editor element
        super(MapEditor, {
            group,
            index,
        });
    }
}