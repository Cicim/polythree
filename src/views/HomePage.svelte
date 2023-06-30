<script lang="ts">
    import Button from "src/components/Button.svelte";
    import type { HomePageContext } from "./HomePage";
    import { openRom, rom } from "src/systems/rom";
    import MapEditor from "./MapEditor.svelte";
    import { MapEditorContext } from "./MapEditor";

    export let context: HomePageContext;
</script>

<div class="view">
    <div class="rom-selection">
        {#if $rom === null}
            <Button on:click={openRom} color="secondary">Open Rom</Button>
        {:else}
            <Button on:click={() => rom.set(null)}>Close Rom</Button>
        {/if}
        {#if $rom !== null}
            <p>Rom Base: {$rom.type}</p>
        {:else}
            <p class="recent-files">Recent Files</p>
        {/if}
    </div>
    <div class="editors">
        {#if $rom !== null}
            <Button
                on:click={() =>
                    new MapEditorContext({ group: 3, index: 0 })
                        .create()
                        .select()}
            >
                Map Editor
            </Button>
        {/if}
    </div>
</div>

<style lang="scss">
    .view {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .rom-selection {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 0.5em;

        :global(button) {
            padding: 0.5em;
        }
    }
</style>
