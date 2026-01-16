import { BlockCache } from "obsidian";
import { Notifier } from "src/lib/notifier";
import { LOGGING_ENABLED } from "src/utils/logging";

interface BlockRefErrorState {
    blockId: string
    asset?: {
        message: string
        item?: BlockCache
        link?: string
    }
}

interface AssetBlockRefError<T extends NonNullable<BlockRefErrorState['asset']>> extends BlockRefErrorState {
    asset: T
}

interface AssetBlockRefNotFound {
    message: 'notFound'
    item?: undefined
}

interface AssetBlockRefNotALink {
    message: 'notALink'
    item: BlockCache
}

interface AssetBlockRefUnknownFile {
    message: 'unknownFile'
    item: BlockCache
    link: string
}

interface AssetBlockRefLoadingError {
    message: 'errorLoading'
    item: BlockCache
    link: string
}

type AssetBlockRefErrorTypes = AssetBlockRefError<
    AssetBlockRefNotFound |
    AssetBlockRefNotALink |
    AssetBlockRefUnknownFile |
    AssetBlockRefLoadingError
>

class BlockRefErrors {
    readonly #notifier = new Notifier();
    readonly #stateMap = new Map<string, BlockRefErrorState>();

    #hasErrors(state: BlockRefErrorState) {
        return Boolean(state.asset);
    }

    #isSameAssetError(a: BlockRefErrorState['asset'], b: AssetBlockRefErrorTypes['asset']) {
        if (a?.message !== b.message) {
            return false;
        }
        switch (b.message) {
            case "notFound":
                return true;
            case "notALink":
                return a.item === b.item
            case "unknownFile":
            case "errorLoading":
                // return a.link === b.link
                return a.link === b.link
        }
    }

    setAssetError(blockRefError: AssetBlockRefErrorTypes) {
        let blockRefState = this.#stateMap.get(blockRefError.blockId);
        let shouldNotify = false;
        if (!blockRefState) {
            this.#stateMap.set(blockRefError.blockId, blockRefState = {
                blockId: blockRefError.blockId,
            });
        }

        if (!this.#isSameAssetError(
            blockRefState.asset, blockRefError.asset
        )) {
            shouldNotify = true
        } else {
            LOGGING_ENABLED && console.info('Same asset error; skipping notifying', {
                a: blockRefState.asset,
                b: blockRefError.asset
            })
        }

        blockRefState.asset = blockRefError.asset;

        if (shouldNotify) {
            this.#notifier.notifyListeners();
        }

        return blockRefState;
    }

    getCount() {
        let count = 0;

        for (const e of this.#stateMap.values()) {
            if (e.asset) count++
        }

        return count;
    }

    getAll() {
        return [...this.#stateMap.values()];
    }

    removeAssetError(blockId: string) {
        const state = this.#stateMap.get(blockId);

        if (!state?.asset) return;

        delete state.asset;

        if (!this.#hasErrors(state)) {
            this.#stateMap.delete(blockId)
        }

        this.#notifier.notifyListeners();
    }

    addListener(listener: () => void): () => void {
        return this.#notifier.addListener(listener)
    }

    clearAll() {
        for (const blockId of this.#stateMap.keys()) {
            this.removeAssetError(blockId)
        }
    }
}

interface AddListener<Callback extends (...args: unknown[]) => void = () => void> {
    (listener: Callback): () => void
}

function createTrigger<Params extends unknown[], Return>(
    fn: (...args: Params) => Return,
): {
    trigger(...args: Params): Return,
    addListener: AddListener<
        Return extends void
        ? () => void
        : (data: Return) => void
    >
} {
    const notifier = new Notifier<(data: Return) => void>()
    return {
        trigger: (...args: Parameters<typeof fn>) => {
            const res = fn(...args);
            notifier.notifyListeners(res)
            return res;
        },
        addListener: (listener) => notifier.addListener(listener)
    }
}

export default class TLDataDocumentMessages {
    readonly #notifier = new Notifier()
    readonly #blockRefErrors = new BlockRefErrors()
    readonly #counts = {
        blockRefErrors: 0
    }

    readonly triggers = {
        blockRef: {
            asset: {
                /**
                 * The block ref was not found
                 */
                notFound: createTrigger((id: string) => {
                    return this.#blockRefErrors.setAssetError({
                        blockId: id,
                        asset: {
                            message: 'notFound'
                        }
                    })
                },),
                notALink: createTrigger((block: BlockCache) => {
                    return this.#blockRefErrors.setAssetError({
                        blockId: block.id,
                        asset: {
                            message: 'notALink',
                            item: block
                        }
                    })
                }),
                unknownFile: createTrigger(
                    (block: BlockCache, link: string) => {
                        return this.#blockRefErrors.setAssetError({
                            blockId: block.id,
                            asset: {
                                message: 'unknownFile',
                                item: block,
                                link,
                            }
                        })
                    }
                ),
                errorLoading: createTrigger(
                    (block: BlockCache, link: string, error: unknown) => {
                        return this.#blockRefErrors.setAssetError({
                            blockId: block.id,
                            asset: {
                                message: 'errorLoading',
                                item: block,
                                link
                            }
                        })
                    }
                ),
                /**
                 * The asset was loaded into the document
                 */
                loaded: createTrigger(
                    (block: BlockCache) => {
                        this.#blockRefErrors.removeAssetError(block.id);
                        return block;
                    }
                ),
                /**
                 * The asset was deleted from the document
                 */
                deleted: createTrigger(
                    (id: string) => {
                        this.#blockRefErrors.removeAssetError(id)
                        return id;
                    }
                )
            }
        }
    }

    constructor() {
        this.#blockRefErrors.addListener(() => {
            this.#counts.blockRefErrors = this.#blockRefErrors.getCount();
            this.#notifier.notifyListeners();
        })
    }

    getErrorCount() {
        return this.#counts.blockRefErrors;
    }

    /**
     * Add a listener that is called when the messages are changed.
     * @param listener 
     * @returns A callback to unregister the listener.
     */
    addListener(listener: () => void): () => void {
        return this.#notifier.addListener(listener);
    }

    getTriggers() {
        return this.triggers
    }

    getBlockRefError() {
        return this.#blockRefErrors.getAll().map((e) => {
            return {
                state: e,
                getMessage: () => {
                    return e.asset?.message ?? `There is an error with block ${e.blockId}`
                },
                remove: () => {
                    this.#blockRefErrors.removeAssetError(e.blockId)
                }
            }
        })
    }

    removeAll() {
        this.#blockRefErrors.clearAll()
    }
}