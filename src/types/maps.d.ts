interface MapHeader {
    map_layout: VoidPointer;
    events: VoidPointer;
    map_scripts: VoidPointer;
    connections: VoidPointer;
    music: number;
    map_layout_id: number;
    region_map_section_id: number;
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
