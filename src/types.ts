import { computeCustomSchema, computeModifiers } from './docs'

import type { DMMF } from '@prisma/generator-helper'

export const getZodConstructor = (
	field: DMMF.Field,
	getRelatedModelName = (name: string | DMMF.SchemaEnum | DMMF.OutputType | DMMF.SchemaArg) =>
		name.toString()
) => {
	let zodType = 'z.unknown()'
	const extraModifiers: string[] = ['']

	const hasCoerce = field.documentation?.includes('coerce')
	const hasMessage = field.documentation?.includes('.message(')
	const messageRegex = /message\((?<message>.*)\)/

	let message = ''
	if (hasMessage) {
		const messageMatch = field.documentation?.match(messageRegex)

		if (messageMatch?.groups?.message && messageMatch.groups.message.startsWith('{')) {
			message = messageMatch.groups.message
		} else if (messageMatch?.groups?.message && !messageMatch.groups.message.startsWith('{')) {
			message = field.isRequired
				? `{ required_error: ${messageMatch.groups.message} }`
				: `{ invalid_type_error: ${messageMatch.groups.message} }`
		}
	}

	if (field.kind === 'scalar') {
		switch (field.type) {
			case 'String':
				zodType = hasCoerce ? `z.coerce.string(${message})` : `z.string(${message})`
				break
			case 'Int':
				zodType = hasCoerce ? `z.coerce.number(${message})` : `z.number(${message})`
				extraModifiers.push('int()')
				break
			case 'BigInt':
				zodType = hasCoerce ? `z.coerce.bigint(${message})` : `z.bigint(${message})`
				break
			case 'DateTime':
				zodType = hasCoerce ? `z.coerce.date(${message})` : `z.date(${message})`
				break
			case 'Float':
				zodType = hasCoerce ? `z.coerce.number(${message})` : `z.number(${message})`
				break
			case 'Decimal':
				zodType = hasCoerce ? `z.coerce.number(${message})` : `z.number(${message})`
				break
			case 'Json':
				zodType = 'jsonSchema'
				break
			case 'Boolean':
				zodType = `z.boolean(${message})`
				break
			// TODO: Proper type for bytes fields
			case 'Bytes':
				zodType = 'z.unknown()'
				break
		}
	} else if (field.kind === 'enum') {
		zodType = `z.nativeEnum(${field.type}${hasMessage ? ', ' + message : ''})`
	} else if (field.kind === 'object') {
		zodType = getRelatedModelName(field.type)
	}

	if (field.isList) extraModifiers.push('array()')
	if (field.documentation) {
		let documentation: string

		if (field.documentation.includes('.custom(')) {
			const [left, right] = field.documentation.split('.custom(')
			documentation = left.replace('.coerce', '') + '.custom(' + right
		} else {
			documentation = field.documentation.replace('.coerce', '')
		}

		zodType = computeCustomSchema(documentation) ?? zodType
		extraModifiers.push(...computeModifiers(documentation))
	}
	if (!field.isRequired && field.type !== 'Json') extraModifiers.push('nullish()')
	// if (field.hasDefaultValue) extraModifiers.push('optional()')

	return `${zodType}${extraModifiers.join('.')}`
}
