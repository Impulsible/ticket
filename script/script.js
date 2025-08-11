/* script.js — clean merged (client-side only) */
const MAX_FILE_BYTES = 500 * 1024;
const BASE_W = 1440, BASE_H = 810; // 16:9 design

// ----- Elements
const avatarInput  = document.getElementById('avatar');
const avatarPreview= document.getElementById('avatarPreview');
const changeBtn    = document.getElementById('changeBtn');
const removeBtn    = document.getElementById('removeBtn');
const generateBtn  = document.getElementById('generateBtn');
const downloadBtn  = document.getElementById('downloadBtn');
const openFullBtn  = document.getElementById('openFullBtn');
const resetBtn     = document.getElementById('resetBtn');
const dropzone     = document.getElementById('dropzone');

const nameEl   = document.getElementById('fullName');
const emailEl  = document.getElementById('email');
const githubEl = document.getElementById('github');

const previewWrap = document.getElementById('previewWrap');
const canvas      = document.getElementById('ticketCanvas');
const ctx         = canvas.getContext('2d');

let avatarBlob = null;

// ===== Mobile-first canvas sizing
function fitCanvas(el = canvas, baseW = BASE_W, baseH = BASE_H){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = el.clientWidth || el.parentElement.clientWidth || 360;
  const w = Math.round(cssW * dpr);
  const h = Math.round(w * (baseH / baseW));
  el.width = w; el.height = h;
}

function rerenderIfVisible(){
  if(previewWrap.classList.contains('active')){
    fitCanvas();
    renderTicket(canvas, ctx);
  }
}
window.addEventListener('resize', rerenderIfVisible);
window.addEventListener('orientationchange', rerenderIfVisible);

// ===== Inline validation + avatar preview
function setAvatarPreview(src){
  avatarPreview.innerHTML = src
    ? `<img alt="avatar" src="${src}">`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="#9aa1ff"/><path d="M4 20c1.7-4.4 13.3-4.4 16 0" stroke="#9aa1ff"/></svg>`;
}
function fieldError(el, msg){
  const field = el.closest('.field');
  const err = field.querySelector('.error');
  el.classList.add('is-invalid');
  el.setAttribute('aria-invalid','true');
  if(err) err.textContent = msg || '';
}
function clearFieldError(el){
  const field = el.closest('.field');
  const err = field.querySelector('.error');
  el.classList.remove('is-invalid');
  el.removeAttribute('aria-invalid');
  if(err) err.textContent = '';
}
function validate(){
  let ok = true;
  clearFieldError(nameEl); clearFieldError(emailEl); clearFieldError(githubEl);
  if(!nameEl.value.trim()){ fieldError(nameEl,'Full name is required'); ok=false; }
  if(!emailEl.value.trim() || !emailEl.validity.valid){ fieldError(emailEl,'Enter a valid email'); ok=false; }
  if(!githubEl.value.trim()){ fieldError(githubEl,'GitHub username is required'); ok=false; }
  if(avatarBlob && avatarBlob.size > MAX_FILE_BYTES){ fieldError(avatarInput,'Avatar exceeds 500KB'); ok=false; }
  return ok;
}
['input','blur'].forEach(ev=>{
  nameEl.addEventListener(ev, ()=> nameEl.value.trim() && clearFieldError(nameEl));
  emailEl.addEventListener(ev, ()=> emailEl.validity.valid && clearFieldError(emailEl));
  githubEl.addEventListener(ev, ()=> githubEl.value.trim() && clearFieldError(githubEl));
});

// ===== Avatar input / drag-drop
setAvatarPreview(null);
changeBtn.addEventListener('click', () => avatarInput.click());
removeBtn.addEventListener('click', () => { avatarBlob = null; setAvatarPreview(null); });

avatarInput.addEventListener('change', () => {
  const f = avatarInput.files[0]; if(!f) return;
  if(!/^image\/(png|jpe?g)$/.test(f.type)) return fieldError(avatarInput,'Please choose a PNG or JPG image.');
  if(f.size > MAX_FILE_BYTES) return fieldError(avatarInput,'Please choose an image below 500KB.');
  clearFieldError(avatarInput); avatarBlob = f; const url = URL.createObjectURL(f); setAvatarPreview(url);
});
['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.style.borderColor = '#7a6cff';}));
;['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.style.borderColor = '#ffffff22';}));
dropzone.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0]; if(!f) return;
  avatarInput.files = e.dataTransfer.files; avatarInput.dispatchEvent(new Event('change'));
});

// ===== Drawing helpers
function roundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function drawBrand(ctx, x, y, size){
  const s = size/2;
  ctx.save(); ctx.translate(x+size/2, y+size/2); ctx.fillStyle = '#ff7a59';
  for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(s*Math.cos(i*Math.PI/2), s*Math.sin(i*Math.PI/2), s*.75, 0, Math.PI*2); ctx.fill(); }
  ctx.restore();
}
function drawTicketShape(ctx,x,y,w,h,r,fill){
  const notchR = 18; const notchY = y + h/2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arc(x+w, notchY, notchR, -Math.PI/2, Math.PI/2, false);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if(fill) ctx.fill();
}
function blobToImage(blob){
  return new Promise((res,rej)=>{ const img = new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=URL.createObjectURL(blob); });
}

// ===== Core renderer (resolution-independent)
async function renderTicket(targetCanvas, tctx){
  const CW = targetCanvas.width; // CH unused
  const S = CW / BASE_W;

  tctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
  tctx.save(); tctx.scale(S, S);

  const w = BASE_W, h = BASE_H;

  // Background + faint grid
  const bg = tctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,'#121133'); bg.addColorStop(0.55,'#1e1550'); bg.addColorStop(1,'#35155d');
  tctx.fillStyle = bg; tctx.fillRect(0,0,w,h);
  tctx.save(); tctx.globalAlpha = .06; tctx.strokeStyle = '#ffffff'; tctx.lineWidth = 1;
  for(let x=0; x<w; x+=88){ tctx.beginPath(); tctx.moveTo(x,0); tctx.lineTo(x,h); tctx.stroke(); }
  tctx.restore();

  // Brand + headline
  drawBrand(tctx, w/2 - 12, 64, 24);
  const headlineY1 = 128, headlineY2 = 192;
  tctx.textAlign = 'left'; tctx.font = '800 60px "Space Grotesk", sans-serif';
  const part1 = 'Congrats, '; const part2 = nameEl.value.trim() + '!';
  const w1 = tctx.measureText(part1).width; const startX = (w - (w1 + tctx.measureText(part2).width))/2;
  tctx.fillStyle = '#fff'; tctx.fillText(part1, startX, headlineY1);
  tctx.fillStyle = '#ff7a59'; tctx.fillText(part2, startX + w1, headlineY1);
  tctx.fillStyle = '#fff'; tctx.fillText('Your ticket is ready.', (w - tctx.measureText('Your ticket is ready.').width)/2, headlineY2);

  // Subcopy
  const email = emailEl.value.trim();
  tctx.fillStyle = '#bdb8ff'; tctx.font = '600 24px "JetBrains Mono", monospace';
  const l1 = "We've emailed your ticket to";
  tctx.fillText(l1, (w - tctx.measureText(l1).width)/2, 238);
  tctx.fillStyle = '#ffb199';
  tctx.fillText(email, (w - tctx.measureText(email).width)/2, 268);
  tctx.fillStyle = '#bdb8ff';
  const l3 = 'and will send updates in the run up to the event.';
  tctx.fillText(l3, (w - tctx.measureText(l3).width)/2, 298);

  // Ticket card
  const tX = (w-880)/2, tY = 340, tW = 880, tH = 260, r = 18;
  tctx.save();
  tctx.shadowColor = 'rgba(0,0,0,.35)'; tctx.shadowBlur = 24; tctx.shadowOffsetY = 10;
  const cardGrad = tctx.createLinearGradient(tX, tY, tX+tW, tY);
  cardGrad.addColorStop(0,'#2b2e58'); cardGrad.addColorStop(1,'#3a2d5e');
  tctx.fillStyle = cardGrad; tctx.strokeStyle = '#ffffff22'; tctx.lineWidth = 2;
  drawTicketShape(tctx, tX, tY, tW, tH, r, true); tctx.stroke();
  tctx.restore();

  // Gloss
  const gloss = tctx.createLinearGradient(tX,tY,tX,tY+tH);
  gloss.addColorStop(0,'rgba(255,255,255,0.08)');
  gloss.addColorStop(0.5,'rgba(255,255,255,0.02)');
  gloss.addColorStop(1,'rgba(255,255,255,0)');
  tctx.fillStyle = gloss; drawTicketShape(tctx,tX,tY,tW,tH,r,true);

  // Title + date
  drawBrand(tctx, tX+24, tY+24, 22);
  tctx.fillStyle = '#fff'; tctx.font = '700 34px "Space Grotesk", sans-serif';
  tctx.fillText('Coding Conf', tX+64, tY+44);
  tctx.fillStyle = '#c9c4ff'; tctx.font = '600 18px "JetBrains Mono", monospace';
  tctx.fillText('Jan 31, 2025   /   Austin, TX', tX+24, tY+84);

  // Avatar
  const av=64, avX=tX+28, avY=tY+112;
  tctx.save(); roundRectPath(tctx,avX,avY,av,av,12); tctx.clip();
  if(avatarBlob){ const img = await blobToImage(avatarBlob); tctx.drawImage(img,avX,avY,av,av); }
  else { tctx.fillStyle = '#1d1e35'; tctx.fillRect(avX,avY,av,av); }
  tctx.restore(); tctx.strokeStyle='rgba(255,255,255,.6)'; tctx.lineWidth=1; roundRectPath(tctx,avX,avY,av,av,12); tctx.stroke();

  // Name + handle
  const gh = githubEl.value.trim();
  tctx.fillStyle = '#fff'; tctx.font = '700 26px "Space Grotesk", sans-serif';
  tctx.fillText(nameEl.value.trim(), avX+av+16, avY+28);
  tctx.fillStyle = '#bdb8ff'; tctx.font = '600 18px "JetBrains Mono", monospace';
  tctx.fillText(gh.startsWith('@')?gh:'@'+gh, avX+av+16, avY+58);

  // Separator + serial
  const sepX = tX + tW - 180, sepTop = tY+22, sepBot = tY+tH-22;
  tctx.strokeStyle = '#ffffff55'; tctx.setLineDash([4,10]); tctx.lineWidth = 2;
  tctx.beginPath(); tctx.moveTo(sepX,sepTop); tctx.lineTo(sepX,sepBot); tctx.stroke(); tctx.setLineDash([]);

  tctx.save(); tctx.translate(tX+tW-110, tY+tH/2); tctx.rotate(-Math.PI/2);
  tctx.fillStyle = '#c9c4ff'; tctx.globalAlpha = .8; tctx.font = '600 18px "JetBrains Mono", monospace';
  tctx.fillText('#01609', 0, 0); tctx.restore();

  tctx.restore();
}

// ===== Actions
async function drawTicketClient(){
  fitCanvas();
  await renderTicket(canvas, ctx);
  previewWrap.classList.add('active');
}
function downloadCanvasPNG(){
  const a = document.createElement('a');
  a.download = 'coding-conf-ticket.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}
async function openFullPageHiRes(){
  // Render a 4K image for ultra clarity
  const off = document.createElement('canvas');
  off.width = 3840;
  off.height = Math.round(off.width * (BASE_H/BASE_W));
  const octx = off.getContext('2d');
  await renderTicket(off, octx);
  const url = off.toDataURL('image/png');

  // Base href so favicon/manifest paths work for both file:// and http(s)
  const baseHref = (document.baseURI || location.href)
    .replace(/[#?].*$/,'')
    .replace(/[^/]*$/, ''); // strip filename

  const win = window.open('', '_blank');
  if(!win){ alert('Please allow pop-ups to open the ticket.'); return; }
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Your Ticket</title>
  <base href="${baseHref}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">

  <!-- Favicons & PWA -->
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <link rel="mask-icon" href="safari-pinned-tab.svg" color="#ff7a59">
  <meta name="msapplication-TileColor" content="#0b0a1f">
  <meta name="msapplication-config" content="browserconfig.xml">
  <meta name="theme-color" content="#0b0a1f">

  <style>
    :root{--pad:16px}
    html,body{height:100%;margin:0;background:linear-gradient(120deg,#0b0a1f,#1b0f3a 40%,#2a0f4a);}
    .outer{min-height:100%;display:grid;place-items:center}
    img{display:block;border-radius:22px;box-shadow:0 40px 120px rgba(0,0,0,.5);aspect-ratio:16/9;max-width:100vw;height:auto}
    @media (min-aspect-ratio:16/9){ img{height:100vh;width:auto} }
    .bar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:.5rem;justify-content:center;align-items:center;
         padding:calc(10px + env(safe-area-inset-bottom)) var(--pad);background:#0f1026d0;border-top:1px solid #ffffff26;
         color:#fff;font-family:"JetBrains Mono",monospace;backdrop-filter:blur(6px)}
    .bar button{border:0;padding:.55rem .9rem;border-radius:10px;cursor:pointer;background:#ff7a59;color:#1b0f19;font-weight:800}
    @media (min-width:768px){ .bar{width:auto;left:auto;right:18px;bottom:18px;border:1px solid #ffffff26;border-radius:12px;padding:.6rem .7rem} }
    @media print{ .bar{display:none} img{box-shadow:none;border-radius:0} body{background:#000} }
  </style>
</head>
<body>
  <div class="outer"><img src="${url}" alt="Ticket"></div>
  <div class="bar">
    <button onclick="window.print()">Print</button>
    <button onclick="download()">Download PNG</button>
  </div>
  <script>
    function download(){
      const a=document.createElement('a');
      a.href='${url}';
      a.download='coding-conf-ticket.png';
      a.click();
    }
    window.download=download;
  </script>
</body>
</html>`);
  win.document.close();
}

// Bindings
generateBtn.addEventListener('click', async ()=>{
  if(!validate()){
    (nameEl.value ? (emailEl.validity.valid ? githubEl.focus() : emailEl.focus()) : nameEl.focus());
    return;
  }
  try { await drawTicketClient(); } catch { alert('Oops—could not generate the ticket.'); }
});
downloadBtn.addEventListener('click', downloadCanvasPNG);
openFullBtn.addEventListener('click', openFullPageHiRes);
resetBtn.addEventListener('click', ()=>{
  previewWrap.classList.remove('active');
  ctx.clearRect(0,0,canvas.width,canvas.height);
});

// Initial crisp sizing
fitCanvas();

