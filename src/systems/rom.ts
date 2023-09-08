import { invoke } from "@tauri-apps/api";
import { get } from "svelte/store";
import { open } from "@tauri-apps/api/dialog";
import { spawnErrorDialog } from "src/components/dialog/ErrorDialog.svelte";
import { spawnCloseViewsDialog } from "src/components/dialog/CloseViewsDialog.svelte";
import { HomePageContext } from "src/views/HomePage";
import { openViews } from "./views";
import { config, rom, type Config } from "./global";
import { lastClosedViews } from "./views";
import { resetData } from "./data/common";

type RomOpenResponse = {
    rom_type: RomType,
    rom_size: number,
    rom_size_fmt: string,
};

export async function openRom() {
    if (get(rom) !== null)
        return console.error("A rom is already open");

    const filePath = await open({
        title: "Open ROM",
        multiple: false,
        filters: [
            {
                name: "ROMs",
                extensions: ["gba"]
            },
            {
                name: "All Files",
                extensions: ["*"]
            }
        ]
    }) as string;

    if (filePath === null)
        return rom.set(null);

    try {
        // Initialize the ROM
        const res = await invoke("init_rom", { path: filePath }) as RomOpenResponse;
        rom.set({
            size: res.rom_size,
            sizePretty: res.rom_size_fmt,
            type: res.rom_type,
            path: filePath,
        });
    } catch (err) {
        await spawnErrorDialog(err, "Error while loading ROM");
    }

    try {
        // Load the configs too
        const configs: Config = await invoke("get_config");
        // Update the config store
        config.set(configs);
    }
    catch (err) {
        await spawnErrorDialog(err, "Error while loading configs");
    }
}

export async function closeRom() {
    // Close all tabs that require a rom
    const romTabs = get(openViews).filter(v => v.needsRom);

    if (romTabs.length !== 0) {
        // Ask the user if they want to close the tabs
        const res = await spawnCloseViewsDialog({
            title: "Close ROM",
            message: "Closing the ROM will close all tabs that require it. Are you sure you want to close the ROM?",
            views: romTabs,
            thisView: get(openViews).find(v => v instanceof HomePageContext)
        });

        if (!res) return;
    }


    if (get(rom) === null)
        return console.error("No rom is open");

    // Close the rom
    await invoke("close_rom");

    // Set the rom
    rom.set(null);
    // Reset previously loaded data
    resetData();

    // Close all recently opened views
    lastClosedViews.set([]);
}


export function getPtrOffset<T>(voidPointer: PointedData<T>): number {
    // In case it's unusable or invalid
    if (typeof voidPointer === "number")
        return null;

    // Get the offset
    return voidPointer.offset;
}