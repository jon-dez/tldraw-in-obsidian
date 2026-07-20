import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Notifier } from 'src/lib/notifier'
import { createRecordStore, createSetStore, createStore } from 'src/lib/stores'
import { createTrigger } from 'src/lib/trigger'

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('Notifier', () => {
	it('coalesces multiple notifications into one per event loop', () => {
		const notifier = new Notifier()
		const listener = vi.fn()
		notifier.addListener(listener)

		notifier.notifyListeners()
		notifier.notifyListeners()
		notifier.notifyListeners()
		expect(listener).not.toHaveBeenCalled()

		vi.runAllTimers()
		expect(listener).toHaveBeenCalledTimes(1)
	})

	it('passes the latest args to listeners', () => {
		const notifier = new Notifier<(n: number) => void>()
		const listener = vi.fn()
		notifier.addListener(listener as never)

		notifier.notifyListeners(1)
		notifier.notifyListeners(2)
		vi.runAllTimers()
		expect(listener).toHaveBeenCalledWith(2)
	})

	it('removes listeners via the returned unsubscribe', () => {
		const notifier = new Notifier()
		const listener = vi.fn()
		const unsubscribe = notifier.addListener(listener)
		unsubscribe()
		notifier.notifyListeners()
		vi.runAllTimers()
		expect(listener).not.toHaveBeenCalled()
	})
})

describe('createTrigger', () => {
	it('invokes the wrapped fn once per event loop with the latest args', () => {
		const fn = vi.fn((n: number) => n * 2)
		const trigger = createTrigger(fn)
		trigger.trigger(1)
		trigger.trigger(2)
		vi.runAllTimers()
		expect(fn).toHaveBeenCalledTimes(1)
		expect(fn).toHaveBeenCalledWith(2)
	})

	it('notifies listeners with the fn result', () => {
		const trigger = createTrigger((n: number) => n * 2)
		const listener = vi.fn()
		trigger.addListener(listener as never)
		trigger.trigger(21)
		vi.runAllTimers()
		expect(listener).toHaveBeenCalledWith(42)
	})
})

describe('createSetStore', () => {
	it('adds/removes items and notifies listeners', () => {
		const store = createSetStore<string>()
		const listener = vi.fn()
		store.addListener(listener)

		store.add('a')
		store.add('b')
		vi.runAllTimers()
		expect(listener).toHaveBeenCalledTimes(1)
		expect(store.getAll()).toEqual(['a', 'b'])

		store.remove('a')
		expect(store.getAll()).toEqual(['b'])
	})

	it('caches getAll until mutation', () => {
		const store = createSetStore<string>()
		store.add('a')
		const first = store.getAll()
		expect(store.getAll()).toBe(first)
		store.add('b')
		expect(store.getAll()).not.toBe(first)
	})

	it('does not notify when removing a missing item', () => {
		const store = createSetStore<string>()
		const listener = vi.fn()
		store.addListener(listener)
		store.remove('ghost')
		vi.runAllTimers()
		expect(listener).not.toHaveBeenCalled()
	})
})

describe('createRecordStore', () => {
	it('stores key/value pairs and lists entries', () => {
		const store = createRecordStore<string, number>()
		store.add('a', 1)
		store.add('b', 2)
		expect(store.getAll()).toEqual([
			['a', 1],
			['b', 2],
		])
		store.remove('a')
		expect(store.getAll()).toEqual([['b', 2]])
	})
})

describe('createStore', () => {
	it('holds state and notifies on setState', () => {
		const store = createStore({ n: 1, s: 'x' })
		const listener = vi.fn()
		store.addListener(listener)
		store.setState({ n: 2 })
		vi.runAllTimers()
		expect(store.getState()).toEqual({ n: 2, s: 'x' })
		expect(listener).toHaveBeenCalled()
	})

	it('supports functional updates', () => {
		const store = createStore({ n: 1 })
		store.setState((s) => ({ n: s.n + 1 }))
		expect(store.getState().n).toBe(2)
	})
})
