/**
 * Cloudflare Worker für die Bregenz-Umfrage.
 * Nimmt Stimmen entgegen und speichert sie als votes/<Name>.json im GitHub-Repo.
 *
 * Benötigte Variablen im Worker (Settings → Variables and Secrets):
 *   GITHUB_TOKEN    (Secret)  Fine-grained Token, nur für dieses Repo, "Contents: Read and write"
 *   REPO            (Text)    zachyy22/bregenz-umfrage
 *   ALLOWED_ORIGIN  (Text)    https://zachyy22.github.io
 */

const NAMES = ["Justin","Marlon","Navas","Marci","Ludde","David","Lucas","Dennis","Ramon"];
const MAX_DATE_ID = 9;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : (allowed[0] || "*"),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const gh = (path, init = {}) => fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, {
      ...init,
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "bregenz-umfrage-worker",
        ...(init.headers || {}),
      },
    });

    try {
      /* ---------- Stimme speichern ---------- */
      if (url.pathname === "/vote" && request.method === "POST") {
        if (allowed.length && !allowed.includes(origin)) return json({ error: "origin" }, 403);
        let body;
        try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }

        const name = NAMES.find(n => n === body.name);
        if (!name) return json({ error: "unknown name" }, 400);
        const dates = Array.isArray(body.dates)
          ? [...new Set(body.dates.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= MAX_DATE_ID))].sort((a, b) => a - b)
          : [];
        const none = !!body.none && dates.length === 0;
        const record = { name, dates, none, at: new Date().toISOString() };

        const path = `votes/${name}.json`;
        const existing = await gh(path);
        const sha = existing.ok ? (await existing.json()).sha : undefined;

        const content = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(record, null, 2) + "\n")));
        const put = await gh(path, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Stimme von ${name}: ${none ? "kein Termin" : dates.join(", ")}`,
            content,
            ...(sha ? { sha } : {}),
          }),
        });
        if (!put.ok) return json({ error: "github", status: put.status }, 502);
        return json({ ok: true, record });
      }

      /* ---------- Alle Stimmen lesen ---------- */
      if (url.pathname === "/votes" && request.method === "GET") {
        const list = await gh("votes");
        if (list.status === 404) return json([]);
        if (!list.ok) return json({ error: "github", status: list.status }, 502);
        const files = (await list.json()).filter(f => f.name.endsWith(".json"));
        const votes = await Promise.all(files.map(async f => {
          const r = await gh(f.path, { headers: { "Accept": "application/vnd.github.raw+json" } });
          try { return r.ok ? await r.json() : null; } catch { return null; }
        }));
        return json(votes.filter(Boolean));
      }

      return json({ ok: true, hint: "POST /vote oder GET /votes" });
    } catch (e) {
      return json({ error: "worker", message: String(e) }, 500);
    }
  },
};
