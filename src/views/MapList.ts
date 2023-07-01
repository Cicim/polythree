import { EditorContext } from "src/systems/editors";
import MapList from "src/views/MapList.svelte";

export class MapListContext extends EditorContext {
    public name: string = "Map List";
    public singularTab = true;

    public save(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    public async load(): Promise<void> {
        this.isLoading.set(true);
        // wait a random amount of time to simulate loading
        // Get the maps list from the server
        let data: any = { search: "" };
        this.data.set(data);
        this.isLoading.set(false);
    }

    constructor() {
        super(MapList, {});
    }
}