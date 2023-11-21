import { ArrayTree, parse, stringify } from 'parenthesis'

import { chunk } from './util'

export const getJSDocs = (docString?: string) => {
	const lines: string[] = []

	if (docString) {
		const docLines = docString.split('\n').filter((dL) => !dL.trimStart().startsWith('@zod'))

		if (docLines.length) {
			lines.push('/**')
			docLines.forEach((dL) => lines.push(` * ${dL}`))
			lines.push(' */')
		}
	}

	return lines
}

export const getZodDocElements = (docString: string) =>
	docString
		.split('\n')
		.filter((line) => line.trimStart().startsWith('@zod'))
		.map((line) => line.trimStart().slice(4))
		.flatMap((line) =>
			// Array.from(line.matchAll(/\.([^().]+\(.*?\))/g), (m) => m.slice(1)).flat()
			chunk(parse(line), 2)
				.slice(0, -1)
				.map(
					([each, contents]) =>
						(each as string).replace(/\)?\./, '') +
						`${stringify(contents as ArrayTree)})`
				)
		)

const primitives = new Map(
	[
		'string',
		'number',
		'bigint',
		'boolean',
		'date',
		'symbol',
		'undefined',
		'null',
		'void',
		'any',
		'unknown',
		'never',
	].map((item) => [`${item}()`, item])
)

const isPrimitiveZod = (item: string) => {
	return primitives.get(item)
}

export const computeCustomSchema = (docString: string, message: string) => {
	let setMessage = false
	return getZodDocElements(docString)
		.find((modifier) => modifier.startsWith('custom('))
		?.slice(7)
		.slice(0, -1)
		.split('.')
		.map((item) => {
			const hasPrimitive = isPrimitiveZod(item)

			if (hasPrimitive && !setMessage) {
				setMessage = true
				return `${hasPrimitive}(${message})`
			}

			return item
		})
		.join('.')
}

export const computeModifiers = (docString: string) => {
	return getZodDocElements(docString).filter((each) => !each.startsWith('custom('))
}
