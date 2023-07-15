function defaultMaxWidth(nodeWidth: number) {
    return window.innerWidth;
}
function defaultMinWidth(nodeWidth: number) {
    return 0;
}

interface ResizeXOptions {
    startWidth: number;
    maxWidth: ((nodeWidth: number) => number) | number;
    minWidth: ((nodeWidth: number) => number) | number;
}

/** Adds the listeners for resizing an element
 * @param node The element to resize
 * @param startWidth The width to start with
 * @param maxWidth The maximum width to resize to. Can be a number or a function that returns a number
 */
export function resizeX(node: HTMLElement, { startWidth, minWidth, maxWidth }: ResizeXOptions) {
    // The max width is a function that returns the max width, but it can be passed as a number as well
    const getMaxWidth = maxWidth == null ? defaultMaxWidth : // maxWidth is undefined, return a default () => window.innerWidth
        maxWidth instanceof Function ? maxWidth : // maxWidth is a function, return itself
            () => maxWidth; // maxWidth is a number, return a function that returns that number

    const getMinWidth = minWidth == null ? defaultMinWidth :
        minWidth instanceof Function ? minWidth :
            () => minWidth;

    // The width of the node
    let nodeWidth = startWidth;

    // The offset of the mouse from the left side of the node
    let resizeOffsetX: number;
    // Whether the mouse is down
    let isResizing = false;

    let lastChosenWidth = nodeWidth;

    const setWidth = (width: number) => {
        nodeWidth = Math.max(Math.min(width, getMaxWidth(nodeWidth)), getMinWidth(nodeWidth));
        node.style.width = `${nodeWidth}px`;
    }

    setWidth(nodeWidth);

    function startResizing(event: MouseEvent) {
        // Get the mouse's position on the node
        const rect = node.getBoundingClientRect();
        const offset = rect.x - event.clientX;
        if (offset > 0) {
            resizeOffsetX = offset;
            isResizing = true;
        }
    }
    function stopResizing() {
        isResizing = false;
        lastChosenWidth = nodeWidth;
    }
    function resize(event: MouseEvent) {
        // Check if the mouse is down
        if (isResizing) {
            setWidth(window.innerWidth - event.clientX - resizeOffsetX);
        }
    }
    function onWindowResize() {
        setWidth(lastChosenWidth);
    }

    node.addEventListener("mousedown", startResizing);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("mouseleave", stopResizing);
    window.addEventListener("mousemove", resize);
    window.addEventListener("resize", onWindowResize);

    return {
        destroy() {
            node.removeEventListener("mousedown", startResizing);
            window.removeEventListener("mouseup", stopResizing);
            window.removeEventListener("mouseleave", stopResizing);
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("resize", onWindowResize);
        }
    }
}