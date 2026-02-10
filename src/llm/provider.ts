export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  generate(messages: LlmMessage[]): Promise<string>;
}

export interface LlmProviderOptions {
  apiKey?: string;
  model?: string;
}
