declare namespace svelte.JSX {
    interface HTMLAttributes<T> {
        onenterViewport: () => void
        onexitViewport: () => void
    }
}