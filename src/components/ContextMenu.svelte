<script lang="ts">
    import ContextMenuItem from "./ContextMenuItem.svelte";
    import {
        IconButton,
        Menu,
        Separator,
        SubMenuButton,
        TextButton,
        closeContextMenu,
        ctxMenu,
    } from "../systems/context_menu";

    const menu = new Menu([
        new IconButton("New File", "mingcute:file-new-line", () => {
            console.log("New File");
        }),
        new IconButton("New Folder", "mingcute:new-folder-line", () => {
            console.log("New Folder");
        }),
        new Separator(),
        new IconButton("Open", "majesticons:open", () => {
            console.log("Open");
        }),
        new IconButton(
            "Open With",
            "material-symbols:open-in-new-off-sharp",
            () => {
                console.log("Open With");
            }
        ),
        new Separator(),
        new IconButton("Cut", "tabler:cut", () => {
            console.log("Cut");
        }),
        new IconButton(
            "Copy",
            "ph:copy",
            () => {
                console.log("Copy");
            },
            "Ctrl+C"
        ),
        new IconButton("Paste", "la:paste", () => {
            console.log("Paste");
        }),
        new Separator(),
        new SubMenuButton(
            "More",
            new Menu([
                new TextButton("Rename", () => {
                    console.log("Rename");
                }),
                new TextButton(
                    "Delete This File from the Face of the Earth",
                    () => {
                        console.log("Delete");
                    }
                ),
                new Separator(),
                new TextButton("Properties", () => {
                    console.log("Properties");
                }),
            ])
        ),
        new SubMenuButton(
            "Even More",
            new Menu([
                new TextButton("Rename", () => {
                    console.log("Rename");
                }),
                new SubMenuButton(
                    "Rename",
                    new Menu([
                        new TextButton(
                            "Rename",
                            () => {
                                console.log("Rename");
                            },
                            "Ctrl+R"
                        ),
                        new TextButton(
                            "Delete This File from the Face of the Earth",
                            () => {
                                console.log("Delete");
                            }
                        ),
                        new Separator(),
                        new TextButton("Properties", () => {
                            console.log("Properties");
                        }),
                    ])
                ),
            ])
        ),
    ]);
</script>

<svelte:window
    on:contextmenu|preventDefault={() => null}
    on:resize={() => closeContextMenu()}
    on:mousedown={closeContextMenu}
    on:keydown={(e) => $ctxMenu.checkKeyBindings(e)}
/>

<dialog id="ctx-menu" class="ctx-menu">
    <div id="ctx-list">
        {#each $ctxMenu.items as item}
            <ContextMenuItem {item} />
        {/each}
    </div>
</dialog>

<style type="scss">
    #ctx-menu {
        --chonkiness: 4px;

        position: fixed;
        top: 0;
        left: 0;

        z-index: 1000000;

        &::backdrop {
            background: transparent;
        }

        &:focus {
            outline: none;
        }
    }
    #ctx-list {
        display: flex;
        flex-direction: column;
    }
</style>
