import { FileView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { TldrawAppProps } from "src/components/TldrawApp";
import TldrawPlugin from "src/main";
import { PaneTarget, TLDRAW_ICON_NAME, VIEW_TYPE_TLDRAW, VIEW_TYPE_TLDRAW_READ_ONLY, ViewType } from "src/utils/constants";
import { TldrawLoadableMixin } from "./TldrawMixins";
import { TLDRAW_FILE_EXTENSION } from "tldraw";
import { migrateTldrawFileDataIfNecessary } from "src/utils/migrate/tl-data-to-tlstore";
import { pluginMenuLabel } from "./menu";

export class TldrawReadonly extends TldrawLoadableMixin(FileView) {
    plugin: TldrawPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: TldrawPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.navigation = true;
    }

    getViewType(): string {
        return VIEW_TYPE_TLDRAW_READ_ONLY;
    }

    getDisplayText(): string {
        return `[Preview] ${super.getDisplayText()}`;
    }

    onload() {
        super.onload();
        this.addAction(TLDRAW_ICON_NAME, "Edit", async () => {
            await this.plugin.updateViewMode(VIEW_TYPE_TLDRAW);
        });
    }

    async onLoadFile(file: TFile): Promise<void> {
        const fileData = await this.app.vault.read(file);
        if (!file.path.endsWith(TLDRAW_FILE_EXTENSION)) {
            const storeInstance = this.plugin.tlDataDocumentStoreManager.register(file, () => fileData, () => { }, false);
            this.registerOnUnloadFile(() => storeInstance.unregister());
            await this.setStore({
                plugin: storeInstance.documentStore
            });
        } else {
            await this.setStore({
                tldraw: {
                    store: migrateTldrawFileDataIfNecessary(fileData)
                }
            })
        }
    }

    override onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string): void {
        super.onPaneMenu(menu, source);
        const { file } = this;
        if (!file) return;

        menu.addItem((item) => pluginMenuLabel(item
            .setSection('tldraw')
        ))
            .addItem((item) => item
                .setIcon('external-link')
                .setSection('tldraw')
                .setTitle('Open in default app')
                .onClick(async () => {
                    await this.app.openWithDefaultApp(file.path);
                })
            )
    }

    protected override getTldrawOptions(): TldrawAppProps['options'] {
        return {
            ...super.getTldrawOptions(),
            isReadonly: true,
        }
    }

    protected override viewAsMarkdownClicked(): void {
        const { file } = this;
        if (file !== null && file.path.endsWith(TLDRAW_FILE_EXTENSION)) {
            this.createAndOpen(file, 'new-tab', 'markdown');
            return;
        } else {
            super.viewAsMarkdownClicked()
        }
    }

    private async createAndOpen(tFile: TFile, location: PaneTarget, viewType: ViewType) {
        // TODO: Add a dialog to confirm the creation of a file.
        const newFile = await this.plugin.createUntitledTldrFile({
            inMarkdown: true,
            tlStore:
                // NOTE: Maybe this should be retreiving the current tlStore from the tldraw editor instead of re-reading the file.
                migrateTldrawFileDataIfNecessary(
                    await this.app.vault.read(tFile)
                )
        });
        await this.plugin.openTldrFile(newFile, location, viewType)
        new Notice(`Created a new file for editing "${newFile.path}"`)
    }
}
