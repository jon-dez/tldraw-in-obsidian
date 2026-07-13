import { browser } from '@wdio/globals'
import { tldrawSel } from './tldraw';


/** Ribbon → confirm destination modal → wait for tldraw canvas. */
export async function createNewTldrawingAndWaitForCanvas() {
	const ribbon = await browser.$(tldrawSel.createTldrawingRibbon)
	await ribbon.waitForExist({ timeout: 30000 })
	await ribbon.click()

	const confirm = await browser.$(tldrawSel.confirmNewTldrawing)
	await confirm.waitForExist({ timeout: 15000 })
	await confirm.click()

	const canvas = await browser.$(tldrawSel.tlCanvas)
	await canvas.waitForExist({ timeout: 30000 })
	return canvas
}
