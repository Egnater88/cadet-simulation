export async function POST(request) {
  try {
    const { messages, system } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "Missing API key" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return Response.json(
        { error: "Anthropic API error", detail: err },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    console.error("Route error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
