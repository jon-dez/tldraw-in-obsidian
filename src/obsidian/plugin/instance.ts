import { App } from "obsidian";
import { MainDataMessages } from "./TLDataDocumentStoreManager";
import { createSetStore } from "src/lib/stores";

export interface DocumentMessagesButton {
    key: string
    actionEl: HTMLElement;
    messages: MainDataMessages;
    onClicked?: (evt: MouseEvent) => void
}

export default class TldrawInObsidianPluginInstance {
    readonly stores = Object.freeze({
        documentMessages: createSetStore<DocumentMessagesButton>()
    });

    constructor(
        public readonly app: App,
    ) { }

    dispose() {
        // Cleanup if necessary
    }

    registerDocumentMessagesAction({
        key,
        messages,
        actionEl
    }: Omit<DocumentMessagesButton, 'onClicked'>) {
        const dmb = {
            key,
            messages,
            actionEl
        } satisfies DocumentMessagesButton as DocumentMessagesButton
        const store = this.stores.documentMessages
        store.add(dmb)
        return {
            onMessagesClicked: (evt: MouseEvent) => dmb.onClicked?.(evt),
            unregister: () => store.remove(dmb)
        }
    }
}
