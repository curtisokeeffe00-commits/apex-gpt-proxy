// Netlify Function: gpt-chat (persona-weighted)
// CommonJS syntax for Netlify standard Functions runtime.

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { message, persona = {} } = body;

    if (!process.env.OPENAI_API_KEY) {
      return json(500, { error: "Missing OPENAI_API_KEY" });
    }

    // ---- Build strict style rules from persona ----
    const styleRules = buildStyleRules(persona);

    const baseSystem = `
You are the AI twin of a professional fitness coach.
You MUST follow the persona and style rules exactly.
Do not soften or ignore them. Never break character.
Never give medical or PED advice. Keep total length under 180 words.
`;

    // Optional: add a tiny few-shot only when "tough love"
    const fewShotForTough = (persona.tone || "").toLowerCase().includes("tough")
      ? [
          {
            role: "user",
            content: "Client: I missed my workout yesterday.",
          },
          {
            role: "assistant",
            content:
              "You missed. Fine. Today: 30 min Zone 2 + 3 x 8 squats at RPE 7. Log it. No excuses. Execute.",
          },
        ]
      : [];

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.6, // slightly lower to keep tone tight
      messages: [
        { role: "system", content: baseSystem.trim() },
        {
          role: "system",
          content:
            "PERSONA JSON (authoritative):\n" +
            JSON.stringify(persona, null, 2),
        },
        {
          role: "system",
          content:
            "STYLE RULES (hard constraints):\n" + styleRules + "\n" +
            "Hard limits:\n" +
            "- Max 3 sentences unless persona says otherwise.\n" +
            "- No emojis.\n" +
            "- Prefer imperative sentences.\n" +
            (persona.signoff ? `- End with signoff: "${persona.signoff}"\n` : ""),
        },
        ...fewShotForTough,
        {
          role: "user",
          content:
            "Client says:\n" +
            (message || "Say hello") +
            "\n\nRespond in the coach's exact voice.",
        },
      ],
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      return json(500, { error: "OpenAI error", detail: txt });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "No reply generated.";

    return json(200, { reply });
  } catch (e) {
    return json(500, { error: e.message || "Server error" });
  }
};

// -------- Helpers --------
function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(obj),
  };
}

function buildStyleRules(p) {
  const rules = [];
  const tone = (p.tone || "").toLowerCase();
  const directness = String(p.directness_level || p.directness || "")
    .toLowerCase();
  const formality = (p.formality || "").toLowerCase();

  // TONE
  if (tone.includes("tough")) {
    rules.push(
      "- Tone: tough love. Blunt, no-nonsense.",
      "- Acknowledge once, then move straight to action.",
      '- Forbidden softeners: "no worries", "it happens", "you’ve got this", "let’s crush it", "that’s okay".',
      "- Short sentences. Avoid exclamation marks."
    );
  }
  if (tone.includes("compassion") || tone.includes("warm")) {
    rules.push(
      "- Tone: compassionate. Warm, validating, encouraging.",
      "- Use gentle language. Reflect feelings before action.",
      "- Longer sentences allowed."
    );
  }
  if (tone.includes("analytical")) {
    rules.push(
      "- Tone: analytical. Evidence-based, practical.",
      "- Reference metrics, sets/reps, RPE, calories, sleep, steps.",
      "- Remove fluff."
    );
  }

  // DIRECTNESS
  if (directness.includes("1") || directness.includes("very")) {
    rules.push("- Very direct. No hedging (avoid maybe, might, try, can).");
  }

  // FORMALITY
  if (formality.includes("casual")) {
    rules.push("- Casual language. Contractions allowed.");
  } else if (formality.includes("formal")) {
    rules.push("- Formal register. No slang or contractions.");
  }

  // Signature phrases
  if (Array.isArray(p.signature_phrases) && p.signature_phrases.length) {
    rules.push(
      "- Sprinkle signature phrases sparingly: " +
        p.signature_phrases.map((s) => `"${s}"`).join(", ")
    );
  }

  // Fallback if nothing provided
  if (rules.length === 0) {
    rules.push("- Default: short, confident, focused.");
  }

  return rules.join("\n");
}
