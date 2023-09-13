<script lang="ts">
    import { get } from "svelte/store";
    import { GroupCriteria } from "../MapList";
    import { config } from "src/systems/global";
    import { mapNames } from "src/systems/data/map_names";

    export let id: string;
    export let criteria: GroupCriteria;

    let html = "";

    $: {
        switch (criteria) {
            case GroupCriteria.Group:
                html = `Group #${id}`;
                break;
            case GroupCriteria.Name:
                html = $mapNames[id];
                break;
            case GroupCriteria.Tilesets:
                let [t1, t2] = id.split("+");

                t1 = get(config).tileset_names[t1] ?? "Unnamed";
                t2 = get(config).tileset_names[t2] ?? "Unnamed";

                html = `<i>${t1}</i> & <i>${t2}</i>`;
                break;
            case GroupCriteria.Layout:
                if (id === "0") html = "<i>No Layout</i> (0)";
                else {
                    html = get(config).layout_names[id] ?? "Unnamed";
                    html = `<i>${html}</i> (${id})`;
                }
        }
    }
</script>

<h2 class="separator">
    {@html html}
</h2>

<style lang="scss">
    .separator {
        font-weight: 400;
        color: var(--weak-fg);
        margin-left: 0.5em;

        grid-column: 1 / -1;
    }
</style>
