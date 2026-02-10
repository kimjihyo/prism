import OpenAI from "openai";
import type { LlmProvider, LlmMessage, LlmProviderOptions } from "./provider.js";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: LlmProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generate(messages: LlmMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
