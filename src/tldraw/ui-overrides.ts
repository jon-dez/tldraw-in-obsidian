import { Editor, exportToBlob, TLUiActionItem, TLUiActionsContextType, TLUiEventContextType, TLUiEventMap, TLUiEventSource, TLUiOverrideHelpers, TLUiOverrides, useUiEvents } from "tldraw";
import { Platform } from "obsidian";
import TldrawPlugin from "src/main";
import { downloadBlob, getSaveFileCopyAction, getSaveFileCopyInVaultAction, importFileAction, OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION, SAVE_FILE_COPY_IN_VAULT_ACTION } from "src/utils/file";

export function uiOverrides(plugin: TldrawPlugin): TLUiOverrides {
	const trackEvent = useUiEvents();
	return {
		tools(editor, tools, helpers) {
			// console.log(tools);
			// // this is how you would override the kbd shortcuts
			// tools.draw = {
			// 	...tools.draw,
			// 	kbd: "!q",
			// };
			return tools;
		},
		actions: (editor, actions, { msg, addDialog, addToast, paste }) => {
			const defaultDocumentName = msg("document.default-name");
			if (!Platform.isMobile) {
				actions[SAVE_FILE_COPY_ACTION] = getSaveFileCopyAction(
					editor,
					defaultDocumentName
				);
			}

			actions[SAVE_FILE_COPY_IN_VAULT_ACTION] = getSaveFileCopyInVaultAction(
				editor,
				defaultDocumentName,
				plugin
			);

			actions[OPEN_FILE_ACTION] = importFileAction(plugin, addDialog);

			(['json', 'png', 'svg'] satisfies TLExportAllAsFormatType[]).map((e) => exportAllAsOverride(editor, actions, plugin, {
				type: e,
				defaultDocumentName,
				trackEvent
			}))

			actions['paste'] = pasteFromClipboardOverride(editor, { msg, paste, addToast });

			return actions;
		},
		// toolbar(editor, toolbar, { tools }) {
		// 	// console.log(toolbar);
		// 	// toolbar.splice(4, 0, toolbarItem(tools.card))
		// 	return toolbar;
		// },
		// keyboardShortcutsMenu(editor, keyboardShortcutsMenu, { tools }) {
		// 	// console.log(keyboardShortcutsMenu);
		// 	// const toolsGroup = keyboardShortcutsMenu.find(
		// 	// 	(group) => group.id === 'shortcuts-dialog.tools'
		// 	// ) as TLUiMenuGroup
		// 	// toolsGroup.children.push(menuItem(tools.card))
		// 	return keyboardShortcutsMenu;
		// },
		// contextMenu(editor, schema, helpers) {
		// 	// console.log({ schema });
		// 	// console.log(JSON.stringify(schema[0]));
		// 	return schema;
		// },
	}
}

type TLExportAllAsFormatType = TLUiEventMap['export-all-as']['format']

function exportAllAsOverride(editor: Editor, actions: TLUiActionsContextType, plugin: TldrawPlugin, options: {
	type: TLExportAllAsFormatType,
	trackEvent: TLUiEventContextType,
	defaultDocumentName: string
}) {
	const key = `export-all-as-${options.type}` as const;
	actions[key] = {
		...actions[key],
		async onSelect(source) {
			const ids = Array.from(editor.getCurrentPageShapeIds().values())
			if (ids.length === 0) return
			options.trackEvent('export-all-as', { format: options.type, source })

			const blob = await exportToBlob({
				editor,
				ids,
				format: options.type,
				// TODO: Make use of opts
				// opts
			})

			const res = await downloadBlob(blob, `${options.defaultDocumentName}.${options.type}`, plugin);

			if (typeof res === 'object') {
				res.showResultModal()
			}
		}
	}
}

/**
 * Obsidian doesn't allow manual access to the clipboard API on mobile,
 * so we add a fallback when an error occurs on the initial clipboard read.
 */
function pasteFromClipboardOverride(
	editor: Editor,
	{
		addToast,
		msg,
		paste,
	}: Pick<TLUiOverrideHelpers, 'addToast' | 'msg' | 'paste'>
): TLUiActionItem {
	const pasteClipboard = (source: TLUiEventSource, items: ClipboardItem[]) => paste(
		items,
		source,
		source === 'context-menu' ? editor.inputs.currentPagePoint : undefined
	)
	return {
		id: 'paste',
		label: 'action.paste',
		kbd: '$v',
		onSelect(source) {
			// Adapted from src/lib/ui/context/actions.tsx of the tldraw library
			navigator.clipboard
				?.read()
				.then((clipboardItems) => {
					pasteClipboard(source, clipboardItems);
				})
				.catch((e) => {
					// Fallback to reading the clipboard as plain text.
					navigator.clipboard
						?.readText()
						.then((val) => {
							pasteClipboard(source, [
								new ClipboardItem(
									{
										'text/plain': new Blob([val], { type: 'text/plain' }),
									}
								)
							]);
						}).catch((ee) => {
							console.error({ e, ee });
							addToast({
								title: msg('action.paste-error-title'),
								description: msg('action.paste-error-description'),
								severity: 'error',
							})
						})
				})
		},
	};
}