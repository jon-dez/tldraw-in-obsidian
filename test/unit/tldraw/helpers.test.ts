import { describe, expect, it } from 'vitest'
import { createTLStore } from 'tldraw'
import { processInitialData } from 'src/tldraw/helpers'
import toPageId from 'src/tldraw/helpers/string-to-page-id'
import { createImageAsset } from 'src/tldraw/helpers/create-asset'
import { getTLMetaTemplate } from 'src/utils/document'
import { migrateTldrawFileDataIfNecessary } from 'src/utils/migrate/tl-data-to-tlstore'
import { createRawTldrawFile } from 'src/utils/tldraw-file'

describe('toPageId', () => {
	it('prefixes valid page names with page:', () => {
		expect(toPageId('abc123')).toBe('page:abc123')
	})

	it('returns undefined for undefined or empty input', () => {
		expect(toPageId(undefined)).toBeUndefined()
		expect(toPageId('')).toBeUndefined()
	})

	it('accepts arbitrary non-empty names (validator only enforces the page: prefix)', () => {
		expect(toPageId('has space')).toBe('page:has space')
	})
})

describe('processInitialData', () => {
	const meta = getTLMetaTemplate('1.29.0', 'uuid-pid')

	it('passes an existing store through untouched', () => {
		const store = createTLStore()
		const result = processInitialData({ meta, store })
		expect(result.store).toBe(store)
		expect(result.meta).toBe(meta)
	})

	it('creates a store from raw serialized data, preserving records', () => {
		const source = migrateTldrawFileDataIfNecessary(createRawTldrawFile())
		const raw = source.serialize()
		const result = processInitialData({ meta, raw })
		expect(result.store).not.toBe(source)
		// serialize() is document-scoped, so only document-scope records carry over.
		expect(result.store.allRecords().length).toBe(Object.keys(raw).length)
		expect(result.store.allRecords().length).toBeGreaterThan(0)
	})

	it('creates a fresh (empty) store when neither store nor raw is provided', () => {
		const result = processInitialData({ meta })
		// A brand-new TLStore has no records until an editor ensures defaults.
		expect(result.store.allRecords()).toHaveLength(0)
	})
})

describe('createImageAsset', () => {
	it('creates a tldraw image asset record with the given props', () => {
		const asset = createImageAsset({
			props: {
				isAnimated: false,
				fileSize: 10,
				mimeType: 'image/png',
				name: 'x.png',
				src: 'asset:obsidian.blockref.abc',
				w: 100,
				h: 50,
			},
		})
		expect(asset.type).toBe('image')
		expect(asset.id.startsWith('asset:')).toBe(true)
		expect(asset.props.w).toBe(100)
	})
})
