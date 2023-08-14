declare namespace svelte.JSX {
    interface HTMLAttributes<T> {
        tooltip: string;
        onenterViewport: () => void;
        onexitViewport: () => void;
        onblockschanged: (event: BlocksChangedEvent) => void;
    }
}