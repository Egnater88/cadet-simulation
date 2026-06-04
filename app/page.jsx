"use client";
import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `You are a military training scenario engine for 2nd year cadets at a military university in Abu Dhabi.

STRICT RULES:
- Use simple English (B1 level). Short sentences. Clear words.
- Every response MUST end with exactly 3 numbered options UNLESS it is the final debrief.
- Count the student's decisions carefully. After their 3rd decision, output the DEBRIEF immediately.
- Keep scenario updates to 3-5 sentences.
- Escalate the situation based on what the student chose.
- Military tone, direct, not aggressive.

RESPONSE FORMAT for decisions 1 and 2:
[3-5 sentences: what happened after the student's choice + a new complication]

Your options:
1. [Option A]
2. [Option B]
3. [Option C]

FINAL RESPONSE after the student's 3rd decision — use this format exactly:
DEBRIEF:
• [What the cadet did well]
• [Something to improve]
• [Overall observation about their decision pattern]`;

const OPENING_SCENARIO = `You are Lieutenant Hassan, an officer in the UAE Armed Forces. You lead a team of 8 soldiers based at Al Minhad Air Base.

Your mission: deliver medical supplies to Camp Falcon, 40km south across the desert. You must arrive before sunset — 6 hours from now.

Situation:
- 2 trucks are ready. Truck 2 has a small engine problem. It is slow but working.
- The main road is fast (2 hours) but there are reports of a protest blocking it near Dubai-Al Ain Road.
- The desert road is safe but long (4 hours) and very hot today (42 degrees).
- One of your soldiers, Private Saeed, says he feels sick. He can still walk.`;

const OPENING_CHOICES = [
  "Take the main road — faster but the protest may stop you.",
  "Take the desert road — safe but slow and very hot.",
  "Wait 1 hour to get more information before deciding.",
];

export default function App() {
  const [phase, setPhase] = useState("intro");
  const [decisionCount, setDecisionCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [choices, setChoices] = useState(OPENING_CHOICES);
  const [currentSituation, setCurrentSituation] = useState("");
  const [debriefText, setDebriefText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, phase]);

  function parseAI(text) {
    if (text.includes("DEBRIEF:")) {
      return { isDebrief: true, text: text.split("DEBRIEF:")[1].trim() };
    }
    const lines = text.split("\n");
    const optionLines = lines.filter((l) => /^[123][.)]\s/.test(l.trim()));
    const opts = optionLines.map((l) => l.replace(/^[123][.)]\s*/, "").trim());
    const situation = lines
      .filter((l) => !/^[123][.)]\s/.test(l.trim()) && !/^your options/i.test(l.trim()))
      .join("\n")
      .trim();
    return {
      isDebrief: false,
      situation,
      options: opts.length === 3 ? opts : OPENING_CHOICES,
    };
  }

  async function handleChoice(choice, idx) {
    if (loading || selectedIdx !== null) return;
    setSelectedIdx(idx);
    setLoading(true);
    setErrorMsg("");

    const thisDecision = decisionCount + 1;
    setDecisionCount(thisDecision);

    const isLast = thisDecision >= 3;
    const userContent = isLast
      ? `My 3rd and final decision: Option ${idx + 1} — ${choice}. Now give me the DEBRIEF.`
      : `Decision ${thisDecision}: Option ${idx + 1} — ${choice}`;

    const newHistory = [...history, { role: "user", content: userContent }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, system: SYSTEM_PROMPT }),
      });

      const data = await res.json();

      if (data.error) {
        setErrorMsg("API error: " + (data.detail || data.error));
        setSelectedIdx(null);
        setDecisionCount(thisDecision - 1);
        setLoading(false);
        return;
      }

      const aiText = data.content.map((b) => b.text || "").join("");
      const parsed = parseAI(aiText);

      setHistory([...newHistory, { role: "assistant", content: aiText }]);

      if (isLast || parsed.isDebrief) {
        setMessages((prev) => [
          ...prev,
          { type: "cadet", text: choice, num: thisDecision },
        ]);
        setDebriefText(parsed.isDebrief ? parsed.text : aiText.replace("DEBRIEF:", "").trim());
        setPhase("debrief");
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "cadet", text: choice, num: thisDecision },
          { type: "ai", text: parsed.situation },
        ]);
        setCurrentSituation(parsed.situation);
        setChoices(parsed.options);
        setSelectedIdx(null);
      }
    } catch (e) {
      setErrorMsg("Network error — check your connection and try again.");
      setSelectedIdx(null);
      setDecisionCount(thisDecision - 1);
    }

    setLoading(false);
  }

  function start() {
    setHistory([{ role: "assistant", content: OPENING_SCENARIO }]);
    setPhase("scenario");
  }

  function reset() {
    setPhase("intro");
    setDecisionCount(0);
    setHistory([]);
    setMessages([]);
    setChoices(OPENING_CHOICES);
    setCurrentSituation("");
    setDebriefText("");
    setLoading(false);
    setSelectedIdx(null);
    setErrorMsg("");
  }

  const pct = Math.round((decisionCount / 3) * 100);

  const G = {
    green: "#4caf50",
    orange: "#ff6b35",
    bg: "#0a0f0a",
    card: "rgba(15,30,15,0.9)",
    border: "#2a4a2a",
    dim: "#557755",
    text: "#d0e0d0",
    muted: "#8a9e8a",
  };

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: "Arial, sans-serif", color: "#c8d8c8" }}>

      {/* Header */}
      <div style={{ background: "rgba(20,40,20,0.97)", borderBottom: `1px solid ${G.border}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: phase === "debrief" ? G.orange : G.green, boxShadow: `0 0 8px ${phase === "debrief" ? G.orange : G.green}` }} />
          <span style={{ fontSize: 12, letterSpacing: 2, color: G.green, fontWeight: "bold" }}>SDR TRAINING — RABDAN ACADEMY</span>
        </div>
        <span style={{ fontSize: 11, color: G.dim, letterSpacing: 1 }}>DECISION {decisionCount} / 3</span>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 100px" }}>

        {/* INTRO */}
        {phase === "intro" && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: G.green, marginBottom: 12 }}>SIMULATE — DELIBERATE — REFLECT</div>
            <div style={{ fontSize: 30, fontWeight: "bold", color: "#e8f5e8", marginBottom: 6 }}>OPERATION FALCON</div>
            <div style={{ fontSize: 12, color: G.dim, letterSpacing: 2, marginBottom: 40 }}>CADET LEVEL II · ~20 MINUTES</div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: 24, marginBottom: 32, textAlign: "left" }}>
              <div style={{ fontSize: 11, color: G.green, letterSpacing: 2, marginBottom: 14 }}>BRIEFING</div>
              {["You will face a realistic military training simulation.", "You must make 3 decisions under pressure. Each one changes the situation.", "There are no perfect answers — only trade-offs.", "After 3 decisions you receive a personal After Action Review."].map((t, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "#aabcaa", margin: "0 0 8px" }}>{t}</p>
              ))}
            </div>
            <button onClick={start}
              style={{ background: "#1a3a1a", border: `2px solid ${G.green}`, color: G.green, padding: "16px 52px", fontSize: 14, letterSpacing: 2, cursor: "pointer", borderRadius: 4, fontFamily: "Arial, sans-serif", fontWeight: "bold" }}
              onMouseOver={(e) => { e.target.style.background = G.green; e.target.style.color = "#0a0f0a"; }}
              onMouseOut={(e) => { e.target.style.background = "#1a3a1a"; e.target.style.color = G.green; }}>
              BEGIN EXERCISE
            </button>
          </div>
        )}

        {/* SCENARIO */}
        {phase === "scenario" && (
          <div>
            {/* Progress */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.dim, marginBottom: 6 }}>
                <span>PROGRESS</span><span>{pct}%</span>
              </div>
              <div style={{ height: 3, background: "#1a2a1a", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: G.green, transition: "width 0.5s", borderRadius: 2 }} />
              </div>
            </div>

            {/* History */}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                {m.type === "cadet" && (
                  <div style={{ background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.25)", borderRadius: 4, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: G.green, letterSpacing: 2, marginBottom: 5 }}>YOUR DECISION {m.num}</div>
                    <div style={{ fontSize: 14, color: "#c8d8c8" }}>→ {m.text}</div>
                  </div>
                )}
                {m.type === "ai" && i < messages.length - 1 && (
                  <div style={{ background: "rgba(10,20,10,0.6)", border: "1px solid #1a2a1a", borderRadius: 4, padding: 14, opacity: 0.6 }}>
                    <div style={{ fontSize: 10, color: G.dim, letterSpacing: 2, marginBottom: 6 }}>SITUATION UPDATE</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8, color: G.muted, whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Current card */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: 22, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: G.green, letterSpacing: 2, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.green, boxShadow: `0 0 6px ${G.green}` }} />
                {decisionCount === 0 ? "INITIAL SITUATION" : `SITUATION UPDATE — AFTER DECISION ${decisionCount}`}
              </div>
              {loading
                ? <div style={{ textAlign: "center", padding: "28px 0", color: G.green, fontSize: 13, letterSpacing: 2 }}>PROCESSING...</div>
                : <div style={{ fontSize: 14, lineHeight: 1.9, color: G.text, whiteSpace: "pre-wrap" }}>{decisionCount === 0 ? OPENING_SCENARIO : currentSituation}</div>
              }
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{ background: "rgba(255,80,50,0.1)", border: "1px solid #ff5032", borderRadius: 4, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: "#ff8060" }}>
                {errorMsg}
              </div>
            )}

            {/* Choices */}
            {!loading && (
              <div>
                <div style={{ fontSize: 11, color: G.dim, letterSpacing: 2, marginBottom: 10 }}>SELECT YOUR ACTION:</div>
                {choices.map((c, i) => (
                  <button key={i} onClick={() => handleChoice(c, i)}
                    disabled={selectedIdx !== null || loading}
                    style={{ display: "block", width: "100%", textAlign: "left", background: selectedIdx === i ? "rgba(76,175,80,0.15)" : "rgba(15,25,15,0.8)", border: selectedIdx === i ? `1px solid ${G.green}` : "1px solid #1e3a1e", color: selectedIdx === i ? G.green : "#c8d8c8", padding: "14px 18px", marginBottom: 8, fontSize: 14, lineHeight: 1.6, cursor: selectedIdx !== null ? "default" : "pointer", borderRadius: 4, fontFamily: "Arial, sans-serif", transition: "all 0.15s" }}
                    onMouseOver={(e) => { if (selectedIdx === null) { e.currentTarget.style.borderColor = G.green; e.currentTarget.style.background = "rgba(76,175,80,0.08)"; } }}
                    onMouseOut={(e) => { if (selectedIdx !== i) { e.currentTarget.style.borderColor = "#1e3a1e"; e.currentTarget.style.background = "rgba(15,25,15,0.8)"; } }}>
                    <span style={{ color: G.green, marginRight: 12, fontWeight: "bold" }}>{i + 1}.</span>{c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEBRIEF */}
        {phase === "debrief" && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: G.orange, marginBottom: 8 }}>EXERCISE COMPLETE</div>
              <div style={{ fontSize: 28, fontWeight: "bold", color: "#e8f5e8" }}>AFTER ACTION REVIEW</div>
            </div>
            <div style={{ background: "rgba(15,25,15,0.8)", border: "1px solid #1e3a1e", borderRadius: 6, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: G.dim, letterSpacing: 2, marginBottom: 14 }}>YOUR DECISIONS</div>
              {messages.filter((m) => m.type === "cadet").map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 14, color: G.muted }}>
                  <span style={{ color: G.green, fontWeight: "bold", minWidth: 20 }}>{i + 1}.</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(20,15,10,0.9)", border: "1px solid #3a2a1a", borderRadius: 6, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: G.orange, letterSpacing: 2, marginBottom: 14 }}>INSTRUCTOR FEEDBACK</div>
              <div style={{ fontSize: 14, lineHeight: 2, color: "#d0c8b8", whiteSpace: "pre-wrap" }}>{debriefText}</div>
            </div>
            <button onClick={reset}
              style={{ display: "block", width: "100%", background: "#1a1a0a", border: `2px solid ${G.orange}`, color: G.orange, padding: 16, fontSize: 13, letterSpacing: 2, cursor: "pointer", borderRadius: 4, fontFamily: "Arial, sans-serif", fontWeight: "bold" }}
              onMouseOver={(e) => { e.target.style.background = G.orange; e.target.style.color = "#0a0a00"; }}
              onMouseOut={(e) => { e.target.style.background = "#1a1a0a"; e.target.style.color = G.orange; }}>
              RUN EXERCISE AGAIN
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
