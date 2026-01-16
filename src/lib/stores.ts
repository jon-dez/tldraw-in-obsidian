import { Notifier } from "./notifier";

export function createSetStore<T>() {
    const notifier = new Notifier();
    const set = new Set<T>();
    let cached: ReadonlyArray<T> | undefined

    return Object.freeze({
        getAll: () => cached ??= Array.from([...set]) ,
        add: (item: T) => {
            set.add(item);
            cached = undefined;
            notifier.notifyListeners();
        },
        remove: (item: T) => {
            if (set.delete(item)) {
                cached = undefined
                notifier.notifyListeners();
            }
        },
        addListener: (cb: () => void) => notifier.addListener(cb)
    })
}

export function createRecordStore<K, V>() {
    const notifier = new Notifier();
    const map = new Map<K, V>();
    let cached: ReadonlyArray<[key: K, value: V]> | undefined

    return Object.freeze({
        getAll: () => cached ??= Array.from([...map]) ,
        add: (key: K, value: V) => {
            map.set(key, value);
            cached = undefined;
            notifier.notifyListeners();
        },
        remove: (key: K) => {
            if (map.delete(key)) {
                cached = undefined
                notifier.notifyListeners();
            }
        },
        addListener: (cb: () => void) => notifier.addListener(cb)
    })
}
