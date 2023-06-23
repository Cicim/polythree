<!-- A library input element -->
<script lang="ts">
    type InputType = "text" | "number";

    export let type: InputType = "text";
</script>

<input {type} />

<style type="scss">
</style>
