# 🎰 Bregenz Boyz Trip – Terminumfrage

Umfrage für Justins Geburtstags-Trip ins Casino Bregenz. Die Jungs wählen ihren Namen, kreuzen die passenden Wochenenden (Jan/Feb 2027) an, und jede Stimme landet als Datei in `votes/` in diesem Repo.

| Seite | Zweck |
|---|---|
| `index.html` | Umfrage – diesen Link in den Chat schicken |
| `auswertung.html` | Deine Auswertung: Rangliste, Justin-Markierung, Wer-kann-wann-Tabelle |
| `worker/worker.js` | Cloudflare Worker, der Stimmen ins Repo schreibt |
| `votes/*.json` | Die Stimmen (eine Datei pro Person, wird bei Änderung überschrieben) |

**Regel:** Termine, an denen Justin nicht kann, werden in der Auswertung durchgestrichen und ans Ende sortiert.

---

## Einrichtung (ca. 15 Minuten)

### 1. GitHub Pages aktivieren
Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save.
Nach 1–2 Minuten ist die Umfrage erreichbar unter:
`https://zachyy22.github.io/bregenz-umfrage/`

### 2. GitHub-Token erstellen
github.com → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
- Name: `bregenz-umfrage-worker`
- Expiration: z. B. 90 Tage
- Repository access: **Only select repositories** → `bregenz-umfrage`
- Permissions → Repository permissions → **Contents: Read and write**
- Generieren und Token kopieren (wird nur einmal angezeigt)

### 3. Cloudflare Worker anlegen
1. Kostenlos anmelden auf [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages → Create → Create Worker** → Name z. B. `bregenz-vote` → Deploy
3. **Edit code** → den kompletten Inhalt von `worker/worker.js` einfügen → **Deploy**
4. Im Worker unter **Settings → Variables and Secrets** anlegen:

   | Typ | Name | Wert |
   |---|---|---|
   | Secret | `GITHUB_TOKEN` | der Token aus Schritt 2 |
   | Text | `REPO` | `zachyy22/bregenz-umfrage` |
   | Text | `ALLOWED_ORIGIN` | `https://zachyy22.github.io` |

5. Worker-URL kopieren (z. B. `https://bregenz-vote.DEINNAME.workers.dev`)

### 4. Worker-URL eintragen
In `common.js` ganz oben eintragen und committen:
```js
const WORKER_URL = "https://bregenz-vote.DEINNAME.workers.dev";
```

### 5. Testen
- `https://bregenz-vote.DEINNAME.workers.dev/votes` im Browser öffnen → sollte `[]` zeigen
- Umfrage einmal selbst durchklicken → in `votes/` erscheint eine Datei mit Commit „Stimme von …“
- Testdatei danach löschen

---

## Hinweise
- Der Token liegt nur im Worker, nie im Repo oder im Browser.
- Das Repo ist öffentlich: Wer den Ordner `votes/` findet, sieht die Stimmen.
- Jeder mit dem Link kann für jeden Namen abstimmen. Für eine Freundesgruppe ist das okay; im Commit-Verlauf siehst du jede Änderung.
- Falls der Worker mal nicht erreichbar ist, zeigt die Umfrage einen `#BZ:`-Code zum Kopieren in den Chat. Den kannst du in der Auswertung unter „Antworten aus dem Chat einlesen“ einfügen.
