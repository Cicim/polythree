<script lang="ts">
    import Select from "src/components/Select.svelte";
    import { getMapNamesOptions } from "src/systems/data/map_names";
    import type { NavigatePath } from "src/systems/navigate";
    import { onMount } from "svelte";
    import { readable, type Readable, type Writable } from "svelte/store";

    export let store: Writable<any>;
    /** Edits for the Select */
    export let edits: NavigatePath;

    /** Options start as a thing to avoid loading pains */
    let nameOptions: Readable<[number, string][]> = readable([[0, "Loading"]]);

    onMount(async () => {
        nameOptions = await getMapNamesOptions();
    });
</script>

{#key nameOptions}
    <Select options={$nameOptions} {store} {edits} valueTag="number" />
{/key}
