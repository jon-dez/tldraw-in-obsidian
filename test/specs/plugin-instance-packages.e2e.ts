import { browser, expect } from '@wdio/globals'

describe('Plugin instance API', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('exposes react, react-dom, and tldraw on instance.packages', async () => {
		const checks = await browser.executeObsidian(({ app }) => {
			type PluginShape = { instance?: { packages?: Record<string, unknown> } }
			const plugins = app.plugins.plugins as Record<string, PluginShape>
			const plugin = plugins['tldraw']
			if (!plugin) return { ok: false, reason: 'no plugin' }

			const packages = plugin.instance?.packages
			if (!packages) return { ok: false, reason: 'no packages' }

			const react = packages.react as { createElement?: unknown } | undefined
			const reactDom = packages.reactDom as { createRoot?: unknown } | undefined
			const tldraw = packages.tldraw as Record<string, unknown> | undefined

			const reactOk = typeof react?.createElement === 'function'
			const reactDomOk = typeof reactDom?.createRoot === 'function'
			const tldrawOk =
				tldraw != null &&
				typeof tldraw === 'object' &&
				('Tldraw' in tldraw || 'Editor' in tldraw)

			return {
				ok: reactOk && reactDomOk && tldrawOk,
				reactOk,
				reactDomOk,
				tldrawOk,
			}
		})

		expect(checks).toMatchObject({
			ok: true,
			reactOk: true,
			reactDomOk: true,
			tldrawOk: true,
		})
	})
})
