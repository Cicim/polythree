<script lang="ts">
    import Button from "src/components/Button.svelte";
    import type { HomePageContext } from "./HomePage";
    import { openRom, rom } from "src/systems/rom";
    import { MapEditorContext } from "./MapEditor";

    export let context: HomePageContext;
</script>

<div class="view">
    <div class="rom-selection">
        <div class="rom-button">
            {#if $rom === null}
                <Button on:click={openRom} color="secondary">Open Rom</Button>
            {:else}
                <Button on:click={() => rom.set(null)}>Close Rom</Button>
            {/if}
        </div>
        <div class="rom-container">
            {#if $rom !== null}
                <div class="rom-info">
                    <fieldset>
                        <legend>Path</legend>
                        {$rom.path}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <iconify-icon
                            on:click={() =>
                                navigator.clipboard.writeText($rom.path)}
                            icon="mdi:clipboard-outline"
                        />
                    </fieldset>

                    <fieldset>
                        <legend>Base</legend>
                        {$rom.type}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <iconify-icon
                            on:click={() =>
                                navigator.clipboard.writeText($rom.type)}
                            icon="mdi:clipboard-outline"
                        />
                    </fieldset>

                    <fieldset>
                        <legend>Size</legend>
                        {$rom.sizePretty}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <iconify-icon
                            on:click={() =>
                                navigator.clipboard.writeText($rom.sizePretty)}
                            icon="mdi:clipboard-outline"
                        />
                    </fieldset>
                </div>
            {:else}
                <p class="recent-files">Recent Files</p>
            {/if}
        </div>
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
        grid-template-columns: min(400px, calc(50% - 1em)) 1fr;
        grid-column-gap: 1em;
        height: 100%;
    }

    .rom-selection {
        display: grid;
        grid-template-rows: min-content minmax(0, 1fr);
        grid-row-gap: 0.5em;

        .rom-button {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 4px;

            :global(button) {
                padding: 0.5em;
                font-size: 14px;
                letter-spacing: 1px;
            }
        }

        .rom-container {
            overflow-y: auto;

            .rom-info {
                height: 0;
                word-break: break-all;

                fieldset {
                    position: relative;
                    border: none;
                    legend {
                        text-transform: uppercase;
                        color: var(--weak-fg);
                    }
                    iconify-icon {
                        display: none;

                        &:hover {
                            color: var(--accent-fg);
                        }
                    }

                    &:hover iconify-icon {
                        display: initial;
                        position: absolute;
                        right: 4px;
                        bottom: calc(1em - 4px);
                    }
                }
            }
        }
    }
</style>
