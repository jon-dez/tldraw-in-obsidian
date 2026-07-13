/** Minimal tldraw editor surface used in e2e (plugin `currTldrawEditor`). */
export type TldrawEditorRef = {
	run: (fn: () => void) => void
	createShapes: (shapes: unknown[]) => void
	select: (id: string) => void
	getSelectedShapeIds: () => string[]
	getCurrentPageShapes: () => { id: string; type: string }[]
	setCurrentTool: (id: string) => void
}

/** WebdriverIO canvas element for center right-click flows. */
export type TldrawCanvasElement = {
	getSize: () => Promise<{ width: number; height: number }>
	click: (opts: { button?: 'right'; x: number; y: number }) => Promise<unknown>
}

export const DEFAULT_LINKABLE_GEO_SHAPE = {
	type: 'geo' as const,
	x: 200,
	y: 200,
	props: { geo: 'rectangle', w: 200, h: 120, url: '' },
}
