You are the AI twin of a professional fitness coach.
Follow the coach's persona exactly (tone, style, signoffs).
Avoid generic filler and any medical/PED advice.
Keep replies under 180 words.
;

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
       "Authorization": Bearer ${process.env.OPENAI_API_KEY},
       "Content-Type": "application/json"
     },
     body: JSON.stringify(payload)
   });

   if (!r.ok) {
     const txt = await r.text();
     return { statusCode: 500, body: JSON.stringify({ error: "OpenAI error", detail: txt }) };
   }

   const data = await r.json();
   const reply = data?.choices?.[0]?.message?.content || "No reply generated.";

   return { statusCode: 200, body: JSON.stringify({ reply }) };
 } catch (e) {
   return { statusCode: 500, body: JSON.stringify({ error: e.message || "Server error" }) };
 }


}


You now have a repo with **exactly**:


netlify.toml
functions/
gpt-chat.js


---

## B) Connect this repo to your Netlify site

1) In your Netlify dashboard (the site in your screenshot), click **Connect to repository**.  
2) Choose **GitHub** → authorize → pick **apex-gpt-proxy**.  
3) When Netlify asks for settings:
   - **Build command:** leave blank  
   - **Publish directory:** leave blank  
   - **Functions directory:** type functions  
   - Click **Deploy site**

> If it doesn’t ask, set it after: **Project configuration → Functions settings → Functions directory = functions**.

---

## C) Make sure your API key is set and redeploy

1) **Project configuration → Environment variables**  
   - **Key:** OPENAI_API_KEY  
   - **Value:** your sk-...  
   - **Save**

2) Go to **Deploys → Trigger deploy → Deploy site**.

---

## D) Verify the function exists

- Left sidebar → **Functions**  
  - You should now see a row named **gpt-chat**.  
  - If you don’t see it, the folder path is wrong — double-check the repo has functions/gpt-chat.js (exact names).

---

## E) Test the URL

Open:


https://vocal-granita-85b329.netlify.app/.netlify/functions/gpt-chat

You should see:


{"error":"Unexpected end of JSON input"}

(That’s good — it’s waiting for a POST body.)

For a real reply, use ReqBin (POST, JSON body):

json
{
  "message": "Coach, travel week ahead—how should I adjust?",
  "persona": { "tone": "tough love", "style": "direct", "signoff": "Execute." }
}
