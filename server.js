// One-app server: serves the frontend (./public) and generates the PNG ticket
// Run:
//   npm init -y
//   npm i express canvas multer
//   node server.js

const path = require('path');
const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 } });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req,res)=> res.send('ok'));

app.post('/api/ticket', upload.single('avatar'), async (req,res)=>{
  try{
    const { fullName = '', email = '', github = '' } = req.body || {};

    const w = 1440, h = 810; const canvas = createCanvas(w, h); const ctx = canvas.getContext('2d');
    // Background
    const bg = ctx.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#121133'); bg.addColorStop(0.55,'#1e1550'); bg.addColorStop(1,'#35155d'); ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = .06; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; for(let x=0; x<w; x+=88){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); } ctx.globalAlpha = 1;

    // Headline centered
    ctx.textAlign = 'left'; ctx.font = '800 60px "Space Grotesk", Arial';
    const part1 = 'Congrats, '; const part2 = fullName + '!';
    const w1 = ctx.measureText(part1).width; const w2 = ctx.measureText(part2).width; const total = w1 + w2; let startX = (w-total)/2;
    ctx.fillStyle = '#ffffff'; ctx.fillText(part1, startX, 128);
    ctx.fillStyle = '#ff7a59'; ctx.fillText(part2, startX + w1, 128);
    ctx.fillStyle = '#ffffff'; const line2 = 'Your ticket is ready.'; ctx.fillText(line2, (w-ctx.measureText(line2).width)/2, 192);

    ctx.fillStyle = '#c9c4ff'; ctx.font = '600 24px "JetBrains Mono", monospace'; const l1 = "We've emailed your ticket to"; ctx.fillText(l1, (w-ctx.measureText(l1).width)/2, 238);
    ctx.fillStyle = '#ffb199'; ctx.fillText(email, (w-ctx.measureText(email).width)/2, 268);
    ctx.fillStyle = '#c9c4ff'; const l3 = 'and will send updates in the run up to the event.'; ctx.fillText(l3, (w-ctx.measureText(l3).width)/2, 298);

    // Ticket card
    const tX=(w-880)/2, tY=340, tW=880, tH=260, r=18;
    const tg = ctx.createLinearGradient(tX,tY,tX+tW,tY); tg.addColorStop(0,'#2b2e58'); tg.addColorStop(1,'#3a2d5e'); ctx.fillStyle=tg; ctx.strokeStyle='#ffffff33'; ctx.lineWidth=2; ticketShape(ctx,tX,tY,tW,tH,r,true); ctx.stroke();
    const gloss = ctx.createLinearGradient(tX,tY,tX,tY+tH); gloss.addColorStop(0,'rgba(255,255,255,0.08)'); gloss.addColorStop(0.5,'rgba(255,255,255,0.02)'); gloss.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=gloss; ticketShape(ctx,tX,tY,tW,tH,r,true);

    drawBrand(ctx, tX+24, tY+24, 22); ctx.fillStyle='#ffffff'; ctx.font='700 34px "Space Grotesk", Arial'; ctx.fillText('Coding Conf', tX+64, tY+44);
    ctx.fillStyle = '#c9c4ff'; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.fillText('Jan 31, 2025   /   Austin, TX', tX+24, tY+84);

    const av=64, avX=tX+28, avY=tY+112; if(req.file){ const img = await loadImage(req.file.buffer); ctx.save(); ctx.beginPath(); roundRect(ctx,avX,avY,av,av,12); ctx.clip(); ctx.drawImage(img,avX,avY,av,av); ctx.restore(); } else { ctx.fillStyle='#1d1e35'; roundRect(ctx,avX,avY,av,av,12); ctx.fill(); }
    ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=1; roundRect(ctx,avX,avY,av,av,12); ctx.stroke();

    ctx.fillStyle='#ffffff'; ctx.font='700 26px "Space Grotesk", Arial'; ctx.fillText(fullName, avX+av+16, avY+28);
    ctx.fillStyle='#bdb8ff'; ctx.font='600 18px "JetBrains Mono", monospace'; const handle = github.startsWith('@')? github : '@'+github; ctx.fillText(handle, avX+av+16, avY+58);

    const sepX=tX+tW-180, sepTop=tY+22, sepBot=tY+tH-22; ctx.strokeStyle='#ffffff55'; ctx.setLineDash([4,10]); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(sepX,sepTop); ctx.lineTo(sepX,sepBot); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(tX+tW-110, tY+tH/2); ctx.rotate(-Math.PI/2); ctx.fillStyle='#c9c4ff'; ctx.globalAlpha=.8; ctx.font='600 18px "JetBrains Mono", monospace'; ctx.fillText('#01609',0,0); ctx.restore();

    res.setHeader('Content-Type', 'image/png'); canvas.pngStream().pipe(res);
  }catch(err){ console.error(err); res.status(500).json({error:'render_failed'}); }
});

function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function ticketShape(ctx,x,y,w,h,r,fill){ const notchR=18, notchY=y+h/2; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arc(x+w, notchY, notchR, -Math.PI/2, Math.PI/2, false); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); }
function drawBrand(ctx, x, y, size){ const s=size/2; ctx.save(); ctx.translate(x+size/2,y+size/2); ctx.fillStyle='#ff7a59'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(s*Math.cos(i*Math.PI/2), s*Math.sin(i*Math.PI/2), s*.75, 0, Math.PI*2); ctx.fill(); } ctx.restore(); }

const PORT = process.env.PORT || 3000; app.listen(PORT, ()=> console.log('Server running on http://localhost:'+PORT));