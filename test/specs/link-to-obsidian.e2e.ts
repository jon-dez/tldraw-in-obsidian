/**
 * E2E: attach an Obsidian URI to a tldraw shape and open the linked note.
 *
 * Run: npm run e2e:link
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Obsidian } from '@obsidian-plugin-toolkit/e2e'
import { browser, expect } from '@wdio/globals'

import {
	applyObsidianUrlToSelectedShape,
	createNewTldrawingAndWaitForCanvas,
	ensureLinkableShapeSelected,
} from '../lib/obsidian-ui'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vaultPath = join(__dirname, '..', 'vaults', 'link-to-obsidian')
const screenshotDir = join(__dirname, '..', 'screenshots', 'e2e')
const welcomePath = 'Welcome.md'

const screenshots = {
	afterCopyUrl: join(screenshotDir, 'link-to-obsidian-after-copy-url.png'),
	afterCreateShape: join(screenshotDir, 'link-to-obsidian-after-create-shape.png'),
	afterEditLink: join(screenshotDir, 'link-to-obsidian-after-open-link-dialog.png'),
	afterOpenLink: join(screenshotDir, 'link-to-obsidian-after-open-link.png'),
}

async function saveScreenshot(path: string) {
	mkdirSync(dirname(path), { recursive: true })
	await browser.saveScreenshot(path)
}

describe('Obsidian URI hyperlinks on tldraw shapes', () => {
	before(async function () {
		this.timeout(120000)
		await browser.reloadObsidian({
			vault: vaultPath,
			plugins: ['tldraw'],
		})
	})

	it('copies Obsidian URL, links a shape, and opens Welcome.md', async function () {
		this.timeout(120000)

		await browser.executeObsidian(async ({ app }) => {
			const file = app.vault.getFileByPath('Welcome.md')
			if (!file) throw new Error('Welcome.md not found')
			await app.workspace.getLeaf(false).openFile(file)
		})

		await browser.waitUntil(
			async () =>
				browser.executeObsidian(({ app }) => {
					const view = app.workspace.activeLeaf?.view as { file?: { path: string } } | undefined
					return view?.file?.path === 'Welcome.md'
				}),
			{ timeout: 30000, timeoutMsg: 'Expected Welcome.md to be the active file' }
		)

		for await (const { action } of Obsidian.Vault.Macros.copyObsidianUrlForVaultFile(welcomePath)) {
			if (action === 'right-click') await browser.pause(300)
			else if (action === 'hover-copy-path') await browser.pause(400)
		}
		const obsidianUrl = await Obsidian.Vault.Actions.readClipboardObsidianUrl(welcomePath)
		expect(obsidianUrl).toMatch(/^obsidian:\/\//)
		await saveScreenshot(screenshots.afterCopyUrl)

		const canvas = await createNewTldrawingAndWaitForCanvas()
		await expect(canvas).toBeDisplayed()

		await ensureLinkableShapeSelected()

		await saveScreenshot(screenshots.afterCreateShape)

		await applyObsidianUrlToSelectedShape(obsidianUrl, canvas)

		const urlOnShape = await browser.executeObsidian(({ app }) => {
			const plugin = app.plugins.plugins.tldraw as {
				currTldrawEditor?: {
					getSelectedShapes: () => { props: { url?: string } }[]
				}
			}
			const shapes = plugin?.currTldrawEditor?.getSelectedShapes() ?? []
			return shapes[0]?.props?.url ?? ''
		})
		expect(urlOnShape).toMatch(/^obsidian:\/\//)

		await saveScreenshot(screenshots.afterEditLink)

		const hyperlinkButton = await browser.$('.tl-hyperlink-button')
		await hyperlinkButton.waitForExist({ timeout: 15000 })
		await hyperlinkButton.click()

		await browser.waitUntil(
			async () => {
				const active = await browser.executeObsidian(({ app }) => {
					const leaf = app.workspace.activeLeaf
					const file = leaf?.view && 'file' in leaf.view ? (leaf.view as { file?: { path: string } }).file : null
					return file?.path ?? ''
				})
				return active === welcomePath
			},
			{ timeout: 15000, timeoutMsg: `Expected active file to be ${welcomePath}` }
		)

		await saveScreenshot(screenshots.afterOpenLink)
	})
})
