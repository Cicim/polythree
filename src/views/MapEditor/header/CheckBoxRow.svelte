<script lang="ts">
    import CheckBox from "src/components/CheckBox.svelte";
    import type { NavigatePath } from "src/systems/navigate";
    import { tooltip } from "src/systems/tooltip";
    import type { Writable } from "svelte/store";

    export let title: string;
    export let text: string;
    export let store: Writable<any>;
    export let edits: NavigatePath;
</script>

<div class="tq-row">
    <div>
        <span class="subtitle" use:tooltip tooltip={title}>
            {text}
        </span>
    </div>
    <CheckBox {store} {edits} />
</div>
