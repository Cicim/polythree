<script lang="ts">
    import Button from "src/components/Button.svelte";

    import { openRom, closeRom } from "src/systems/rom";
    import { rom } from "src/systems/global";
    import { MapListContext } from "./MapList";
    import ClickableIcons from "src/components/ClickableIcons.svelte";
    import type { HomePageContext } from "./HomePage";
    import { setContext } from "svelte";

    export let context: HomePageContext;
    setContext("context", context);
</script>

<div class="view">
    <div class="rom-selection">
        <div class="rom-button">
            {#if $rom === null}
                <Button on:click={openRom} theme="secondary">Open Rom</Button>
            {:else}
                <Button on:click={closeRom}>Close Rom</Button>
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
                        <ClickableIcons
                            icons={[
                                {
                                    text: "Copy Path",
                                    icon: "mdi:clipboard-outline",
                                    onclick: () =>
                                        navigator.clipboard.writeText(
                                            $rom.path
                                        ),
                                },
                            ]}
                        />
                    </fieldset>

                    <fieldset>
                        <legend>Base</legend>
                        {$rom.type}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <ClickableIcons
                            icons={[
                                {
                                    text: "Copy",
                                    icon: "mdi:clipboard-outline",
                                    onclick: () =>
                                        navigator.clipboard.writeText(
                                            $rom.type
                                        ),
                                },
                            ]}
                        />
                    </fieldset>

                    <fieldset>
                        <legend>Size</legend>
                        {$rom.sizePretty}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <ClickableIcons
                            icons={[
                                {
                                    text: "Copy Bytes",
                                    icon: "mdi:clipboard-edit-outline",
                                    onclick: () =>
                                        navigator.clipboard.writeText(
                                            $rom.size.toString()
                                        ),
                                },
                                {
                                    text: "Copy",
                                    icon: "mdi:clipboard-outline",
                                    onclick: () =>
                                        navigator.clipboard.writeText(
                                            $rom.sizePretty
                                        ),
                                },
                            ]}
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
            <Button on:click={() => new MapListContext().create().select()}>
                Map List
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

                    :global(.container) {
                        display: none;
                    }

                    &:hover :global(.container) {
                        display: flex;
                    }
                }
            }
        }
    }
</style>
