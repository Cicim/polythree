
interface SerializedBlocksData {
    width: number;
    height: number;
    metatiles: number[];
    permissions: number[];
};

interface SerializedBrush {
    /** The brushe's type */
    type: BrushType;
    /** The brush name */
    name: string;
    /** The serialized blocks */
    blocks?: SerializedBlocksData;
    /** The current pinned state */
    pinned: boolean;
    /** The brush's primary tileset offset */
    primary: number;
    /** The brush's secondary tileset offeset (or undefined) */
    secondary?: number;
}

interface SerializedSimpleBrush extends SerializedBrush {
    type: BrushType.Simple;
    /** The serialized blocks */
    blocks?: SerializedBlocksData;
}

interface SerializedNinePatchBrush extends SerializedBrush {
    type: BrushType.NinePatch;
    /** The serialized metatiles */
    metatiles: number[];
    /** The serialized levels */
    permissions: number[];
}