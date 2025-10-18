export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { message, persona } = body;

    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    const systemPrompt = `
