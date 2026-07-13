/* eslint-disable */
/* E2E helper plugin (CommonJS). Consumes react / react-dom / tldraw from the real tldraw plugin instance. */
const { Plugin, ItemView } = require('obsidian')

const VIEW_TYPE = 'test-package-modules-tldraw-tab'

class TestTldrawTabView extends ItemView {
	/** @type {import('react-dom/client').Root | null} */
	root = null

	constructor(leaf) {
		super(leaf)
	}

	getViewType() {
		return VIEW_TYPE
	}

	getDisplayText() {
		return 'Test Tldraw (e2e)'
	}

	getIcon() {
		return 'pencil'
	}

	async onOpen() {
		const { contentEl } = this
		contentEl.empty()
		contentEl.id = 'test-package-modules-tldraw-root'

		const tldrawPlugin = this.app.plugins.plugins['tldraw']
		if (!tldrawPlugin?.instance?.packages) {
			contentEl.setText('tldraw plugin instance.packages is not available')
			return
		}

		const { react: React, reactDom, tldraw: TldrawMod } = tldrawPlugin.instance.packages
		const Tldraw = TldrawMod.Tldraw
		if (!Tldraw) {
			contentEl.setText('tldraw package has no Tldraw export')
			return
		}

		const { createRoot } = reactDom
		const mount = contentEl.createDiv('test-package-modules-tldraw-mount')
		this.root = createRoot(mount)
		/* Match main plugin: .tldraw-view-root gets height:100% from tldraw-in-obsidian styles.css */
		this.root.render(
			React.createElement(
				'div',
				{
					className: 'tldraw-view-root tl-obsidian-theme',
					onTouchStart: (e) => e.stopPropagation(),
				},
				React.createElement(Tldraw)
			)
		)
	}

	async onClose() {
		if (this.root) {
			this.root.unmount()
			this.root = null
		}
	}
}

module.exports = class TestPackageModulesPlugin extends Plugin {
	setup() {
		this.registerView(VIEW_TYPE, (leaf) => new TestTldrawTabView(leaf))

		this.addCommand({
			id: 'open-tldraw-test-tab',
			name: 'Open Tldraw test tab (e2e)',
			callback: () => {
				void this.activateView()
			},
		})

		this.addRibbonIcon('pencil', 'Open Tldraw test tab (e2e)', () => {
			void this.activateView()
		})
	}

	async onload() {
		let attempts = 0
		const maxAttempts = 250
		const timer = window.setInterval(() => {
			const t = this.app.plugins.plugins['tldraw']
			if (t?.instance?.packages) {
				window.clearInterval(timer)
				this.setup()
			} else if (++attempts >= maxAttempts) {
				window.clearInterval(timer)
				console.error('test-package-modules: timed out waiting for tldraw instance.packages')
			}
		}, 20)

		this.register(() => window.clearInterval(timer))
	}

	async activateView() {
		const { workspace } = this.app
		const existing = workspace.getLeavesOfType(VIEW_TYPE)[0]
		if (existing) {
			workspace.revealLeaf(existing)
			return
		}
		const leaf = workspace.getLeaf(true)
		await leaf.setViewState({ type: VIEW_TYPE, active: true })
		workspace.revealLeaf(leaf)
	}
}
