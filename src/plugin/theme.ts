import { isObsidianThemeDark } from 'src/obsidian/helpers/theme'
import { ThemePreference } from 'src/plugin/settings/settings-types'

export const getIsDarkMode = (themeMode: ThemePreference) => {
	return themeMode === 'match-theme' ? isObsidianThemeDark() : themeMode === 'dark'
}
