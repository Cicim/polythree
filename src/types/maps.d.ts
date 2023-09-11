interface MapData {
    group: number,
    index: number,
    offset: VoidPointer,

    header: MapHeader,
    connections?: unknown,
    events?: unknown,
    scripts?: unknown,
}

interface MapHeader {
    layout: VoidPointer;
    events: VoidPointer;
    scripts: VoidPointer;
    connections: VoidPointer;

    music: number;
    layout_id: number;
    mapsec_id: number;
    cave: number;
    weather: number;
    map_type: number;
    biking_allowed: number;
    allow_escaping: number;
    allow_running: number;
    show_map_name: number;
    floor_num: number;
    battle_type: number;
}

interface MapLayoutData {
    index: number,
    header: MapLayout,
    map_data: BlocksData,
    border_data: BlocksData,
}

type MetatileLayerData = [number, number, number, number];

interface TilesetPairRenderingData {
    palettes: [number, number, number][][],
    metatiles: [MetatileLayerData, MetatileLayerData][],
    tiles: number[][][],
    layer_types: number[],
}

type LayoutCreationOptions = {
    Use: {
        layout: number,
    },
} | {
    New: {
        width: number,
        height: number,
        tileset1: number,
        tileset2: number,
        name: string,
    },
}

interface MapLayout {
    width: number;
    height: number;
    border: VoidPointer;
    data: VoidPointer;
    primary_tileset: VoidPointer;
    secondary_tileset: VoidPointer;
    border_width: number;
    border_height: number;
}

interface MapHeaderDump {
    group: number,
    index: number,
    offset: number,
    tileset1: number?,
    tileset2: number?,
    header: MapHeader,
}

interface MapNamesDump {
    names: string[],
    start_index: number,
}

interface Point {
    x: number;
    y: number;
}

interface TileSelection extends Point {
    width: number;
    height: number;
}

type BlockData = [metatile: number, level: number];

type CoordinatesHash = `${number},${number}`;
