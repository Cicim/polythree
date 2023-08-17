<script lang="ts">
    import { dialog } from "@tauri-apps/api";
    import { writeBinaryFile } from "@tauri-apps/api/fs";
    import { spawnErrorDialog } from "src/systems/dialogs";
    import { onMount } from "svelte";
    import viewport from "src/systems/intersection";
    import {
        showContextMenu,
        Menu,
        IconOption,
    } from "src/systems/context_menu";
    import LoadingScreen from "src/components/LoadingScreen.svelte";

    /** The image alt in case it didn't load */
    export let alt: string = null;
    /** If the maps should scroll even when moving around the window */
    export let windowScroll = true;
    /** The async function that returns the b65 encoded image */
    export let loadFunction: () => Promise<string>;
    /** The context menu to apply to the image once it's loaded */
    export let saveFileName: string = "Image";

    /** True until the map is loaded or an error occurs */
    let isLoading = true;
    /** A string representing the error that occurred */
    let error = null;
    /** The b64 encoded map image */
    let b64encodedImage: string;

    let containerEl: HTMLDivElement;
    let imageEl: HTMLImageElement;

    let centerVertical = false;
    let centerHorizontal = false;

    /** Saves the preview image as a file */
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

    function onWindowMouseMove(event: MouseEvent) {
        if (!windowScroll) return;
        onMouseMove(event);
    }

    function onContainerMouseMove(event: MouseEvent) {
        if (windowScroll) return;
        onMouseMove(event);
    }

    function openContextMenu(event: MouseEvent) {
        showContextMenu(
            event,
            new Menu([new IconOption("Save as PNG", "mdi:export", saveAs)])
        );
    }

    /** Saves the preview image as a file */
    async function saveAs() {
        // Get the file name with a dialog
        const path = await dialog.save({
            title: "Save Image",
            defaultPath: saveFileName,
            filters: [{ name: "PNG", extensions: ["png"] }],
        });

        if (path === null) return;

        // Get the image binary and write it to the file
        try {
            const response = await fetch(b64encodedImage);
            const buffer = await response.arrayBuffer();

            await writeBinaryFile({
                path,
                contents: buffer,
            });
        } catch (e) {
            await spawnErrorDialog(e, "Failed to save image");
        }
    }

    /** Loads the image */
    onMount(async () => {
        try {
            b64encodedImage = await loadFunction();
        } catch (errorMessage) {
            error = errorMessage;
        }
        isLoading = false;
    });
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
        >
            <img
                on:load={applyCentering}
                on:mousemove={onContainerMouseMove}
                on:contextmenu={openContextMenu}
                bind:this={imageEl}
                class="image"
                src={b64encodedImage}
                {alt}
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
