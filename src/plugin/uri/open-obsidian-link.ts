import { App, TFile } from 'obsidian'
import { setRuntimeOverrides } from 'tldraw'

let installed = false

/**
 * Parse an Obsidian URI and open the target note in the vault.
 * @see https://obsidian.md/help/uri#Open%20note
 */
/** Edit link may store `https://obsidian://…` when validate lacked the obsidian protocol. */
export function normalizeObsidianUri(uri: string): string {
	return uri.replace(/^https?:\/\/(?=obsidian:\/\/)/i, '')
}

export async function openObsidianUri(app: App, uri: string): Promise<boolean> {
	uri = normalizeObsidianUri(uri)
	if (!uri.startsWith('obsidian://')) return false

	let parsed: URL
	try {
		parsed = new URL(uri)
	} catch {
		return false
	}

	const action = parsed.hostname || parsed.pathname.replace(/^\//, '')
	if (action !== 'open' && action !== 'new' && action !== 'daily' && action !== 'unique') {
		// Shorthand: obsidian://vault/file
		const pathParts = uri.replace(/^obsidian:\/\//, '').split('/')
		if (pathParts.length >= 2) {
			const vaultName = decodeURIComponent(pathParts[0])
			const filePath = decodeURIComponent(pathParts.slice(1).join('/'))
			return openObsidianFile(app, vaultName, filePath)
		}
		return false
	}

	const vaultParam = parsed.searchParams.get('vault')
	const fileParam = parsed.searchParams.get('file')
	const pathParam = parsed.searchParams.get('path')

	if (pathParam) {
		const absolutePath = decodeURIComponent(pathParam)
		const vault = app.vault
		if (absolutePath.startsWith(vault.adapter.basePath)) {
			const relative = absolutePath.slice(vault.adapter.basePath.length).replace(/^\//, '')
			return openObsidianFile(app, null, relative)
		}
	}

	if (!fileParam) return false

	const filePath = decodeURIComponent(fileParam)
	return openObsidianFile(app, vaultParam ? decodeURIComponent(vaultParam) : null, filePath)
}

async function openObsidianFile(
	app: App,
	vaultName: string | null,
	filePath: string
): Promise<boolean> {
	const vault = app.vault
	if (vaultName && vault.getName() !== vaultName) {
		// Named vault differs from active vault; fall back to window.open
		return false
	}

	const { filePath: pathPart, subpath } = splitSubpath(filePath)
	const file = app.metadataCache.getFirstLinkpathDest(pathPart, '')
	if (!(file instanceof TFile)) return false

	const linkpath = subpath ? `${file.path}#${subpath}` : file.path
	await app.workspace.openLinkText(linkpath, '', false, { active: true })
	return true
}

function splitSubpath(filePath: string): { filePath: string; subpath?: string } {
	const hashIndex = filePath.indexOf('#')
	if (hashIndex === -1) return { filePath }
	return {
		filePath: filePath.slice(0, hashIndex),
		subpath: filePath.slice(hashIndex + 1),
	}
}

const defaultOpenWindow = window.open.bind(window)

export function installObsidianLinkHandler(app: App): void {
	if (installed) return
	installed = true

	setRuntimeOverrides({
		openWindow(url: string, target: string, allowReferrer?: boolean) {
			const obsidianUrl = normalizeObsidianUri(url)
			if (obsidianUrl.startsWith('obsidian://')) {
				void openObsidianUri(app, obsidianUrl).then((handled) => {
					if (!handled) defaultOpenWindow(url, target, allowReferrer ? 'noopener' : 'noopener noreferrer')
				})
				return null
			}
			return defaultOpenWindow(url, target, allowReferrer ? 'noopener' : 'noopener noreferrer')
		},
	})
}
