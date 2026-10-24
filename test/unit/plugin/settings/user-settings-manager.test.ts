import { describe, expect, it, vi } from 'vitest'
import UserSettingsManager from 'src/plugin/settings/UserSettingsManager'
import { DEFAULT_SETTINGS, TldrawPluginSettings } from 'src/plugin/settings/settings-types'
import type TldrawPlugin from 'src/plugin/TldrawPlugin'

/**
 * UserSettingsManager owns the settings state itself; it only touches
 * `loadData` and `saveSettings` on the plugin, so a minimal fake is enough.
 */
function createFakePlugin(data: unknown) {
	const plugin = {
		loadData: async () => data,
		saveSettings: vi.fn(async () => {}),
	}
	return plugin as typeof plugin & TldrawPlugin
}

describe('UserSettingsManager.loadSettings', () => {
	it('applies defaults when no stored data exists', async () => {
		const plugin = createFakePlugin(null)
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()
		expect(manager.settings.fileDestinations).toEqual(DEFAULT_SETTINGS.fileDestinations)
	})

	it('preserves already-migrated fileDestinations', async () => {
		const fileDestinations = {
			...DEFAULT_SETTINGS.fileDestinations,
			defaultFolder: 'my/folder',
			assetsFolder: 'my/assets',
		}
		const plugin = createFakePlugin({ fileDestinations })
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()
		expect(manager.settings.fileDestinations).toEqual(fileDestinations)
	})

	it('strips the deprecated file destination keys from the loaded settings', async () => {
		const plugin = createFakePlugin({
			folder: 'legacy/drawings',
			assetsFolder: 'legacy/assets',
			useAttachmentsFolder: true,
		})
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()
		expect(manager.settings.folder).toBeUndefined()
		expect(manager.settings.useAttachmentsFolder).toBeUndefined()
	})

	it('migrates the deprecated file destination settings', async () => {
		const plugin = createFakePlugin({
			folder: 'legacy/drawings',
			assetsFolder: 'legacy/assets',
			useAttachmentsFolder: true,
		})
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()
		expect(manager.settings.fileDestinations.defaultFolder).toBe('legacy/drawings')
		expect(manager.settings.fileDestinations.assetsFolder).toBe('legacy/assets')
		expect(manager.settings.fileDestinations.destinationMethod).toBe('attachments-folder')
	})
})

describe('UserSettingsManager update methods', () => {
	it('updateLaserDelayMs resolves only after the settings were saved', async () => {
		const plugin = createFakePlugin({})
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()

		let saved = false
		plugin.saveSettings = vi.fn(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
			saved = true
		})

		await manager.updateLaserDelayMs(1234)
		expect(saved).toBe(true)
	})

	it('updatePasteAtCursor resolves only after the settings were saved', async () => {
		const plugin = createFakePlugin({})
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()

		let saved = false
		plugin.saveSettings = vi.fn(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
			saved = true
		})

		await manager.updatePasteAtCursor(true)
		expect(saved).toBe(true)
	})

	it('updateSettings persists before notifying subscribers', async () => {
		const plugin = createFakePlugin({})
		const manager = new UserSettingsManager(plugin)
		await manager.loadSettings()

		const order: string[] = []
		plugin.saveSettings = vi.fn(async () => {
			order.push('save')
		})
		manager.store.subscribe(() => order.push('notify'))

		await manager.updateSettings(manager.settings)
		expect(order).toEqual(['save', 'notify'])
	})
})
