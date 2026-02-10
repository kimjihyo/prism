import { z } from "zod/v4";

export const FactCardSchema = z.object({
  prNumber: z.number(),
  title: z.string(),
  summary: z.string().describe("1-2 sentence summary of the PR's purpose"),
  problem: z.string().describe("What problem or need this PR addresses"),
  approach: z.string().describe("Technical approach taken"),
  impact: z.string().describe("Measurable or qualitative impact"),
  technologies: z.array(z.string()).describe("Key technologies, frameworks, patterns used"),
  complexity: z.enum(["low", "medium", "high"]).describe("Estimated complexity"),
  category: z.string().describe("e.g., feature, bugfix, refactor, infra, docs"),
  keywords: z.array(z.string()).describe("Searchable keywords for clustering"),
});

export type FactCard = z.infer<typeof FactCardSchema>;
