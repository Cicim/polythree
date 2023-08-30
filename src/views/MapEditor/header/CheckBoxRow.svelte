<script lang="ts">
    import CheckBox from "src/components/CheckBox.svelte";
    import type { NavigatePath } from "src/systems/navigate";
    import { tooltip } from "src/systems/tooltip";

    export let title: string;
    export let text: string;
    export let edits: NavigatePath;
</script>

<div class="tq-row">
    <div>
        <span class="subtitle" use:tooltip tooltip={title}>
            {text}
        </span>
    </div>
    <CheckBox {edits} />
</div>
