<script lang="ts">
    import Button from "src/components/Button.svelte";
    import Input from "src/components/Input.svelte";
    import { ValueChange } from "src/systems/changes";
    import {
        Menu,
        SubMenuButton,
        TextButton,
        showContextMenu,
    } from "src/systems/context_menu";
    import type { MapEditorContext, MapEditorData } from "src/views/MapEditor";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    let context: MapEditorContext = getContext("context");
    let data: Writable<MapEditorData> = getContext("data");

</script>

<div class="grid">
    <Button
        on:click={(e) => {
            console.log("Button 1");
            // @ts-ignore
            e.target.setAttribute("disabled", true);
        }}>1</Button
    >
    <Button on:click={() => console.log("Button 2")}>2</Button>
    <Button on:click={() => console.log("Button 3")} disabled>3</Button>
    <Button color="secondary" on:click={() => console.log("Button 1")}>1</Button
    >
    <Button color="secondary" on:click={() => console.log("Button 2")}>
        2
    </Button>
    <Button color="secondary" on:click={() => console.log("Button 3")} disabled
        >3</Button
    >
</div>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    on:contextmenu={(e) =>
        showContextMenu(
            e,
            new Menu([
                new TextButton("Clear All", () => {
                    $data.tilemap = $data.tilemap.map((row) =>
                        row.map(() => 0)
                    );
                }),
                new SubMenuButton(
                    "Clear Row",
                    (() => {
                        let rowButtons = [];
                        for (let i = 0; i < $data.tilemap.length; i++) {
                            rowButtons.push(
                                new TextButton(`Row ${i}`, () => {
                                    $data.tilemap[i] = $data.tilemap[i].map(
                                        () => 0
                                    );
                                })
                            );
                        }
                        return new Menu(rowButtons);
                    })()
                ),
                new SubMenuButton(
                    "Clear Column",
                    (() => {
                        let colButtons = [];
                        for (let i = 0; i < $data.tilemap[0].length; i++) {
                            colButtons.push(
                                new TextButton(`Column ${i}`, () => {
                                    $data.tilemap = $data.tilemap.map((row) =>
                                        row.map((_, j) =>
                                            j === i ? 0 : row[j]
                                        )
                                    );
                                })
                            );
                        }
                        return new Menu(colButtons);
                    })()
                ),
            ])
        )}
>
    {$data.width}
    {$data.height}
    {$data.tilemap}

    <br />

    width: <Input edits="name" /><br />
    width: <Input type="number" edits="width" /><br />
    height: <Input type="number" edits="height" /><br />

    <Button on:click={() => context.changes.setValue("name", "Pallet Town")}>
        Set to Pallet Town
    </Button>

    {JSON.stringify($data)}

    {#each $data.tilemap as row, y}
        <div>
            {#each row as tile, x}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <Button
                    style="display: inline-block; padding: 10px"
                    on:click={(e) => {
                        context.changes.setValue(
                            `tilemap.${y}.${x}`,
                            $data.tilemap[y][x] + 1
                        );
                    }}
                >
                    {tile}
                </Button>
            {/each}
        </div>
    {/each}
</div>

<style lang="scss">
    .grid {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        place-items: stretch;
    }
</style>
