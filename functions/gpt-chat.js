exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { message, persona } = body;

    if (!process.env.OPENAI_API_KEY) {
      return json(500, { error: "Missing OPENAI_API_KEY" });
    }

    const systemPrompt = `
You are the AI twin of a professional fitness coach.
Follow the coach's persona exactly (tone, style, signoffs).
Avoid generic filler and any medical/PED advice.
Keep replies under 180 words.
`;

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: "Persona:\n" + JSON.stringify(persona || {}, null, 2) },
        { role: "user", content: message || "Say hello" }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
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

// helper to return JSON + CORS
function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(obj)
  };
}
