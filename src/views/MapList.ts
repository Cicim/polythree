import { EditorContext } from "src/systems/editors";
import MapList from "src/views/MapList.svelte";
import { writable } from "svelte/store";

export class MapListContext extends EditorContext {
    public name: string = "Map List";

    public save(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    public async load(): Promise<void> {
        this.isLoading.set(true);
        // wait a random amount of time to simulate loading
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
        // Get the maps list from the server
        let data: any = { search: "" };
        this.data.set(data);
        this.isLoading.set(false);
    }

    constructor() {
        super(MapList, {});
    }
}