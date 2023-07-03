<script lang="ts">
    export let offset: number | string;

    $: offsetNumber = typeof offset === "string" ? parseInt(offset) : offset;
</script>

<span class="offset">
    {#if offsetNumber === null}
        ???
    {:else}
        ${offsetNumber.toString(16).toUpperCase().padStart(8, "0")}
    {/if}
</span>

<style lang="scss">
    .offset {
        font-family: monospace;
    }
</style>
