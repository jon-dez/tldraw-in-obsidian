import TldrawPlugin from 'src/plugin/TldrawPlugin'
import { createEmbedMenu, TldrAppControllerForMenu } from './create-embed-menu'

export function showEmbedContextMenu(
	ev: MouseEvent | TouchEvent,
	{
		title,
		controller,
		focusContainer,
		openFile,
	}: {
		title: string
		plugin: TldrawPlugin
		controller: TldrAppControllerForMenu
		focusContainer: HTMLElement
		openFile: Parameters<typeof createEmbedMenu>[0]['openFile']
	}
) {
	createEmbedMenu({
		title,
		controller,
		selectEmbedLinkText: (ev) => {
			// KeyboardEvent (menu item chosen via keyboard) has no pointer position; fall back to
			// the container's center instead of silently defaulting to (0, 0).
			const { clientX, clientY } = ev.instanceOf(MouseEvent)
				? ev
				: (() => {
						const rect = focusContainer.getBoundingClientRect()
						return { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
					})()
			focusContainer.dispatchEvent(
				new MouseEvent('click', {
					bubbles: ev.bubbles,
					cancelable: ev.cancelable,
					clientX,
					clientY,
				})
			)
		},
		openFile,
	}).showAtMouseEvent(
		ev.instanceOf(MouseEvent)
			? ev
			: // simulate click when it ev is undefined, e.g. MouseEvent not given because it was a touch event.
				new MouseEvent('click', {
					clientX: ev.touches.item(0)?.clientX,
					clientY: ev.touches.item(0)?.clientY,
				})
	)
}
