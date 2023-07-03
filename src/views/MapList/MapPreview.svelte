<script lang="ts">
    import { dialog, invoke } from "@tauri-apps/api";
    import { writeBinaryFile } from "@tauri-apps/api/fs";
    import LoadingScreen from "src/components/LoadingScreen.svelte";
    import AlertDialog from "src/components/dialog/AlertDialog.svelte";
    import {
        Menu,
        TextOption,
        showContextMenu,
    } from "src/systems/context_menu";
    import { spawnDialog } from "src/systems/dialogs";
    import viewport from "src/systems/intersection";
    import { onMount } from "svelte";

    export let group: number;
    export let index: number;
    export let name: string = null;

    /** If the maps should scroll even when moving around the window */
    export let windowScroll = true;

    /** True until the map is loaded or an error occurs */
    let isLoading = true;
    /** The b64 encoded map image */
    let preview: string;
    /** A string representing the error that occurred */
    let error = null;

    let containerEl: HTMLDivElement;
    let imageEl: HTMLImageElement;

    let centerVertical = false;
    let centerHorizontal = false;

    /** Saves the preview image as a file */
    async function saveAs() {
        // Get the file name with a dialog
        const path = await dialog.save({
            title: "Save Map Preview",
            defaultPath: `map_preview_${group}_${index}.png`,
            filters: [{ name: "PNG", extensions: ["png"] }],
        });

        if (path === null) return;

        // Get the image binary and write it to the file
        try {
            const response = await fetch(preview);
            const buffer = await response.arrayBuffer();

            await writeBinaryFile({
                path,
                contents: buffer,
            });
        } catch (e) {
            await spawnDialog(AlertDialog, {
                title: "Failed to save map preview",
                message: e,
            });
        }
    }

    function scrollTransform(x: number): number {
        let y = 1 / (-0.5 - x / 2) + 2;
        if (y < 0) y = 0;
        if (y > 1) y = 1;
        return y;
    }

    /** Moves the preview scroll based on the mouse's position over it */
    function onMouseMove(event: MouseEvent) {
        if (!imageEl) return;

        const rect = containerEl.getBoundingClientRect();
        // Get the page mouse
        const x = (event.pageX - rect.x) / rect.width;
        const y = (event.pageY - rect.y) / rect.height;

        // Get the image size
        const imgWidth = imageEl.width;
        const imgHeight = imageEl.height;

        // Get the image's scrollable size
        const scrollWidth = imgWidth - rect.width;
        const scrollHeight = imgHeight - rect.height;

        // Set the scroll position
        containerEl.scrollLeft = scrollTransform(x) * scrollWidth;
        containerEl.scrollTop = scrollTransform(y) * scrollHeight;
    }

    /** Centers the image in all orientations that are smaller than the tooltip */
    function applyCentering() {
        // Get the container size
        const rect = containerEl.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Get the image size
        const imgWidth = this.width;
        const imgHeight = this.height;

        centerHorizontal = imgWidth < width;
        centerVertical = imgHeight < height;
    }

    /** Loads the image */
    onMount(async () => {
        try {
            preview = await invoke("get_map_preview", {
                group,
                index,
            });
        } catch (err) {
            error = err;
        } finally {
            isLoading = false;
        }
    });

    function onWindowMouseMove(event: MouseEvent) {
        if (!windowScroll) return;
        onMouseMove(event);
    }

    function onContainerMouseMove(event: MouseEvent) {
        if (windowScroll) return;
        onMouseMove(event);
    }
</script>

<svelte:window on:mousemove={onWindowMouseMove} />

<div class="container" bind:this={containerEl}>
    {#if isLoading}
        <LoadingScreen />
    {:else if error !== null}
        <div class="error">
            {error}
        </div>
    {:else}
        <div
            class:center-vertical={centerVertical}
            class:center-horizontal={centerHorizontal}
            class="img-container"
            on:contextmenu={(e) =>
                showContextMenu(
                    e,
                    new Menu([new TextOption("Save as...", saveAs)])
                )}
        >
            <img
                on:load={applyCentering}
                on:mousemove={onContainerMouseMove}
                bind:this={imageEl}
                class="image"
                src={preview}
                alt={name}
                use:viewport
                on:enterViewport={applyCentering}
            />
        </div>
    {/if}
</div>

<style lang="scss">
    .container {
        overflow: hidden;

        .error {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
        }
    }

    .img-container {
        display: grid;
        width: 100%;
        height: 100%;

        &.center-vertical {
            align-content: center;
        }

        &.center-horizontal {
            justify-content: center;
        }

        .image {
            image-rendering: pixelated;
        }
    }
</style>
