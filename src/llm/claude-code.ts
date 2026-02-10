import { spawn } from "node:child_process";
import type { LlmProvider, LlmMessage, LlmProviderOptions } from "./provider.js";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class ClaudeCodeProvider implements LlmProvider {
  private model: string;

  constructor(options: LlmProviderOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generate(messages: LlmMessage[]): Promise<string> {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");
    const userPrompt = userMsgs.map((m) => m.content).join("\n\n");

    const args = ["--print", "--output-format", "text", "--model", this.model];

    if (systemMsg) {
      args.push("--system-prompt", systemMsg.content);
    }

    return new Promise<string>((resolve, reject) => {
      // Strip API keys so claude CLI uses subscription auth (Max/Pro) instead
      const env = { ...process.env };
      delete env.ANTHROPIC_API_KEY;
      delete env.OPENAI_API_KEY;

      const child = spawn("claude", args, {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: TIMEOUT_MS,
        env,
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
      child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

      child.on("error", (error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(
            new Error(
              'Claude Code CLI not found. Install it with: npm install -g @anthropic-ai/claude-code',
            ),
          );
          return;
        }
        reject(new Error(`Claude Code CLI error: ${error.message}`));
      });

      child.on("close", (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
        const stderr = Buffer.concat(stderrChunks).toString("utf-8");

        if (code !== 0) {
          reject(
            new Error(
              `Claude Code CLI exited with code ${code}\nstderr: ${stderr}\nstdout: ${stdout.slice(0, 500)}`,
            ),
          );
          return;
        }
        resolve(stdout.trim());
      });

      child.stdin.write(userPrompt);
      child.stdin.end();
    });
  }
}
