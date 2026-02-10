#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { confirm, checkbox } from "@inquirer/prompts";
import { getConfig } from "./config.js";
import { collectPrIndex } from "./collector/index-collector.js";
import { collectPrDetails } from "./collector/detail-collector.js";
import { collectPrDiffs } from "./collector/diff-collector.js";
import { generateFactCards } from "./llm/fact-generator.js";
import { generateNarratives } from "./llm/narrative-generator.js";
import { exportMarkdown } from "./export/markdown.js";
import { AnthropicProvider } from "./llm/anthropic.js";
import { OpenAIProvider } from "./llm/openai.js";
import { ClaudeCodeProvider } from "./llm/claude-code.js";
import { writePrIndex } from "./storage/storage.js";
import type { LlmProvider } from "./llm/provider.js";
import type { PrIndex } from "./types/pr.js";

function createLlmProvider(): LlmProvider {
  const config = getConfig();
  if (config.LLM_PROVIDER === "anthropic") {
    return new AnthropicProvider({
      apiKey: config.ANTHROPIC_API_KEY!,
      model: config.LLM_MODEL,
    });
  }
  if (config.LLM_PROVIDER === "claude-code") {
    return new ClaudeCodeProvider({
      model: config.LLM_MODEL,
    });
  }
  return new OpenAIProvider({
    apiKey: config.OPENAI_API_KEY!,
    model: config.LLM_MODEL,
  });
}

function parseRepo(value: string): { owner: string; repo: string } {
  const parts = value.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo format: "${value}". Expected "owner/repo".`);
  }
  return { owner: parts[0], repo: parts[1] };
}

function collectRepos(value: string, previous: { owner: string; repo: string }[]): { owner: string; repo: string }[] {
  return [...previous, parseRepo(value)];
}

async function selectPrs(entries: PrIndex[]): Promise<PrIndex[]> {
  const useAll = await confirm({
    message: `전체 ${entries.length}개 PR을 사용할까요?`,
    default: true,
  });

  if (useAll) return entries;

  const selected = await checkbox({
    message: "사용할 PR을 선택하세요:",
    choices: entries.map((entry) => ({
      name: `${entry.owner}/${entry.repo}#${entry.number} ${entry.title}`,
      value: `${entry.owner}/${entry.repo}#${entry.number}`,
      checked: true,
    })),
  });

  if (selected.length === 0) {
    console.log(chalk.yellow("선택된 PR이 없습니다. 종료합니다."));
    process.exit(0);
  }

  const selectedSet = new Set(selected);
  return entries.filter((e) => selectedSet.has(`${e.owner}/${e.repo}#${e.number}`));
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
  .requiredOption("--repo <owner/repo>", "Repository in owner/repo format (repeatable)", collectRepos, [])
  .requiredOption("--author <author>", "PR author username")
  .option("--state <state>", "PR state filter", "merged")
  .action(async (opts) => {
    const spinner = ora("Collecting PR index...").start();
    try {
      const entries = await collectPrIndex(
        {
          repos: opts.repo,
          author: opts.author,
          state: opts.state,
        },
        (count, total) => {
          spinner.text = `Collecting PR index... ${count}/${total}`;
        },
      );
      spinner.succeed(chalk.green(`Collected ${entries.length} PRs`));

      const selected = await selectPrs(entries);
      writePrIndex(selected);
      console.log(chalk.green(`Saved ${selected.length}/${entries.length} PRs → pr_index.jsonl`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- collect-detail ---
program
  .command("collect-detail")
  .description("Collect detailed PR data (body, commits, files, reviews)")
  .action(async () => {
    const spinner = ora("Collecting PR details...").start();
    try {
      const details = await collectPrDetails((current, total, prNumber) => {
        spinner.text = `Collecting PR details... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(chalk.green(`Collected details for ${details.length} PRs`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- collect-diff ---
program
  .command("collect-diff")
  .description("Collect PR diffs via REST API")
  .action(async () => {
    const spinner = ora("Collecting PR diffs...").start();
    try {
      const count = await collectPrDiffs((current, total, prNumber) => {
        spinner.text = `Collecting PR diffs... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(chalk.green(`Collected ${count} diffs`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- generate-facts ---
program
  .command("generate-facts")
  .description("Generate FACT cards from PR data using LLM")
  .option("--lang <language>", "Output language (e.g., Korean, Japanese, English)")
  .action(async (opts) => {
    const spinner = ora("Generating FACT cards...").start();
    try {
      const provider = createLlmProvider();
      const cards = await generateFactCards(provider, (current, total, prNumber) => {
        spinner.text = `Generating FACT cards... ${current}/${total} (PR #${prNumber})`;
      }, opts.lang);
      spinner.succeed(chalk.green(`Generated ${cards.length} FACT cards`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- generate-narratives ---
program
  .command("generate-narratives")
  .description("Generate STAR/CARE narratives from FACT cards")
  .option("--lang <language>", "Output language (e.g., Korean, Japanese, English)")
  .action(async (opts) => {
    const spinner = ora("Generating narratives...").start();
    try {
      const provider = createLlmProvider();
      const { star, care } = await generateNarratives(provider, (step, current, total) => {
        spinner.text = `Generating narratives [${step}]... ${current}/${total}`;
      }, opts.lang);
      spinner.succeed(
        chalk.green(
          `Generated ${star.narratives.length} STAR + ${care.narratives.length} CARE narratives`,
        ),
      );
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- export-markdown ---
program
  .command("export-markdown")
  .description("Export narratives as a Markdown portfolio document")
  .option("--output <path>", "Output file path (default: data/portfolio.md)")
  .action(async (opts) => {
    try {
      const filePath = exportMarkdown(opts.output);
      console.log(chalk.green(`Exported portfolio → ${filePath}`));
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// --- run-all ---
program
  .command("run-all")
  .description("Run the full pipeline: collect → facts → narratives → export")
  .requiredOption("--repo <owner/repo>", "Repository in owner/repo format (repeatable)", collectRepos, [])
  .requiredOption("--author <author>", "PR author username")
  .option("--state <state>", "PR state filter", "merged")
  .option("--lang <language>", "Output language (e.g., Korean, Japanese, English)")
  .action(async (opts) => {
    console.log(chalk.bold("\n🔍 PRISM — Full Pipeline\n"));

    // Step 1: Collect Index
    let spinner = ora("Step 1/6: Collecting PR index...").start();
    try {
      const entries = await collectPrIndex(
        {
          repos: opts.repo,
          author: opts.author,
          state: opts.state,
        },
        (count, total) => {
          spinner.text = `Step 1/6: Collecting PR index... ${count}/${total}`;
        },
      );
      spinner.succeed(`Step 1/6: Collected ${entries.length} PRs`);

      const selected = await selectPrs(entries);
      writePrIndex(selected);
      console.log(chalk.green(`  → Saved ${selected.length}/${entries.length} PRs`));
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 2: Collect Details
    spinner = ora("Step 2/6: Collecting PR details...").start();
    try {
      const details = await collectPrDetails((current, total, prNumber) => {
        spinner.text = `Step 2/6: Collecting PR details... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(`Step 2/6: Collected ${details.length} PR details`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 3: Collect Diffs
    spinner = ora("Step 3/6: Collecting PR diffs...").start();
    try {
      const count = await collectPrDiffs((current, total, prNumber) => {
        spinner.text = `Step 3/6: Collecting PR diffs... ${current}/${total} (PR #${prNumber})`;
      });
      spinner.succeed(`Step 3/6: Collected ${count} diffs`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 4: Generate FACT Cards
    spinner = ora("Step 4/6: Generating FACT cards...").start();
    try {
      const provider = createLlmProvider();
      const cards = await generateFactCards(provider, (current, total, prNumber) => {
        spinner.text = `Step 4/6: Generating FACT cards... ${current}/${total} (PR #${prNumber})`;
      }, opts.lang);
      spinner.succeed(`Step 4/6: Generated ${cards.length} FACT cards`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 5: Generate Narratives
    spinner = ora("Step 5/6: Generating narratives...").start();
    try {
      const provider = createLlmProvider();
      const { star, care } = await generateNarratives(provider, (step, current, total) => {
        spinner.text = `Step 5/6: Generating narratives [${step}]... ${current}/${total}`;
      }, opts.lang);
      spinner.succeed(
        `Step 5/6: Generated ${star.narratives.length} STAR + ${care.narratives.length} CARE narratives`,
      );
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Step 6: Export Markdown
    spinner = ora("Step 6/6: Exporting markdown...").start();
    try {
      const filePath = exportMarkdown();
      spinner.succeed(`Step 6/6: Exported portfolio → ${filePath}`);
    } catch (error) {
      spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    console.log(chalk.bold.green("\nPipeline complete! Check the data/ directory.\n"));
  });

program.parse();
