import { describe, expect, it } from 'vitest'
import { deleteRangesFromText } from 'src/utils/text'

describe('deleteRangesFromText', () => {
	const text = '0123456789'

	it('deletes a single range', () => {
		const { newText, deleteds } = deleteRangesFromText(text, [{ start: 2, end: 5 }])
		expect(newText).toBe('0156789')
		expect(deleteds).toHaveLength(1)
		expect(deleteds[0].deleted).toBe('234')
	})

	it('deletes multiple disjoint ranges atomically (indices refer to original text)', () => {
		const { newText } = deleteRangesFromText(text, [
			{ start: 0, end: 2 },
			{ start: 8, end: 10 },
		])
		expect(newText).toBe('234567')
	})

	it('merges overlapping ranges', () => {
		const { newText, deleteds } = deleteRangesFromText(text, [
			{ start: 2, end: 6 },
			{ start: 4, end: 8 },
		])
		expect(newText).toBe('0189')
		expect(deleteds).toHaveLength(1)
		expect(deleteds[0].deleted).toBe('234567')
	})

	it('merges adjacent ranges', () => {
		const { newText } = deleteRangesFromText(text, [
			{ start: 2, end: 4 },
			{ start: 4, end: 6 },
		])
		expect(newText).toBe('016789')
	})

	it('accepts unsorted input ranges', () => {
		const { newText } = deleteRangesFromText(text, [
			{ start: 7, end: 9 },
			{ start: 1, end: 3 },
		])
		expect(newText).toBe('034569')
	})

	it('returns the original text for no ranges', () => {
		const { newText, deleteds } = deleteRangesFromText(text, [])
		expect(newText).toBe(text)
		expect(deleteds).toHaveLength(0)
	})

	it('throws on out-of-bounds or inverted ranges', () => {
		expect(() => deleteRangesFromText(text, [{ start: -1, end: 3 }])).toThrow()
		expect(() => deleteRangesFromText(text, [{ start: 0, end: 11 }])).toThrow()
		expect(() => deleteRangesFromText(text, [{ start: 5, end: 2 }])).toThrow()
	})

	it('preserves extra properties on ranges in deleteds (used by asset block refs)', () => {
		const { deleteds } = deleteRangesFromText(text, [{ start: 2, end: 5, tag: 'block' }])
		expect(deleteds[0].range.tag).toBe('block')
	})
})
