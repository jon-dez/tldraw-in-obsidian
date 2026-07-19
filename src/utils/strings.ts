export const hasKeywords = (input: string, keyword1: string, keyword2: string) => {
	const pattern = new RegExp(`${keyword1}(.*?)${keyword2}`, 's')
	return pattern.test(input)
}

export const extractDataBetweenKeywords = (input: string, keyword1: string, keyword2: string) => {
	const pattern = new RegExp(`${keyword1}(.*?)${keyword2}`, 's')
	const match = input.match(pattern)
	return match ? match[1] : null
}

export const replaceBetweenKeywords = (
	input: string,
	keyword1: string,
	keyword2: string,
	replacement: string
) => {
	const regex = new RegExp(`${keyword1}[\\s\\S]*?${keyword2}`, 'g')
	// A replacer function inserts the replacement literally; a replacement
	// string would interpret $-patterns ($&, $', $1…) that can occur in
	// arbitrary drawing data and corrupt the output.
	return input.replace(regex, () => `${keyword1}\n${replacement}\n${keyword2}`)
}
