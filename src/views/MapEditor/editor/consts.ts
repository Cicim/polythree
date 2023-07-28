/**
 * The RGB color for each level. Since there are patches to change the bitsize
 * of a level, we split it in layer (8 bits) and obstacle (1 bit).
 *
 * The format is [0x0OLL]: "#RRGGBB"
 */
export const LEVEL_COLORS: Record<number, string> = {
    [0x000]: "#2076DF",
    [0x100]: "#DF2020",
    [0x001]: "#20DFBE",
    [0x101]: "#DF6820",
    [0x002]: "#C7DF20",
    [0x102]: "#2071DF",
    [0x003]: "#20DF50",
    [0x103]: "#A620DF",
    [0x004]: "#2050DF",
    [0x104]: "#DF4620",
    [0x005]: "#DF2068",
    [0x105]: "#20DF2E",
    [0x006]: "#38DF20",
    [0x106]: "#5E20DF",
    [0x007]: "#7F20DF",
    [0x107]: "#DFD620",
    [0x008]: "#80DF20",
    [0x108]: "#2029DF",
    [0x009]: "#C720DF",
    [0x109]: "#A1DF20",
    [0x00a]: "#20DF97",
    [0x10a]: "#DF20D1",
    [0x00b]: "#DFAF20",
    [0x10b]: "#20B9DF",
    [0x00c]: "#DF20AF",
    [0x10c]: "#59DF20",
    [0x00d]: "#3820DF",
    [0x10d]: "#DF8E20",
    [0x00e]: "#2097DF",
    [0x10e]: "#DF2041",
    [0x00f]: "#20DFDF",
    [0x10f]: "#E920E9",
};
export const LAYER_CHARS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛";