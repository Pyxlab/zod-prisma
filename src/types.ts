import { computeCustomSchema, computeModifiers } from './docs'
import type { DMMF } from '@prisma/generator-helper'

const getMessage = (content: string, clonedField: DMMF.Field) => {
	const messageMatch = content.match(/message\((?<message>.*)\)/)

	if (messageMatch?.groups?.message && messageMatch.groups.message.startsWith('{')) {
		return messageMatch.groups.message
	} else if (messageMatch?.groups?.message && !messageMatch.groups.message.startsWith('{')) {
		return clonedField.isRequired
			? `{ required_error: ${messageMatch.groups.message} }`
			: `{ invalid_type_error: ${messageMatch.groups.message} }`
	}

	return ''
}

export const getZodConstructor = (
	field: DMMF.Field,
	getRelatedModelName = (name: string | DMMF.SchemaEnum | DMMF.OutputType | DMMF.SchemaArg) =>
		name.toString()
) => {
	const clonedField = { ...field }

	let zodType = 'z.unknown()'
	const extraModifiers: string[] = ['']

	const hasCoerce = clonedField.documentation?.includes('coerce')
	const hasMessage = clonedField.documentation?.includes('.message(')

	const messageRegex = /(?<message>\.message\((?<messageContent>.*?)\))/g

	let message = ''
	if (hasMessage) {
		const content = clonedField.documentation?.match(messageRegex)?.[0]!
		message = getMessage(content, clonedField)
		clonedField.documentation = clonedField.documentation?.replace(content, '')
	}

	switch (clonedField.kind) {
		case 'scalar':
			switch (clonedField.type) {
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
				case 'Bytes':
					zodType = 'z.unknown()'
					break
			}
			break
		case 'enum':
			zodType = `z.nativeEnum(${clonedField.type}${hasMessage ? ', ' + message : ''})`
			break
		case 'object':
			zodType = getRelatedModelName(clonedField.type)
			break
	}

	if (clonedField.isList) extraModifiers.push('array()')
	if (clonedField.documentation) {
		let documentation: string

		if (clonedField.documentation.includes('.custom(')) {
			const [left, right] = clonedField.documentation.split('.custom(')
			documentation = left.replace('.coerce', '') + '.custom(' + right
		} else {
			documentation = clonedField.documentation.replace('.coerce', '')
		}

		zodType = computeCustomSchema(documentation, message) ?? zodType
		extraModifiers.push(...computeModifiers(documentation))
	}
	if (!clonedField.isRequired && clonedField.type !== 'Json') extraModifiers.push('nullish()')

	return `${zodType}${extraModifiers.join('.')}`
}
