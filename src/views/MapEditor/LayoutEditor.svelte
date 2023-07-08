<script lang="ts">
    export const bindings: Record<string, Function> = {
        "layout_editor/pick_pencil": () => {
            console.log("Pencil");
        },
    };
</script>

<div class="editor" />

<style lang="scss">
    .editor {
        display: grid;
        width: 100%;
        height: 100%;
    }
</style>
