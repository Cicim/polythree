import { invoke as tauriInvoke } from "@tauri-apps/api"

/** Rust commands invokable via Tauri. */
export enum RustFn {
    // ROM
    init_rom = 'init_rom',
    close_rom = 'close_rom',

    // Config
    get_config = 'get_config',
    // TODO Rename to `save_config`
    set_config = 'set_config',
    update_tileset_level = 'update_tileset_level',
    update_brushes = 'update_brushes',

    // Map list
    get_map_list = 'get_map_list',
    get_map_names = 'get_map_names',
    get_map_preview = 'get_map_preview',
    get_tilesets = 'get_tilesets',
    get_layout_ids = 'get_layout_ids',
    create_map = 'create_map',
    delete_maps = 'delete_maps',

    // Map editor
    get_map_data = 'get_map_data',
    get_map_layout_data = 'get_map_layout_data',
    get_tilesets_rendering_data = 'get_tilesets_rendering_data',
    get_tilesets_animations = 'get_tilesets_animations',
    get_layout_offset = 'get_layout_offset',
    get_tilesets_lengths = 'get_tilesets_lengths',
    update_map_header = 'update_map_header',
    update_layout_header = 'update_layout_header',
}

/** Parameter and return type of every rust command. */
type InvokeParamsAndReturnTypes = {
    // ANCHOR ROM
    [RustFn.init_rom]: {
        params: { path: string },
        return: {
            rom_base: string,
            rom_size: number,
            rom_size_fmt: string,
        },
    }
    [RustFn.close_rom]: {
        params: undefined,
        return: void,
    }

    // ANCHOR Config
    [RustFn.get_config]: {
        params: undefined,
        return: RomConfig,
    }
    [RustFn.set_config]: {
        params: undefined,
        return: void,
    }
    // TODO Rename levels to permissions (once Rust changed)
    [RustFn.update_tileset_level]: {
        params: { tileset: number, levels: string },
        return: void,
    }
    [RustFn.update_brushes]: {
        params: {
            tileset1: number,
            tileset2: number,
            tileset1Brushes: SerializedBrush[],
            tileset2Brushes: SerializedBrush[],
        },
        return: void,
    }

    // ANCHOR Map List
    [RustFn.get_map_list]: {
        params: undefined,
        return: MapHeaderDump[],
    }
    [RustFn.get_map_names]: {
        params: undefined,
        return: MapNamesDump,
    }
    [RustFn.get_map_preview]: {
        params: { group: number, index: number },
        return: string,
    }
    [RustFn.get_tilesets]: {
        params: undefined,
        return: {
            offset: number,
            is_primary: boolean,
        }[],
    }
    [RustFn.get_layout_ids]: {
        params: undefined,
        return: number[],
    }
    [RustFn.create_map]: {
        params: {
            group: number, index: number,
            layoutOptions: LayoutCreationOptions
        },
        return: MapHeaderDump,
    }
    [RustFn.delete_maps]: {
        params: {
            maps: {
                group: number,
                index: number,
                layout: number,
            }[],
            // FIXME
            actions: any,
        }
        return: { group: number, index: number }[],
    }

    // ANCHOR Map Editor
    [RustFn.get_map_data]: {
        params: { group: number, index: number },
        return: MapData,
    }
    [RustFn.get_map_layout_data]: {
        params: { id: number },
        return: MapLayoutData,
    }
    [RustFn.get_tilesets_rendering_data]: {
        params: { tileset1: number, tileset2: number },
        return: TilesetPairRenderingData,
    }
    [RustFn.get_tilesets_animations]: {
        params: { tileset1: number, tileset2: number },
        return: {
            primary: {
                start_tile: number,
                graphics: number[][],
                start_time: number,
                interval: number,
            }[],
            primary_max_frames: number,
            secondary: {
                start_tile: number,
                graphics: number[][],
                start_time: number,
                interval: number,
            }[],
            secondary_max_frames: number,
        },
    }
    [RustFn.get_layout_offset]: {
        params: { id: number },
        return: number,
    }
    [RustFn.get_tilesets_lengths]: {
        params: { tileset1: number, tileset2: number },
        return: [number, number],
    }
    [RustFn.update_map_header]: {
        params: { group: number, index: number, header: MapHeader },
        return: void,
    }
    [RustFn.update_layout_header]: {
        params: { id: number, header: MapLayout },
        return: void,
    }
}

type InvokeParams<T extends RustFn> = InvokeParamsAndReturnTypes[T]['params'];
type InvokeReturnTypes<T extends RustFn> = InvokeParamsAndReturnTypes[T]['return'];

/** Invokes an asynchronous request to run a rust command on the ROM. */
export async function invoke<T extends RustFn>(type: T, args?: InvokeParams<T>): Promise<InvokeReturnTypes<T>> {
    return await tauriInvoke(type, args);
}
