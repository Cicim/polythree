<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import ImagePreview from "src/components/ImagePreview.svelte";

    export let group: number;
    export let index: number;
    export let name: string = null;
    export let windowScroll = true;

    async function load(): Promise<string> {
        return await invoke("get_map_preview", {
            group,
            index,
        });
    }
</script>

<ImagePreview
    saveFileName={`map_preview_${group}_${index}.png`}
    loadFunction={load}
    {windowScroll}
    alt={name}
/>
