/**
 * aiProvider.js — Unified AI inference client for Dream2Play AI
 *
 * Supports:
 *  - openai        → https://api.openai.com/v1/chat/completions
 *  - ollama        → {endpoint}/api/chat  (Ollama native format)
 *  - local         → {endpoint}/v1/chat/completions  (OpenAI-compatible)
 *  - anthropic     → https://api.anthropic.com/v1/messages
 *  - gemini        → https://generativelanguage.googleapis.com/v1beta/...
 */

const DEFAULT_ENDPOINTS = {
  openai: "https://api.openai.com",
  ollama: "http://localhost:11434",
  local: "http://localhost:1234",
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
};

const DEFAULT_MODELS = {
  openai: "gpt-3.5-turbo",
  ollama: "llama3",
  local: "local-model",
  anthropic: "claude-3-haiku-20240307",
  gemini: "gemini-1.5-flash",
};

/**
 * Main entry point.
 * @param {Object} config
 * @param {string} config.provider   - 'openai' | 'ollama' | 'local' | 'anthropic' | 'gemini'
 * @param {string} [config.apiKey]   - API key (not required for Ollama)
 * @param {string} [config.model]    - Model name
 * @param {string} [config.endpoint] - Base URL override
 * @param {Array}  messages          - OpenAI-style messages [{role, content}]
 * @returns {Promise<string>}        - The assistant's text response
 */
async function callAI(
  { provider = "openai", apiKey = "", model, endpoint } = {},
  messages = [],
) {
  const resolvedModel =
    model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;
  const resolvedEndpoint =
    endpoint || DEFAULT_ENDPOINTS[provider] || DEFAULT_ENDPOINTS.openai;

  switch (provider) {
    case "ollama":
      return callOllama(resolvedEndpoint, resolvedModel, messages);
    case "local":
      return callOpenAICompatible(
        resolvedEndpoint,
        resolvedModel,
        apiKey,
        messages,
      );
    case "anthropic":
      return callAnthropic(resolvedEndpoint, resolvedModel, apiKey, messages);
    case "gemini":
      return callGemini(resolvedEndpoint, resolvedModel, apiKey, messages);
    default:
      return callOpenAI(apiKey, resolvedModel, messages);
  }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function callOpenAI(apiKey, model, messages) {
  if (!apiKey) throw new Error("OpenAI API key is required.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.85 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

async function callOllama(endpoint, model, messages) {
  // Ollama uses /api/chat with its own format
  const base = endpoint.replace(/\/$/, "");
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages, // Ollama accepts OpenAI-style messages array
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error ${response.status}: ${err}`);
  }

  const data = await response.json();
  // Ollama response: { message: { content: "..." } }
  return (data.message?.content || data.response || "").trim();
}

// ─── OpenAI-Compatible (LM Studio, Jan, etc.) ────────────────────────────────

async function callOpenAICompatible(endpoint, model, apiKey, messages) {
  const base = endpoint.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.85 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Local endpoint error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function callAnthropic(endpoint, model, apiKey, messages) {
  if (!apiKey) throw new Error("Anthropic API key is required.");

  // Anthropic separates system messages from user/assistant messages
  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  const base = endpoint.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMsg,
      messages: conversationMsgs,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

// ─── Google Gemini ────────────────────────────────────────────────────────────

async function callGemini(endpoint, model, apiKey, messages) {
  if (!apiKey) throw new Error("Google Gemini API key is required.");

  // Convert OpenAI messages to Gemini format
  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  const geminiContents = conversationMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Prepend system instruction as first user message if present
  if (systemMsg) {
    geminiContents.unshift({ role: "user", parts: [{ text: systemMsg }] });
    geminiContents.splice(1, 0, {
      role: "model",
      parts: [{ text: "Understood." }],
    });
  }

  const base = endpoint.replace(/\/$/, "");
  const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: geminiContents }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// ─── Connection Test ──────────────────────────────────────────────────────────

/**
 * Test connectivity to the configured AI provider.
 * Returns { ok: true, latency: <ms>, model: <str> } or throws.
 */
async function testAIConnection(aiConfig) {
  const testMessages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Reply with only the word: ok" },
  ];

  const start = Date.now();
  const result = await callAI(aiConfig, testMessages);
  const latency = Date.now() - start;

  return {
    ok: true,
    latency,
    model: aiConfig.model || DEFAULT_MODELS[aiConfig.provider] || "unknown",
    response: result.substring(0, 50),
  };
}

module.exports = {
  callAI,
  testAIConnection,
  DEFAULT_MODELS,
  DEFAULT_ENDPOINTS,
};
