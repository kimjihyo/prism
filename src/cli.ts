#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { getConfig } from "./config.js";
import { collectPrIndex } from "./collector/index-collector.js";
import { collectPrDetails } from "./collector/detail-collector.js";
import { collectPrDiffs } from "./collector/diff-collector.js";
import { generateFactCards } from "./llm/fact-generator.js";
import { generateNarratives } from "./llm/narrative-generator.js";
import { AnthropicProvider } from "./llm/anthropic.js";
import { OpenAIProvider } from "./llm/openai.js";
import type { LlmProvider } from "./llm/provider.js";

function createLlmProvider(): LlmProvider {
  const config = getConfig();
  if (config.LLM_PROVIDER === "anthropic") {
    return new AnthropicProvider({
      apiKey: config.ANTHROPIC_API_KEY!,
      model: config.LLM_MODEL,
    });
  }
  return new OpenAIProvider({
    apiKey: config.OPENAI_API_KEY!,
    model: config.LLM_MODEL,
  });
}

const program = new Command();

program
  .name("prism")
  .description("GitHub PR data collector & STAR/CARE narrative generator")
  .version("1.0.0");

// --- collect-index ---
program
  .command("collect-index")
  .description("Collect PR index (metadata) via GitHub Search API")
  .requiredOption("--owner <owner>", "Repository owner")
  .requiredOption("--repo <repo>", "Repository name")
  .requiredOption("--author <author>", "PR author username")
  .option("--state <state>", "PR state filter", "merged")
  .action(async (opts) => {
    const spinner = ora("Collecting PR index...").start();
    try {
      const entries = await collectPrIndex(
        {
          owner: opts.owner,
          repo: opts.repo,
          author: opts.author,
          state: opts.state,
        },
        (count, total) => {
          spinner.text = `Collecting PR index... ${count}/${total}`;
        },
      );
      spinner.succeed(chalk.green(`Collected ${entries.length} PRs → pr_index.jsonl`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- collect-detail ---
program
  .command("collect-detail")
  .description("Collect detailed PR data (body, commits, files, reviews)")
  .requiredOption("--owner <owner>", "Repository owner")
  .requiredOption("--repo <repo>", "Repository name")
  .action(async (opts) => {
    const spinner = ora("Collecting PR details...").start();
    try {
      const details = await collectPrDetails(opts.owner, opts.repo, (current, total, prNumber) => {
        spinner.text = `Collecting PR details... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(chalk.green(`Collected details for ${details.length} PRs → pr_detail/`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- collect-diff ---
program
  .command("collect-diff")
  .description("Collect PR diffs via REST API")
  .requiredOption("--owner <owner>", "Repository owner")
  .requiredOption("--repo <repo>", "Repository name")
  .action(async (opts) => {
    const spinner = ora("Collecting PR diffs...").start();
    try {
      const count = await collectPrDiffs(opts.owner, opts.repo, (current, total, prNumber) => {
        spinner.text = `Collecting PR diffs... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(chalk.green(`Collected ${count} diffs → pr_diff/`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- generate-facts ---
program
  .command("generate-facts")
  .description("Generate FACT cards from PR data using LLM")
  .action(async () => {
    const spinner = ora("Generating FACT cards...").start();
    try {
      const provider = createLlmProvider();
      const cards = await generateFactCards(provider, (current, total, prNumber) => {
        spinner.text = `Generating FACT cards... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(chalk.green(`Generated ${cards.length} FACT cards → fact_cards/`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- generate-narratives ---
program
  .command("generate-narratives")
  .description("Generate STAR/CARE narratives from FACT cards")
  .action(async () => {
    const spinner = ora("Generating narratives...").start();
    try {
      const provider = createLlmProvider();
      const { star, care } = await generateNarratives(provider, (step, current, total) => {
        spinner.text = `Generating narratives [${step}]... ${current}/${total}`;
      });
      spinner.succeed(
        chalk.green(
          `Generated ${star.narratives.length} STAR + ${care.narratives.length} CARE narratives → narratives/`,
        ),
      );
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- run-all ---
program
  .command("run-all")
  .description("Run the full pipeline: collect → facts → narratives")
  .requiredOption("--owner <owner>", "Repository owner")
  .requiredOption("--repo <repo>", "Repository name")
  .requiredOption("--author <author>", "PR author username")
  .option("--state <state>", "PR state filter", "merged")
  .action(async (opts) => {
    console.log(chalk.bold("\n🔍 PRISM — Full Pipeline\n"));

    // Step 1: Collect Index
    let spinner = ora("Step 1/5: Collecting PR index...").start();
    try {
      const entries = await collectPrIndex(
        {
          owner: opts.owner,
          repo: opts.repo,
          author: opts.author,
          state: opts.state,
        },
        (count, total) => {
          spinner.text = `Step 1/5: Collecting PR index... ${count}/${total}`;
        },
      );
      spinner.succeed(`Step 1/5: Collected ${entries.length} PRs`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 2: Collect Details
    spinner = ora("Step 2/5: Collecting PR details...").start();
    try {
      const details = await collectPrDetails(opts.owner, opts.repo, (current, total, prNumber) => {
        spinner.text = `Step 2/5: Collecting PR details... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(`Step 2/5: Collected ${details.length} PR details`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 3: Collect Diffs
    spinner = ora("Step 3/5: Collecting PR diffs...").start();
    try {
      const count = await collectPrDiffs(opts.owner, opts.repo, (current, total, prNumber) => {
        spinner.text = `Step 3/5: Collecting PR diffs... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(`Step 3/5: Collected ${count} diffs`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 4: Generate FACT Cards
    spinner = ora("Step 4/5: Generating FACT cards...").start();
    try {
      const provider = createLlmProvider();
      const cards = await generateFactCards(provider, (current, total, prNumber) => {
        spinner.text = `Step 4/5: Generating FACT cards... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(`Step 4/5: Generated ${cards.length} FACT cards`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 5: Generate Narratives
    spinner = ora("Step 5/5: Generating narratives...").start();
    try {
      const provider = createLlmProvider();
      const { star, care } = await generateNarratives(provider, (step, current, total) => {
        spinner.text = `Step 5/5: Generating narratives [${step}]... ${current}/${total}`;
      });
      spinner.succeed(
        `Step 5/5: Generated ${star.narratives.length} STAR + ${care.narratives.length} CARE narratives`,
      );
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    console.log(chalk.bold.green("\nPipeline complete! Check the data/ directory.\n"));
  });

program.parse();
