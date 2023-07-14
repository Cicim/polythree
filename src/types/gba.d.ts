type PointedData<T> = {
    data: T;
    pointer: number;
} | number;

type VoidPointer = PointedData<null>;