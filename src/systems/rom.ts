import { invoke } from "@tauri-apps/api";
import { get, writable, type Writable } from "svelte/store";
import { open } from "@tauri-apps/api/dialog";
import { spawnDialog } from "./dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";

interface Rom {
    path: string;
    type: string;
    size: number;
    sizePretty: string;
}

/** The curretly open ROM */
export const rom: Writable<Rom | null> = writable(null);

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
    if (get(rom) === null)
        return console.error("No rom is open");

    // Close the rom
    await invoke("close_rom");

    // Set the rom
    rom.set(null);
}