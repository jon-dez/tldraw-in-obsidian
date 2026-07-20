import { describe, expect, it } from 'vitest'
import { Vault } from 'obsidian'
import { getNewUniqueFilepath, isValidViewType } from 'src/utils/utils'

function makeVault(existingPaths: string[]) {
	const existing = new Set(existingPaths)
	return {
		getAbstractFileByPath: (path: string) => (existing.has(path) ? { path } : null),
	} as unknown as Vault
}

describe('getNewUniqueFilepath', () => {
	it('returns the joined path when no file exists', () => {
		const vault = makeVault([])
		expect(getNewUniqueFilepath(vault, 'Drawing.md', 'tldraw')).toBe('tldraw/Drawing.md')
	})

	it('appends an incrementing counter until the path is unique', () => {
		const vault = makeVault(['tldraw/Drawing.md', 'tldraw/Drawing (0).md'])
		expect(getNewUniqueFilepath(vault, 'Drawing.md', 'tldraw')).toBe('tldraw/Drawing (1).md')
	})

	it('handles non-md extensions', () => {
		const vault = makeVault(['tldraw/Drawing.tldr'])
		expect(getNewUniqueFilepath(vault, 'Drawing.tldr', 'tldraw')).toBe('tldraw/Drawing (0).tldr')
	})
})

describe('isValidViewType', () => {
	it('accepts the known view types', () => {
		expect(isValidViewType('markdown')).toBe(true)
		expect(isValidViewType('tldraw-view')).toBe(true)
		expect(isValidViewType('tldraw-read-only')).toBe(true)
	})

	it('rejects unknown strings', () => {
		expect(isValidViewType('pdf')).toBe(false)
		expect(isValidViewType('')).toBe(false)
	})
})
