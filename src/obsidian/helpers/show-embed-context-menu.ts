import TldrawPlugin from "src/main";
import { createEmbedMenu } from "../menu/create-embed-menu";
import { TldrawAppViewModeController } from "./TldrawAppEmbedViewController";
import { TFile } from "obsidian";

export function showEmbedContextMenu(ev: MouseEvent | undefined, {
    tFile, plugin, controller, focusContainer,
}: {
    tFile: TFile,
    plugin: TldrawPlugin,
    controller: TldrawAppViewModeController,
    focusContainer: HTMLElement,
}) {
    createEmbedMenu({
        tFile, plugin,
        controller,
        selectEmbedLinkText: (ev) => {
            focusContainer.dispatchEvent(new MouseEvent('click', {
                bubbles: ev.bubbles,
                cancelable: ev.cancelable,
                clientX: ev.clientX,
                clientY: ev.clientY
            }))
        }
    }).showAtMouseEvent(ev ??
        // simulate click when it ev is undefined, e.g. MouseEvent not given because it was a touch event.
        new MouseEvent('click'));
}