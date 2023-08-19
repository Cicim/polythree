<script lang="ts">
    import type { FilterReason } from "./MapCard.svelte";

    export let string: string;
    export let reason: FilterReason[keyof FilterReason];
</script>

{#if reason}
    {@html `${string.slice(0, reason[0])}<u>${string.slice(
        reason[0],
        reason[1]
    )}</u>${string.slice(reason[1])}`}
{:else}
    {string}
{/if}
