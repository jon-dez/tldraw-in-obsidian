import { describe, expect, it } from 'vitest'
import { TLDATA_DELIMITER_END, TLDATA_DELIMITER_START } from 'src/plugin/document/constants'
import {
	extractDataBetweenKeywords,
	hasKeywords,
	replaceBetweenKeywords,
} from 'src/utils/strings'
import { clamp, msToSeconds, safeSecondsToMs } from 'src/utils/numbers'

const doc = (payload: string) =>
	`prefix\n${TLDATA_DELIMITER_START}\n${payload}\n${TLDATA_DELIMITER_END}\nsuffix`

describe('hasKeywords', () => {
	it('detects the tldraw data delimiters', () => {
		expect(hasKeywords(doc('{}'), TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)).toBe(true)
	})

	it('is false when either delimiter is missing', () => {
		expect(hasKeywords('no delimiters here', TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)).toBe(
			false
		)
		expect(
			hasKeywords(`${TLDATA_DELIMITER_START} only start`, TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)
		).toBe(false)
	})

	it('matches across newlines (dotall)', () => {
		expect(
			hasKeywords(doc('line1\nline2\nline3'), TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)
		).toBe(true)
	})
})

describe('extractDataBetweenKeywords', () => {
	it('extracts the payload between the delimiters', () => {
		const payload = '{\n\t"a": 1\n}'
		expect(extractDataBetweenKeywords(doc(payload), TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)).toBe(
			`\n${payload}\n`
		)
	})

	it('returns null when there is no match', () => {
		expect(extractDataBetweenKeywords('nothing', TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)).toBe(
			null
		)
	})

	it('extracts lazily (first end delimiter wins)', () => {
		const input = doc('first') + `\n${TLDATA_DELIMITER_END}`
		expect(extractDataBetweenKeywords(input, TLDATA_DELIMITER_START, TLDATA_DELIMITER_END)).toBe(
			'\nfirst\n'
		)
	})
})

describe('replaceBetweenKeywords', () => {
	it('replaces the payload and keeps surrounding text', () => {
		const result = replaceBetweenKeywords(
			doc('old'),
			TLDATA_DELIMITER_START,
			TLDATA_DELIMITER_END,
			'new'
		)
		expect(result).toBe(doc('new'))
	})

	it('replaces all delimiter pairs (global regex)', () => {
		const input = `${doc('one')}\n${doc('two')}`
		const result = replaceBetweenKeywords(input, TLDATA_DELIMITER_START, TLDATA_DELIMITER_END, 'X')
		expect(result).toBe(`${doc('X')}\n${doc('X')}`)
	})

	/**
	 * Characterization of current (buggy) behavior: the replacement string is
	 * passed straight to String.replace, so `$`-patterns are interpreted as
	 * replacement templates. Drawing data containing e.g. `$&` would corrupt
	 * the saved file. Documented here; fix deferred (see refactor-bugs memory).
	 */
	it('currently interprets $-patterns in the replacement (known quirk)', () => {
		const result = replaceBetweenKeywords(doc('old'), TLDATA_DELIMITER_START, TLDATA_DELIMITER_END, '$&')
		// '$&' expands to the whole match instead of the literal characters.
		expect(result).not.toBe(doc('$&'))
		expect(result).toContain('old')
	})
})

describe('numeric helpers', () => {
	it('clamp', () => {
		expect(clamp(5, 0, 10)).toBe(5)
		expect(clamp(-1, 0, 10)).toBe(0)
		expect(clamp(11, 0, 10)).toBe(10)
	})

	it('msToSeconds / safeSecondsToMs', () => {
		expect(msToSeconds(1500)).toBe(1.5)
		expect(safeSecondsToMs(1.5)).toBe(1500)
		expect(safeSecondsToMs(0.0004)).toBe(0)
	})
})
