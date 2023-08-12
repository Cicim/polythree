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
            tooltip={`${tab.title} ${tab.isLocked ? "(Locked)" : ""}`}
            {id}
        >
            <span class="icon">
                <iconify-icon icon={tab.icon} />
                {#if tab.isLocked}
                    <span class="locked">
                        <iconify-icon icon="mdi:lock" />
                    </span>
                {/if}
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
            position: relative;
            display: flex;
            writing-mode: vertical-rl;
            place-items: center;
            padding: 1em 0;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;

            cursor: pointer;

            .icon {
                position: relative;
                iconify-icon {
                    font-size: 1.25em;
                    transform: rotate(-90deg);
                }
            }

            .locked {
                position: absolute;
                bottom: 0px;
                left: 8px;
                color: var(--warn-fg);
                transform: rotate(90deg);

                iconify-icon {
                    font-size: 0.75em;
                    text-shadow: 1px 1px 0 red;
                }
            }

            @media screen and (max-height: 880px) {
                padding: 0.75em 0;
                .icon {
                    iconify-icon {
                        transform: rotate(0deg);
                    }
                }

                .locked {
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
