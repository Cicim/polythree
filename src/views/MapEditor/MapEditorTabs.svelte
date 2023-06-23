<script lang="ts">
    import type { MapEditorContext, MapEditorData } from "src/views/MapEditor";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    let context: MapEditorContext = getContext("context");
    let data: Writable<MapEditorData> = getContext("data");
</script>

{$data.width}
{$data.height}
{$data.tilemap}

<style type="scss">
</style>
