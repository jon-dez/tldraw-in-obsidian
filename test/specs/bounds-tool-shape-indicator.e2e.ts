/**
 * E2E: ctrl-drag a bounds-selector box over a shape inside an interactive tldraw embed and
 * verify the selected-shape indicator renders.
 *
 * tldraw removed the old `useEditorComponents().ShapeIndicator` React-component slot in favor of
 * a canvas-based `overlayUtils` overlay system; `BoundsSelectorIndicatorOverlayUtil`
 * (src/tldraw/tools/bounds-selector-tool.ts) is the replacement. Asserts on the reactive state
 * (`BoundsDraggingState.selectedShapes`), which is what the overlay reads to decide what to draw.
 *
 * Run with TEST_INTERACTIVE=true to additionally pause mid-drag and look at the render by hand.
 *
 * Run: npm run e2e:inspect:bounds-indicator
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, expect } from '@wdio/globals'
import { Key } from 'webdriverio'
import { pauseE2eForTerminal } from '@obsidian-plugin-toolkit/e2e'

import {
	createNewTldrawingAndWaitForCanvas,
	DEFAULT_LINKABLE_GEO_SHAPE,
} from '../lib/obsidian-ui'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vaultPath = join(__dirname, '..', 'vaults', 'default')
const screenshotDir = join(__dirname, '..', 'screenshots', 'e2e')
const notePath = 'bounds-indicator-check.md'

/** `BoundsSelectorTool.id` from src/tldraw/tools/bounds-selector-tool.ts. */
const BOUNDS_SELECTOR_TOOL_ID = 'bounds-selector-tool'
/** `BoundsSelectorTool.draggingStatePath` from the same file. */
const BOUNDS_DRAGGING_STATE_PATH = 'bounds-selector-tool.bounds-dragging'

type EditorRef = {
	run: (fn: () => void) => void
	createShapes: (shapes: unknown[]) => void
	setCurrentTool: (id: string) => void
	zoomToFit: () => void
	getStateDescendant: (path: string) => {
		selectedShapes: { get: () => { id: string }[] }
	} | undefined
}

async function saveScreenshot(path: string) {
	mkdirSync(dirname(path), { recursive: true })
	await browser.saveScreenshot(path)
}

describe('Bounds-selector tool shape indicator', () => {
	before(async function () {
		this.timeout(120000)
		await browser.reloadObsidian({
			vault: vaultPath,
			plugins: ['tldraw'],
		})
	})

	it('populates selectedShapes when ctrl-dragging a bounds box over a shape', async function () {
		this.timeout(0)

		// 1. Create a tldrawing with one shape via the full-page editor.
		await createNewTldrawingAndWaitForCanvas()

		// The ribbon action creates a markdown-embedded tldraw document (`.md` with a tldraw
		// frontmatter key + JSON code block) by default, not a raw `.tldr` file.
		const tldrFilePath = await browser.executeObsidian(
			({ app }, shape: typeof DEFAULT_LINKABLE_GEO_SHAPE) => {
				const editor = (app.plugins.plugins.tldraw as { currTldrawEditor?: EditorRef })
					?.currTldrawEditor
				if (!editor) throw new Error('tldraw editor not mounted')
				editor.run(() => editor.createShapes([shape]))
				return app.workspace.getActiveFile()?.path ?? ''
			},
			DEFAULT_LINKABLE_GEO_SHAPE
		)
		expect(tldrFilePath).toMatch(/\.md$/)

		// 2. Embed that file in a new markdown note and open the note.
		await browser.executeObsidian(
			async ({ app }, tldrFilePath: string, notePath: string) => {
				const existing = app.vault.getFileByPath(notePath)
				if (existing) await app.vault.delete(existing)
				const file = await app.vault.create(notePath, `![[${tldrFilePath}]]\n`)
				await app.workspace.getLeaf('tab').openFile(file)
			},
			tldrFilePath,
			notePath
		)

		const embedContent = await browser.$('.ptl-view-content')
		await embedContent.waitForExist({ timeout: 30000 })

		// 3. Right-click the embed's preview and switch it to interactive editing.
		await embedContent.click({ button: 'right' })
		await browser.pause(300)

		const editInteractiveItem = await browser.$(
			`//*[contains(@class,'menu-item')][.//*[contains(text(),'Edit drawing (interactive)')]]`
		)
		await editInteractiveItem.waitForExist({ timeout: 10000 })
		await editInteractiveItem.click()

		const embedCanvas = await browser.$('.ptl-view-content .tl-canvas')
		await embedCanvas.waitForExist({ timeout: 15000 })
		await browser.pause(500)

		// 4. Select the bounds-selector tool and zoom so the shape is comfortably in view.
		await browser.executeObsidian((_obs, toolId: string) => {
			const editor = (
				_obs.app.plugins.plugins.tldraw as { currTldrawEditor?: EditorRef }
			)?.currTldrawEditor
			if (!editor) throw new Error('embed tldraw editor not mounted')
			editor.zoomToFit()
			editor.setCurrentTool(toolId)
		}, BOUNDS_SELECTOR_TOOL_ID)
		await browser.pause(300)

		// 5. Ctrl+drag a box from near the embed's corners across the shape, holding the
		// pointer button and Control down (skipRelease) so the state persists through the pause.
		const location = await embedCanvas.getLocation()
		const size = await embedCanvas.getSize()
		const startX = Math.round(location.x + size.width * 0.1)
		const startY = Math.round(location.y + size.height * 0.1)
		const endX = Math.round(location.x + size.width * 0.9)
		const endY = Math.round(location.y + size.height * 0.9)

		await browser.action('key').down(Key.Ctrl).perform(true)
		await browser
			.action('pointer')
			.move({ duration: 0, x: startX, y: startY, origin: 'viewport' })
			.down({ button: 0 })
			.move({ duration: 300, x: endX, y: endY, origin: 'viewport' })
			.perform(true)

		await browser.pause(300)

		const selectedShapeIds = await browser.executeObsidian((_obs, draggingStatePath: string) => {
			const editor = (
				_obs.app.plugins.plugins.tldraw as { currTldrawEditor?: EditorRef }
			)?.currTldrawEditor
			const draggingState = editor?.getStateDescendant(draggingStatePath)
			return draggingState?.selectedShapes.get().map((s) => s.id) ?? []
		}, BOUNDS_DRAGGING_STATE_PATH)

		await saveScreenshot(join(screenshotDir, 'bounds-indicator-mid-drag.png'))

		if (process.env.TEST_INTERACTIVE === 'true') {
			await pauseE2eForTerminal(
				'[e2e] Paused mid-drag (Ctrl + left button held). Look at the Obsidian window to ' +
					'check whether the selected-shape indicator renders, then press Enter to release ' +
					'the drag and finish the test.'
			)
		}

		// 6. Release the drag and the modifier key.
		await browser.action('pointer').up({ button: 0 }).perform(true)
		await browser.action('key').up(Key.Ctrl).perform()
		await browser.releaseActions()

		expect(selectedShapeIds.length).toBe(1)
	})
})
