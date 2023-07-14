type PointedData<T> = {
    data?: T;
    offset: number;
} | number;

type VoidPointer = PointedData<null>;