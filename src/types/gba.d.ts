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