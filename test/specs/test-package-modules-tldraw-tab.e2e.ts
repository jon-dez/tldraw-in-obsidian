import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, expect } from '@wdio/globals'

import { pauseE2eForTerminal } from '@obsidian-plugin-toolkit/e2e'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tldrawTabScreenshotPath = join(
	__dirname,
	'..',
	'screenshots',
	'e2e',
	'test-package-modules-tldraw-tab.png'
)
const communityPluginsScreenshotPath = join(
	__dirname,
	'..',
	'screenshots',
	'e2e',
	'test-package-modules-community-plugins-tab.png'
)

const testVaultPath = join(__dirname, '..', 'vaults', 'test-package-modules')


describe('Test package modules tab (shared packages + Tldraw)', () => {
	before(async () => {
		await browser.reloadObsidian({
			vault: testVaultPath,
			plugins: ['tldraw', 'test-package-modules'],
		})
	})

	it('opens a custom tab that renders <Tldraw /> and saves a screenshot', async () => {
		await browser.executeObsidianCommand('test-package-modules:open-tldraw-test-tab')

		const root = await browser.$('#test-package-modules-tldraw-root')
		await root.waitForExist({ timeout: 30000 })

		const canvas = await browser.$('.tl-canvas')
		await canvas.waitForExist({ timeout: 30000 })

		await expect(canvas).toBeDisplayed()

		if(process.env.TEST_INTERACTIVE === 'true') {
			await pauseE2eForTerminal('[e2e] Inspect Obsidian / Tldraw, then press Enter to capture the screenshot.')
		}

		mkdirSync(dirname(tldrawTabScreenshotPath), { recursive: true })
		await browser.saveScreenshot(tldrawTabScreenshotPath)
	})

	it('shows helper plugin in Community plugins tab and saves screenshot', async () => {
		await browser.executeObsidianCommand('app:open-settings')

		const settingsModal = await browser.$('.modal.mod-settings')
		await settingsModal.waitForExist({ timeout: 30000 })

		const communityPluginsTab = await browser.$(
			"//div[contains(@class,'vertical-tab-nav-item')][contains(., 'Community plugins')]"
		)
		await communityPluginsTab.waitForExist({ timeout: 30000 })
		await communityPluginsTab.click()

		const helperPluginCard = await browser.$("//*[contains(., 'Test package modules')]")
		await helperPluginCard.waitForExist({ timeout: 30000 })
		await expect(helperPluginCard).toBeDisplayed()

		await browser.saveScreenshot(communityPluginsScreenshotPath)
	})
})
