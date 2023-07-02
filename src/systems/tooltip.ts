import { tick } from "svelte";

export interface TooltipOptions {
    target: EventTarget,
    width?: number;
    height?: number;
    maxWidth?: number;
    maxHeight?: number;
}

export function getTooltip() {
    return document.getElementById('tooltip') as HTMLDialogElement;
}

let divs = [];

async function placeTooltip(target: HTMLElement, options: { width?: number, height?: number }) {
    const tooltip = getTooltip!();
    tooltip.style.top = '0px';
    tooltip.style.left = '0px';
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = options?.width ?? tooltipRect.width;
    const tooltipHeight = options?.width ?? tooltipRect.height;
    await tick();

    const targetRect = target.getBoundingClientRect();
    const targetX = targetRect.x;
    const targetY = targetRect.y;
    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;

    // Check if the tooltip is out of bounds
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Check the four rectangles that are around the target
    const rects = [
        {
            x: 0, y: 0,
            width: windowWidth,
            height: targetY,
            dir: "top",
        },
        {
            x: 0, y: targetY + targetHeight,
            width: windowWidth,
            height: windowHeight - targetY - targetHeight,
            dir: "bottom",
        },
        {
            x: 0, y: 0,
            width: targetX,
            height: windowHeight,
            dir: "left",
        },
        {
            x: targetX + targetWidth, y: 0,
            width: windowWidth - targetX - targetWidth,
            height: windowHeight,
            dir: "right",
        }
    ];

    // DEBUG Create each reactangle as a differenly colored div
    // const colors = ['red', 'lime', 'blue', 'yellow'];
    // for (let i = 0; i < rects.length; i++) {
    //     const rect = rects[i];
    //     const color = colors[i];

    //     const div = document.createElement('div');
    //     div.style.position = 'absolute';
    //     div.style.left = `${rect.x}px`;
    //     div.style.top = `${rect.y}px`;
    //     div.style.width = `${rect.width}px`;
    //     div.style.height = `${rect.height}px`;
    //     div.style.backgroundColor = color;
    //     div.style.opacity = '0.5';
    //     div.style.setProperty('border-' + rect.dir, '1px solid white');
    //     document.body.appendChild(div);
    //     divs.push(div);
    // }

    // Get the best rectangle with the biggest area
    let newRects = [...rects].sort((r1, r2) => {
        return Math.min(r2.width, tooltipWidth) *
            Math.min(r2.height, tooltipHeight) -
            Math.min(r1.width, tooltipWidth) *
            Math.min(r1.height, tooltipHeight);
    });

    // Place the tooltip in the first rectangle
    const rect = newRects[0];
    console.log(rect.dir);

    let startX = rect.x;
    let startY = rect.y;

    // Place the tooltip to the edge of the target
    if (rect.dir === 'top') {
        startX = targetX + targetWidth / 2 - tooltipWidth / 2;
        startY = targetY - tooltipHeight;
        startY -= Math.min(20, startY + 20);
    } else if (rect.dir === 'bottom') {
        startX = targetX + targetWidth / 2 - tooltipWidth / 2;
        startY = targetY + targetHeight;
        startY += Math.min(20, windowHeight - startY - 20);
    } else if (rect.dir === 'left') {
        startX = targetX - tooltipWidth;
        startY = targetY + targetHeight / 2 - tooltipHeight / 2;
        startX -= Math.min(20, startX + 20);
    } else if (rect.dir === 'right') {
        startX = targetX + targetWidth;
        startY = targetY + targetHeight / 2 - tooltipHeight / 2;
        startX += Math.min(20, windowWidth - startX - 20);
    }

    // Check if it's out of bounds
    if (startX < 0) {
        startX = 0;
    }
    if (startX + tooltipWidth > windowWidth) {
        startX = windowWidth - tooltipWidth;
    }
    // Check if it's out of bounds
    if (startY < 0) {
        startY = 0;
    }
    if (startY + tooltipHeight > windowHeight) {
        startY = windowHeight - tooltipHeight;
    }

    // Place the tooltip
    tooltip.style.left = `${startX}px`;
    tooltip.style.top = `${startY}px`;
}

export function showTooltip(options: TooltipOptions = {
    target: document.body
}) {
    const tooltip = getTooltip!();
    let target = options.target as HTMLElement;

    {
        if (options.width)
            tooltip.style.width = `${options.width}px`;
        else
            tooltip.style.removeProperty('width');

        if (options.height)
            tooltip.style.height = `${options.height}px`;
        else
            tooltip.style.removeProperty('height');

        if (options.maxWidth)
            tooltip.style.maxWidth = `${options.maxWidth}px`;
        else
            tooltip.style.removeProperty('max-width');

        if (options.maxHeight)
            tooltip.style.maxHeight = `${options.maxHeight}px`;
        else
            tooltip.style.removeProperty('max-height');
    }

    tooltip.showModal();
    // Place the tooltip
    placeTooltip(target, options);
}

export function closeTooltip() {
    const tooltip = getTooltip!();
    for (const div of divs) {
        div.remove();
    }
    tooltip.close();
}