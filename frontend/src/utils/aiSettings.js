const PROVIDER_DEFAULTS = {
  openai: { model: "gpt-3.5-turbo", endpoint: "https://api.openai.com" },
  ollama: { model: "llama3", endpoint: "http://localhost:11434" },
  local: { model: "local-model", endpoint: "http://localhost:1234" },
  anthropic: {
    model: "claude-3-haiku-20240307",
    endpoint: "https://api.anthropic.com",
  },
  gemini: {
    model: "gemini-1.5-flash",
    endpoint: "https://generativelanguage.googleapis.com",
  },
};

export function getAISettings() {
  const provider = localStorage.getItem("dream2play_ai_provider") || "openai";
  const apiKey = localStorage.getItem("dream2play_ai_api_key") || "";

  // If the stored model or endpoint is empty/null, fall back to the provider default
  const defaultModel = PROVIDER_DEFAULTS[provider]?.model || "gpt-3.5-turbo";
  const defaultEndpoint = PROVIDER_DEFAULTS[provider]?.endpoint || "";

  const model = localStorage.getItem("dream2play_ai_model") || defaultModel;
  const endpoint =
    localStorage.getItem("dream2play_ai_endpoint") || defaultEndpoint;

  return { provider, apiKey, model, endpoint };
}

export function saveAISettings({ provider, apiKey, model, endpoint }) {
  localStorage.setItem("dream2play_ai_provider", provider);
  localStorage.setItem("dream2play_ai_api_key", apiKey || "");
  localStorage.setItem("dream2play_ai_model", model || "");
  localStorage.setItem("dream2play_ai_endpoint", endpoint || "");
}

export function getAIHeaders() {
  const { provider, apiKey, model, endpoint } = getAISettings();
  return {
    "x-ai-provider": provider,
    "x-ai-key": apiKey,
    "x-ai-model": model,
    "x-ai-endpoint": endpoint,
  };
}

export { PROVIDER_DEFAULTS };
