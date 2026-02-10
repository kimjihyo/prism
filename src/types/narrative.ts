import { z } from "zod/v4";

export const StarNarrativeSchema = z.object({
  theme: z.string().describe("Narrative theme/title"),
  prNumbers: z.array(z.number()).describe("Source PR numbers"),
  situation: z.string().describe("Context and background"),
  task: z.string().describe("Specific responsibility or goal"),
  action: z.string().describe("What was done and how"),
  result: z.string().describe("Outcome and impact"),
});

export const CareNarrativeSchema = z.object({
  theme: z.string().describe("Narrative theme/title"),
  prNumbers: z.array(z.number()).describe("Source PR numbers"),
  context: z.string().describe("Project context and constraints"),
  action: z.string().describe("Technical actions taken"),
  result: z.string().describe("Measurable outcomes"),
  evolution: z.string().describe("Growth, lessons learned, or ongoing impact"),
});

export const NarrativeOutputSchema = z.object({
  generatedAt: z.string(),
  narratives: z.array(z.union([StarNarrativeSchema, CareNarrativeSchema])),
});

export type StarNarrative = z.infer<typeof StarNarrativeSchema>;
export type CareNarrative = z.infer<typeof CareNarrativeSchema>;
export type NarrativeOutput = z.infer<typeof NarrativeOutputSchema>;
