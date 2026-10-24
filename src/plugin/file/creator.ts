import { moment, normalizePath, OpenViewState, TFile, WorkspaceLeaf } from 'obsidian'
import { TLDRAW_FILE_EXTENSION, TLStore } from 'tldraw'
import { checkAndCreateFolder, getNewUniqueFilepath } from 'src/obsidian/helpers/vault-paths'
import { PaneTarget, VIEW_TYPE_TLDRAW, ViewType } from 'src/plugin/constants'
import { FILE_EXTENSION, FRONTMATTER_KEY } from 'src/plugin/document/constants'
import {
	codeBlockTemplate,
	frontmatterTemplate,
	getTLDataTemplate,
	tlFileTemplate,
} from 'src/plugin/document/document'
import { createRawTldrawFile } from 'src/plugin/document/tldraw-file'
import { tldrawFileToJson } from 'src/plugin/document/tldraw-file/tldraw-file-to-json'
import { getTldrawFileDestination } from 'src/plugin/file/file-destination'
import { formatFilePrefix } from 'src/plugin/file/new'
import { DEFAULT_SETTINGS } from 'src/plugin/settings/settings-types'
import TldrawPlugin from 'src/plugin/TldrawPlugin'

/**
 * `moment` is genuinely callable at runtime (Obsidian re-exports the real `moment` package), but
 * TS6+ treats its namespace-imported type (`obsidian.d.ts`'s `typeof Moment`) as not having a call
 * signature. `moment.default` does not exist at runtime, unlike this cast to moment's own module
 * type, which does carry a call signature.
 */
const callMoment = moment as unknown as typeof import('moment')

/**
 * Creates and opens tldraw files (markdown-embedded or raw `.tldr`) using the
 * user's file-destination preferences.
 */
export default class TldrawFileCreator {
	constructor(private readonly plugin: TldrawPlugin) {}

	async createFile(filename: string, foldername: string, data?: string): Promise<TFile> {
		const folderpath = normalizePath(foldername)
		await checkAndCreateFolder(folderpath, this.plugin.app.vault) //create folder if it does not exist
		const fname = getNewUniqueFilepath(this.plugin.app.vault, filename, folderpath)

		return await this.plugin.app.vault.create(fname, data ?? '')
	}

	createTldrFile = async (
		filename: string,
		{
			foldername,
			inMarkdown,
			tlStore,
		}: { foldername: string; inMarkdown: boolean; tlStore?: TLStore }
	) => {
		const extension = inMarkdown ? FILE_EXTENSION : TLDRAW_FILE_EXTENSION
		// adds the extension if the filename does not already include it:
		filename = filename.endsWith(extension) ? filename : filename + extension

		const tldrawFile = createRawTldrawFile(tlStore)
		const fileData = !inMarkdown
			? JSON.stringify(tldrawFileToJson(tldrawFile))
			: (() => {
					// constructs the markdown content thats a template:
					const tlData = getTLDataTemplate(
						this.plugin.manifest.version,
						tldrawFile,
						window.crypto.randomUUID()
					)
					const frontmatter = frontmatterTemplate(
						`${this.plugin.settingsManager.settings.file?.altFrontmatterKey ?? FRONTMATTER_KEY}: true`,
						this.plugin.settingsManager.markdownFileTags
					)
					const codeblock = codeBlockTemplate(tlData)
					return tlFileTemplate(frontmatter, codeblock)
				})()

		return await this.createFile(filename, foldername, fileData)
	}

	createDefaultFilename({ currentFile }: { currentFile?: Pick<TFile, 'basename'> }) {
		const { newFilePrefix, newFileTimeFormat } = this.plugin.settingsManager.settings

		const date = newFileTimeFormat.trim() !== '' ? callMoment().format(newFileTimeFormat) : ''

		// if both the prefix and the date is empty as contentation
		// then we have to use the defaults to name the file
		let filename =
			formatFilePrefix(newFilePrefix, {
				currentFileBasename: currentFile?.basename,
			}) + date
		if (filename.trim() === '')
			filename =
				DEFAULT_SETTINGS.newFilePrefix + callMoment().format(DEFAULT_SETTINGS.newFileTimeFormat)

		return filename
	}

	/**
	 *
	 * @param attachTo The file that is considered as the "parent" of this new file. If this is not undefined then the new untitled tldr file will be considered as an attachment.
	 * @returns
	 */
	createUntitledTldrFile = async ({
		attachTo,
		tlStore,
		inMarkdown = true,
	}: {
		attachTo?: TFile
		tlStore?: TLStore
		/**
		 * @default true
		 */
		inMarkdown?: boolean
	} = {}) => {
		const filename = this.createDefaultFilename({ currentFile: attachTo })
		const res = await getTldrawFileDestination(this.plugin, filename, attachTo)
		return this.createTldrFile(res.filename, {
			tlStore,
			inMarkdown,
			foldername: res.folder,
		})
	}

	openTldrFile = async (
		file: TFile,
		location: PaneTarget,
		viewType: ViewType = VIEW_TYPE_TLDRAW,
		openState?: OpenViewState
	) => {
		let leaf: WorkspaceLeaf

		if (location === 'current-tab') leaf = this.plugin.app.workspace.getLeaf(false)
		else if (location === 'new-tab') leaf = this.plugin.app.workspace.getLeaf(true)
		else if (location === 'new-window') leaf = this.plugin.app.workspace.getLeaf('window')
		else if (location === 'split-tab') leaf = this.plugin.app.workspace.getLeaf('split')
		else leaf = this.plugin.app.workspace.getLeaf(false)

		await leaf.openFile(file, openState)
		await this.plugin.updateViewMode(viewType, leaf, openState?.eState)
		return leaf
	}
}
