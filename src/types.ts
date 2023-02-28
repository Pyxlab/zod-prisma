import { computeCustomSchema, computeModifiers } from './docs'

import type { DMMF } from '@prisma/generator-helper'

export const getZodConstructor = (
	field: DMMF.Field,
	getRelatedModelName = (name: string | DMMF.SchemaEnum | DMMF.OutputType | DMMF.SchemaArg) =>
		name.toString(),
) => {
	let zodType = 'z.unknown()'
	const extraModifiers: string[] = ['']

	const hasCoerce = field.documentation?.includes('coerce')

	if (field.kind === 'scalar') {
		switch (field.type) {
			case 'String':
				zodType = hasCoerce ? 'z.coerce.string()' : 'z.string()'
				break
			case 'Int':
				zodType = hasCoerce ? 'z.coerce.number()' : 'z.number()'
				extraModifiers.push('int()')
				break
			case 'BigInt':
				zodType = hasCoerce ? 'z.coerce.bigint()' : 'z.bigint()'
				break
			case 'DateTime':
				zodType = hasCoerce ? 'z.coerce.date()' : 'z.date()'
				break
			case 'Float':
				zodType = hasCoerce ? 'z.coerce.number()' : 'z.number()'
				break
			case 'Decimal':
				zodType = hasCoerce ? 'z.coerce.number()' : 'z.number()'
				break
			case 'Json':
				zodType = 'jsonSchema'
				break
			case 'Boolean':
				zodType = 'z.boolean()'
				break
			// TODO: Proper type for bytes fields
			case 'Bytes':
				zodType = 'z.unknown()'
				break
		}
	} else if (field.kind === 'enum') {
		zodType = `z.nativeEnum(${field.type})`
	} else if (field.kind === 'object') {
		zodType = getRelatedModelName(field.type)
	}

	if (field.isList) extraModifiers.push('array()')
	if (field.documentation) {
		const documentation = field.documentation.replace('.coerce', '')
		zodType = computeCustomSchema(documentation) ?? zodType
		extraModifiers.push(...computeModifiers(documentation))
	}
	if (!field.isRequired && field.type !== 'Json') extraModifiers.push('nullish()')
	// if (field.hasDefaultValue) extraModifiers.push('optional()')

	return `${zodType}${extraModifiers.join('.')}`
}
