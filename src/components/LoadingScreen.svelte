<script lang="ts">
    import "iconify-icon";
    import { onMount, onDestroy } from "svelte";

    // Pulse the shadow
    let pulse = 10;
    let going = false;
    let interval;

    onMount(() => {
        interval = setInterval(() => {
            if (going) {
                pulse += 1;
            } else {
                pulse -= 1;
            }

            if (pulse >= 20) {
                going = false;
            } else if (pulse <= 10) {
                going = true;
            }
        }, 100);
    });

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

<div
    class="loading-screen"
    style="box-shadow: inset 0 0 {pulse}px var(--light-shadow)"
>
    <iconify-icon icon="eos-icons:loading" />&nbsp; Loading...
</div>

<style lang="scss">
    .loading-screen {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;

        user-select: none;
    }
</style>
