import { z } from 'zod'

import { optionValueProblems } from './option-values'

const QuestionOptionSchema = z
  .object({
    value: z.string().min(1, "Option 'value' cannot be empty."),
    label: z.string().min(1, "Option 'label' cannot be empty."),
    nextSectionId: z.string().optional(),
    isOther: z.boolean().optional(),
  })
  .strict()

const OPTION_VALUE_MESSAGES = {
  duplicate: 'Option values must be unique.',
  reserved: "'other' is reserved for the Other option.",
} as const

/** Duplicate and reserved values (v0 0.0.49); an empty value is `min(1)`'s. */
function refineOptionValues(
  options: readonly { value: string; isOther?: boolean }[],
  ctx: z.RefinementCtx
) {
  optionValueProblems(options).forEach((problem, index) => {
    if (problem === 'duplicate' || problem === 'reserved')
      ctx.addIssue({
        code: 'custom',
        path: [index, 'value'],
        message: OPTION_VALUE_MESSAGES[problem],
      })
  })
}

const BaseValidationRulesSchema = z.object({
  required: z.boolean().optional(),
})

/** v0 stores NaN/null bounds; both mean "no bound". */
const optionalBound = z
  .number()
  .nullish()
  .transform((value) =>
    value === null || (typeof value === 'number' && Number.isNaN(value))
      ? undefined
      : value
  )
  .optional()

const LengthRuleSchema = z.object({
  type: z.literal('length'),
  rule: z.enum(['min', 'max']),
  value: z.number().int().min(0),
  customError: z.string().optional(),
})

const RegexRuleSchema = z.object({
  type: z.literal('regex'),
  rule: z.enum(['contains', 'not_contains', 'matches', 'not_matches']),
  value: z.string(),
  customError: z.string().optional(),
})

const CustomValidationRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('number'),
    rule: z.enum([
      'gt',
      'gte',
      'lt',
      'lte',
      'eq',
      'neq',
      'between',
      'not_between',
      'is_number',
      'is_whole',
    ]),
    value: optionalBound,
    value2: optionalBound,
    customError: z.string().optional(),
  }),
  z.object({
    type: z.literal('text'),
    rule: z.enum(['contains', 'not_contains', 'is_email', 'is_url']),
    value: z.string().optional(),
    customError: z.string().optional(),
  }),
  LengthRuleSchema,
  RegexRuleSchema,
])

const MultipleChoiceValidationRuleSchema = z.object({
  rule: z.enum(['min', 'max', 'exact']),
  value: z.number().int().min(1, 'Value must be at least 1.'),
  customError: z.string().optional(),
})

const BaseQuestionSchema = z.object({
  id: z.string().min(1, "Question 'id' cannot be empty."),
  label: z.string(),
  description: z.string().optional(),
  validation: BaseValidationRulesSchema.optional(),
  locked: z.boolean().optional(),
})

export const SectionHeaderSchema = z.object({
  id: z.string().min(1),
  type: z.literal('section-header'),
  title: z.string().min(1),
  description: z.string().optional(),
  locked: z.boolean().optional(),
  action: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('submit') }).strict(),
      z
        .object({ type: z.literal('jump'), targetSectionId: z.string().min(1) })
        .strict(),
    ])
    .optional(),
})

export const ShortTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('short-text'),
  validation: BaseValidationRulesSchema.extend({
    custom: CustomValidationRuleSchema.optional(),
  }).optional(),
})

export const LongTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('long-text'),
  validation: BaseValidationRulesSchema.extend({
    custom: z
      .discriminatedUnion('type', [LengthRuleSchema, RegexRuleSchema])
      .optional(),
  }).optional(),
})

export const LinearScaleQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('linear-scale'),
  min: z.number().default(0),
  max: z.number().default(10),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  validation: BaseValidationRulesSchema.optional(),
})

const ShuffleValidationSchema = BaseValidationRulesSchema.extend({
  shuffleOptions: z.boolean().optional(),
})

export const SingleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('single-choice'),
  options: z
    .array(QuestionOptionSchema)
    .min(1, 'Single-choice questions must have at least one option.')
    .superRefine(refineOptionValues),
  validation: ShuffleValidationSchema.optional(),
})

export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('multiple-choice'),
  options: z
    .array(QuestionOptionSchema.omit({ nextSectionId: true }))
    .min(1, 'Multiple-choice questions must have at least one option.')
    .superRefine(refineOptionValues),
  validation: ShuffleValidationSchema.extend({
    custom: MultipleChoiceValidationRuleSchema.optional(),
  }).optional(),
})

export const DropdownQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('dropdown'),
  options: z
    .array(QuestionOptionSchema)
    .min(1, 'Dropdown questions must have at least one option.')
    .superRefine(refineOptionValues),
  validation: ShuffleValidationSchema.optional(),
})

export const RatingQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('rating'),
  levels: z.number().min(2).max(10).default(5),
  symbol: z.enum(['star', 'heart', 'thumb']).default('star'),
  validation: BaseValidationRulesSchema.optional(),
})

export const DateQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('date'),
  includeTime: z.boolean().optional().default(false),
  includeYear: z.boolean().optional().default(true),
  validation: BaseValidationRulesSchema.optional(),
})

export const TimeQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('time'),
  answerType: z.enum(['time', 'duration']).default('time'),
  validation: BaseValidationRulesSchema.optional(),
})

export const SurveyItemSchema = z.discriminatedUnion('type', [
  SectionHeaderSchema,
  ShortTextQuestionSchema,
  LongTextQuestionSchema,
  LinearScaleQuestionSchema,
  SingleChoiceQuestionSchema,
  MultipleChoiceQuestionSchema,
  DropdownQuestionSchema,
  RatingQuestionSchema,
  DateQuestionSchema,
  TimeQuestionSchema,
])

export const SurveySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    items: z.array(SurveyItemSchema),
  })
  .superRefine((survey, ctx) => {
    // Item ids are form field names and branching targets: duplicates collapse.
    const seen = new Set<string>()
    survey.items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'id'],
          message: `Duplicate item id "${item.id}".`,
        })
        return
      }
      seen.add(item.id)
    })
  })

export type Survey = z.infer<typeof SurveySchema>
export type SurveyItem = z.infer<typeof SurveyItemSchema>
export type SectionHeader = z.infer<typeof SectionHeaderSchema>
export type SurveyQuestion = Exclude<SurveyItem, { type: 'section-header' }>
export type QuestionKind = SurveyQuestion['type']
export type QuestionOption = z.infer<typeof QuestionOptionSchema>
export type CustomValidationRule = z.infer<typeof CustomValidationRuleSchema>
export type ShortTextQuestion = z.infer<typeof ShortTextQuestionSchema>
export type LongTextQuestion = z.infer<typeof LongTextQuestionSchema>
export type LinearScaleQuestion = z.infer<typeof LinearScaleQuestionSchema>
export type SingleChoiceQuestion = z.infer<typeof SingleChoiceQuestionSchema>
export type MultipleChoiceQuestion = z.infer<
  typeof MultipleChoiceQuestionSchema
>
export type DropdownQuestion = z.infer<typeof DropdownQuestionSchema>
export type RatingQuestion = z.infer<typeof RatingQuestionSchema>
export type DateQuestion = z.infer<typeof DateQuestionSchema>
export type TimeQuestion = z.infer<typeof TimeQuestionSchema>
export type ValidationRules = z.infer<typeof BaseValidationRulesSchema>
/** A survey as stored (before defaults); `Survey` is assignable to it. */
export type SurveyInput = z.input<typeof SurveySchema>
