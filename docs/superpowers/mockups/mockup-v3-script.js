/* AEC ERP · Control Tower v3 — script (bagian 1/4: helper + data) */
const C={grid:'#e4e4e7',axis:'#71717a',ink:'#18181b',faint:'#a1a1aa',
  pos:'#15803d',neg:'#b91c1c',warn:'#b45309',info:'#1d4ed8',strong:'#d4d4d8'};
const NS='http://www.w3.org/2000/svg';
const el=(n,a={})=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);return e;};
const txt=(s,x,y,o={})=>{const t=el('text',Object.assign({x,y},o));t.textContent=s;return t;};
const h=(html)=>{const d=document.createElement('div');d.innerHTML=html.trim();return d.firstElementChild;};
const fmtRp=(v)=>'Rp '+Math.round(v).toLocaleString('id-ID');
const fmtRpShort=(v)=>{const a=Math.abs(v);if(a>=1e9)return (v<0?'−':'')+'Rp '+(a/1e9).toFixed(1)+'B';if(a>=1e6)return (v<0?'−':'')+'Rp '+(a/1e6).toFixed(0)+'M';return fmtRp(v);};

/* ---- sparkline (area + garis) ---- */
function spark(id,values,color,baseline){
  const s=document.getElementById(id); if(!s) return;
  const w=300,hh=Number(s.getAttribute('height'))||26,pad=3;
  const mn=Math.min(...values,baseline??Infinity),mx=Math.max(...values,baseline??-Infinity),sp=(mx-mn)||1;
  const X=i=>values.length>1?(i/(values.length-1))*w:0, Y=v=>hh-pad-((v-mn)/sp)*(hh-2*pad);
  if(baseline!=null) s.appendChild(el('line',{x1:0,y1:Y(baseline),x2:w,y2:Y(baseline),stroke:'#d4d4d8','stroke-dasharray':'3 3'}));
  const pts=values.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const gid='g_'+id, defs=el('defs'), lg=el('linearGradient',{id:gid,x1:0,y1:0,x2:0,y2:1});
  lg.appendChild(el('stop',{offset:'0%','stop-color':color,'stop-opacity':'.18'}));
  lg.appendChild(el('stop',{offset:'100%','stop-color':color,'stop-opacity':'0'}));
  defs.appendChild(lg); s.appendChild(defs);
  s.appendChild(el('polygon',{points:`0,${hh} ${pts} ${w},${hh}`,fill:`url(#${gid})`}));
  s.appendChild(el('polyline',{points:pts,fill:'none',stroke:color,'stroke-width':1.6,'stroke-linejoin':'round','stroke-linecap':'round'}));
}

/* ---- ring gauge ---- */
function ring(id,pc,color,label){
  const s=document.getElementById(id); if(!s) return;
  const size=Number(s.getAttribute('width'))||60, cx=size/2, cy=size/2, r=size/2-6, sw=5, circ=2*Math.PI*r;
  s.appendChild(el('circle',{cx,cy,r,fill:'none',stroke:'#f4f4f5','stroke-width':sw}));
  s.appendChild(el('circle',{cx,cy,r,fill:'none',stroke:color,'stroke-width':sw,'stroke-linecap':'round',
    'stroke-dasharray':`${circ*pc/100} ${circ}`,transform:`rotate(-90 ${cx} ${cy})`}));
  s.appendChild(txt(pc+'%',cx,cy+4,{'text-anchor':'middle','font-size':size>52?'11':'10','font-family':'IBM Plex Mono, monospace','font-weight':'600',fill:'#18181b'}));
  if(label) s.appendChild(txt(label,cx,cy+size/2-2,{'text-anchor':'middle','font-size':'8',fill:'#71717a'}));
}

/* ---- CASH FLOW (grouped bar + forecast band + target + zero) ---- */
function chartCashFlow(id){
  const s=document.getElementById(id); if(!s) return;
  const W=640,H=200,L=44,R=10,T=12,B=26;
  const iv=[310,280,340,420,390,470,440,410,380,360,330,300];
  const ov=[260,300,290,308,330,340,360,350,320,300,290,280];
  const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const max=520,y=v=>H-B-(v/max)*(H-T-B);
  for(let g=0;g<=4;g++){const v=g*130;s.appendChild(el('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),stroke:C.grid,'stroke-dasharray':'3 3'}));
    s.appendChild(txt(v+'jt',L-6,y(v)+3,{'text-anchor':'end','font-size':'9',fill:C.axis}));}
  s.appendChild(el('line',{x1:L,y1:y(0),x2:W-R,y2:y(0),stroke:C.strong}));
  const fx0=L+(9/12)*(W-L-R);
  s.appendChild(el('rect',{x:fx0,y:T,width:W-R-fx0,height:H-T-B,fill:'rgba(161,161,170,.10)'}));
  s.appendChild(txt('forecast',(fx0+W-R)/2,T+10,{'text-anchor':'middle','font-size':'8',fill:C.faint}));
  s.appendChild(el('line',{x1:L,y1:y(330),x2:W-R,y2:y(330),stroke:C.ink,'stroke-width':1,'stroke-dasharray':'5 4','opacity':'.5'}));
  const bw=(W-L-R)/12, barW=bw*0.34;
  mo.forEach((m,i)=>{const cx=L+bw*i+bw/2;
    s.appendChild(el('rect',{x:cx-barW-1,y:y(iv[i]),width:barW,height:y(0)-y(iv[i]),fill:C.pos,rx:2}));
    s.appendChild(el('rect',{x:cx+1,y:y(ov[i]),width:barW,height:y(0)-y(ov[i]),fill:C.neg,rx:2}));
    s.appendChild(txt(m,cx,H-8,{'text-anchor':'middle','font-size':'9',fill:C.axis}));});
}

/* ---- WATERFALL (jembatan kas: opening -> in -> out -> closing) ---- */
function chartWaterfall(id){
  const s=document.getElementById(id); if(!s) return;
  const W=420,H=180,L=40,R=8,T=12,B=26;
  const steps=[['Open',14200,'base'],['Collect',5200,'pos'],['Pay',-4800,'neg'],['Close',14600,'total']];
  let run=steps[0][1]; const bars=[];
  bars.push({x:0,v:steps[0][1],from:0,to:steps[0][1],kind:'base'});
  run=steps[0][1]+steps[1][1]; bars.push({x:1,delta:steps[1][1],from:steps[0][1],to:run,kind:'pos'});
  const r2=run+steps[2][1]; bars.push({x:2,delta:steps[2][1],from:run,to:r2,kind:'neg'});
  bars.push({x:3,v:r2,from:0,to:r2,kind:'total'});
  const max=18000,y=v=>H-B-(v/max)*(H-T-B);
  for(let g=0;g<=3;g++){const v=g*6000;s.appendChild(el('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),stroke:C.grid,'stroke-dasharray':'3 3'}));
    s.appendChild(txt((v/1000)+'jt',L-6,y(v)+3,{'text-anchor':'end','font-size':'9',fill:C.axis}));}
  const bw=(W-L-R)/4;
  bars.forEach(b=>{const cx=L+bw*b.x+bw/2, w2=bw*0.44;
    const top=Math.min(y(b.from),y(b.to)), hgt=Math.abs(y(b.from)-y(b.to));
    const col=b.kind==='pos'?C.pos:b.kind==='neg'?C.neg:b.kind==='total'?C.ink:'#71717a';
    s.appendChild(el('rect',{x:cx-w2/2,y:top,width:w2,height:Math.max(2,hgt),fill:col,rx:2}));
    // connector
    if(b.x<3) s.appendChild(el('line',{x1:cx+w2/2,y1:y(b.to),x2:cx+bw-w2/2,y2:y(b.to),stroke:C.faint,'stroke-dasharray':'2 2'}));
    s.appendChild(txt(b.kind==='pos'?'+'+b.delta:b.kind==='neg'?b.delta:fmtRpShort(b.v??b.to),cx,top-5,{'text-anchor':'middle','font-size':'9',fill:col==='#71717a'?C.axis:col,'font-weight':'600'}));
    s.appendChild(txt(steps[b.x][0],cx,H-8,{'text-anchor':'middle','font-size':'9',fill:C.axis}));});
}

/* ---- SCATTER (portfolio EVM: CPI x SPI, bubble = contract) ---- */
function chartScatter(id){
  const s=document.getElementById(id); if(!s) return;
  const W=260,H=170,pad=22,lo=.6,hi=1.4;
  const X=v=>pad+((v-lo)/(hi-lo))*(W-2*pad), Y=v=>H-pad-((v-lo)/(hi-lo))*(H-2*pad);
  for(let g=0;g<=4;g++){const v=lo+g*(hi-lo)/4;
    s.appendChild(el('line',{x1:X(v),y1:pad,x2:X(v),y2:H-pad,stroke:C.grid,'stroke-dasharray':'2 3'}));
    s.appendChild(el('line',{x1:pad,y1:Y(v),x2:W-pad,y2:Y(v),stroke:C.grid,'stroke-dasharray':'2 3'}));}
  s.appendChild(el('line',{x1:X(1),y1:pad,x2:X(1),y2:H-pad,stroke:C.strong}));
  s.appendChild(el('line',{x1:pad,y1:Y(1),x2:W-pad,y2:Y(1),stroke:C.strong}));
  const pts=[[.82,.91,'neg',9],[.94,.97,'warn',7],[1.05,1.02,'pos',8],[.88,.95,'warn',6],[1.12,1.06,'pos',5],[.72,.80,'neg',7],[1.0,1.08,'pos',5],[.9,1.1,'pos',4]];
  const col={neg:C.neg,warn:C.warn,pos:C.pos};
  pts.forEach(([x,y,k,r])=>s.appendChild(el('circle',{cx:X(x),cy:Y(y),r,fill:col[k],'fill-opacity':'.8',stroke:'#fff','stroke-width':1})));
  s.appendChild(txt('CPI →',W-pad,H-5,{'text-anchor':'end','font-size':'8',fill:C.faint}));
  s.appendChild(txt('↑ SPI',6,pad-5,{'font-size':'8',fill:C.faint}));
}

/* ---- BULLET (nilai vs target, per proyek) ---- */
function chartBullets(id,rows){
  const s=document.getElementById(id); if(!s) return;
  const W=420,rowH=22,pad=6;
  s.setAttribute('viewBox',`0 0 ${W} ${rows.length*rowH+8}`);
  s.setAttribute('height', String(rows.length*rowH+8));
  const lx=96, maxV=1.5;
  rows.forEach((r,i)=>{const yy=i*rowH+rowH/2;
    s.appendChild(txt(r.name,lx-6,yy+3,{'text-anchor':'end','font-size':'10',fill:C.axis}));
    s.appendChild(el('rect',{x:lx,y:yy-4,width:W-lx-40,height:8,fill:'#f4f4f5',rx:2}));
    const wv=Math.min(1,(r.val/maxV))*(W-lx-40);
    s.appendChild(el('rect',{x:lx,y:yy-4,width:wv,height:8,fill:r.val>=1?C.pos:C.neg,rx:2}));
    const tg=lx+(1/maxV)*(W-lx-40);
    s.appendChild(el('line',{x1:tg,y1:yy-7,x2:tg,y2:yy+7,stroke:C.ink,'stroke-width':1.5}));
    s.appendChild(txt(r.val.toFixed(2),W-2,yy+3,{'text-anchor':'end','font-size':'10','font-family':'IBM Plex Mono, monospace','font-weight':'600',fill:r.val>=1?C.pos:C.neg}));});
}

/* ============================================================
   DOM BUILDERS
   ============================================================ */
const root=document.getElementById('root');

/* --- STAT BAND: 6 stat kecil sebagai TEKS (bukan kartu), dipisah rule --- */
function buildStatBand(){
  const items=[
    ['Cash on hand',fmtRp(18240500000),'+12,4%',1,'p','91% of Rp 20B min'],
    ['Net cash flow','+'+fmtRp(420000000),'+8,1%',1,'p','in 5,2B − out 4,8B'],
    ['Contract backlog',fmtRp(31400000000),'−2,1%',-1,'n','89% of Rp 35B tgt'],
    ['AR overdue 61+',fmtRp(3100000000),'−4,2%',-1,'p','target ≤ Rp 2,5B'],
    ['DSO','54 d','+6 d',1,'n','target ≤ 45 d'],
    ['Manpower today','1.240','+3,2%',1,'p','6 sites'],
  ];
  const sec=h(`<div class="sec">
    <div class="sec-h"><span class="name">Position</span><span class="rule"></span>
      <span class="r" id="pos-updated">updated 2s ago</span></div>
    <div class="g" id="statband"></div></div>`);
  root.appendChild(sec);
  const host=sec.querySelector('#statband');
  items.forEach(([k,v,delta,sign,dk,ctx])=>{
    const arrow=sign>0?'▲':sign<0?'▼':'→', dcls=dk==='p'?'p':dk==='n'?'n':'f';
    const cell=h(`<div class="s2 stat">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;">
        <span class="k">${k}</span><span class="dl ${dcls}">${arrow} ${delta}</span></div>
      <div class="v val ${dk==='n'?'neg':''}" data-kpi="${k}">${v}</div>
      <div class="c">${ctx}</div></div>`);
    cell.style.gridColumn='span 2';
    host.appendChild(cell);
  });
}

/* --- SECTION header helper --- */
function secHead(name,count,rightHtml){
  return `<div class="sec-h"><span class="name">${name}</span>${count?`<span class="cnt">${count}</span>`:''}
    <span class="newbadge" data-new="${name}">● baru</span><span class="rule"></span>
    <span class="r">${rightHtml||''}</span></div>`;
}

/* --- T3: CASH FLOW (dominan, bleed) + EXCEPTION list --- */
function buildAttention(){
  const sec=h(`<div class="sec">
    ${secHead('Cash flow &amp; exceptions','',`<span class="leg"><span><i class="dot" style="background:var(--pos)"></i>In</span><span><i class="dot" style="background:var(--crit)"></i>Out</span><span><i class="dot" style="background:var(--n300)"></i>Forecast</span><span><i class="dot" style="background:var(--ink)"></i>Target</span></span>`)}
    <div class="g">
      <div class="blk bleed s8">
        <svg id="cashflow" width="100%" height="200" viewBox="0 0 640 200" preserveAspectRatio="none" aria-label="Cash in and out per month"></svg>
        <div class="hr"></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink50);">
          <span>In <b class="mono pos">Rp 5,2B</b></span><span>Out <b class="mono neg">Rp 4,8B</b></span>
          <span>Net <b class="mono pos">+Rp 420M</b></span><span>Avg <b class="mono">+34M/mo</b></span><span>Peak Apr <b class="mono pos">+112M</b></span>
        </div>
        <div class="foot">Drag to zoom · hover a month syncs every chart</div>
      </div>
      <div class="blk bleed s4">
        <div class="blk-head"><span class="t">Exception queue</span><span class="s" id="exc-count">12 open · oldest 34d</span></div>
        <div class="sbar" style="margin-bottom:10px;">
          <i style="width:17%;background:var(--crit)"></i><i style="width:50%;background:var(--warn)"></i><i style="width:33%;background:var(--info)"></i></div>
        <div class="panel" style="border-radius:var(--r);"><div id="exceptions"></div></div>
        <div class="foot">Click a row for detail · SLA bar = age vs limit</div>
      </div>
    </div></div>`);
  root.appendChild(sec);
  chartCashFlow('cashflow');
  const ex=[
    ['HIGH','Approval SLA','PO-2026-0184','Procurement',6,5,'h'],
    ['HIGH','NCR overdue','NCR-0042','Quality',34,14,'h'],
    ['MED','BG expiring','BG-0017','Treasury',18,30,'m'],
    ['MED','Corrective action','CA-0091','HSE',5,7,'m'],
    ['MED','Budget overrun','PRJ-014','Project',2,1,'m'],
    ['LOW','Claim DRAFT','PC-0311','Finance',9,30,'l'],
    ['LOW','PM overdue','EQ-0021','HCM',12,14,'l'],
    ['LOW','Punch item','PL-0233','Quality',7,30,'l'],
  ];
  const col={h:C.neg,m:C.warn,l:C.info}, host=sec.querySelector('#exceptions');
  ex.forEach(([sev,label,doc,dom,age,lim,cls])=>{
    const over=age>lim;
    host.appendChild(h(`<div class="exc">
      <span class="sev ${cls}"><i class="dot ${cls}"></i>${sev}</span>
      <span class="lb">${label} <span class="dc">${doc}</span> <span class="i34" style="font-size:10px">· ${dom}</span></span>
      <span class="sla"><i style="width:${Math.min(100,(age/lim)*100)}%;background:${over?C.neg:C.warn}"></i></span>
      <span class="mono" style="text-align:right;font-size:11px;color:${over?C.neg:'var(--ink50)'}">${age}d</span></div>`));
  });
}

/* --- T4: OPERATIONAL PULSE (scatter, liquidity, safety, procurement) --- */
function buildPulse(){
  const sec=h(`<div class="sec">
    ${secHead('Operational pulse','',`<span>Liquidity · Safety/Quality · Procurement</span>`)}
    <div class="g">
      <div class="blk s3">
        <div class="blk-head"><span class="t">Portfolio map</span><span class="s">CPI × SPI · bubble = contract</span></div>
        <svg id="scatter" width="100%" height="170" viewBox="0 0 260 170" aria-label="Project scatter CPI vs SPI"></svg>
        <div class="leg" style="margin-top:8px;"><span><i class="dot ok"></i>On track</span><span><i class="dot m"></i>At risk</span><span><i class="dot h"></i>Critical</span></div>
      </div>
      <div class="blk s3">
        <div class="blk-head"><span class="t">Liquidity &amp; working capital</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
          <div><div class="lbl">DSO</div><div class="mono" style="font-size:18px;font-weight:600">54<span style="font-size:11px" class="i50"> d</span></div></div>
          <div><div class="lbl">DPO</div><div class="mono" style="font-size:18px;font-weight:600">38<span style="font-size:11px" class="i50"> d</span></div></div>
          <div><div class="lbl">Cycle</div><div class="mono" style="font-size:18px;font-weight:600;color:var(--warn)">22<span style="font-size:11px" class="i50"> d</span></div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;">
          <span class="mono" style="width:32px;text-align:right;color:var(--info)">4,7B</span>
          <div style="flex:1;display:flex;height:11px;gap:2px;">
            <div style="flex:1;display:flex;justify-content:flex-end;"><i style="width:62%;background:var(--info-fill);border-radius:2px 0 0 2px;display:block"></i></div>
            <div style="width:1px;background:var(--n300)"></div>
            <div style="flex:1;"><i style="width:100%;background:var(--pos-fill);border-radius:0 2px 2px 0;display:block"></i></div>
          </div>
          <span class="mono" style="width:32px;color:var(--pos)">9,1B</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink34);margin:2px 0 10px;"><span>◀ AP</span><span>AR ▶</span></div>
        <div class="lbl" style="margin-bottom:4px;">Aging AR</div>
        <div class="mbar" style="width:100%;height:10px;">
          <i style="width:46%;background:var(--ag1)"></i><i style="width:20%;background:var(--ag2)"></i>
          <i style="width:13%;background:var(--ag3)"></i><i style="width:12%;background:var(--ag4)"></i><i style="width:9%;background:var(--ag5)"></i></div>
        <div class="leg" style="margin-top:6px;gap:8px;font-size:10px;">
          <span><i class="dot" style="width:6px;height:6px;background:var(--ag1)"></i>Cur 4,2</span>
          <span><i class="dot" style="width:6px;height:6px;background:var(--ag4)"></i>61-90 1,1</span>
          <span><i class="dot" style="width:6px;height:6px;background:var(--ag5)"></i>90+ 0,8</span></div>
      </div>
      <div class="blk s3">
        <div class="blk-head"><span class="t">Safety · Quality</span><span class="sev" style="color:var(--pos)"><i class="dot ok"></i>LTI-free 42d</span></div>
        <div class="micro" style="margin-bottom:8px;"><span class="i50" style="font-size:11px">TRIR</span><span class="mono">0,8</span>
          <div class="tr" style="flex:1"><i style="width:53%;background:var(--pos)"></i><span class="tg" style="left:62%"></span></div>
          <span class="i34" style="font-size:10px">tgt ≤1,5</span></div>
        <div class="kv"><span class="k">Incidents open</span><span class="v"><span class="dot h"></span> 4</span></div>
        <div class="kv"><span class="k">NCR open</span><span class="v"><span class="dot m"></span> 11</span></div>
        <div class="kv"><span class="k">Punch open</span><span class="v">23</span></div>
        <div style="margin-top:10px;"><div class="lbl" style="margin-bottom:4px;">Incidents · 6 mo</div>
          <svg id="sp-safety" width="100%" height="26" viewBox="0 0 300 26" preserveAspectRatio="none" aria-label="Incident trend"></svg></div>
      </div>
      <div class="blk s3">
        <div class="blk-head"><span class="t">Procurement</span><span class="s">Open PO 12,4B</span></div>
        <div class="kv"><span class="k">PR pending</span><span class="v">7</span></div>
        <div class="kv"><span class="k">RFQ due</span><span class="v">3</span></div>
        <div class="kv"><span class="k">Vendor score</span><span class="v">3,8 / 5</span></div>
        <div class="micro" style="margin:10px 0 4px;"><span class="i50" style="font-size:11px;width:84px">Top vendor</span><span class="mono" style="font-size:11px">PT Karya 92%</span></div>
        <div class="tr s"><i style="width:92%;background:var(--pos)"></i></div>
        <div style="margin-top:10px;"><div class="lbl" style="margin-bottom:4px;">PO value · 6 mo</div>
          <svg id="sp-proc" width="100%" height="26" viewBox="0 0 300 26" preserveAspectRatio="none" aria-label="PO trend"></svg></div>
      </div>
    </div></div>`);
  root.appendChild(sec);
  chartScatter('scatter');
  spark('sp-safety',[7,6,6,5,5,4],C.neg);
  spark('sp-proc',[9,10.2,11,10.6,12,12.4],C.info);
}

/* --- T5: PORTFOLIO LEDGER (panel) + waterfall + EVM bullets --- */
function buildLedger(){
  const sec=h(`<div class="sec">
    ${secHead('Portfolio ledger','12 projects',`<span class="seg"><button aria-pressed="true">Table</button><button aria-pressed="false">Canvas</button><button aria-pressed="false">Treemap</button></span>`)}
    <div class="g">
      <div class="panel s12" style="padding:0;">
        <table class="led">
          <thead><tr><th>Code</th><th>Project</th><th>Health</th><th>Progress</th><th>Budget / Actual</th><th style="text-align:right">Variance</th><th>CPI / SPI</th><th>Risk</th><th>Client</th></tr></thead>
          <tbody id="ledger"></tbody>
          <tfoot><tr><td colspan="4">Σ 12 projects</td><td>Σ budget 61,0B · actual 44,1B</td><td style="text-align:right" class="neg">−Rp 6,7B</td><td colspan="3" class="i50">CPI 0,93 · SPI 0,97</td></tr></tfoot>
        </table>
      </div>
      <div class="blk s6">
        <div class="blk-head"><span class="t">Cash bridge · period</span><span class="s">opening → collections → payments → closing</span></div>
        <svg id="waterfall" width="100%" height="180" viewBox="0 0 420 180" aria-label="Cash bridge waterfall"></svg>
      </div>
      <div class="blk s6">
        <div class="blk-head"><span class="t">EVM index by project</span><span class="s">CPI vs 1.0 target · red = below</span></div>
        <svg id="bullets" width="100%" height="120" viewBox="0 0 420 120" aria-label="CPI per project vs target"></svg>
      </div>
    </div></div>`);
  root.appendChild(sec);
  const tb=sec.querySelector('#ledger');
  const rows=[
    ['PRJ-014','Ring Road','crit','Critical','▲ 62/78%',62,78,-3.2,.82,.91,'h',16,'Pemprov'],
    ['PRJ-007','Port Extension','risk','At Risk','▲ 88/85%',88,85,-1.8,.94,.97,'m',9,'Pelindo'],
    ['PRJ-002','Toll A-3','track','On Track','▸ 71/70%',71,70,0.4,1.05,1.02,'l',4,'Jasa Marga'],
    ['PRJ-011','Bridge B2','risk','At Risk','▲ 55/61%',55,61,-0.9,.88,.95,'m',12,'Pemprov'],
    ['PRJ-019','Warehouse W1','track','On Track','▸ 90/88%',90,88,0.2,1.01,1.0,'l',5,'Swasta'],
    ['PRJ-023','Water Treatment','risk','At Risk','▲ 44/52%',44,52,-1.1,.9,.93,'m',10,'PDAM'],
    ['PRJ-006','Jetty J2','track','On Track','▸ 80/79%',80,79,0.3,1.03,1.0,'l',6,'Pelindo'],
    ['PRJ-031','Plant P3','nob','No Budget','▸ 12/—%',12,0,0,0,0,'l',3,'Swasta'],
  ];
  const dotc={crit:'h',risk:'m',track:'ok',nob:'off'}, rc={h:C.neg,m:C.warn,l:C.pos};
  rows.forEach(([code,name,hk,hl,prog,pb,pa,vv,cpi,spi,rk,rs,client])=>{
    const vc=vv<0?'neg':vv>0?'pos':'i50';
    const cb=Array.from({length:5},(_,i)=>`<i class="${i<Math.round(cpi*4.5)?('f'+(cpi>=1?'':' bad')):''}"></i>`).join('');
    const sb=Array.from({length:5},(_,i)=>`<i class="${i<Math.round(spi*4.5)?('f'+(spi>=1?'':' bad')):''}"></i>`).join('');
    const mx=Math.max(pb,pa)||1, wp=Math.min(100,pa/mx*100);
    tb.appendChild(h(`<tr>
      <td class="mono i50">${code}</td><td>${name}</td>
      <td><span class="hp"><i class="dot ${dotc[hk]}"></i>${hl}</span></td>
      <td class="mono" style="font-size:11px">${prog}</td>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <span class="mbar"><i style="width:${wp}%;background:${pa>pb?C.neg:C.ink}"></i><i style="width:${100-wp}%;background:var(--n200)"></i></span>
        <span class="mono" style="font-size:10px;color:var(--ink50)">${pb?pb+'/':'—/'}${pa}</span></div></td>
      <td class="mono ${vc}" style="text-align:right">${vv<0?'−':vv>0?'+':''}${Math.abs(vv).toFixed(1)}B</td>
      <td>${cpi?`<span class="ratio">${cb}<span style="width:4px"></span>${sb}</span> <span class="mono" style="font-size:10px;color:var(--ink50)">${cpi}/${spi}</span>`:'<span class="i34">—</span>'}</td>
      <td><span class="riskb" style="background:${rc[rk]}">${rs}</span></td>
      <td class="i50">${client}</td></tr>`));
  });
  chartWaterfall('waterfall');
  chartBullets('bullets',[
    {name:'Ring Road',val:.82},{name:'Port Ext.',val:.94},{name:'Bridge B2',val:.88},
    {name:'Water Treat.',val:.90},{name:'Toll A-3',val:1.05},{name:'Warehouse',val:1.01},{name:'Jetty J2',val:1.03},
  ]);
}

/* --- T6: GOVERNANCE · COMMERCIAL · TREASURY --- */
function buildGov(){
  const sec=h(`<div class="sec">
    ${secHead('Governance · Commercial · Treasury','',`<span>risk · pipeline · exposure</span>`)}
    <div class="g">
      <div class="blk s4">
        <div class="blk-head"><span class="t">Governance</span><span class="s">14 open risk</span></div>
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <div style="flex:0 0 118px;">
            <div class="lbl" style="margin-bottom:5px;">Risk matrix · L×I</div>
            <div class="heat" id="heat"></div>
            <div class="leg" style="margin-top:6px;font-size:10px;gap:6px;">
              <span><i class="dot" style="width:6px;height:6px;background:var(--pos)"></i>low</span>
              <span><i class="dot" style="width:6px;height:6px;background:var(--warn)"></i>med</span>
              <span><i class="dot" style="width:6px;height:6px;background:var(--crit)"></i>high</span></div>
          </div>
          <div style="flex:1;">
            <div class="kv"><span class="k">High risk</span><span class="v"><span class="dot h"></span> 3</span></div>
            <div class="kv"><span class="k">Audit overdue</span><span class="v">2</span></div>
            <div class="kv"><span class="k">Legal open</span><span class="v">5</span></div>
            <div class="kv"><span class="k">Access review</span><span class="v">FY26-Q1</span></div>
          </div>
        </div>
      </div>
      <div class="blk s4">
        <div class="blk-head"><span class="t">Commercial pipeline</span><span class="s">58,2B</span></div>
        <div class="funnel" id="funnel"></div>
        <div class="hr"></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink50);">
          <span>Win rate <b class="mono" style="color:var(--ink)">38%</b></span>
          <span>Tender due <b class="mono" style="color:var(--ink)">2</b></span>
          <span>Variations <b class="mono pos">+1,2B</b></span></div>
      </div>
      <div class="blk s4">
        <div class="blk-head"><span class="t">Treasury</span><span class="s">USD 2,1M @16.240</span></div>
        <div style="display:flex;gap:14px;align-items:center;">
          <svg id="ring-bg" width="62" height="62" viewBox="0 0 62 62" aria-label="Bank guarantee utilisation"></svg>
          <div style="flex:1;">
            <div class="kv"><span class="k">BG expiring</span><span class="v">3 · Rp 4,2B</span></div>
            <div class="kv"><span class="k">FX exposure</span><span class="v">USD 2,1M</span></div>
            <div class="kv"><span class="k">Period close</span><span class="v"><span class="dot m"></span> OPEN 34/40</span></div>
          </div>
        </div>
        <div style="margin-top:10px;"><div class="lbl" style="margin-bottom:4px;">Cash forecast · 6 mo</div>
          <svg id="sp-treasury" width="100%" height="26" viewBox="0 0 300 26" preserveAspectRatio="none" aria-label="Cash forecast trend"></svg></div>
      </div>
    </div></div>`);
  root.appendChild(sec);
  const hg=sec.querySelector('#heat');
  const g=[[2,3,4,5,5],[2,3,3,4,5],[1,2,3,3,4],[1,1,2,2,3],[1,1,1,2,2]];
  const col={1:'#15803d',2:'#65a30d',3:'#ca8a04',4:'#ea580c',5:'#b91c1c'};
  for(let r=4;r>=0;r--)for(let c=0;c<5;c++){const i=document.createElement('i');i.style.background=col[g[r][c]];i.style.opacity=.4+.12*g[r][c];hg.appendChild(i);}
  const fn=sec.querySelector('#funnel');
  [['Lead',58.2,100],['Qualified',41.0,70],['Proposal',28.4,49],['Negotiation',17.1,29],['Won',8.6,15]].forEach(([n,v,w])=>{
    fn.appendChild(h(`<div class="st"><span class="nm">${n}</span><div class="br" style="width:${w*0.86}%"></div><span class="vv">${v.toFixed(1)}B</span></div>`));
  });
  ring('ring-bg',72,C.warn);
  spark('sp-treasury',[8,9.2,8.6,10.1,9.8,10.4],C.info,0);
}

/* --- T7: ANOMALY --- */
function buildAnomaly(){
  const sec=h(`<div class="sec">
    ${secHead('Anomaly triage','',`<span class="chip" style="border-color:var(--warn);color:var(--warn)">4 anomalies</span>`)}
    <div class="panel"><div id="anomalies"></div></div></div>`);
  root.appendChild(sec);
  const host=sec.querySelector('#anomalies');
  [['HIGH','BUDGET_OVERRUN','PRJ-014','Budget 108% of contract (Rp 3,2B / Rp 3,0B)'],
   ['HIGH','NCR_CRITICAL_OPEN','','2 CRITICAL NCR(s) not yet closed'],
   ['MED','ALLOCATION_OVER_100','','3 employee(s) with active allocation >100%'],
   ['LOW','CLAIMS_DRAFT_BACKLOG','','4 claim(s) still DRAFT — certification needed']].forEach(([sev,type,code,msg])=>{
    const cls={HIGH:'h',MED:'m',LOW:'l'}[sev];
    const r=h(`<div class="exc" style="grid-template-columns:56px 176px 1fr;">
      <span class="sev ${cls}"><i class="dot ${cls}"></i>${sev}</span>
      <span class="dc">${type}${code?' <span class="i34">'+code+'</span>':''}</span>
      <span class="lb i70">${msg}</span></div>`);
    host.appendChild(r);
  });
}

/* --- header + timeline --- */
function buildHeader(){
  root.insertAdjacentHTML('beforeend',`
    <div class="phead">
      <div><h1>Dashboard · Control Tower</h1>
        <p class="sub">Portfolio command center · cost, cash, delivery &amp; risk · 12 projects · 3 legal entities · <span id="updated">updated 2s ago</span></p></div>
      <div class="tools">
        <div class="seg" role="group" aria-label="Period">
          <button aria-pressed="false">MTD</button><button aria-pressed="false">QTD</button>
          <button aria-pressed="true">YTD</button><button aria-pressed="false">12M</button></div>
        <button class="btn">All entities ▾</button>
        <button class="btn" aria-label="Reload">⟳</button>
        <button class="btn" id="livebtn" aria-pressed="true">● Live</button>
        <button class="btn">⤓ Export</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:14px;">
      <span class="i34" style="font-size:11px">◀</span>
      <div style="position:relative;flex:1;height:24px;background:var(--raised);border:1px solid var(--bd);border-radius:4px;display:flex;align-items:center;padding:0 8px;">
        <div style="position:absolute;left:20%;right:26%;top:2px;bottom:2px;border:1px solid rgba(220,38,38,.4);background:rgba(220,38,38,.07);border-radius:3px;"></div>
        ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>
          `<span style="flex:1;text-align:center;font-size:10px;color:${i>=3&&i<=5?'var(--ink)':'var(--ink34)'};${i>=3&&i<=5?'font-weight:600':''}">${m}</span>`).join('')}
      </div>
      <span class="i34" style="font-size:11px">▶</span></div>`);
}

/* ============================================================
   LIVE SIM (tiru SSE change-feed -> invalidateQueries -> refetch)
   ============================================================ */
function liveSim(){
  const toasts=document.createElement('div'); toasts.className='toasts'; document.body.appendChild(toasts);
  let on=true, since=2;
  const upd=document.getElementById('updated'), ind=document.getElementById('liveind'), btn=document.getElementById('livebtn');
  const base={
    'Cash on hand':{v:18240500000,step:1.2e8,fmt:v=>fmtRp(v)},
    'Net cash flow':{v:420000000,step:8e6,fmt:v=>'+'+fmtRp(v)},
    'Contract backlog':{v:31400000000,step:9e7,fmt:v=>fmtRp(v)},
    'AR overdue 61+':{v:3100000000,step:-4e7,fmt:v=>fmtRp(v)},
    'DSO':{v:54,step:.3,fmt:v=>Math.round(v)+' d'},
    'Manpower today':{v:1240,step:6,fmt:v=>Math.round(v).toLocaleString('id-ID')},
  };
  const flash=(n,up)=>{n.classList.remove('fl-up','fl-dn');void n.offsetWidth;n.classList.add(up?'fl-up':'fl-dn');};
  const countUp=(n,from,to,fmt)=>{const t0=performance.now(),dur=520;
    (function st(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);n.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(st);})(t0);};
  const toast=(msg)=>{const t=h(`<div class="toast">${msg}</div>`);toasts.appendChild(t);setTimeout(()=>t.remove(),5200);};
  function tick(){
    if(!on) return;
    const keys=Object.keys(base), n=1+Math.floor(Math.random()*2);
    for(let i=0;i<n;i++){
      const k=keys[Math.floor(Math.random()*keys.length)], b=base[k];
      const node=document.querySelector(`[data-kpi="${k}"]`); if(!node) continue;
      const from=b.v; b.v+=b.step*(Math.random()*1.6-0.5); const to=b.v;
      flash(node,to>=from); countUp(node,from,to,b.fmt);
    }
    if(Math.random()<0.45){
      const c=document.getElementById('exc-count'); const cur=parseInt(c.textContent)||12;
      c.textContent=(cur+1)+' open · oldest 34d';
      const nb=document.querySelector('[data-new]');
      if(nb){nb.textContent='● 1 baru';nb.classList.add('on');setTimeout(()=>nb.classList.remove('on'),3000);}
      toast('<b>1 exception baru</b><br>NCR-0051 · Quality · PRJ-011');
    }
    since=0;
  }
  setInterval(()=>{if(on){since++;upd.textContent='updated '+since+'s ago';}},1000);
  setInterval(tick,3600); setTimeout(tick,1400);
  btn.addEventListener('click',()=>{
    on=!on; btn.setAttribute('aria-pressed',String(on));
    btn.textContent=on?'● Live':'○ Paused'; btn.classList.toggle('paused',!on);
    ind.classList.toggle('paused',!on); ind.lastChild.textContent=on?'LIVE':'PAUSED';
  });
  document.addEventListener('visibilitychange',()=>{if(on)ind.classList.toggle('paused',document.hidden);});
}

/* --- boot --- */
buildHeader(); buildStatBand(); buildAttention(); buildPulse(); buildLedger(); buildGov(); buildAnomaly(); liveSim();



