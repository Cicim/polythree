<script lang="ts" context="module">
    export function prettyOffset(offset: number) {
        return offset.toString(16).toUpperCase().padStart(8, "0");
    }
</script>

<script lang="ts">
    export let offset: number | string;

    $: offsetNumber = typeof offset === "string" ? parseInt(offset) : offset;
</script>

<span class="offset">
    {#if offsetNumber === null}
        ???
    {:else}
        ${prettyOffset(offsetNumber)}
    {/if}
</span>

<style lang="scss">
    .offset {
        font-family: monospace;
        color: var(--weak-fg);
    }
</style>
