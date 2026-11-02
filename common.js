/* ============ KONFIGURATION ============
   Nach dem Einrichten des Cloudflare Workers hier dessen URL eintragen
   (ohne Slash am Ende), z. B. "https://bregenz-vote.deinname.workers.dev" */
const WORKER_URL = "https://bregenz-umfrage.manuel-f16.workers.dev";

const REPO = "zachyy22/bregenz-umfrage";
/* ======================================= */

const NAMES = ["Justin","Marlon","Navas","Marci","Ludde","David","Lucas","Dennis","Ramon"];
const BDAY = "Justin";
const HUES = {Justin:["#f5c96a","#ff9f43"],Marlon:["#46d3ff","#8b5cff"],Navas:["#ff5fa8","#ff9f43"],Marci:["#62f2ae","#46d3ff"],Ludde:["#b48bff","#ff5fa8"],David:["#ffd36e","#62f2ae"],Lucas:["#7ad7ff","#62f2ae"],Dennis:["#ff8f6b","#ff5fa8"],Ramon:["#c6ff6b","#46d3ff"]};
const DATES = [
  {id:1, m:"Januar 2027",  days:"02–03", short:"02.–03.01.", wd:"Sa – So", hint:"Neujahrs-Wochenende", cls:"gold"},
  {id:2, m:"Januar 2027",  days:"09–10", short:"09.–10.01.", wd:"Sa – So"},
  {id:3, m:"Januar 2027",  days:"16–17", short:"16.–17.01.", wd:"Sa – So"},
  {id:4, m:"Januar 2027",  days:"23–24", short:"23.–24.01.", wd:"Sa – So"},
  {id:5, m:"Januar 2027",  days:"30–31", short:"30.–31.01.", wd:"Sa – So"},
  {id:6, m:"Februar 2027", days:"06–07", short:"06.–07.02.", wd:"Sa – So", hint:"Fasching-Wochenende", cls:"rose"},
  {id:7, m:"Februar 2027", days:"13–14", short:"13.–14.02.", wd:"Sa – So", hint:"Valentinstag am So"},
  {id:8, m:"Februar 2027", days:"20–21", short:"20.–21.02.", wd:"Sa – So"},
  {id:9, m:"Februar 2027", days:"27–28", short:"27.–28.02.", wd:"Sa – So"},
];
const byId = Object.fromEntries(DATES.map(d=>[d.id,d]));
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hue = n => `--h1:${HUES[n][0]};--h2:${HUES[n][1]}`;

function setSteps(n){
  document.querySelectorAll("#steps span").forEach((s,i)=>s.classList.toggle("on", i<n));
}

/* Stimmen laden: zuerst über den Worker (immer aktuell), sonst direkt über die GitHub-API */
async function loadVotes(){
  const out = {};
  const put = v => { if(v && NAMES.includes(v.name)) out[v.name] = {...v, dates:(v.dates||[]).map(Number)}; };
  if (WORKER_URL){
    try{
      const r = await fetch(WORKER_URL + "/votes", {cache:"no-store"});
      if (r.ok){ (await r.json()).forEach(put); return {votes:out, source:"live"}; }
    }catch{}
  }
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/votes?t=${Date.now()}`);
  if (r.status === 404) return {votes:out, source:"github"};
  if (!r.ok) throw new Error("GitHub " + r.status);
  const files = (await r.json()).filter(f=>f.name.endsWith(".json"));
  await Promise.all(files.map(async f=>{
    try{ put(await (await fetch(f.download_url + "?t=" + Date.now())).json()); }catch{}
  }));
  return {votes:out, source:"github"};
}

addEventListener("pointermove", e=>{
  document.documentElement.style.setProperty("--mx", e.clientX+"px");
  document.documentElement.style.setProperty("--my", e.clientY+"px");
},{passive:true});

function burst(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c=document.getElementById("confetti"), x=c.getContext("2d"), dpr=devicePixelRatio||1;
  const W=c.width=innerWidth*dpr, H=c.height=innerHeight*dpr;
  c.style.width=innerWidth+"px"; c.style.height=innerHeight+"px";
  const cols=["#f5c96a","#ff5fa8","#46d3ff","#ffffff","#8b5cff"];
  const P=Array.from({length:150},()=>({x:W/2,y:H*.45,vx:(Math.random()-.5)*28*dpr,vy:(-Math.random()*26-6)*dpr,r:(Math.random()*7+4)*dpr,c:cols[Math.random()*cols.length|0],a:Math.random()*6,s:(Math.random()-.5)*.3,chip:Math.random()<.35}));
  let t=0;
  (function f(){
    x.clearRect(0,0,W,H); t++;
    P.forEach(p=>{p.vy+=.7*dpr; p.vx*=.985; p.x+=p.vx; p.y+=p.vy; p.a+=p.s;
      x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.globalAlpha=Math.max(0,1-t/140); x.fillStyle=p.c;
      if(p.chip){ x.beginPath(); x.ellipse(0,0,p.r*1.3,p.r*1.3*Math.abs(Math.cos(p.a)),0,0,7); x.fill(); x.strokeStyle="rgba(0,0,0,.35)"; x.lineWidth=2; x.setLineDash([3,3]); x.stroke(); }
      else x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);
      x.restore();});
    if(t<140) requestAnimationFrame(f); else x.clearRect(0,0,W,H);
  })();
}

/* ===== FX: Funken, Ripple, Vibration, Slot ===== */
function buzz(ms){ try{ navigator.vibrate && navigator.vibrate(ms); }catch{} }
function slotHTML(){
  const sym=["♠","♥","♦","♣"], strip=r=>Array.from({length:13},(_,i)=>`<span>${sym[(i+r)%4]}</span>`).join("")+"<span>7</span>";
  return `<div class="slot win" aria-hidden="true">${[0,1,2].map(r=>`<div class="reel"><div class="strip" style="--r:${r}">${strip(r)}</div></div>`).join("")}</div>`;
}
document.addEventListener("pointerdown", e=>{
  const t=e.target.closest(".btn,.name,.date,.none"); if(!t || t.disabled) return;
  const r=t.getBoundingClientRect(), s=document.createElement("span");
  s.className="ripple"; s.style.left=(e.clientX-r.left)+"px"; s.style.top=(e.clientY-r.top)+"px";
  t.appendChild(s); setTimeout(()=>s.remove(),700); buzz(8);
},{passive:true});
(function sparks(){
  const c=document.getElementById("sparks"); if(!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const x=c.getContext("2d"); let W,H,dpr; const N=innerWidth<620?26:46;
  const size=()=>{dpr=Math.min(devicePixelRatio||1,2); W=c.width=innerWidth*dpr; H=c.height=innerHeight*dpr; c.style.width=innerWidth+"px"; c.style.height=innerHeight+"px";};
  size(); addEventListener("resize",size);
  const mk=(y)=>({x:Math.random()*W, y:y??H+10, v:(Math.random()*.5+.2)*dpr, r:(Math.random()*1.8+.6)*dpr, w:Math.random()*6.28, g:Math.random()<.6});
  const P=Array.from({length:N},()=>mk(Math.random()*H));
  (function f(){
    if(!document.hidden){
      x.clearRect(0,0,W,H);
      P.forEach((p,i)=>{ p.y-=p.v; p.w+=.02; p.x+=Math.sin(p.w)*.4*dpr; if(p.y<-10) P[i]=mk();
        const a=.35+.35*Math.sin(p.w*3);
        x.beginPath(); x.arc(p.x,p.y,p.r,0,6.28); x.fillStyle=p.g?`rgba(245,201,106,${a})`:`rgba(255,255,255,${a*.7})`;
        x.shadowColor=p.g?"rgba(245,201,106,.9)":"rgba(255,255,255,.8)"; x.shadowBlur=8*dpr; x.fill(); });
    }
    requestAnimationFrame(f);
  })();
})();
