<script lang="ts">
    import { Bindings } from "src/systems/bindings";
    import type { SvelteComponent } from "svelte";

    interface Tab {
        title: string;
        icon: string;
        component: SvelteComponent;
    }

    export let tabs: Record<string, Tab> = {};

    export let activeTab: string;
    let oldTabId = activeTab;

    export function changeTab(newTabId: string) {
        if (newTabId === activeTab) return;

        // If the old tab is not null, unbind its bindings
        if (oldTabId !== null) {
            Bindings.unregister(tabs[oldTabId].component.bindings);
        }

        // Set the new tab
        activeTab = newTabId;

        Bindings.register(tabs[activeTab].component.bindings);

        // Update the old tab
        oldTabId = activeTab;
    }
</script>

<div class="tabs">
    {#each Object.entries(tabs) as [id, tab]}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            on:click={() => changeTab(id)}
            class:active={activeTab === id}
            class="tab"
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
        width: 2em;
        background: black;
        grid-area: tabs;
        display: flex;
        flex-flow: column-reverse;
        background: var(--tabs-bg);
        user-select: none;

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

            @media screen and (max-height: 800px) {
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
