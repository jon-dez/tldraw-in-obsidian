import { $, browser } from '@wdio/globals'
import fs from 'node:fs'
import path from 'node:path'

describe('Embeds', () => {
	before(async () => {
		await browser.reloadObsidian({
			vault: path.join(process.cwd(), 'test', 'vaults', 'embeds-tests'),
		})
	})

	it('captures the embedded tldraw drawing', async () => {
		await browser.executeObsidian(async ({ app, obsidian }) => {
			const file = app.vault.getAbstractFileByPath('Embed.md')
			if (!(file instanceof obsidian.TFile)) {
				throw new Error('Embed.md not found in vault')
			}
			const leaf = app.workspace.getLeaf('tab')
			await leaf.openFile(file, { state: { mode: 'preview' } })
			app.workspace.setActiveLeaf(leaf, { focus: true })
		})

		const embed = await $('.ptl-markdown-embed')
		await embed.waitForExist({ timeout: 10000 })
		const previewImg = await $('.ptl-markdown-embed img[src]')
		await previewImg.waitForExist({ timeout: 10000 })

		const outDir = path.join(process.cwd(), 'test', 'screenshots')
		fs.mkdirSync(outDir, { recursive: true })
		const outPath = path.join(outDir, 'embed-tldraw.png')
		await embed.saveScreenshot(outPath)
	})
})
