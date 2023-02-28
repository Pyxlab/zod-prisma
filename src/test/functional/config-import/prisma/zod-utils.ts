import { Decimal } from 'decimal.js'
import { z } from 'zod'

export const decimalSchema = z
	.union([z.string(), z.number()])
	.transform((value) => new Decimal(value))
