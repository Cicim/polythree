<script lang="ts">
    import { onMount } from "svelte";
    import MapEditor from "../editor/MapEditor.svelte";

    export let editLevels: boolean = false;

    onMount(() => {
        console.log("Mounting");
    });
</script>

<div class="container">
    <MapEditor {editLevels} />
</div>

<style lang="scss">
    .container {
        display: grid;
        height: 100%;
    }
</style>
