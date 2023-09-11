import { invoke, RustFn } from "src/systems/invoke";
import { spawnErrorDialog } from "src/components/dialog/ErrorDialog.svelte";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";

type MapNames = string[];

export let mapNames: Writable<MapNames> = null;
export let mapsecStartIndex: number;

/** Returns the mapNames store */
export async function getMapNamesStore(): Promise<Writable<MapNames>> {
    if (mapNames === null) {
        // Fill the names array with 256 nulls
        let names: string[] = [];

        mapNames = writable(null);

        try {
            const mapsecDump = await invoke(RustFn.get_map_names);
            mapsecStartIndex = mapsecDump.start_index;

            // Copy each name from the dump into the names array
            for (let i = 0; i < mapsecDump.names.length; i++)
                names[i + mapsecStartIndex] = mapsecDump.names[i];

            // Set the name writable
            mapNames.set(names);
        } catch (err) {
            await spawnErrorDialog(err + "\nThey will not be shown", "Could not retrieve map names")
        }
    }
    return mapNames;
}

export async function getMapNames(): Promise<MapNames> {
    return get(await getMapNamesStore());
}

/** Updates the map names list with the new map name */
export async function setMapName(index: number, newName: string): Promise<boolean> {
    try {
        // Try to update the rom
        // TODO Uncomment this when the backend is implemented
        // await invoke("set_map_name", { index, newName });
        // If nothing fails update the client-side store
        (await getMapNamesStore()).update((names) => {
            names[index] = newName;
            return names;
        });
        return true;
    }
    catch (err) {
        // In case of an error, show it and return false
        await spawnErrorDialog(err, "Error while renaming mapsec");
        return false;
    }
}

/** Returns a writable that contains the name options, which updates with the mapNames store */
export async function getMapNamesOptions(): Promise<Readable<[number, string][]>> {
    // Get the map names
    const mapNames = await getMapNamesStore();
    // Create the derived for the map names options
    return derived([mapNames], ([names]) =>
        names.flat().map((name, i) => [i + mapsecStartIndex, name]) as [number, string][]);
}

/** To be ran every time the rom is closed */
export function resetMapNames() {
    mapNames = null;
    mapsecStartIndex = null;
}