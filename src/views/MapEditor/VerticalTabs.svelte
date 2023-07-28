<script lang="ts">
    import type { EditorSubTab } from "src/systems/contexts";
    import { getContext } from "svelte";
    import type { MapEditorContext } from "../MapEditor";
    import { tooltip } from "src/systems/tooltip";

    export let tabs: Record<string, EditorSubTab> = {};
    const context: MapEditorContext = getContext("context");
    let activeTab = context.selectedTab;
</script>

<div class="tabs">
    {#each Object.entries(tabs) as [id, tab]}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            on:click={() => context.changeTab(id)}
            class:active={$activeTab === id}
            class="tab"
            use:tooltip
            tooltip={tab.title}
            {id}
        >
            <span class="icon">
                <iconify-icon icon={tab.icon} />
            </span>
            <span class="text">{tab.title}</span>
        </div>
    {/each}
</div>

<style lang="scss">
    .tabs {
        width: 36px;
        background: black;
        grid-area: tabs;
        display: flex;
        flex-flow: column-reverse;
        background: var(--tabs-bg);
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;

        box-shadow: inset calc(var(--tab-border-width) * -1) 0
            var(--tab-selected-border);

        .tab {
            display: flex;
            writing-mode: vertical-rl;
            place-items: center;
            padding: 1em 0;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;

            cursor: pointer;

            .icon {
                iconify-icon {
                    font-size: 1.25em;
                }
                transform: rotate(-90deg);
            }

            @media screen and (max-height: 880px) {
                padding: 0.75em 0;
                .icon {
                    transform: rotate(0deg);
                }
                .text {
                    display: none;
                }
            }

            .text {
                transform: rotate(180deg);
                margin-top: 0.5em;
            }

            &:hover {
                color: var(--accent-fg);
            }
            &.active {
                background: var(--main-bg);

                box-shadow: 0 var(--tab-border-width) var(--tab-selected-border),
                    inset 0 var(--tab-border-width) var(--tab-selected-border);
            }
        }
    }
</style>
