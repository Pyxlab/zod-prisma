import { z } from 'zod'

const configBoolean = z.enum(['true', 'false']).transform((arg) => JSON.parse(arg))
const configCase = z.enum(['PascalCase', 'camelCase', 'snake_case']).default('PascalCase')

export const configSchema = z.object({
	relationModel: configBoolean.default('true').or(z.literal('default')),
	modelSuffix: z.string().default('Model'),
	modelCase: configCase,
	useDecimalJs: configBoolean.default('false'),
	imports: z.string().optional(),
	prismaJsonNullability: configBoolean.default('true'),
	includeTypename: configBoolean.default('false').or(z.string()),
	typenameCase: configCase,
})

export type Config = z.infer<typeof configSchema>

export type PrismaOptions = {
	schemaPath: string
	outputPath: string
	clientPath: string
}

export type Names = {
	model: string
	related: string
}
