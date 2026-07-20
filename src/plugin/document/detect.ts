import { App, TFile } from 'obsidian'
import { FRONTMATTER_KEY } from './constants'
import { TldrawPluginSettings } from 'src/plugin/settings/settings-types'

/**
 * Check whether {@linkcode file} has the tldraw frontmatter key (or the
 * user-configured alternative key) marking it as a tldraw document.
 */
export function hasTldrawFrontMatterKey(
	app: App,
	settings: TldrawPluginSettings,
	file: TFile
): boolean {
	const fcache = file ? app.metadataCache.getFileCache(file) : null
	const frontmatter = fcache?.frontmatter
	if (!frontmatter) return false

	const altFrontmatterKey = settings.file?.altFrontmatterKey

	return (
		Object.hasOwn(frontmatter, FRONTMATTER_KEY) ||
		(!!altFrontmatterKey && Object.hasOwn(frontmatter, altFrontmatterKey))
	)
}

/**
 * Check if {@linkcode file} is a markdown file for tldraw documents.
 */
export function isTldrawFile(app: App, settings: TldrawPluginSettings, file: TFile): boolean {
	if (!file) return false
	return hasTldrawFrontMatterKey(app, settings, file)
}
