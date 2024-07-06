import path from 'path'

import { getDMMF, getConfig } from '@prisma/sdk'
import execa from 'execa'
import glob from 'fast-glob'
import { readFile } from 'fs-extra'
import { Project } from 'ts-morph'
import { SemicolonPreference } from 'typescript'

import { configSchema, PrismaOptions } from '../../config'
import { populateModelFile, generateBarrelFile } from '../../generator'
import { snakeCase } from '../../change-case'

jest.setTimeout(10000)

const ftForDir = (dir: string) => async () => {
	const schemaFile = path.resolve(__dirname, dir, 'prisma/schema.prisma')
	const expectedDir = path.resolve(__dirname, dir, 'expected')
	const actualDir = path.resolve(__dirname, dir, 'actual')

	const project = new Project()

	const datamodel = await readFile(schemaFile, 'utf-8')

	const dmmf = await getDMMF({
		datamodel,
	})

	const { generators } = await getConfig({
		datamodel,
	})

	const generator = generators.find((generator) => generator.provider.value === 'zod-prisma')!
	const config = configSchema.parse(generator.config)

	const prismaClient = generators.find(
		(generator) => generator.provider.value === 'prisma-client-js'
	)!

	const outputPath = path.resolve(path.dirname(schemaFile), generator.output!.value)
	const clientPath = path.resolve(path.dirname(schemaFile), prismaClient.output!.value)

	const prismaOptions: PrismaOptions = {
		clientPath,
		outputPath,
		schemaPath: schemaFile,
	}

	const indexFile = project.createSourceFile(`${outputPath}/index.ts`, {}, { overwrite: true })

	generateBarrelFile(dmmf.datamodel.models, indexFile)

	indexFile.formatText({
		indentSize: 2,
		convertTabsToSpaces: true,
		semicolons: SemicolonPreference.Insert,
	})

	await indexFile.save()

	const actualIndexContents = await readFile(`${actualDir}/index.ts`, 'utf-8').then((contents) =>
		contents.replace(/"/g, "'").replace(/;/g, '')
	)

	const expectedIndexFile = path.resolve(expectedDir, `index.ts`)
	const expectedIndexContents = await readFile(
		path.resolve(expectedDir, expectedIndexFile),
		'utf-8'
	).then((contents) => contents.replace(/"/g, "'").replace(/;/g, ''))

	expect(actualIndexContents).toStrictEqual(expectedIndexContents)

	await Promise.all(
		dmmf.datamodel.models.map(async (model) => {
			const sourceFile = project.createSourceFile(
				`${actualDir}/${snakeCase(model.name)}.ts`,
				{},
				{ overwrite: true }
			)

			populateModelFile(model, sourceFile, config, prismaOptions)

			sourceFile.formatText({
				indentSize: 2,
				convertTabsToSpaces: true,
				semicolons: SemicolonPreference.Insert,
			})

			await sourceFile.save()
			const actualContents = await readFile(
				`${actualDir}/${snakeCase(model.name)}.ts`,
				'utf-8'
			).then((contents) => contents.replace(/"/g, "'").replace(/;/g, ''))

			const expectedFile = path.resolve(expectedDir, `${snakeCase(model.name)}.ts`)
			const expectedContents = await readFile(
				path.resolve(expectedDir, expectedFile),
				'utf-8'
			).then((contents) => contents.replace(/"/g, "'").replace(/;/g, ''))

			expect(actualContents).toStrictEqual(expectedContents)
		})
	)

	await project.save()
}

describe('Functional Tests', () => {
	jest.setTimeout(15000); // Increase the timeout to 30 seconds

	test.concurrent('Basic', ftForDir('basic'))
	test.concurrent('Config', ftForDir('config'))
	test.concurrent('Docs', ftForDir('docs'))
	test.concurrent('Different Client Path', ftForDir('different-client-path'))
	test.concurrent('Recursive Schema', ftForDir('recursive'))
	test.concurrent('relationModel = false', ftForDir('relation-false'))
	test.concurrent('Relation - 1 to 1', ftForDir('relation-1to1'))
	test.concurrent('Typename config', ftForDir('typename'))
	test.concurrent('Imports', ftForDir('imports'))
	test.concurrent('JSON', ftForDir('json'))
	test.concurrent('Optional fields', ftForDir('optional'))
	test.concurrent('Config Import', ftForDir('config-import'))

	test.concurrent('Type Check Everything', async () => {
		const typeCheckResults = await execa(
			path.resolve(__dirname, '../../../node_modules/.bin/tsc'),
			['--strict', '--noEmit', ...(await glob(`${__dirname}/*/expected/*.ts`))]
		)

		expect(typeCheckResults.exitCode).toBe(0)
	})
})
