<script lang="ts">
    import Button from "src/components/Button.svelte";
    import WarningDiv from "src/components/WarningDiv.svelte";
    import { onMount } from "svelte";
    import type { MapCardProps } from "../MapList";
    import Select from "src/components/Select.svelte";

    export let close: (value: any) => void;
    export let toDelete: { group: number; index: number; layout?: number }[];
    export let all: MapCardProps[];
    export let actionableLayoutToMap: Record<
        number,
        { group: number; index: number }[]
    >;

    /** List of duplicate layouts that are not all being deleted */
    let duplicateLayouts = [];

    // Check if there are maps that share the same layout
    // If so, warn the user
    onMount(() => {
        /** Map of layouts => map that share a layout with with a toDelete map */
        const layoutToMap = new Map<
            number,
            Set<{ group: number; index: number }>
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

        console.log(toDelete);
        console.log(layouts);
        console.log(layoutToMap);

        if (layouts.size > 0) {
            duplicateLayouts = [...layouts];
            actionableLayoutToMap = {};
            layoutToMap.forEach((maps, layout) => {
                actionableLayoutToMap[layout] = [...maps];
            });
        }
    });

    onMount(() => {
        if (toDelete.length === 0) close(null);
    });
</script>

<div class="dialog-content">
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
            <span class="caption">Choose an action:</span>
            <div class="actions">
                <div class="row label layout">Layout</div>
                <div class="row label maps">Maps</div>
                <div class="row label action">Action</div>
                {#each Object.keys(actionableLayoutToMap) as layout}
                    <div class="row layout">{layout}</div>
                    <div class="row maps">
                        {#each actionableLayoutToMap[layout] as map}
                            <span class="map">
                                {map.group}.{map.index}
                            </span>
                        {/each}
                    </div>
                    <div class="row action">
                        <Select
                            options={[
                                ["nothing", "Don't Delete"],
                                ["clear", "Set Layout to NULL"],
                                ["delete", "Delete these Maps"],
                                ["yolo", "Delete Anyway"],
                            ]}
                        />
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

    .actions {
        display: grid;
        grid-template-columns: 0.5fr minmax(0, 1fr) 1fr;
        grid-template-rows: 25px 1fr;
        gap: 8px;
        margin: 4px;
        margin-top: 8px;
        margin-bottom: 0;
        padding: 0.5em;
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;

        background: var(--main-bg);

        .row {
            display: grid;
        }
        .label {
            place-self: center;
            color: var(--weak-fg);
        }

        .layout {
            place-self: center;
        }

        .maps {
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
            }
        }

        .action {
            align-content: end;
        }
    }
</style>
