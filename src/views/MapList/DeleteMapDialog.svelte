<script lang="ts">
    import Button from "src/components/Button.svelte";
    import WarningDiv from "src/components/WarningDiv.svelte";
    import { onMount } from "svelte";
    import type { MapCardProps } from "../MapList";
    import Select from "src/components/Select.svelte";
    import MapPreview from "./MapPreview.svelte";

    type Action = "nothing" | "clear" | "delete" | "yolo";

    export const noOutsideClose = true;
    export let close: (value: any) => void;
    export let toDelete: { group: number; index: number; layout?: number }[];
    export let all: MapCardProps[];
    let actionableLayoutToMap: Record<
        number,
        { action: Action; maps: MapCardProps[] }
    >;

    /** List of duplicate layouts that are not all being deleted */
    let duplicateLayouts = [];

    // Check if there are maps that share the same layout
    // If so, warn the user
    onMount(() => {
        /** Map of layouts => map that share a layout with with a toDelete map */
        const layoutToMap = new Map<
            number,
            Set<MapCardProps>
        >();

        const layouts = new Set<number>();

        for (const map of toDelete) {
            // Get this map's layout
            const layout = all.find(
                (m) => m.group === map.group && m.index === map.index
            )?.layout;

            if (layout === 0) continue;

            // Save the toDelete map's layout for later
            map.layout = layout;

            // If it you've already seen it, skip
            if (layouts.has(layout)) continue;

            // See if one exists among the other maps
            if (
                all.reduce((res, m) => {
                    // When you've found a duplicate layout
                    // that isn't going to the grind
                    if (
                        m.layout === map.layout &&
                        !toDelete.find(
                            (d) => d.group === m.group && d.index === m.index
                        )
                    ) {
                        // Add it to the layoutToMap
                        if (!layoutToMap.has(m.layout))
                            layoutToMap.set(m.layout, new Set([m]));
                        layoutToMap.get(m.layout).add(m);
                    }

                    return (
                        res ||
                        (m.layout === layout &&
                            m.group !== map.group &&
                            m.index !== map.index)
                    );
                }, false)
            ) {
                layouts.add(layout);
            }
        }

        if (layouts.size > 0) {
            duplicateLayouts = [...layouts];
            actionableLayoutToMap = {};
            layoutToMap.forEach((maps, layout) => {
                actionableLayoutToMap[layout] = {
                    action: "nothing",
                    maps: [...maps],
                };
            });
        }
    });

    onMount(() => {
        if (toDelete.length === 0) close(null);
    });

    $: console.log(actionableLayoutToMap);
</script>

<div class="dialog-content expanding">
    <div class="title">
        {#if toDelete.length === 1}
            Do you want to delete <b>{toDelete[0].group}.{toDelete[0].index}</b
            >?
        {:else}
            Do you want to delete <b>{toDelete.length}</b> maps?
        {/if}
    </div>
    <div class="content">
        <WarningDiv>
            Once deleted, you <b>cannot</b> recover the maps. If unsure
            <b>make a backup</b>. first.
        </WarningDiv>
        {#if duplicateLayouts.length > 0}
            <WarningDiv>
                You are deleting maps that share the same layout.
            </WarningDiv>

            <div class="actions-container">
                {#each Object.entries(actionableLayoutToMap) as [layout, o]}
                    <div class="action-card">
                        <div class="preview">
                            <MapPreview
                                group={o.maps[0].group}
                                index={o.maps[0].index}
                                windowScroll={false}
                            />
                        </div>
                        <div class="layout">
                            Layout #{layout}
                        </div>
                        <div class="maps">
                            {#each o.maps as map}
                                {#if map?.name}
                                    <span class="map" title={map?.name}>
                                        {map.group}.{map.index}
                                    </span>
                                {:else}
                                    <span class="map">
                                        {map.group}.{map.index}
                                    </span>
                                {/if}
                            {/each}
                        </div>
                        <div class="action">
                            <Select
                                bind:value={actionableLayoutToMap[layout]
                                    .action}
                                options={[
                                    ["nothing", "Don't Delete the Layout"],
                                    ["clear", "Set each Map's Layout to NULL"],
                                    ["delete", "Delete these Maps"],
                                    ["yolo", "Delete the Layout Anyway"],
                                ]}
                            />
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
    <div class="buttons">
        <Button color="secondary" on:click={() => close(null)}>Cancel</Button>
        <Button color="primary" on:click={() => close(true)}>Delete</Button>
    </div>
</div>

<style lang="scss">
    .caption {
        display: inline-block;
        margin: 4px 0.5em 0;
    }

    .content {
        display: grid;
        grid-template-rows: min-content min-content 1fr;
    }

    .actions-container {
        display: grid;
        gap: 1em;
        margin: 4px;
        margin-top: 8px;
        margin-bottom: 0;
        padding: 0.5em;
        border-radius: 8px;
        overflow-y: auto;

        background: var(--main-bg);

        .action-card {
            display: grid;
            grid-template-rows: min-content minmax(0px, 1fr) min-content;
            grid-template-columns: max-content 1fr;
            grid-template-areas: "preview title" "preview maps" "preview action";

            gap: 0.5em;

            .layout {
                grid-area: title;
            }

            .maps {
                grid-area: maps;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                align-content: flex-start;

                .map {
                    background: var(--card-bg);
                    border: 1px solid var(--card-border);
                    font-size: 11px;
                    padding: 0.25em 0.5em;
                    width: max-content;
                    cursor: default;
                }
            }

            .action {
                grid-area: action;
                display: flex;
                flex-direction: column;
                padding: 0 1em 0 0;
            }

            .preview {
                grid-area: preview;
                display: flex;
                width: 80px;
                height: 80px;
                border: 1px solid var(--card-border);
                box-shadow: 0 0 2px 1px var(--light-shadow);
                justify-self: center;
                margin: 4px 8px;

                &:hover {
                    box-shadow: 0 0 4px 2px var(--accent-shadow);
                }
            }
        }
    }
</style>
