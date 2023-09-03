<script lang="ts" context="module">
    import {
        spawnDialog,
        type DialogOptions,
    } from "src/components/dialog/Dialog.svelte";
    import RenameMapSectionDialog from "./RenameMapSectionDialog.svelte";
    import Button from "src/components/Button.svelte";

    export interface RenameMapSectionDialogOptions extends DialogOptions {
        /** The mapsec to rename */
        mapsec: number;
        /** The original name */
        originalName: string;
    }

    export async function spawnRenameMapSectionDialog(
        options: RenameMapSectionDialogOptions
    ): Promise<true | false | null> {
        return await spawnDialog(RenameMapSectionDialog, options);
    }
</script>

<script lang="ts">
    import GameInput from "src/components/GameInput.svelte";
    import { setMapName } from "src/systems/data/map_names";

    export let close: (_: any) => void;
    export let mapsec: number;
    export let originalName: string;

    let newName = originalName;
    let invalidName = true;

    async function renameAndClose() {
        const result = await setMapName(mapsec, newName);

        // All correct, exit
        if (result) return close(true);
    }
</script>

<div class="dialog-content">
    <div class="title">
        Change display name for Mapsec {mapsec}
    </div>
    <div class="content form">
        <div class="row">
            <div class="row subtitle">Original name:</div>
            <div class="row">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <i on:click={() => (newName = originalName)}
                    >(<b>{originalName}</b>)</i
                >
            </div>
        </div>
        <div class="row dark">
            <div class="row subtitle">New Name</div>
            <GameInput
                bind:invalid={invalidName}
                bind:value={newName}
                maxLength={16}
            />
        </div>
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Cancel</Button>
        <Button
            disabled={invalidName}
            theme="secondary"
            on:click={() => renameAndClose()}>Rename</Button
        >
    </div>
</div>

<style lang="scss">
    .content {
        i {
            cursor: pointer;
            &:hover {
                b {
                    text-decoration: underline;
                }
            }
            align-self: center;
        }
        b {
            color: var(--weak-fg);
        }
    }
</style>
