import { describe, expect, it, vi } from 'vitest'
import { TFile } from 'obsidian'
import { normalizeObsidianUri, openObsidianUri } from 'src/plugin/uri/open-obsidian-link'

function makeApp({
	vaultName = 'MyVault',
	basePath = '/home/user/vault',
	resolveFile = null as TFile | null,
} = {}) {
	const openLinkText = vi.fn(async () => {})
	const getFirstLinkpathDest = vi.fn(() => resolveFile)
	const app = {
		vault: {
			getName: () => vaultName,
			adapter: { basePath },
		},
		metadataCache: { getFirstLinkpathDest },
		workspace: { openLinkText },
	}
	return { app: app as never, openLinkText, getFirstLinkpathDest }
}

function makeTFile(path: string) {
	const file = new TFile()
	file.path = path
	return file
}

describe('normalizeObsidianUri', () => {
	it('strips a leading http(s):// wrapper from obsidian uris', () => {
		expect(normalizeObsidianUri('https://obsidian://open?vault=V&file=F')).toBe(
			'obsidian://open?vault=V&file=F'
		)
		expect(normalizeObsidianUri('http://obsidian://open?file=F')).toBe('obsidian://open?file=F')
	})

	it('leaves ordinary urls and bare obsidian uris untouched', () => {
		expect(normalizeObsidianUri('https://example.com')).toBe('https://example.com')
		expect(normalizeObsidianUri('obsidian://open?file=F')).toBe('obsidian://open?file=F')
	})
})

describe('openObsidianUri', () => {
	it('returns false for non-obsidian uris', async () => {
		const { app } = makeApp()
		expect(await openObsidianUri(app, 'https://example.com')).toBe(false)
	})

	it('opens a file in the active vault via the open action', async () => {
		const file = makeTFile('Notes/Target.md')
		const { app, openLinkText, getFirstLinkpathDest } = makeApp({ resolveFile: file })
		const handled = await openObsidianUri(app, 'obsidian://open?vault=MyVault&file=Notes%2FTarget')
		expect(handled).toBe(true)
		expect(getFirstLinkpathDest).toHaveBeenCalledWith('Notes/Target', '')
		expect(openLinkText).toHaveBeenCalledWith('Notes/Target.md', '', false, { active: true })
	})

	it('returns false when the named vault is not the active vault', async () => {
		const file = makeTFile('Note.md')
		const { app, openLinkText } = makeApp({ resolveFile: file })
		const handled = await openObsidianUri(app, 'obsidian://open?vault=OtherVault&file=Note')
		expect(handled).toBe(false)
		expect(openLinkText).not.toHaveBeenCalled()
	})

	it('returns false when the file cannot be resolved', async () => {
		const { app } = makeApp({ resolveFile: null })
		expect(await openObsidianUri(app, 'obsidian://open?vault=MyVault&file=Missing')).toBe(false)
	})

	it('preserves subpaths (headings/blocks) in the opened link', async () => {
		const file = makeTFile('Note.md')
		const { app, openLinkText } = makeApp({ resolveFile: file })
		const handled = await openObsidianUri(
			app,
			'obsidian://open?vault=MyVault&file=' + encodeURIComponent('Note#Heading')
		)
		expect(handled).toBe(true)
		expect(openLinkText).toHaveBeenCalledWith('Note.md#Heading', '', false, { active: true })
	})

	it('supports the shorthand obsidian://vault/file form', async () => {
		const file = makeTFile('Some/Note.md')
		const { app, openLinkText } = makeApp({ resolveFile: file })
		const handled = await openObsidianUri(app, 'obsidian://MyVault/Some/Note')
		expect(handled).toBe(true)
		expect(openLinkText).toHaveBeenCalled()
	})

	it('resolves absolute path params inside the vault base path', async () => {
		const file = makeTFile('Sub/Note.md')
		const { app, getFirstLinkpathDest } = makeApp({ resolveFile: file })
		const handled = await openObsidianUri(
			app,
			'obsidian://open?path=' + encodeURIComponent('/home/user/vault/Sub/Note.md')
		)
		expect(handled).toBe(true)
		expect(getFirstLinkpathDest).toHaveBeenCalledWith('Sub/Note.md', '')
	})

	it('returns false for garbage that is not a url', async () => {
		const { app } = makeApp()
		expect(await openObsidianUri(app, 'obsidian://')).toBe(false)
	})
})
