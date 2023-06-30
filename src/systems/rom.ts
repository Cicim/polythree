import { invoke } from "@tauri-apps/api";
import { get, writable, type Writable } from "svelte/store";
import { open } from "@tauri-apps/api/dialog";
import { spawnDialog } from "./dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";

interface Rom {
    path: string;
    type: string;
    size: number;
}

/** The curretly open ROM */
export const rom: Writable<Rom | null> = writable(null);

interface RomOpenResponse {
    Success: { rom_type: string, rom_size: number },
    Error: { message: string },
}

export async function openRom() {
    if (get(rom) !== null)
        return console.error("A rom is already open");

    const res = await open({
        title: "Open ROM",
        multiple: false,
        // filters: [
        //     {
        //         name: "ROMs",
        //         extensions: ["gba"]
        //     }
        // ]
    }) as string;

    if (res === null)
        return rom.set(null);

    // Initalize the rom
    let { Success, Error } = await invoke("init_rom", { path: res }) as RomOpenResponse;

    if (Error)
        return await spawnDialog(AlertDialog, {
            message: Error.message,
            title: "Error while loading ROM"
        });

    // Set the rom
    rom.set({ size: Success.rom_size, type: Success.rom_type, path: res });
}