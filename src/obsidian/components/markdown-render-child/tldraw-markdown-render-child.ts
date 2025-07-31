import { MarkdownRenderChild, Menu, TFile } from "obsidian";
import BoundsTool from "src/components/BoundsTool";
import BoundsToolSelectedShapeIndicator from "src/components/BoundsToolSelectedShapesIndicator";
import EmbedTldrawToolBar from "src/components/EmbedTldrawToolBar";
import TldrawApp from "src/components/TldrawApp";
import TldrawPlugin from "src/main";
import BoundsSelectorTool from "src/tldraw/tools/bounds-selector-tool";
import { ImageViewModeOptions, ViewMode } from "../../helpers/TldrawAppEmbedViewController";
import { BoxLike, Editor, pageIdValidator, TLPageId } from "tldraw";
import TLDataDocumentStoreManager from "../../plugin/TLDataDocumentStoreManager";
import { showEmbedContextMenu } from "../../helpers/show-embed-context-menu";
import { ComponentProps } from "react";
import { TldrAppControllerForMenu } from "../../menu/create-embed-menu";
import { isObsidianThemeDark } from "src/utils/utils";
import { logClass } from "src/utils/logging";
import TldrawViewComponent from "../tldraw-view-component";
import PreviewImageImpl from "./preview-image";
import SnapshotPreviewSyncStoreImpl from "./snapshot-preview-store";

const boundsSelectorToolIconName = `tool-${BoundsSelectorTool.id}`;

type DocumentStoreInstance = ReturnType<TLDataDocumentStoreManager['register']>;

function _pageId(page?: string) {
    return page === undefined || page.length === 0 ? undefined : (
        !pageIdValidator.isValid(`page:${page}`) ? undefined : `page:${page}` as TLPageId
    )
}

type EmbedPageOptions = Pick<ImageViewModeOptions, 'bounds'>;

type Timeout = number;

export class TldrawMarkdownRenderChild extends MarkdownRenderChild {
    #storeInstance?: DocumentStoreInstance;
    #currentMenu?: Menu;
    #viewContentEl?: HTMLElement;
    #viewMode: ViewMode = 'image';
    #viewComponent?: TldrawViewComponent;
    #embedPagesOptions: Partial<Record<TLPageId, EmbedPageOptions>> = {};
    readonly #previewImage: PreviewImageImpl;

    /**
     * Used with the `useSyncExternalStore` hook
     */
    readonly #snapshotPreviewStore: SnapshotPreviewSyncStoreImpl;

    readonly plugin: TldrawPlugin;

    constructor(
        containerEl: HTMLElement,
        plugin: TldrawPlugin,
        public readonly context: {
            tFile: TFile,
            refreshTimeoutDelay: number,
            initialEmbedValues: {
                imageSize: { width: number, height: number },
                bounds?: BoxLike,
                showBg: boolean,
                page?: string,
            },
            /**
             * Called whenever the bounds are updated using the {@linkcode BoundsSelectorTool}
             * @param bounds 
             * @returns 
             */
            onUpdatedBounds: (page: string, bounds?: BoxLike) => void,
            onUpdatedSize: (size: { width: number, height: number }) => void,
            /**
             * 
             * @param cb Callback to invoke when the workspace leaf is visible again.
             * @returns Callback to cancel the invocation if not invoked yet.
             */
            deferUntilIsShown: (cb: () => void) => (() => void),
            isWorkspaceLeafShown: () => boolean,
        },
    ) {
        super(containerEl);
        this.plugin = plugin;
        const pageId = _pageId(context.initialEmbedValues.page);
        if (pageId) {
            this.#embedPagesOptions = {
                [pageId]: { bounds: context.initialEmbedValues.bounds }
            };
        }
        this.#previewImage = new PreviewImageImpl({
            size: context.initialEmbedValues.imageSize,
            refreshTimeoutDelay: context.refreshTimeoutDelay,
            options: {
                assetUrls: {
                    fonts: plugin.getFontOverrides(),
                    icons: plugin.getIconOverrides(),
                },
                pageId,
                background: context.initialEmbedValues.showBg,
                bounds: context.initialEmbedValues.bounds,
                padding: plugin.settings.embeds.padding,
                darkMode: (() => {
                    const { themeMode } = plugin.settings;
                    if (themeMode === "dark") return true;
                    else if (themeMode === "light") return false;
                    else return isObsidianThemeDark();
                })(),
                targetDocument: containerEl.ownerDocument,
            },
        }, {
            getStoreInstance: () => this.#storeInstance,
            isVisible: () => this.context.isWorkspaceLeafShown() && this._loaded,
            deferUntilIsShown: (cb) => this.context.deferUntilIsShown(cb),
        });

        this.#snapshotPreviewStore = new SnapshotPreviewSyncStoreImpl(this.#previewImage);
    }

    get #currentPage() {
        return this.#previewImage.options.pageId;
    }

    #updateHasShape() {
        this.#viewContentEl?.setAttr('data-has-shape',
            this.#storeInstance?.documentStore.store.query.record('shape').get() !== undefined
        );
    }

    #dataUpdated() {
        this.#previewImage.markSnapshotStale();
        this.#updateHasShape();
    }

    get lastPreviewImageBounds() { return this.#previewImage.options.bounds; }

    #setUpTldrawOptions(): ComponentProps<typeof TldrawApp> {
        const boundsSelectorIcon = this.plugin.getEmbedBoundsSelectorIcon();

        function zoomToEmbedPageBounds(editor: Editor) {
            const selectorTool = editor.getStateDescendant<BoundsSelectorTool>(BoundsSelectorTool.id);
            if (!selectorTool) return;
            // Update the bounding box indicator
            selectorTool.init();
            selectorTool.zoomToBounds();
        }

        return {
            plugin: this.plugin,
            store: !this.#storeInstance ? undefined : { plugin: this.#storeInstance.documentStore },
            options: {
                // assetStore: documentStore.store.props.assets,
                onClickAwayBlur: (ev) => {
                    if (this.#currentMenu && this.#currentMenu.dom.contains(ev.targetNode)) return false;
                    Promise.resolve().then(() => this.setViewMode('image'));
                    return true;
                },
                isReadonly: this.#storeInstance?.isSynchronizingToMain() !== true,
                components: {
                    InFrontOfTheCanvas: BoundsTool,
                    OnTheCanvas: BoundsToolSelectedShapeIndicator,
                    Toolbar: EmbedTldrawToolBar,
                },
                selectNone: true,
                iconAssetUrls: {
                    [boundsSelectorToolIconName]: boundsSelectorIcon,
                },
                initialTool: 'hand',
                tools: [
                    BoundsSelectorTool.create({
                        getInitialBounds: (pageId) => {
                            if (!this.#currentPage) {
                                const bounds = this.lastPreviewImageBounds;
                                return !bounds ? undefined : {
                                    isSpecific: false,
                                    bounds,
                                };
                            }
                            const bounds = this.#embedPagesOptions[pageId]?.bounds;
                            return !bounds ? undefined : {
                                isSpecific: true,
                                bounds,
                            };
                        },
                        callback: (pageId, bounds) => {
                            if (!pageId.startsWith('page:')) {
                                console.warn('Page id does not start with "page:"', { pageId })
                                return;
                            }
                            this.context.onUpdatedBounds(pageId.substring(5), bounds);
                        },
                    }),
                ],
                uiOverrides: {
                    tools: (editor, tools, _) => {
                        return {
                            ...tools,
                            [BoundsSelectorTool.id]: {
                                id: BoundsSelectorTool.id,
                                label: 'Select embed bounds',
                                icon: boundsSelectorToolIconName,
                                readonlyOk: true,
                                onSelect(_) {
                                    editor.setCurrentTool(BoundsSelectorTool.id)
                                },
                            }
                        }
                    },
                },
                onEditorMount: (editor) => {
                    if (this.#currentPage) {
                        editor.setCurrentPage(this.#currentPage);
                    }
                    zoomToEmbedPageBounds(editor);
                },
                onUiEvent: (editor, name, data) => {
                    if (!editor || name !== 'change-page') return;
                    zoomToEmbedPageBounds(editor)
                }
            },
            targetDocument: this.containerEl.ownerDocument,
        };
    }

    /**
     * Set the placeholder variables for the container if for some reason the component is unloaded.
     * 
     * We utilize these values in the CSS to maintain this placeholder size until the embed view is properly loaded.
     */
    #setPlaceHolderSize(rect?: DOMRect) {
        const container = this.containerEl;
        const viewContentRect = rect ?? this.#viewContentEl?.getBoundingClientRect();
        if (!viewContentRect) return;
        const { width, height } = viewContentRect;
        if (!width || !height) return;
        container.style.setProperty('--ptl-placeholder-width', `${width}px`);
        container.style.setProperty('--ptl-placeholder-height', `${height}px`);
    }

    #createViewContentEl() {
        return createTldrawEmbedView(this.containerEl, {
            file: this.context.tFile,
            controller: {
                getViewOptions: () => this.#previewImage.options,
                getViewMode: () => this.#viewMode,
                toggleBackground: () => {
                    this.#previewImage.refreshPreview({
                        ...this.#previewImage.options,
                        background: !this.#previewImage.options.background
                    });
                },
                toggleInteractive: () => {
                    if (this.#viewMode !== 'image') {
                        this.setViewMode('image');
                    } else {
                        this.setViewMode('interactive');
                    }
                },
                setCurrentMenu: (menu) => {
                    this.#currentMenu?.hide();
                    this.#currentMenu = menu;
                },
                unsetMenu: (menu) => {
                    if (menu === this.#currentMenu) {
                        this.#currentMenu = undefined;
                    }
                },
                enableEditing: () => {
                    this.#storeInstance?.syncToMain(true);
                    this.#viewMode = 'interactive';
                    this.renderRoot();
                }
            },
            setHeight: (height, preview) => {
                const size = {
                    width: this.#previewImage.size.width,
                    height: Math.max(height, 0),
                };
                if (!preview) {
                    this.context.onUpdatedSize(size);
                } else {
                    this.#previewImage.setSize(size);
                }
            },
            plugin: this.plugin,
            showBgDots: this.plugin.settings.embeds.showBgDots,
        }).tldrawEmbedViewContent;
    }

    setViewMode(mode: ViewMode) {
        if (mode === 'image' && this.#storeInstance?.isSynchronizingToMain()) {
            this.#storeInstance.syncToMain(false);
        }
        this.#viewMode = mode;
        this.renderRoot();
    }

    unloadStoreInstance() {
        this.#storeInstance?.unregister();
        this.#storeInstance = undefined;
    }

    updateEmbedValues({
        bounds,
        imageSize,
        showBg,
        page,
    }: {
        bounds?: BoxLike,
        imageSize: { width: number, height: number },
        showBg: boolean,
        page?: string,
    }) {
        const { options: currOptions } = this.#previewImage;
        if (imageSize.height !== this.#previewImage.size.height || imageSize.width !== this.#previewImage.size.width) {
            this.#previewImage.setSize(imageSize);
        }

        const pageId = _pageId(page);
        if (pageId) {
            const page = this.#storeInstance?.documentStore.store.query.records('page').get().find((value) => (
                value.id === pageId
            ));

            if (!page) {
                console.warn('Not updating preview, since the page not found in tldraw document:', { pageId, tFile: this.context.tFile });
                return;
            }
            this.#embedPagesOptions = {
                [pageId]: { bounds }
            };
        }

        if (currOptions.background === showBg
            && currOptions.bounds?.h === bounds?.h
            && currOptions.bounds?.w === bounds?.w
            && currOptions.bounds?.x === bounds?.x
            && currOptions.bounds?.y === bounds?.y
            && currOptions.pageId === pageId
        ) return;

        this.#previewImage.refreshPreview({
            ...currOptions,
            background: showBg,
            bounds,
            pageId,
        });
    }

    updateBounds(bounds?: BoxLike) {
        this.#previewImage.setOptions({
            ...this.#previewImage.options,
            bounds,
        });
    }

    async awaitInitialLoad(ms: number) {
        const controller = new AbortController();
        return Promise.race([
            this.#awaitInitialLoadViaTimeout(ms),
            this.#viewContentEl
                ? this.#awaitInitialImageLoad(this.#viewContentEl, controller.signal)
                // Never resolve if the view content element is not set.
                : new Promise<void>(() => { }),
        ]).finally(() => {
            controller.abort();
        });
    }

    /**
     * Observer-based approach to wait for the initial load to complete.
     * Will attach an observer to the view content element to check if the image preview is loaded.
     * If the image preview is observed, it will resolve the promise.
     */
    #awaitInitialImageLoad(contentEl: HTMLElement, signal: AbortSignal) {
        const { resolve, promise } = Promise.withResolvers<void>();
        const observer = PreviewImageImpl.srcMutationObserver(contentEl, () => {
            resolve();
            observer.disconnect();
        });

        signal.addEventListener('abort', () => observer.disconnect());

        return promise;
    }

    /**
     * Timeout-based approach to wait for the initial load to complete.
     * @param ms Timeout in milliseconds to wait for the initial load to complete.
     */
    #awaitInitialLoadViaTimeout(ms: number) {
        return new Promise<void>((res, rej) => {
            if (this.isContentLoaded()) return res();
            setTimeout(() => {
                if (this.isContentLoaded()) {
                    return res();
                } else {
                    if (this._loaded) {
                        return rej(new Error(`Error loading tldraw embed: Timeout of ${ms} ms reached.`));
                    } else {
                        return rej(new Error(`Component was unloaded before its initial load was finished.`));
                    }
                }
            }, ms);
        });
    }

    /**
     * Checks if the view content is loaded. It is considered loaded if the image preview is rendered or the interactive mode canvas is available.
     */
    isContentLoaded() {
        return (
            this.#viewContentEl !== undefined
            && (
                // The image preview
                this.#viewContentEl.querySelector('.ptl-tldraw-image > div.tl-container > img[src]') !== null
                ||
                // The interactive mode canvas
                this.#viewContentEl.querySelector('.tldraw-view-root > div.tl-container') !== null
            )
        );
    }

    hasView() {
        return this.#viewComponent !== undefined;
    }

    renderRoot() {
        const container = this.#viewContentEl ??= this.#createViewContentEl();
        this.#previewImage.observePreviewImage(container, (rect) => {
            this.#setPlaceHolderSize(rect);
        });

        const component = this.#viewComponent ??= (() => {
            const viewComponent = new TldrawViewComponent(container)
            this.addChild(viewComponent);
            this.register(() => this.#viewComponent = undefined);
            return viewComponent;
        })();

        // Wait for the component to be ready before rendering
        setTimeout(() => {
            switch (this.#viewMode) {
                case 'image':
                    component.renderImage(this.#snapshotPreviewStore);
                    break;
                case 'interactive':
                    component.renderInteractive(this.#setUpTldrawOptions());
                    break;
                default:
                    console.warn('Unknown view mode:', this.#viewMode);
            }
        }, 0);
    }

    async lazyLoadStoreInstance() {
        if (this.#storeInstance) return this.#storeInstance;
        const fileData = await this.plugin.app.vault.read(this.context.tFile);
        this.#storeInstance = this.plugin.tlDataDocumentStoreManager.register(this.context.tFile, () => fileData, () => {
            this.#dataUpdated();
        }, false);
        this.#previewImage.setOptions({
            ...this.#previewImage.options,
            assets: this.#storeInstance.documentStore.store.props.assets,
        });
        return this.#storeInstance;
    }

    async loadRoot() {
        TLDRAW_COMPONENT_LOGGING && logClass(TldrawMarkdownRenderChild, this.loadRoot, this);
        this.#updateHasShape();
        await this.lazyLoadStoreInstance();
        this.renderRoot();
    }

    unloadRoot() {
        TLDRAW_COMPONENT_LOGGING && logClass(TldrawMarkdownRenderChild, this.unloadRoot, this);
        this.#previewImage.clearRefreshTimeout();
        this.#previewImage.observePreviewImageDisconnect();
        this.#setPlaceHolderSize();
    }

    override onload(): void {
        try {
            this.loadRoot();
        } catch (e) {
            this.unload();
            console.error('There was an error while mounting the tldraw app: ', e);
        }
    }

    override onunload(): void {
        this.unloadRoot();
        this.unloadStoreInstance();
        this.containerEl.empty();
    }
}

function createTldrawEmbedView(internalEmbedDiv: HTMLElement, {
    file, plugin, controller, showBgDots, setHeight
}: {
    file: TFile,
    plugin: TldrawPlugin,
    controller: TldrAppControllerForMenu,
    setHeight: (height: number, preview: boolean) => void,
    showBgDots: boolean,
}) {
    const tldrawEmbedView = internalEmbedDiv.createDiv({ cls: 'ptl-markdown-embed' },);

    const tldrawEmbedViewContent = tldrawEmbedView.createDiv({
        cls: 'ptl-view-content', attr: {
            'data-showBgDots': showBgDots,
        }
    })

    const resizeHandle = tldrawEmbedView.createDiv({
        cls: 'ptl-embed-resize-handle'
    });

    // Prevent the Obsidian editor from selecting the embed link with the editing cursor when a user interacts with the view.
    tldrawEmbedView.addEventListener('click', (ev) => {
        if (controller.getViewMode() === 'interactive') {
            ev.stopPropagation();
        }
    })

    tldrawEmbedViewContent.addEventListener('dblclick', (ev) => {
        if (controller.getViewMode() === 'image') {
            plugin.openTldrFile(file, 'new-tab', 'tldraw-view');
            ev.stopPropagation();
        }
    })

    tldrawEmbedViewContent.addEventListener('contextmenu', (ev) => {
        if (ev.button === 2) {
            showEmbedContextMenu(ev, {
                plugin, controller, focusContainer: internalEmbedDiv,
                tFile: file
            })
        }
        // Prevent default: On mobile without this the embed image view will zoom in, which is unwanted behavior when showing the context menu.
        ev.preventDefault()
    })


    {// Mobile
        let longPressTimer: Timeout | undefined;
        tldrawEmbedViewContent.addEventListener('touchstart', (ev) => {
            clearTimeout(longPressTimer)
            longPressTimer = setTimeout(() => showEmbedContextMenu(ev, {
                plugin, controller, focusContainer: tldrawEmbedView,
                tFile: file
            }), 500)
        }, { passive: true })

        tldrawEmbedViewContent.addEventListener('touchmove', (ev) => {
            clearTimeout(longPressTimer)
        }, { passive: true });

        tldrawEmbedViewContent.addEventListener('touchend', (ev) => {
            clearTimeout(longPressTimer);
        }, { passive: true });

        resizeHandle.addEventListener('touchstart', function touchStart(ev) {
            // Helps with responsiveness of the the resizing.
            ev.preventDefault();
            // Stops the command pallette from opening when dragging down.
            ev.stopPropagation();
        });
    }


    resizeHandle.addEventListener('pointerdown', function pointerDown(ev) {
        // Prevent text from being selected during mousemove.
        ev.preventDefault();

        let isResizing = true;
        const startY = ev.clientY;
        const startHeight = parseInt(resizeHandle.doc.defaultView!.getComputedStyle(tldrawEmbedViewContent).height)

        function updateHeight(ev: MouseEvent, preview = true) {
            const dy = ev.clientY - startY;
            const newHeight = startHeight + dy;
            setHeight(newHeight, preview);
        }
        function pointerMove(ev: MouseEvent) {
            if (!isResizing) return;
            updateHeight(ev);
        }
        function pointerUp(ev: MouseEvent) {
            isResizing = false;
            resizeHandle.doc.removeEventListener('pointermove', pointerMove);
            resizeHandle.doc.removeEventListener('pointerup', pointerUp);
            updateHeight(ev, false);
        }

        resizeHandle.doc.addEventListener('pointermove', pointerMove);
        resizeHandle.doc.addEventListener('pointerup', pointerUp)
    });

    return {
        tldrawEmbedView,
        tldrawEmbedViewContent,
    }
}