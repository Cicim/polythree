type PointedData<T> = {
    data?: T;
    offset: number;
} | number;

type VoidPointer = PointedData<null>;

interface GbaGraphic {
    offset: number,
    tiles: Vec<number[][]>,
    compressed: boolean,
    read_length: number,
    replace: boolean,
}

/** A string identifying a ROM Type */
type RomType = "Fire Red"
    | "Leaf Green"
    | "Ruby"
    | "Sapphire"
    | "Emerald";