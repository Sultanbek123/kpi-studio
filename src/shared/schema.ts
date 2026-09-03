import { z } from 'zod'
import { BASE_METRICS, DIMENSION_FIELDS, type BaseMetric, type DimensionField } from './types'

/** Zod mirrors of the types in ./types.ts, used to validate everything
 * that crosses the renderer -> main IPC boundary. Casting to a literal
 * tuple (rather than `[string, ...string[]]`) keeps z.infer producing the
 * real union types (DimensionField/BaseMetric) instead of widening to
 * `string`. */
const dimensionFieldTuple = DIMENSION_FIELDS as [DimensionField, ...DimensionField[]]
const baseMetricTuple = BASE_METRICS as unknown as [BaseMetric, ...BaseMetric[]]

export const MetricKindSchema = z.enum(['plan', 'fact'])

export const ColumnRoleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dimension'), field: z.enum(dimensionFieldTuple) }),
  z.object({
    type: z.literal('metric'),
    metric: z.enum(baseMetricTuple),
    kind: MetricKindSchema
  }),
  z.object({ type: z.literal('ignore') })
])

export const ColumnMappingSchema = z.object({
  columnIndex: z.number().int().min(0),
  header: z.string(),
  role: ColumnRoleSchema,
  confidence: z.number().min(0).max(1).optional()
})

export const PreviewSheetRequestSchema = z.object({
  filePath: z.string().min(1),
  sheetName: z.string().min(1),
  maxRows: z.number().int().positive().max(500).default(50)
})

export const ImportPreviewRequestSchema = z.object({
  filePath: z.string().min(1),
  sheetName: z.string().min(1),
  headerRowIndex: z.number().int().min(0),
  columnMap: z.array(ColumnMappingSchema),
  campaignName: z.string().min(1),
  fallbackDate: z.string().min(1)
})

export const ImportCommitRequestSchema = z.object({
  filePath: z.string().min(1),
  sheetName: z.string().min(1),
  headerRowIndex: z.number().int().min(0),
  columnMap: z.array(ColumnMappingSchema),
  campaignName: z.string().min(1),
  fallbackDate: z.string().min(1), // ISO date used when no date column is mapped
  saveAsTemplateName: z.string().min(1).optional(),
  templateAgency: z.string().optional()
})

export const SaveTemplateRequestSchema = z.object({
  name: z.string().min(1),
  agency: z.string().optional(),
  headerRow: z.number().int().min(0),
  sheetNameHint: z.string().optional(),
  columnMap: z.array(ColumnMappingSchema)
})

export type PreviewSheetRequest = z.infer<typeof PreviewSheetRequestSchema>
export type ImportPreviewRequest = z.infer<typeof ImportPreviewRequestSchema>
export type ImportCommitRequest = z.infer<typeof ImportCommitRequestSchema>
export type SaveTemplateRequest = z.infer<typeof SaveTemplateRequestSchema>
