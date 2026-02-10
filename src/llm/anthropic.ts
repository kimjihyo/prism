import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmMessage, LlmProviderOptions } from "./provider.js";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic;
  private model: string;

  constructor(options: LlmProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generate(messages: LlmMessage[]): Promise<string> {
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: nonSystemMsgs.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? "";
  }
}
