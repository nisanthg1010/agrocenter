const express = require("express");

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY;

const buildGeminiEndpoint = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getGeminiApiKey()}`;

const callGemini = async (contents) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      message: "Gemini API key is not configured on the server.",
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(buildGeminiEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          data?.error?.message || `Gemini request failed with HTTP ${response.status}`,
      };
    }

    return { ok: true, data };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        ok: false,
        status: 504,
        message: "Gemini request timed out.",
      };
    }

    return {
      ok: false,
      status: 500,
      message: error.message || "Unexpected Gemini proxy error.",
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
};

router.post("/chat", async (req, res) => {
  try {
    const { history = [], message = "" } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const systemPrompt = `
You are AgroBot — the official agriculture assistant of Agro Center.
You help users with:
- Fertilizers, seeds, soil, compost, pesticides.
- Plant care, usage guidance, farming tips.
Keep responses simple, friendly and helpful.
If the user asks unrelated things, gently guide them back to agriculture topics.
`;

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && typeof item.text === "string")
          .map((item) => ({
            role: item.role === "bot" ? "model" : "user",
            parts: [{ text: item.text }],
          }))
      : [];

    const contents = [
      ...safeHistory,
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "user", parts: [{ text: String(message).trim() }] },
    ];

    const result = await callGemini(contents);

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    const text =
      result.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't respond. Please try again.";

    return res.json({ reply: text });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Chat failed." });
  }
});

router.post("/diagnose", async (req, res) => {
  try {
    const { mimeType, imageData, query = "" } = req.body || {};

    if (!mimeType || !imageData) {
      return res.status(400).json({ message: "Image data is required." });
    }

    const prompt = `
You are AgroBot, an agriculture expert.

Analyze the uploaded plant image and answer:
1. What disease or issue does the plant appear to have?
2. What fertilizer should be used?
3. What insecticide/pesticide should be used?
4. Give care steps in simple words.
5. Dont use special charaters, ** and emojies, give only text response
User question: ${query || "Identify plant disease and provide treatment."}
`;

    const contents = [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageData,
            },
          },
          { text: prompt },
        ],
      },
    ];

    const result = await callGemini(contents);

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    const text =
      result.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to analyze the image.";

    return res.json({ reply: text });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Plant diagnosis failed." });
  }
});

module.exports = router;
