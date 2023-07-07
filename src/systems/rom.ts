import { invoke } from "@tauri-apps/api";
import { get, writable, type Writable } from "svelte/store";
import { open } from "@tauri-apps/api/dialog";
import { spawnDialog } from "./dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import CloseViewsDialog from "src/components/dialog/CloseViewsDialog.svelte";
import { HomePageContext } from "src/views/HomePage";
import { openViews } from "./views";
import { rom } from "./global";

type RomOpenResponse = {
    rom_type: string,
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
        let res = await invoke("init_rom", { path: filePath }) as RomOpenResponse;
        rom.set({
            size: res.rom_size,
            sizePretty: res.rom_size_fmt,
            type: res.rom_type,
            path: filePath,
        });
    } catch (err) {
        await spawnDialog(AlertDialog, {
            message: err,
            title: "Error while loading ROM"
        });
    }
}

export async function closeRom() {
    // Close all tabs that require a rom
    const romTabs = get(openViews).filter(v => v.needsRom);

    if (romTabs.length !== 0) {
        // Ask the user if they want to close the tabs
        const res = await spawnDialog(CloseViewsDialog, {
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
}