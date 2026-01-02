import { TFile } from 'obsidian'
import TldrawPlugin from 'src/main'

type Tail<T> = T extends [unknown, ...infer U] ? U : never
type OpenArgs = Tail<Parameters<TldrawPlugin['openTldrFile']>>

export class TldrawDocument {
	#plugin: TldrawPlugin
	#tFile: TFile

	constructor(plugin: TldrawPlugin, tFile: TFile) {
		this.#plugin = plugin
		this.#tFile = tFile
	}

	static async create(
		plugin: TldrawPlugin,
		...args: Parameters<TldrawPlugin['createUntitledTldrFile']>
	): Promise<TldrawDocument> {
		const tFile = await plugin.createUntitledTldrFile(...args)

		return new TldrawDocument(plugin, tFile)
	}

	get path() {
		return this.#tFile.path
	}

	open(...args: OpenArgs) {
		return this.#plugin.openTldrFile(this.#tFile, ...args)
	}
}
