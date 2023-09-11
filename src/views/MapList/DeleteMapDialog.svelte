<svelte:options accessors />

<script lang="ts" context="module">
    import {
        spawnDialog,
        type DialogOptions,
    } from "src/components/dialog/Dialog.svelte";
    import DeleteMapDialog from "./DeleteMapDialog.svelte";
    export interface DeleteMapDialogOptions extends DialogOptions {
        toDelete: { group: number; index: number; layout?: number }[];
        all: MapCardProps[];
        context: MapListContext;
    }

    export async function spawnDeleteMapDialog(
        options: DeleteMapDialogOptions
    ): Promise<null | false | true> {
        return await spawnDialog(DeleteMapDialog, options);
    }
</script>

<script lang="ts">
    import type { MapCardProps, MapId, MapListContext } from "../MapList";
    import { invoke, RustFn } from "src/systems/invoke";
    import { config } from "src/systems/global";
    import { tooltip } from "src/systems/tooltip";
    import { getAllViews } from "src/systems/views";
    import { MapEditorContext } from "../MapEditor";
    import Button from "src/components/Button.svelte";
    import WarningDiv from "src/components/WarningDiv.svelte";
    import ErrorDiv from "src/components/ErrorDiv.svelte";
    import Select from "src/components/Select.svelte";
    import MapPreview from "./MapPreview.svelte";
    import CloseViewsDialog from "src/components/dialog/CloseViewsDialog.svelte";

    enum State {
        /** The dialog is open and the deletion process has not started */
        Idle,
        /** The deletion process has started */
        Deleting,
        /** The deletion process has ended */
        Done,
        /** The deletion process ended with an error */
        Errored,
    }
    let state: State = State.Idle;
    /** The error message */
    let errorString: string;

    // Dialog options
    export let noOutsideClose = false;
    export let noEscapeClose = false;
    export let close: (value: any) => void;

    $: noEscapeClose = state === State.Deleting;
    $: noOutsideClose = state === State.Deleting;

    /** The list of map {group, index} to be deleted */
    export let toDelete: { group: number; index: number; layout: number }[];
    /** The reference to the MapList $data */
    export let all: MapCardProps[];
    /** The MapListContext reference */
    export let context: MapListContext;

    /** Valid actions to be done to the layout (an passed to the backend on deletion) */
    type Action = "Nothing" | "Clear" | "Delete" | "Change";

    /** List for showing the action cards */
    let actionableLayoutToMap: Record<
        string,
        {
            action: Action;
            maps: MapCardProps[];
            changeTo?: string;
            invalid?: boolean;
        }
    >;
    // Update the valid layouts each time the user the value of an option
    $: actionableLayoutToMap, updateValidLayouts();
    // Updates the Delete button each time the user changes a value in the selects
    $: actionableLayoutToMap, checkIfAllValid();
    /** All map layouts at the moment of creation */
    let allLayouts: number[];
    /** if true, all selected actions are valid and you can proceed with the deletion */
    let anyInvalid: boolean;
    /** Lists of layouts that can be chosen through the Select when the option is "change" */
    let validLayouts: number[] = [];
    /** List of duplicate layouts that are not all being deleted */
    let duplicateLayouts: number;

    /** Starts the deletion process */
    async function deleteMaps() {
        // Get all views with the layout among the ones that will be deleted
        const mapEditorsToClose = [
            ...getAllViews(MapEditorContext, (view: MapEditorContext) => {
                const viewLayout = view.map.$data.layout.index;

                // If the layout is anywhere in the list of layouts that could be deleted
                for (const layoutAction in actionableLayoutToMap) {
                    if (
                        actionableLayoutToMap[layoutAction].action === "Nothing"
                    )
                        continue;
                    for (const actionData of actionableLayoutToMap[layoutAction]
                        .maps) {
                        if (actionData.layout === viewLayout) {
                            return true;
                        }
                    }
                }

                return false;
            }),
        ];

        // If there are views that are at risk of deletion
        // Ask the user if to close the mapEditors
        if (mapEditorsToClose.length > 0) {
            const closed = await spawnDialog(CloseViewsDialog, {
                title: "Close these Map Editors to Proceed",
                views: mapEditorsToClose,
            });

            // If the user refused to close all the views
            if (!closed) {
                state = State.Idle;
                return;
            }
        }

        // Now you're deleting
        state = State.Deleting;

        try {
            const deleted = await invoke(RustFn.delete_maps, {
                maps: toDelete,
                actions: actionableLayoutToMap ?? {},
            });
            context.component.removeDeleted(deleted);
        } catch (err) {
            state = State.Errored;
            errorString = err;
        } finally {
            state = State.Done;
        }
    }

    /** Updates the valid layouts from all the layouts minus the layouts
     *  that are scheduled for deletion (i.e. action !== "nothing") */
    function updateValidLayouts() {
        if (!actionableLayoutToMap) return;

        // Count the number of layouts that are not being deleted
        const invalidLayouts = [];

        for (const index of Object.keys(actionableLayoutToMap)) {
            const layout = +index;
            const more = actionableLayoutToMap[layout];
            if (more.action !== "Nothing") invalidLayouts.push(layout);
        }

        validLayouts = [...allLayouts].filter(
            (layout) => !invalidLayouts.includes(layout)
        );
    }

    /** Checks if all Selected contain valid options */
    function checkIfAllValid() {
        if (!actionableLayoutToMap) return;
        anyInvalid = false;

        for (const index of Object.keys(actionableLayoutToMap)) {
            const more = actionableLayoutToMap[index];
            if (more.action === "Change" && more.invalid) {
                anyInvalid = true;
                break;
            }
        }
    }

    /** Map of layouts => map that share a layout with with a toDelete map */
    const layoutToMap = new Map<number, Set<MapCardProps>>();
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

                    return true;
                }

                return res;
            }, false)
        ) {
            layouts.add(layout);
        }
    }

    if (layouts.size > 0) {
        duplicateLayouts = layoutToMap.size;
        actionableLayoutToMap = {};
        layoutToMap.forEach((maps, layout) => {
            actionableLayoutToMap[layout] = {
                action: "Nothing",
                maps: [...maps],
                changeTo: "1",
            };
        });
    }

    // Get all layouts
    allLayouts = [...new Set(all.map((m) => m.layout))]
        .filter((l) => l !== 0)
        .sort((a, b) => a - b);
</script>

<div class="dialog-content" class:deleting={state === State.Deleting}>
    {#if state === State.Deleting}
        <div class="icon-title">
            <iconify-icon icon="eos-icons:loading" />
            <span>Deleting...</span>
        </div>
    {:else}
        <div class="title">
            {#if state === State.Errored}
                An error has occurred!
            {:else if state === State.Done}
                Done!
            {:else if toDelete.length === 1}
                Do you want to delete <b
                    >{toDelete[0].group}.{toDelete[0].index}</b
                >?
            {:else}
                Do you want to delete <b>{toDelete.length}</b> maps?
            {/if}
        </div>
    {/if}
    <div class="content">
        {#if state === State.Errored}
            <ErrorDiv>{errorString}</ErrorDiv>
        {:else if state === State.Done}
            All maps were successfully deleted!
        {:else if state === State.Deleting}
            <WarningDiv>
                Deleting... Do <b><u>not</u></b> close the editor right now, or
                data might be
                <b>corrupted</b>!
            </WarningDiv>
        {:else}
            <WarningDiv>
                Once deleted, you <b>cannot</b> recover the maps. If unsure
                <b>make a backup</b> first.
            </WarningDiv>
            {#if duplicateLayouts > 0}
                <WarningDiv>
                    {#if duplicateLayouts === 1}
                        One layout is
                    {:else}
                        {duplicateLayouts} layouts are
                    {/if}
                    reused by other maps. <br />
                    Please choose what to do with each layout:
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
                            <div
                                class="maps"
                                class:striked={actionableLayoutToMap[layout]
                                    .action === "Delete"}
                            >
                                {#each o.maps as map}
                                    {#if map?.name}
                                        <span
                                            class="map"
                                            tooltip={map?.name ?? ""}
                                            use:tooltip
                                        >
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
                                        ["Nothing", "Don't Delete"],
                                        [
                                            "Change",
                                            "Delete and change Maps Layout:",
                                        ],
                                        [
                                            "Clear",
                                            "Delete and set these Map's Layout to null",
                                        ],
                                        [
                                            "Delete",
                                            "Delete both the Layout and these Maps",
                                        ],
                                    ]}
                                />
                                {#if actionableLayoutToMap[layout].action === "Change"}
                                    <Select
                                        bind:value={actionableLayoutToMap[
                                            layout
                                        ].changeTo}
                                        bind:invalid={actionableLayoutToMap[
                                            layout
                                        ].invalid}
                                        options={Object.entries(
                                            $config.layout_names
                                        ).filter(([k, _]) =>
                                            validLayouts.includes(+k)
                                        )}
                                    />
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
    <div class="buttons">
        {#if state === State.Errored}
            <Button on:click={() => close(null)}>Close</Button>
        {:else if !(state === State.Done)}
            <Button
                theme="secondary"
                disabled={state === State.Deleting}
                on:click={() => close(null)}>Cancel</Button
            >
            <Button
                theme="warning"
                disabled={anyInvalid || state === State.Deleting}
                on:click={deleteMaps}>Delete</Button
            >
        {:else}
            <Button theme="secondary" on:click={() => close(null)}>Close</Button
            >
        {/if}
    </div>
</div>

<style lang="scss">
    .dialog-content {
        &.deleting {
            .buttons > :global(button) {
                cursor: wait;
            }
        }
    }

    .content {
        display: grid;
        grid-template-rows: min-content min-content 1fr;
        overflow-y: scroll;
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

                &.striked .map {
                    text-decoration: line-through;
                }

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
                flex-direction: row;
                flex-wrap: nowrap;
                padding: 0 1em 0 0;

                :global(> .select) {
                    &:first-child {
                        flex: 1;
                    }
                    &:last-child {
                        flex: 1.5;
                    }
                }
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

                border-radius: 1em;
                overflow: hidden;

                :global(.img-container) {
                    border-radius: 1em;
                }

                &:hover {
                    box-shadow: 0 0 4px 2px var(--accent-shadow);
                }
            }
        }
    }
</style>
