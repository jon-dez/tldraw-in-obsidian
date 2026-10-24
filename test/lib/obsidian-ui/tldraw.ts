/** tldraw-in-obsidian plugin UI selectors (ribbon, canvas, Edit link). */
export const tldrawSel = {
	createTldrawingRibbon: `[aria-label='Create new tldrawing']`,
	confirmNewTldrawing: `//*[contains(@class,'ptl-suggestion-item')][.//*[contains(text(),'Confirm')]]`,
	tlCanvas: '.tl-canvas',
	editLinkInput: 'input.tlui-edit-link-dialog__input',
	editLinkDialogContinue: `//div[contains(@class,'tlui-dialog__footer')]//button[contains(@class,'tlui-button')][contains(@class,'primary') or .//span[contains(., 'Continue')]]`,
	actionsMenuButton: '[data-testid="actions-menu.button"]',
	actionsMenuEditLink: '[data-testid="actions-menu.edit-link"]',
	contextMenuEditButton: '[data-testid="context-menu-sub.edit-button"]',
	contextMenuEditLink: '[data-testid="context-menu.edit-link"]',
} as const
