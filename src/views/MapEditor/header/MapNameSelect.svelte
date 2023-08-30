<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import Select from "src/components/Select.svelte";
    import type { NavigatePath } from "src/systems/navigate";
    import { onMount } from "svelte";
    import type { Writable } from "svelte/store";

    interface GetMapNamesResponse {
        /** List of names. Starts at 0, 0 is actually start_index. Ends at none_index - start_index */
        names: string[];
        /** First invalid index */
        none_index: number;
        /** First valid index */
        start_index: number;
    }

    export let store: Writable<any>;
    /** Edits for the Select */
    export let edits: NavigatePath;

    /** Options start as a thing to avoid loading pains */
    let nameOptions: [number, string][] = [[0, "Loading"]];

    onMount(async () => {
        const { names, start_index } = (await invoke(
            "get_map_names"
        )) as GetMapNamesResponse;

        nameOptions = names.map((nameString, index) => {
            return [index + start_index, nameString];
        });
    });
</script>

{#key nameOptions}
    <Select options={nameOptions} {store} {edits} valueTag="number" />
{/key}
