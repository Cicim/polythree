<svelte:options accessors />

<script lang="ts">
    import { safeCloseViews } from "src/systems/views";
    import type { ViewContext } from "src/systems/contexts";
    import Button from "src/components/Button.svelte";
    import WarningDiv from "../WarningDiv.svelte";

    export let close: (value: any) => void;
    export let title: string;
    export let message: string = null;
    export let views: ViewContext[];
    export let thisView: ViewContext = null;
    export let noEscapeClose = false;
    export let noOutsideClose = false;
    let closing = false;

    async function closeAll() {
        noEscapeClose = true;
        noOutsideClose = true;

        closing = true;
        // Return true if some views were not closed
        const res = await safeCloseViews(views);

        // If a view was passed, select it
        if (thisView !== null) thisView.select();

        close(res);
    }
</script>

<div class="dialog-content">
    <div class="title">
        {#if closing}
            Closing Tabs...
        {:else}
            {title}
        {/if}
    </div>
    <div class="content">
        <div class="message">
            {#if message}
                <WarningDiv>
                    {message}
                </WarningDiv>
            {:else}
                <WarningDiv>
                    The following Views must to be closed in order to proceed:
                </WarningDiv>
            {/if}
        </div>
        <div class="views-container">
            {#each views as view}
                <div class="view">
                    <span class="name">
                        {view.name}
                    </span>
                    {#each Object.entries(view.identifier) as [key, value]}
                        <span class="identifier-key">
                            {key} <span class="identifier-value">{value}</span>
                        </span>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
    <div class="buttons">
        {#if !closing}
            <Button on:click={() => close(null)}>Ignore</Button>
        {/if}
        <Button theme="secondary" disabled={closing} on:click={closeAll}>
            Close All
        </Button>
    </div>
</div>

<style lang="scss">
    .content {
        display: grid;
        grid-template-rows: max-content 1fr;
    }

    .views-container {
        background: var(--main-bg);
        margin: 4px;
        padding: 0.5em;

        display: flex;
        flex-direction: column;
        overflow-y: auto;
        border-radius: 0.5rem;
        gap: 0.25rem;
        max-height: 200px;

        .view {
            display: flex;
            background: var(--card-bg);
            padding: 4px 8px 4px 8px;
            gap: 0.5em;
            border-radius: 4px;

            .name {
                padding-right: 1em;
            }

            .identifier-key {
                background: var(--card-selected-bg);
                border: 1px solid var(--card-selected-border);
                padding: 2px 4px 2px 6px;
                font-size: 12px;

                .identifier-value {
                    background: var(--card-bg);
                    padding: 2px 4px;
                    margin-left: 2px;
                }
            }
        }
    }
</style>
