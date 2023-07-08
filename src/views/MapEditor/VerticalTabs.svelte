<script lang="ts">
    interface Tab {
        title: string;
        id: string;
        icon: string;
    }

    export let tabs: Tab[] = [];

    export let activeTab: string;

    function onTabClick(tabId: string) {
        activeTab = tabId;
    }
</script>

<div class="tabs">
    {#each tabs as tab}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            on:click={() => onTabClick(tab.id)}
            class:active={activeTab === tab.id}
            class="tab"
            id={tab.id}
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

            @media screen and (max-height: 654px) {
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
