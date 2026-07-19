import { describe, expect, it, vi, type Mock } from 'vitest'
import type { TLStore, TLUnknownShape } from 'tldraw'
import { ObsidianTLAssetStore } from 'src/plugin/assets/asset-store'
import { listenAssetChanges } from 'src/plugin/stores/TLDataDocumentStoreManager'

type FakeShape = { id: string; type: string; props: { assetId: string | null } }
type FakeAsset = { id: string; type: string; props: { src: string | null } }

/**
 * listenAssetChanges only touches `props.assets`, `sideEffects`, `get` and
 * `query.records('shape')` on the store, and `proxy.removeBlockRef` on the
 * asset store (which it recognizes via instanceof), so both are faked. The
 * shape-delete side effect is captured so tests can simulate deletions.
 */
function setup({ liveShapes }: { liveShapes: FakeShape[] }) {
	const removeBlockRef = vi.fn(async (_id: string) => {})
	const assets = Object.create(ObsidianTLAssetStore.prototype) as ObsidianTLAssetStore & {
		proxy: { removeBlockRef: Mock }
	}
	Object.defineProperty(assets, 'proxy', { value: { removeBlockRef } })

	const assetRecords = new Map<string, FakeAsset>()
	let afterDelete: (shape: FakeShape) => void = () => {
		throw new Error('after-delete handler was not registered')
	}

	const store = {
		props: { assets },
		sideEffects: {
			registerAfterDeleteHandler: (_type: string, handler: (shape: FakeShape) => void) => {
				afterDelete = handler
				return () => {}
			},
		},
		get: (id: string) => assetRecords.get(id),
		query: {
			records: (_type: 'shape') => ({ get: () => liveShapes as unknown as TLUnknownShape[] }),
		},
	} as unknown as TLStore

	const addImageAsset = (assetId: string, blockRefId: string) => {
		assetRecords.set(assetId, {
			id: assetId,
			type: 'image',
			props: { src: `asset:${blockRefId}` },
		})
	}

	const listener = listenAssetChanges(store)
	if (!listener) throw new Error('expected listenAssetChanges to register')

	return {
		removeBlockRef,
		addImageAsset,
		deleteShape: (shape: FakeShape) => afterDelete(shape),
	}
}

/** The deleteStore Notifier defers listeners with a setTimeout, so flush a macrotask. */
const flushNotifier = () => new Promise((resolve) => setTimeout(resolve))

const imageShape = (id: string, assetId: string): FakeShape => ({
	id,
	type: 'image',
	props: { assetId },
})

describe('listenAssetChanges', () => {
	it('prunes the block ref of a deleted image with no remaining references', async () => {
		const { removeBlockRef, addImageAsset, deleteShape } = setup({ liveShapes: [] })
		addImageAsset('asset:one', 'obsidian.blockref.one')

		deleteShape(imageShape('shape:1', 'asset:one'))
		await flushNotifier()

		expect(removeBlockRef).toHaveBeenCalledWith('obsidian.blockref.one')
	})

	it('keeps the block ref while other shapes still use the asset', async () => {
		const keeper = imageShape('shape:keeper', 'asset:one')
		const { removeBlockRef, addImageAsset, deleteShape } = setup({ liveShapes: [keeper] })
		addImageAsset('asset:one', 'obsidian.blockref.one')

		deleteShape(imageShape('shape:1', 'asset:one'))
		await flushNotifier()

		expect(removeBlockRef).not.toHaveBeenCalled()
	})

	/**
	 * BUG (refactor-bugs #2): the prune loop uses `return` instead of
	 * `continue` when it finds a queued asset that is still referenced, so one
	 * still-referenced asset stops every asset queued after it from ever being
	 * pruned.
	 */
	it.fails('still prunes unreferenced assets queued behind a referenced one', async () => {
		const keeper = imageShape('shape:keeper', 'asset:one')
		const { removeBlockRef, addImageAsset, deleteShape } = setup({ liveShapes: [keeper] })
		addImageAsset('asset:one', 'obsidian.blockref.one')
		addImageAsset('asset:two', 'obsidian.blockref.two')

		// asset one stays referenced by the keeper shape and enters the queue first
		deleteShape(imageShape('shape:1', 'asset:one'))
		// asset two is fully unreferenced and must be pruned despite asset one
		deleteShape(imageShape('shape:2', 'asset:two'))
		await flushNotifier()

		expect(removeBlockRef).toHaveBeenCalledWith('obsidian.blockref.two')
	})
})
