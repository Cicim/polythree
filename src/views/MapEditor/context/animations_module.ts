import { invoke } from "@tauri-apps/api";
import type { MapEditorContext } from "src/views/MapEditor";
import { replace_tiles } from "src/wasm/map-canvas/pkg/map_canvas";
import { type Writable, writable, type Unsubscriber, get } from "svelte/store";

export interface TilesetsAnimations {
    primary: Animation[];
    primary_max_frames: number;
    secondary: Animation[];
    secondary_max_frames: number;
}

export interface Animation {
    start_tile: number;
    graphics: Uint8Array[];
    start_time: number;
    interval: number;
}


export class AnimationsModule {
    /** Tileset animations */
    private list: TilesetsAnimations = null;
    /** Primary animation counter */
    private primaryCounter: number;
    /** Secondary animation counter */
    private secondaryCounter: number;
    /** Listener for the tileset animations. Updates when animations need to be updated */
    public changeStore: Writable<boolean> = writable(false);
    /** if the animations are being played */
    public playing: Writable<boolean> = writable(true);
    /** The animation timeout */
    private timeout: NodeJS.Timeout;
    /** Function to unsubscribe from activeView */
    private activeViewUnsubscriber: Unsubscriber = () => { };

    // ANCHOR Getters
    public get tileset1Offset() { return this.context.tileset1Offset }
    public get tileset2Offset() { return this.context.tileset2Offset }
    public get tileset1Length() { return this.context.tileset1Length }
    public get tileset2Length() { return this.context.tileset2Length }
    public get $playing() { return get(this.playing) }

    // ANCHOR Main Methods
    constructor(public context: MapEditorContext) { }

    public async load() {
        // Unsubscribe from previous subscriptions to activeView
        this.activeViewUnsubscriber();
        // Load the animations to load
        this.loadAnimations().then(() => {
            // Create a listener for activeView
            this.activeViewUnsubscriber = this.context.subscribeToSelection(
                () => this.$playing ? this.play() : this.stop(),
                () => this.stop()
            );
        });
    }
    /** Closes all things regarding animations */
    public async exit() {
        // Unsubscribe from activeView
        this.activeViewUnsubscriber();
        // Clear the animation timeout to prevent memory leaks
        clearTimeout(this.timeout);
    }

    // ANCHOR Secondary Methods
    /** Starts the animation loop */
    public play() {
        this.stop();
        this.animationTick();
    }

    /** Stops the animation loop */
    public stop() {
        clearTimeout(this.timeout);
    }

    /** Toggles the playing state */
    public togglePlaying() {
        this.playing.update(v => !v);
    }

    // ANCHOR Private Method
    private async loadAnimations() {
        this.list = null;

        // Load the animations
        const animations: TilesetsAnimations = await invoke('get_tilesets_animations', {
            tileset1: this.tileset1Offset,
            tileset2: this.tileset2Offset,
        });

        // Convert the animations graphics into Uint8Arrays
        for (const anim of animations.primary) {
            for (let i = 0; i < anim.graphics.length; i++) {
                const frame = Uint8Array.from(anim.graphics[i]);
                anim.graphics[i] = frame;
            }
        }
        for (const anim of animations.secondary) {
            for (let i = 0; i < anim.graphics.length; i++) {
                const frame = Uint8Array.from(anim.graphics[i]);
                anim.graphics[i] = frame;
            }
        }

        this.list = animations;
        this.primaryCounter = 0;
        this.secondaryCounter = 0;
    }

    private async animationTick() {
        let somethingChanged = false;

        // Continue if the animations are loaded
        if (this.list !== null) {
            // Perform the animation
            for (const anim of this.list.primary) {
                if (this.primaryCounter % anim.interval === anim.start_time) {
                    somethingChanged = true;
                    let frame = (this.primaryCounter - anim.start_time) / anim.interval | 0;
                    let bytes = anim.graphics[frame % anim.graphics.length];
                    replace_tiles(this.tileset1Offset, this.tileset2Offset, anim.start_tile, bytes);
                }
            }
            for (const anim of this.list.secondary) {
                if (this.secondaryCounter % anim.interval === anim.start_time) {
                    somethingChanged = true;
                    let frame = (this.secondaryCounter - anim.start_time) / anim.interval | 0;
                    let bytes = anim.graphics[frame % anim.graphics.length];
                    replace_tiles(this.tileset1Offset, this.tileset2Offset, anim.start_tile, bytes);
                }
            }

            // If something changed, update the cache
            if (somethingChanged) {
                this.context.map.updateTilesetCache();
                // Force an update on the canvas
                this.changeStore.update(val => !val);
            }

            // Increment the counters
            this.primaryCounter++;
            this.secondaryCounter++;
            if (this.primaryCounter >= this.list.primary_max_frames)
                this.primaryCounter = 0;
            if (this.secondaryCounter >= this.list.secondary_max_frames)
                this.secondaryCounter = 0;
        }
        // Schedule the next tick
        this.timeout = setTimeout(() => this.animationTick(), 16);
    }
}