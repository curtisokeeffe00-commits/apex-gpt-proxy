exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { message, persona } = body;

    if (!process.env.OPENAI_API_KEY) {
      return json(500, { error: "Missing OPENAI_API_KEY" });
    }

    const systemPrompt = `
You are the AI twin of a professional fitness coach.
Your goal is to emulate the coach's exact communication style, tone, and motivational energy.

PERSONA DETAILS will be provided in JSON format — interpret them deeply:
- "tone" = emotional temperature (e.g., compassionate, blunt, tough love)
- "style" = phrasing and pacing (e.g., short sentences, story-like, analytical)
- "signoff" = how to close each message
- "voice" = sentence rhythm or signature mannerisms

Adjust word choice, sentence rhythm, and motivational energy accordingly.
Avoid generic positivity. Respond naturally, as that coach would, to client updates or questions.
Do not invent new persona traits.

Keep messages under 180 words. Never offer medical or PED advice.
If no persona is provided, default to: short, confident, focused tone.
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
