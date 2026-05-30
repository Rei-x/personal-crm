import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { env } from "../env";

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

// Human-friendly landing page for people RECEIVING a share link (they are not
// app users). Public, no auth. The actual subscription URL is the .ics; this
// page just helps a person add it to their calendar.
export async function sharePageHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token ?? "";
    const link = token
      ? await db.query.shareLink.findFirst({ where: (q) => eq(q.token, token) })
      : null;
    const now = new Date();
    if (!link || !link.enabled || (link.expiresAt && link.expiresAt <= now)) {
      res.status(404).type("html").send(renderMissing());
      return;
    }
    const icsUrl = `${env.PUBLIC_URL}/share/${link.token}.ics`;
    const webcal = icsUrl.replace(/^https?:\/\//, "webcal://");
    const google = "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(icsUrl);
    res.type("html").send(renderPage(esc(link.feedTitle), icsUrl, webcal, google));
  } catch (e) {
    console.error("Share page failed", e);
    res.status(500).type("text/plain").send("Internal error");
  }
}

const STYLE = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  background:#f5f5f7;color:#111}
@media(prefers-color-scheme:dark){body{background:#0c0c0d;color:#f5f5f7}}
.card{width:100%;max-width:420px;background:#fff;border-radius:18px;padding:32px;
  box-shadow:0 10px 40px rgba(0,0,0,.08);text-align:center}
@media(prefers-color-scheme:dark){.card{background:#1b1b1d;box-shadow:0 10px 40px rgba(0,0,0,.4)}}
.icon{font-size:44px;line-height:1}
h1{font-size:22px;margin:14px 0 4px}
.sub{color:#6b7280;margin:0 0 24px;font-size:15px}
.btn{display:block;width:100%;padding:13px 16px;margin:8px 0;border-radius:12px;border:1px solid transparent;
  font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center}
.btn.primary{background:#2563eb;color:#fff}
.btn.primary:hover{background:#1d4ed8}
.btn.secondary{background:transparent;color:inherit;border-color:#d1d5db}
@media(prefers-color-scheme:dark){.btn.secondary{border-color:#3a3a3d}}
.hint{margin-top:20px;font-size:12px;color:#9ca3af;line-height:1.5}
`;

function renderPage(title: string, icsUrl: string, webcal: string, google: string): string {
  return `<!doctype html><html lang="pl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${STYLE}</style></head>
<body><main class="card">
<div class="icon">📅</div>
<h1>${title}</h1>
<p class="sub">Dodaj ten kalendarz, aby zawsze widzieć aktualną dostępność.</p>
<a class="btn primary" href="${google}" target="_blank" rel="noreferrer">Dodaj do Google Calendar</a>
<a class="btn secondary" href="${webcal}">Dodaj do Apple / Outlook</a>
<button class="btn secondary" id="copy" data-url="${icsUrl}">Skopiuj adres kalendarza</button>
<p class="hint">Ręcznie: w Google Calendar otwórz „Inne kalendarze → Z adresu URL" i wklej skopiowany adres.</p>
</main>
<script>
var b=document.getElementById('copy');
b.addEventListener('click',function(){navigator.clipboard.writeText(b.dataset.url);var t=b.textContent;b.textContent='Skopiowano ✓';setTimeout(function(){b.textContent=t},1500)});
</script></body></html>`;
}

function renderMissing(): string {
  return `<!doctype html><html lang="pl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kalendarz niedostępny</title><style>${STYLE}</style></head>
<body><main class="card">
<div class="icon">🔌</div>
<h1>Ten link jest nieaktywny</h1>
<p class="sub">Kalendarz został wyłączony, wygasł lub adres jest nieprawidłowy. Poproś o nowy link.</p>
</main></body></html>`;
}
