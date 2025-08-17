import { TFile, debounce, Notice, Workspace, EventRef } from "obsidian";
import { ObsidianMarkdownFileTLAssetStoreProxy, ObsidianTLAssetStore } from "src/tldraw/asset-store";
import { processInitialData } from "src/tldraw/helpers";
import { getTLMetaTemplate, makeFileDataTldr, TLDataDocumentStore, updateFileData } from "src/utils/document";
import { safeSecondsToMs } from "src/utils/utils";
import TldrawStoresManager, { MainStore, StoreGroup, StoreListenerContext, StoreInstanceInfo } from "src/tldraw/TldrawStoresManager";
import { parseTLDataDocument } from "src/utils/parse";
import TldrawPlugin from "src/main";
import { loadSnapshot, TLDRAW_FILE_EXTENSION } from "tldraw";
import { migrateTldrawFileDataIfNecessary } from "src/utils/migrate/tl-data-to-tlstore";

const formats = {
    markdown: 'markdown',
    tldr: 'tldr'
} as const;

type Format = typeof formats[keyof typeof formats];

type MainData = {
    documentStore: TLDataDocumentStore,
    fileData: string,
    tFile: TFile,
    format: Format,
}

type InstanceData = {
    tFile: TFile,
    onUpdatedData: (data: string) => void,
};

type InstanceInfo = StoreInstanceInfo<InstanceData>;

/**
 * #TODO: Handle the case where files are renamed.
 */
export default class TLDataDocumentStoreManager {
    private storesManager = new TldrawStoresManager<MainData, InstanceData>();

    constructor(
        public readonly plugin: TldrawPlugin,
    ) { }

    dispose() { this.storesManager.dispose(); }

    /**
     * 
     * @param tFile 
     * @param getData Will be called if a store instance does not yet exist for {@linkcode tFile}.
     * @param onUpdatedData Will be called when the store instance has been registered, and before data is saved to {@linkcode tFile}.
     * @returns A {@linkcode TLDataDocumentStore} with a new store instance.
     */
    register(tFile: TFile, getData: () => string, onUpdatedData: (data: string) => void, syncToMain: boolean): {
        documentStore: TLDataDocumentStore,
        unregister: () => void,
    } & Pick<ReturnType<typeof this.storesManager.registerInstance>['instance'], 'syncToMain' | 'isSynchronizingToMain'> {
        const instanceInfo: InstanceInfo = {
            instanceId: window.crypto.randomUUID(),
            syncToMain,
            data: {
                tFile,
                onUpdatedData,
            }
        };

        const storeContext = this.storesManager.registerInstance(instanceInfo,
            {
                createMain: () => this.createMain(instanceInfo, getData),
                getSharedId: () => tFile.path,
            }
        );

        instanceInfo.data.onUpdatedData(storeContext.storeGroup.main.data.fileData);

        return {
            documentStore: {
                meta: storeContext.storeGroup.main.data.documentStore.meta,
                store: storeContext.instance.store
            },
            unregister: () => {
                storeContext.instance.unregister();
            },
            syncToMain: (sync: boolean) => storeContext.instance.syncToMain(sync),
            isSynchronizingToMain: () => storeContext.instance.isSynchronizingToMain(),
        };
    }

    private createMain(info: InstanceInfo, getData: () => string): MainStore<MainData, InstanceData> {
        const { tFile } = info.data;
        const { workspace, vault } = this.plugin.app;
        const fileData = getData();

        const format = this.plugin.isTldrawFile(tFile)
            ? formats.markdown
            : tFile.path.endsWith(TLDRAW_FILE_EXTENSION)
                ? formats.tldr
                : (() => { throw new Error() })();

        const documentStore = this.processFormatInitialData(format, fileData);
        const debouncedSave = this.createDebouncedSaveStoreListener(documentStore);
        let onExternalModificationsRef: undefined | EventRef;
        let onFileRenamedRef: undefined | EventRef;
        let onFileDeletedRef: undefined | EventRef;
        let onQuickPreviewRef: undefined | EventRef;
        let assetStore: undefined | ObsidianTLAssetStore;
        return {
            store: documentStore.store,
            data: {
                fileData,
                tFile,
                documentStore,
                format,
            },
            init: (storeGroup) => {
                onExternalModificationsRef = vault.on('modify', async (file) => {
                    if (!(file instanceof TFile) || file.path !== storeGroup.main.data.tFile.path) return;
                    const data = await vault.cachedRead(file);
                    this.onExternalModification(workspace, storeGroup, data);
                });

                onFileRenamedRef = vault.on('rename', async (file, oldPath) => {
                    if (!(file instanceof TFile) || file.path !== storeGroup.main.data.tFile.path) return;
                    this.storesManager.refreshSharedId(oldPath);
                });

                onFileDeletedRef = vault.on('delete', async (file) => {
                    if (!(file instanceof TFile) || file.path !== storeGroup.main.data.tFile.path) return;
                    storeGroup.unregister();
                });

                onQuickPreviewRef = workspace.on('quick-preview', (file, data) => {
                    if (file.path !== storeGroup.main.data.tFile.path) return;
                    this.onExternalModification(workspace, storeGroup, data)
                });

                if (format !== formats.markdown) {
                    // We don't want to proxy storing the assets in the file using the markdown file proxy if it isn't a markdown file.
                    return;
                }

                const assetStoreProxy = new ObsidianMarkdownFileTLAssetStoreProxy(this.plugin, tFile,
                    (fileContents, _, assetFile) => {
                        new Notice(`Added asset: ${assetFile.path}`);
                        this.propagateData(workspace, storeGroup, fileContents);
                    }
                );
                assetStore = new ObsidianTLAssetStore(documentStore.meta.uuid, assetStoreProxy);
                documentStore.store.props.assets = assetStore;
            },
            dispose: () => {
                assetStore?.dispose();
                if (onExternalModificationsRef) {
                    vault.offref(onExternalModificationsRef);
                }
                if (onFileRenamedRef) {
                    vault.offref(onFileRenamedRef);
                }
                if (onFileDeletedRef) {
                    vault.offref(onFileDeletedRef);
                }
                if (onQuickPreviewRef) {
                    workspace.offref(onQuickPreviewRef);
                }
            },
            storeListener: (entry, context) => debouncedSave(context)
        };
    }

    private createDebouncedSaveStoreListener(documentStore: TLDataDocumentStore) {
        return debounce(
            async (context: StoreListenerContext<MainData, InstanceData>) => {
                const { fileData: currData, tFile, format } = context.storeGroup.main.data;
                const data = await this.formatData(currData, documentStore, format);
                if (currData === data) return;
                // Do this to prevent the data from being reset by Obsidian.
                this.propagateData(this.plugin.app.workspace, context.storeGroup, data);
                await this.plugin.app.vault.modify(tFile, data);
            },
            safeSecondsToMs(this.plugin.settings.saveFileDelay),
            true
        );
    }

    /**
     * If the file used for this view was modified externally (not by this view), ensure this {@linkcode TldrawView.data} is synced with the new {@linkcode data}
     * @param tFile 
     * @param data 
     * @returns 
     */
    private onExternalModification(workspace: Workspace, storeGroup: StoreGroup<MainData, InstanceData>, data: string) {
        if (storeGroup.main.data.fileData === data) return;
        this.propagateData(workspace, storeGroup, data, true);
    }

    /**
     * Ensures each {@linkcode TldrawView} has the same data so no old data overwrites any new data.
     * 
     * ---
     * 
     * If {@linkcode isExternal} is provided, then we should treat it as if it was modified by hand.
     * 
     * - #TODO: Ensure the data is properly checked for errors
     * 
     * ---
     * @param tFile 
     * @param data 
     * @param store If defined, replace the store with a new instance
     * @param isExternal default `false`
     * @returns 
     */
    private propagateData(workspace: Workspace, storeGroup: StoreGroup<MainData, InstanceData>, data: string, isExternal: boolean = false) {
        if (isExternal) {
            const snapshot = this.processFormatInitialData(storeGroup.main.data.format, data)
                .store.getStoreSnapshot();
            loadSnapshot(storeGroup.main.store, snapshot);
            for (const instance of storeGroup.instances) {
                loadSnapshot(instance.store, snapshot);
            }
        }

        storeGroup.main.data.fileData = data;
        for (const instance of storeGroup.instances) {
            instance.source.data.onUpdatedData(data);
        }

        if (!isExternal) {
            workspace.onQuickPreview(storeGroup.main.data.tFile, data);
        }
    }

    private processFormatInitialData(format: Format, data: string) {
        const { plugin } = this;

        switch (format) {
            case formats.markdown:
                return processInitialData(parseTLDataDocument(plugin.manifest.version, data));
            case formats.tldr:
                return processInitialData({
                    meta: getTLMetaTemplate(plugin.manifest.version),
                    ...(
                        data.length === 0
                            ? { raw: undefined }
                            : { store: migrateTldrawFileDataIfNecessary(data) }
                    )
                });
        }

        throw new Error("Unable to process format's initial data", {
            cause: { format, data }
        });
    }

    private formatData(currData: string, documentStore: TLDataDocumentStore, format: Format) {
        switch (format) {
            case formats.markdown:
                return updateFileData(this.plugin.manifest, currData, documentStore)
            case formats.tldr:
                return makeFileDataTldr(documentStore);
        }

        throw new Error('Unsupported update format', {
            cause: { format }
        });
    }
}
