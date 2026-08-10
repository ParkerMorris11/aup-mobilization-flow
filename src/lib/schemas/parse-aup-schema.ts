import { z } from "zod";

export const parsedAupSectionsSchema = z.object({
  topRulesToRemember: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Top 3 rules every employee should remember"),
  permittedUse: z
    .array(z.string())
    .min(1)
    .describe("What employees can do with AI"),
  approvedTools: z
    .array(z.string())
    .min(1)
    .describe("Approved AI tools employees may use"),
  dataToProtect: z
    .array(z.string())
    .min(1)
    .describe("Data categories that must never go into AI tools"),
  accountability: z
    .array(z.string())
    .min(1)
    .describe("Employee responsibilities and accountability"),
  whenUnsure: z
    .array(z.string())
    .min(1)
    .describe("What to do when uncertain — escalation paths"),
});

export const parseAupResponseSchema = z.object({
  sections: parsedAupSectionsSchema,
  confidence: z.number().min(0).max(1),
});

export type ParsedAupSectionsOutput = z.infer<typeof parsedAupSectionsSchema>;

/**
 * Bullet + a verbatim source quote, so grounding can be verified by exact
 * substring match against the source document instead of estimated.
 */
const groundedBullet = z.object({
  text: z.string().describe("Plain-language employee-facing bullet"),
  quote: z
    .string()
    .describe(
      "A short verbatim quote (a few words to one sentence) copied EXACTLY from the source policy text that directly supports this bullet. Must be an exact substring of the source — do not paraphrase the quote."
    ),
});

// min(0), not min(1): a policy legitimately may not address every section.
// Forcing a minimum count pressures the model to invent content just to
// satisfy the schema — an empty array is the honest, correct answer when a
// topic genuinely isn't covered in the source document.
export const groundedAupSectionsSchema = z.object({
  topRulesToRemember: z.array(groundedBullet).min(0).max(5),
  permittedUse: z.array(groundedBullet).min(0),
  approvedTools: z.array(groundedBullet).min(0),
  dataToProtect: z.array(groundedBullet).min(0),
  accountability: z.array(groundedBullet).min(0),
  whenUnsure: z.array(groundedBullet).min(0),
  originalSectionLabels: z
    .object({
      topRulesToRemember: z.string().nullable().optional(),
      permittedUse: z.string().nullable().optional(),
      approvedTools: z.string().nullable().optional(),
      dataToProtect: z.string().nullable().optional(),
      accountability: z.string().nullable().optional(),
      whenUnsure: z.string().nullable().optional(),
    })
    .describe(
      "For each section, the client's own heading/label from their document, if one clearly applied — null if the section was inferred from scattered content rather than a labeled part of the document."
    ),
});

export type GroundedAupSectionsOutput = z.infer<typeof groundedAupSectionsSchema>;

/** Per-section clarifying questions for LX staff to use in client outreach on sparse sections */
export const clarifyingPromptsSchema = z.object({
  sections: z
    .array(
      z.object({
        sectionKey: z
          .enum([
            "topRulesToRemember",
            "permittedUse",
            "approvedTools",
            "dataToProtect",
            "accountability",
            "whenUnsure",
          ])
          .describe("Which of the 6 employee sections these questions are for"),
        questions: z
          .array(z.string())
          .min(1)
          .max(3)
          .describe("Clarifying questions to ask the client about this section"),
      })
    )
    .describe("One entry per sparse section that was passed in"),
});

export type ClarifyingPromptsOutput = z.infer<typeof clarifyingPromptsSchema>;
