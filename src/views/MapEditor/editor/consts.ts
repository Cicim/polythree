/**
 * The RGB color for each level. Since there are patches to change the bitsize
 * of a level, we split it in layer (8 bits) and obstacle (1 bit).
 *
 * The format is [0x0OLL]: "#RRGGBB"
 */
export const LEVEL_COLORS: string[] = [
    "#2076DF",
    "#DF2020",
    "#20DFBE",
    "#DF6820",
    "#C7DF20",
    "#2071DF",
    "#20DF50",
    "#A620DF",
    "#2050DF",
    "#DF4620",
    "#DF2068",
    "#20DF2E",
    "#38DF20",
    "#5E20DF",
    "#7F20DF",
    "#DFD620",
    "#80DF20",
    "#2029DF",
    "#C720DF",
    "#A1DF20",
    "#20DF97",
    "#DF20D1",
    "#DFAF20",
    "#20B9DF",
    "#DF20AF",
    "#59DF20",
    "#3820DF",
    "#DF8E20",
    "#2097DF",
    "#DF2041",
    "#20DFDF",
    "#E920E9",
];
export const LAYER_CHARS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮";