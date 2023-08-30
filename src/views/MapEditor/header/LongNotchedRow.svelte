<script lang="ts">
    import { tooltip } from "src/systems/tooltip";

    export let title: string;
    export let text: string;
</script>

<div class="tqb-row">
    <div>
        <span class="subtitle" use:tooltip tooltip={title}>
            {text}
        </span>
    </div>
    <slot />
</div>
