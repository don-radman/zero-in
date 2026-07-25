// Teach your panda: a short conversational loop where the agent learns about
// its member. Runs on the 0G Compute Router when the key exists; a warm
// question rotation keeps it demoable before then. Everything shared lands in
// the memory mirror (visible + deletable in "what my panda knows").
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";
import { routerClient, CHAT_MODEL } from "@/lib/compute";

const FALLBACK_QUESTIONS = [
  "Nice. What are you spending most of your energy on right now?",
  "What kind of people would you love to meet more of?",
  "What is something you shipped or did recently that you are proud of?",
  "What do you want more of this year: users, capital, collaborators, or calm?",
  "Noted. Anything you are curious about lately, even outside work?",
];

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const { message, history } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

    const client = db();
    const { data: user } = await client.from("users").select("id, email").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first" }, { status: 404 });

    // The panda remembers what you told it (view/delete any time)
    await client.from("memories").insert({
      user_id: user.id,
      kind: "taught",
      summary: message.trim().slice(0, 300),
    });

    const turns = Array.isArray(history) ? history.length : 0;
    let reply: string;

    if (process.env.ROUTER_API_KEY) {
      const name = user.email.split("@")[0];
      const res = await routerClient().chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              `You are ${name}'s panda: their warm, curious astronaut agent on Zero-In. ` +
              "You are learning about them so you can introduce them to the right people at events. " +
              "Acknowledge what they shared in one short sentence, then ask exactly ONE follow-up question. " +
              "Friendly, specific, zero corporate speak, no emojis, under 40 words total.",
          },
          ...(Array.isArray(history) ? history.slice(-8) : []),
          { role: "user", content: message },
        ],
      });
      reply = res.choices[0]?.message?.content?.trim() || FALLBACK_QUESTIONS[turns % FALLBACK_QUESTIONS.length];
    } else {
      reply = FALLBACK_QUESTIONS[turns % FALLBACK_QUESTIONS.length];
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[teach]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
