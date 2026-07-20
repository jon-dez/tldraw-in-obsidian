import { describe, expect, it } from 'vitest'
import { TLDATA_DELIMITER_END, TLDATA_DELIMITER_START } from 'src/utils/constants'
import {
	codeBlockTemplate,
	frontmatterTemplate,
	getTLDataTemplate,
	getTLMetaTemplate,
	tlFileTemplate,
	updateFileData,
} from 'src/utils/document'
import { createRawTldrawFile } from 'src/utils/tldraw-file'
import { extractDataBetweenKeywords } from 'src/utils/utils'

const PLUGIN_VERSION = '1.29.0'

describe('getTLMetaTemplate', () => {
	it('embeds plugin and tldraw versions and a uuid', () => {
		const meta = getTLMetaTemplate(PLUGIN_VERSION, 'my-uuid')
		expect(meta).toEqual({
			uuid: 'my-uuid',
			'plugin-version': PLUGIN_VERSION,
			'tldraw-version': TLDRAW_VERSION,
		})
	})

	it('generates a uuid when not provided', () => {
		expect(getTLMetaTemplate(PLUGIN_VERSION).uuid).toMatch(/[0-9a-f-]{36}/)
	})
})

describe('frontmatterTemplate', () => {
	it('wraps data in frontmatter fences with tags', () => {
		const fm = frontmatterTemplate('tldraw-file: true', ['tldraw', 'draw/ing'])
		expect(fm).toBe('---\ntldraw-file: true\ntags:\n  - tldraw\n  - draw/ing\n---\n')
	})

	it('filters out invalid frontmatter tags', () => {
		const fm = frontmatterTemplate('tldraw-file: true', ['123', 'has space', 'ok_tag'])
		expect(fm).not.toContain('123')
		expect(fm).not.toContain('has space')
		expect(fm).toContain('ok_tag')
	})

	it('omits the tags block entirely when no valid tags remain', () => {
		const fm = frontmatterTemplate('tldraw-file: true', ['???'])
		expect(fm).toBe('---\ntldraw-file: true\n---\n')
	})
})

describe('codeBlockTemplate / updateFileData roundtrip', () => {
	const makeData = () =>
		getTLDataTemplate(PLUGIN_VERSION, createRawTldrawFile(), 'uuid-1')

	it('codeBlockTemplate produces a json code block containing both delimiters', () => {
		const block = codeBlockTemplate(makeData())
		expect(block.startsWith('```json')).toBe(true)
		expect(block.endsWith('```')).toBe(true)
		expect(block).toContain(TLDATA_DELIMITER_START)
		expect(block).toContain(TLDATA_DELIMITER_END)
		const extracted = extractDataBetweenKeywords(block, TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)
		expect(extracted).not.toBeNull()
		expect(JSON.parse(extracted!).meta.uuid).toBe('uuid-1')
	})

	it('updateFileData replaces the payload while preserving frontmatter and uuid', async () => {
		const fileData = tlFileTemplate(
			frontmatterTemplate('tldraw-file: true', ['tldraw']),
			codeBlockTemplate(makeData())
		)
		const store = createRawTldrawFile()
		const updated = await updateFileData(
			{ version: PLUGIN_VERSION } as never,
			fileData,
			{
				meta: getTLMetaTemplate(PLUGIN_VERSION, 'uuid-1'),
				// createRawTldrawFile accepts undefined and creates a fresh store,
				// but updateFileData needs a real TLStore:
				store: (await import('tldraw')).createTLStore(),
			}
		)
		expect(updated).toContain('---\ntldraw-file: true')
		const extracted = extractDataBetweenKeywords(
			updated,
			TLDATA_DELIMITER_START,
			TLDATA_DELIMITER_END
		)
		expect(extracted).not.toBeNull()
		const parsed = JSON.parse(extracted!)
		expect(parsed.meta.uuid).toBe('uuid-1')
		expect(parsed.raw.tldrawFileFormatVersion).toBe(1)
		// Unused variable guard (store created above solely to mirror real call sites)
		expect(store.tldrawFileFormatVersion).toBe(1)
	})

	it('updateFileData appends a code block when the file has no delimiters', async () => {
		const updated = await updateFileData({ version: PLUGIN_VERSION } as never, 'plain file', {
			meta: getTLMetaTemplate(PLUGIN_VERSION, 'uuid-2'),
			store: (await import('tldraw')).createTLStore(),
		})
		expect(updated.startsWith('plain file\n')).toBe(true)
		expect(updated).toContain(TLDATA_DELIMITER_START)
	})
})
