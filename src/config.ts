import "dotenv/config";
import { z } from "zod/v4";

const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  LLM_PROVIDER: z.enum(["anthropic", "openai", "claude-code"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  DATA_DIR: z.string().default("./data"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment variable validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const env = result.data;

  if (env.LLM_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
    process.exit(1);
  }
  if (env.LLM_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
    process.exit(1);
  }

  return env;
}

export type Config = ReturnType<typeof loadConfig>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}
