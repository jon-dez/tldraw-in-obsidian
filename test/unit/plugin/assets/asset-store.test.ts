import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TFile } from 'obsidian'
import {
	ObsidianMarkdownFileTLAssetStoreProxy,
	ObsidianTLAssetStore,
} from 'src/plugin/assets/asset-store'
import { TldrawStoreIndexedDB } from 'src/tldraw/indexeddb-store'
import type TldrawPlugin from 'src/plugin/TldrawPlugin'

type BlockSpan = { id: string; start: number; end: number }

/**
 * The proxy only touches `app.metadataCache.getFileCache`, `app.vault.process`
 * and `tldrawFileMetadataListeners.addListener` on the plugin, so a minimal
 * fake around a string document is enough.
 */
function createProxy(fileData: string, blocks: BlockSpan[]) {
	const metadata = {
		blocks: Object.fromEntries(
			blocks.map(({ id, start, end }) => [
				id,
				{ id, position: { start: { offset: start }, end: { offset: end } } },
			])
		),
	}
	let currentData = fileData
	const plugin = {
		app: {
			metadataCache: { getFileCache: () => metadata },
			vault: {
				process: async (_file: TFile, cb: (data: string) => string) => {
					currentData = cb(currentData)
					return currentData
				},
			},
		},
		tldrawFileMetadataListeners: { addListener: () => ({ remove: () => {} }) },
	} as unknown as TldrawPlugin

	const proxy = new ObsidianMarkdownFileTLAssetStoreProxy(plugin, { path: 'drawing.md' } as TFile)
	return { proxy, getData: () => currentData }
}

describe('ObsidianMarkdownFileTLAssetStoreProxy.removeBlockRef', () => {
	const linkBlock = '[[img.png]]\n^abc123'
	const fileData = `intro\n${linkBlock}\noutro`
	const start = 'intro\n'.length
	const end = start + linkBlock.length

	it('removes the linked block from the markdown file', async () => {
		const { proxy, getData } = createProxy(fileData, [{ id: 'abc123', start, end }])
		await proxy.removeBlockRef('obsidian.blockref.abc123')
		expect(getData()).toBe('intro\n\noutro')
	})

	it('ignores block refs that do not exist in the metadata', async () => {
		const { proxy, getData } = createProxy(fileData, [{ id: 'abc123', start, end }])
		await proxy.removeBlockRef('obsidian.blockref.doesnotexist')
		expect(getData()).toBe(fileData)
	})

	/**
	 * refactor-bugs #3: the verification guard reads
	 * `!deleted.endsWith(...) && deleted.length === range.end - range.start`.
	 * Since deleteRangesFromText always deletes exactly the given range, the
	 * length clause is redundant — this test pins down whether the endsWith
	 * verification actually fires on metadata that points at the wrong text.
	 */
	it('rejects when the block metadata does not point at the block ref', async () => {
		// the block span covers only the link, not the trailing ^abc123
		const { proxy } = createProxy(fileData, [
			{ id: 'abc123', start, end: start + '[[img.png]]'.length },
		])
		await expect(proxy.removeBlockRef('obsidian.blockref.abc123')).rejects.toThrow(
			'Unable to remove asset block ref'
		)
	})
})

describe('ObsidianTLAssetStore.tryOpenDb', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	const createStore = () =>
		new ObsidianTLAssetStore('test-key', {} as ObsidianMarkdownFileTLAssetStoreProxy)

	it('opens the IndexedDB once and caches the instance', async () => {
		const db = {} as NonNullable<Awaited<ReturnType<typeof TldrawStoreIndexedDB.open>>>
		const openSpy = vi.spyOn(TldrawStoreIndexedDB, 'open').mockResolvedValue(db)
		const store = createStore()

		await expect(store.tryOpenDb()).resolves.toBe(db)
		await expect(store.tryOpenDb()).resolves.toBe(db)
		expect(openSpy).toHaveBeenCalledTimes(1)
	})

	it('does not retry opening after a failed open', async () => {
		const openSpy = vi.spyOn(TldrawStoreIndexedDB, 'open').mockResolvedValue(null)
		const store = createStore()

		await expect(store.tryOpenDb()).resolves.toBeNull()
		await expect(store.tryOpenDb()).resolves.toBeNull()
		expect(openSpy).toHaveBeenCalledTimes(1)
	})
})
