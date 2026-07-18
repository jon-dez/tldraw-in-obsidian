import { App, BlockCache } from 'obsidian'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as tldraw from 'tldraw'
import { createSetStore } from 'src/lib/stores'
import { AuditSessionManager } from './audit/AuditSessionManager'
import { MainDataMessages } from 'src/plugin/stores/TLDataDocumentStoreManager'

export interface DocumentMessagesButton {
	key: string
	actionEl: HTMLElement
	messages: MainDataMessages
	onClicked?: (evt: MouseEvent) => void
}

export interface AssetEntry {
	blockCache: BlockCache
}

export default class TldrawInObsidianPluginInstance {
	readonly auditSessionManager: AuditSessionManager<AssetEntry>

	readonly stores = Object.freeze({
		documentMessages: createSetStore<DocumentMessagesButton>(),
	})

	/** Exposed for other plugins that need the same `react`, `react-dom`, and `tldraw` references as this plugin. */
	readonly packages = Object.freeze({
		react: React,
		reactDom: ReactDOM,
		tldraw,
	})

	constructor(public readonly app: App) {
		this.auditSessionManager = new AuditSessionManager(app)
	}

	dispose() {
		// Cleanup if necessary
	}

	registerDocumentMessagesAction({
		key,
		messages,
		actionEl,
	}: Omit<DocumentMessagesButton, 'onClicked'>) {
		const dmb = {
			key,
			messages,
			actionEl,
		} satisfies DocumentMessagesButton as DocumentMessagesButton
		const store = this.stores.documentMessages
		store.add(dmb)
		return {
			onMessagesClicked: (evt: MouseEvent) => dmb.onClicked?.(evt),
			unregister: () => store.remove(dmb),
		}
	}
}
