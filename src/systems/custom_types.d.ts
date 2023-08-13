import type { BlocksData } from "src/views/MapEditor/editor/blocks_data";

declare namespace svelte.JSX {
    interface HTMLAttributes<T> {
        tooltip: string;
        onenterViewport: () => void
        onexitViewport: () => void
        onblockschanged: (event: BlocksChangedEvent) => void;
    }
}