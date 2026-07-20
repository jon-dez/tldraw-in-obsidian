import { describe, expect, it } from 'vitest'
import {
	codeBlockTemplate,
	frontmatterTemplate,
	getTLDataTemplate,
	tlFileTemplate,
} from 'src/utils/document'
import { migrateTldrawFileDataIfNecessary } from 'src/utils/migrate/tl-data-to-tlstore'
import { parseTLDataDocument } from 'src/utils/parse'
import { createRawTldrawFile } from 'src/utils/tldraw-file'
import { tldrawFileToJson } from 'src/utils/tldraw-file/tldraw-file-to-json'

const PLUGIN_VERSION = '1.29.0'

function makeMarkdownFileData(uuid: string) {
	return tlFileTemplate(
		frontmatterTemplate('tldraw-file: true', ['tldraw']),
		codeBlockTemplate(getTLDataTemplate(PLUGIN_VERSION, createRawTldrawFile(), uuid))
	)
}

describe('parseTLDataDocument', () => {
	it('parses a freshly templated markdown document, preserving the uuid', () => {
		const parsed = parseTLDataDocument(PLUGIN_VERSION, makeMarkdownFileData('uuid-parse'))
		expect(parsed.meta.uuid).toBe('uuid-parse')
		// Fresh documents are migrated into a live TLStore.
		expect(parsed.store).toBeDefined()
		expect(parsed.store?.allRecords().length).toBeGreaterThan(0)
	})

	it('returns fresh meta (no store) when the file has no tldraw data', () => {
		const parsed = parseTLDataDocument(PLUGIN_VERSION, '# just a note')
		expect(parsed.store).toBeUndefined()
		expect(parsed.raw).toBeUndefined()
		expect(parsed.meta.uuid).toMatch(/[0-9a-f-]{36}/)
		expect(parsed.meta['plugin-version']).toBe(PLUGIN_VERSION)
	})

	it('throws on malformed json between the delimiters', () => {
		const good = makeMarkdownFileData('uuid-x')
		const bad = good.replace(/\{/, '{ not json')
		expect(() => parseTLDataDocument(PLUGIN_VERSION, bad)).toThrow()
	})

	it('generates a uuid when the stored meta lacks one', () => {
		const fileData = makeMarkdownFileData('uuid-y')
		const withoutUuid = fileData.replace(/"uuid":\s*"uuid-y",?\n?/, '')
		const parsed = parseTLDataDocument(PLUGIN_VERSION, withoutUuid)
		expect(parsed.meta.uuid).toMatch(/[0-9a-f-]{36}/)
	})
})

describe('migrateTldrawFileDataIfNecessary', () => {
	it('parses a serialized .tldr file into a TLStore', () => {
		const raw = JSON.stringify(tldrawFileToJson(createRawTldrawFile()))
		const store = migrateTldrawFileDataIfNecessary(raw)
		expect(store.allRecords().length).toBeGreaterThan(0)
	})

	it('accepts a TldrawFile object directly', () => {
		const store = migrateTldrawFileDataIfNecessary(createRawTldrawFile())
		expect(store.allRecords().length).toBeGreaterThan(0)
	})

	it('throws on unparsable data', () => {
		expect(() => migrateTldrawFileDataIfNecessary('{"nope": true}')).toThrow(
			'Unable to parse TldrawFile.'
		)
	})
})
