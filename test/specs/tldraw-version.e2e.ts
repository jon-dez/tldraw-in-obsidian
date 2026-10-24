import { browser, expect } from '@wdio/globals'

import { version as expectedTldrawVersion } from '../../node_modules/tldraw/package.json'

interface TldrawLibraryVersion {
	name: string
	version: string
	modules: string
}

describe('tldraw version', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('production build bundles the same tldraw version as node_modules', async () => {
		// Same source of truth as vite.config.mts / TLDRAW_VERSION at build time.
		expect(expectedTldrawVersion).toMatch(/^5\./)

		// The bundled tldraw library registers itself on import via
		// registerTldrawLibraryVersion(), so loading the plugin is enough.
		const versions = await browser.executeObsidian(() => {
			const info = (globalThis as Record<string, unknown>).__TLDRAW_LIBRARY_VERSIONS__ as
				| { versions: TldrawLibraryVersion[] }
				| undefined
			return info?.versions ?? []
		})

		const tldrawEntry = versions.find((v) => v.name === 'tldraw')

		expect(tldrawEntry).toBeDefined()
		expect(tldrawEntry?.version).toBe(expectedTldrawVersion)
	})
})
