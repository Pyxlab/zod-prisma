import { DMMF } from '@prisma/generator-helper'

import { Config } from './config'

import type { CodeBlockWriter } from 'ts-morph'

export const writeArray = (writer: CodeBlockWriter, array: string[], newLine = true) =>
	array.forEach((line) => writer.write(line).conditionalNewLine(newLine))

export const useModelNames = ({ modelCase, modelSuffix, relationModel }: Config) => {
	const formatModelName = (name: string, prefix = '') => {
		if (modelCase === 'camelCase') {
			name = name.slice(0, 1).toLowerCase() + name.slice(1)
		}
		return `${prefix}${name}${modelSuffix}`
	}

	return {
		modelName: (name: string) => formatModelName(name, relationModel === 'default' ? '_' : ''),
		relatedModelName: (name: string | DMMF.SchemaEnum | DMMF.OutputType | DMMF.SchemaArg) =>
			formatModelName(
				relationModel === 'default' ? name.toString() : `Related${name.toString()}`
			),
	}
}

export const needsRelatedModel = (model: DMMF.Model, config: Config) =>
	model.fields.some((field) => field.kind === 'object') && config.relationModel !== false

export const chunk = <T extends any[]>(input: T, size: number): T[] => {
	return input.reduce((arr, item, idx) => {
		return idx % size === 0
			? [...arr, [item]]
			: [...arr.slice(0, -1), [...arr.slice(-1)[0], item]]
	}, [])
}

export const dotSlash = (input: string) => {
	const converted = input
		.replace(/^\\\\\?\\/, '')
		.replace(/\\/g, '/')
		.replace(/\/\/+/g, '/')

	if (converted.includes(`/node_modules/`)) return converted.split(`/node_modules/`).slice(-1)[0]

	if (converted.startsWith(`../`)) return converted

	return './' + converted
}

// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu

// Used to iterate over the initial split result and separate numbers.
const SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u

// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu

// The replacement value for splits.
const SPLIT_REPLACE_VALUE = '$1\0$2'

// The default characters to keep after transforming case.
const DEFAULT_PREFIX_SUFFIX_CHARACTERS = ''

/**
 * Supported locale values. Use `false` to ignore locale.
 * Defaults to `undefined`, which uses the host environment.
 */
export type Locale = string[] | string | false | undefined

/**
 * Options used for converting strings to pascal/camel case.
 */
export interface PascalCaseOptions extends Options {
	mergeAmbiguousCharacters?: boolean
}

/**
 * Options used for converting strings to any case.
 */
export interface Options {
	locale?: Locale
	split?: (value: string) => string[]
	/** @deprecated Pass `split: splitSeparateNumbers` instead. */
	separateNumbers?: boolean
	delimiter?: string
	prefixCharacters?: string
	suffixCharacters?: string
}

/**
 * Split any cased input strings into an array of words.
 */
export function split(value: string) {
	let result = value.trim()

	result = result
		.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE)
		.replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE)

	result = result.replace(DEFAULT_STRIP_REGEXP, '\0')

	let start = 0
	let end = result.length

	// Trim the delimiter from around the output string.
	while (result.charAt(start) === '\0') start++
	if (start === end) return []
	while (result.charAt(end - 1) === '\0') end--

	return result.slice(start, end).split(/\0/g)
}

/**
 * Split the input string into an array of words, separating numbers.
 */
export function splitSeparateNumbers(value: string) {
	const words = split(value)
	for (let i = 0; i < words.length; i++) {
		const word = words[i]
		const match = SPLIT_SEPARATE_NUMBER_RE.exec(word)
		if (match) {
			const offset = match.index + (match[1] ?? match[2]).length
			words.splice(i, 1, word.slice(0, offset), word.slice(offset))
		}
	}
	return words
}

/**
 * Convert a string to space separated lower case (`foo bar`).
 */
export function noCase(input: string, options?: Options) {
	const [prefix, words, suffix] = splitPrefixSuffix(input, options)
	return (
		prefix + words.map(lowerFactory(options?.locale)).join(options?.delimiter ?? ' ') + suffix
	)
}

/**
 * Convert a string to snake case (`foo_bar`).
 */
export function snakeCase(input: string, options?: Options) {
	return noCase(input, { delimiter: '_', ...options })
}

function lowerFactory(locale: Locale): (input: string) => string {
	return locale === false
		? (input: string) => input.toLowerCase()
		: (input: string) => input.toLocaleLowerCase(locale)
}

function splitPrefixSuffix(input: string, options: Options = {}): [string, string[], string] {
	const splitFn = options.split ?? (options.separateNumbers ? splitSeparateNumbers : split)
	const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS
	const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS
	let prefixIndex = 0
	let suffixIndex = input.length

	while (prefixIndex < input.length) {
		const char = input.charAt(prefixIndex)
		if (!prefixCharacters.includes(char)) break
		prefixIndex++
	}

	while (suffixIndex > prefixIndex) {
		const index = suffixIndex - 1
		const char = input.charAt(index)
		if (!suffixCharacters.includes(char)) break
		suffixIndex = index
	}

	return [
		input.slice(0, prefixIndex),
		splitFn(input.slice(prefixIndex, suffixIndex)),
		input.slice(suffixIndex),
	]
}
