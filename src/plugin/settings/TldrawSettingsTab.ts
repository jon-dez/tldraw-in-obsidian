import { ReactPluginSettingTab } from '@obsidian-plugin-toolkit/react/utils'
import { App } from 'obsidian'
import { createElement } from 'react'
import TldrawSettingsTabView from 'src/plugin/settings/ui/TldrawSettingsTabView'
import TldrawPlugin from 'src/plugin/TldrawPlugin'

export class TldrawSettingsTab extends ReactPluginSettingTab {
	plugin: TldrawPlugin

	constructor(app: App, plugin: TldrawPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	override render(): React.JSX.Element {
		return createElement(TldrawSettingsTabView, {
			settingsManager: this.plugin.settingsManager,
		})
	}
}
