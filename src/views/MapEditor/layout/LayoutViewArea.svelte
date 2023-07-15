<script lang="ts">
    import { onMount } from "svelte";
    import MapEditor from "../editor/MapEditor.svelte";

    onMount(() => {
        console.log("Mounting");
    });
</script>

<div class="container">
    <MapEditor />
</div>

<style lang="scss">
    .container {
        display: grid;
        height: 100%;
    }
</style>
