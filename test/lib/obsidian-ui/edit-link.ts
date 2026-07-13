import { browser } from '@wdio/globals'

import { ensureLinkableShapeSelected } from './tldraw-editor'
import { tldrawSel as sel } from './tldraw'
import type { TldrawCanvasElement } from './types'

async function tryOpenEditLinkViaActionsMenu(): Promise<boolean> {
	const menuButton = await browser.$(sel.actionsMenuButton)
	if (!(await menuButton.isExisting())) return false
	await menuButton.click()
	await browser.pause(400)

	const editLink = await browser.$(sel.actionsMenuEditLink)
	if (!(await editLink.isExisting())) return false
	if (await editLink.getProperty('disabled')) return false
	await editLink.click()
	return true
}

/** Right-click canvas center → Edit submenu → Edit link (select tool required). */
async function tryOpenEditLinkViaContextMenu(canvas: TldrawCanvasElement): Promise<boolean> {
	const { width, height } = await canvas.getSize()
	await canvas.click({
		button: 'right',
		x: Math.max(10, Math.floor(width / 2)),
		y: Math.max(10, Math.floor(height / 2)),
	})
	await browser.pause(400)

	const editSubmenu = await browser.$(sel.contextMenuEditButton)
	if (!(await editSubmenu.isExisting())) return false
	await editSubmenu.moveTo()
	await browser.pause(300)

	const ctxEditLink = await browser.$(sel.contextMenuEditLink)
	if (!(await ctxEditLink.isExisting())) return false
	await ctxEditLink.click()
	return true
}

/**
 * Open Edit link dialog. Primary: **Actions** toolbar (`actions-menu.edit-link`).
 * Fallback: canvas context menu → Edit → Edit link…
 */
export async function openEditLinkDialogForSelectedShape(canvas: TldrawCanvasElement): Promise<void> {
	await ensureLinkableShapeSelected()

	const opened =
		(await tryOpenEditLinkViaActionsMenu()) || (await tryOpenEditLinkViaContextMenu(canvas))

	if (!opened) {
		throw new Error('Could not open Edit link (actions-menu.edit-link disabled and context menu missing)')
	}

	await browser.$(sel.editLinkInput).waitForExist({ timeout: 15000 })
}

/** Open Actions → Edit link, paste URL, confirm dialog. */
export async function applyObsidianUrlToSelectedShape(
	url: string,
	canvas: TldrawCanvasElement
): Promise<void> {
	await openEditLinkDialogForSelectedShape(canvas)
	await pasteUrlInEditLinkDialog(url)
}

export async function pasteUrlInEditLinkDialog(url: string): Promise<void> {
	const linkInput = await browser.$(sel.editLinkInput)
	await linkInput.waitForExist({ timeout: 15000 })
	await linkInput.click()
	await browser.keys(['Control', 'a'])
	await browser.executeObsidian(async (_obs, value: string) => {
		await navigator.clipboard.writeText(value)
	}, url)
	await browser.keys(['Control', 'v'])

	const primary = await browser.$(sel.editLinkDialogContinue)
	await primary.waitForExist({ timeout: 10000 })
	await primary.click()
}
