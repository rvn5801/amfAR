/* ════════════════════════════════════════════════════════
   HIV/AIDS POLICY INTELLIGENCE — amfAR Dashboard JS
   Sidebar SPA with 7 pages + PDF export
════════════════════════════════════════════════════════ */
Chart.defaults.color = '#8a8a9a';
Chart.defaults.borderColor = '#27272f';
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size = 11;

const A = '#c8102e', A2 = '#e8304e', GOLD = '#d4a843', BLUE = '#60a5fa', GREEN = '#4ade80';
const PAL = ['#c8102e','#e8304e','#d4a843','#60a5fa','#4ade80','#a78bfa','#fb923c'];
const TT = {backgroundColor:'#18181d',borderColor:'#27272f',borderWidth:1,titleColor:'#8a8a9a',bodyColor:'#ededf0',padding:10,cornerRadius:4};
const fmt = n => n==null?'—':n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'k':String(n);

/* ── PAGE NAVIGATION ── */
const PAGE_META = {
  overview:  {title:'Overview',       sub:'United States HIV/AIDS Surveillance · Real CDC/AIDSVu Data'},
  ehe:       {title:'EHE Tracker',    sub:'Ending the HIV Epidemic · 90% Reduction Goal by 2030'},
  funding:   {title:'Funding Gap',    sub:'Federal PrEP Funding Needed to Reach EHE Targets'},
  simulator: {title:'Epidemic Simulator', sub:'Model Impact of PrEP Expansion on Future HIV Diagnoses'},
  states:    {title:'State Explorer', sub:'State-by-State HIV Data · Click Charts for Full Profiles'},
  policy:    {title:'Policy Tools',   sub:'AI Policy Brief Generator + HIV/AIDS News Feed'},
  chat:      {title:'Ask the Data',   sub:'Natural Language Queries Against Real Surveillance Data'},
};

const loaded = {};

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(btn) btn.classList.add('active');
  const m = PAGE_META[id];
  document.getElementById('pageTitle').textContent = m.title;
  document.getElementById('pageSub').textContent   = m.sub;
  if(!loaded[id]) { loadPage(id); loaded[id]=true; }
}

function loadPage(id) {
  if(id==='overview')  { loadPrep(); loadTransmission(); loadRace(); loadAge(); loadInsights(); }
  if(id==='ehe')       { loadEHEPage(); }
  if(id==='funding')   { loadFundingGap(); }
  if(id==='simulator') { /* user-triggered */ }
  if(id==='states')    { loadStates(); populateStateSelects(); }
  if(id==='policy')    { loadNews(); }
  if(id==='chat')      { /* ready */ }
}

/* ── GLOBAL STATS (always load) ── */
async function loadGlobalStats() {
  const d = await fetch('/api/summary-stats').then(r=>r.json());
  document.getElementById('val-diagnoses').textContent = fmt(d.new_diagnoses);
  document.getElementById('val-prep').textContent = fmt(d.prep_users);
  document.getElementById('val-year').textContent = d.year;
  const sub = document.getElementById('val-yoy');
  sub.textContent = `${d.yoy_change_pct>0?'+':''}${d.yoy_change_pct}% vs prior year`;
  sub.className = 'tstat-sub '+(d.yoy_change_pct<0?'up':'down');
}

/* ── TREND (overview) ── */
let trendRaw=[], trendInst=null;
async function loadTrend() {
  trendRaw = await fetch('/api/national-trend').then(r=>r.json());
  renderTrendAbsolute();
}
function renderTrendAbsolute() {
  if(trendInst) trendInst.destroy();
  trendInst = new Chart(document.getElementById('trendChart'),{
    type:'line',
    data:{labels:trendRaw.map(r=>r.year),datasets:[{label:'New HIV Diagnoses',data:trendRaw.map(r=>r.total_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,0.07)',borderWidth:2.5,pointRadius:4,pointHoverRadius:7,pointBackgroundColor:A,tension:0.35,fill:true}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TT,callbacks:{label:ctx=>' '+ctx.raw.toLocaleString()+' diagnoses'}},annotation:{annotations:{covid:{type:'line',xMin:'2020',xMax:'2020',borderColor:GOLD,borderWidth:1.5,borderDash:[5,4],label:{content:'COVID-19',display:true,color:GOLD,font:{size:10},position:'start',yAdjust:-8}}}}},
    scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}
  });
}
function renderTrendYOY() {
  if(trendInst) trendInst.destroy();
  const yoy=trendRaw.map((r,i)=>i===0?null:parseFloat(((r.total_diagnoses-trendRaw[i-1].total_diagnoses)/trendRaw[i-1].total_diagnoses*100).toFixed(1))).filter(v=>v!==null);
  trendInst = new Chart(document.getElementById('trendChart'),{
    type:'bar',data:{labels:trendRaw.slice(1).map(r=>r.year),datasets:[{data:yoy,backgroundColor:yoy.map(v=>v<0?'rgba(74,222,128,0.7)':'rgba(200,16,46,0.7)'),borderRadius:3,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TT,callbacks:{label:ctx=>` ${ctx.raw}% year-over-year`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v+'%'}}}}
  });
}
function switchTrendView(m) {
  document.getElementById('btnAbsolute').classList.toggle('active',m==='absolute');
  document.getElementById('btnYOY').classList.toggle('active',m==='yoy');
  m==='absolute'?renderTrendAbsolute():renderTrendYOY();
}

/* ── SMALL CHARTS (overview) ── */
async function loadPrep(){const rows=await fetch('/api/prep-trend').then(r=>r.json());if(!rows.length)return;new Chart(document.getElementById('prepChart'),{type:'line',data:{labels:rows.map(r=>r.year),datasets:[{label:'PrEP Users',data:rows.map(r=>r.prep_users),borderColor:GREEN,backgroundColor:'rgba(74,222,128,0.07)',borderWidth:2,pointRadius:3,tension:0.35,fill:true,yAxisID:'y1'},{label:'New Diagnoses',data:rows.map(r=>r.new_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,0.06)',borderWidth:2,pointRadius:3,tension:0.35,fill:true,yAxisID:'y2'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:12}},tooltip:{...TT}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y1:{position:'left',grid:{color:'#1a1a20'},ticks:{color:GREEN,callback:v=>fmt(v)},title:{display:true,text:'PrEP Users',color:GREEN,font:{size:10}}},y2:{position:'right',grid:{display:false},ticks:{color:A,callback:v=>fmt(v)},title:{display:true,text:'New Dx',color:A,font:{size:10}}}}}});}
async function loadTransmission(){const rows=await fetch('/api/transmission').then(r=>r.json());new Chart(document.getElementById('transmissionChart'),{type:'doughnut',data:{labels:rows.map(r=>r.transmission_category),datasets:[{data:rows.map(r=>r.total),backgroundColor:PAL,borderWidth:0,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#8a8a9a',boxWidth:10,padding:8,font:{size:10}}},tooltip:{...TT}}}});}
async function loadRace(){const rows=await fetch('/api/demographics').then(r=>r.json());new Chart(document.getElementById('raceChart'),{type:'bar',data:{labels:rows.map(r=>r.race_ethnicity),datasets:[{data:rows.map(r=>r.total),backgroundColor:rows.map((_,i)=>PAL[i]||'#888'),borderWidth:0,borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TT}},scales:{x:{grid:{color:'#1a1a20'},ticks:{callback:v=>fmt(v),color:'#52525e'}},y:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:10}}}}}});}
async function loadAge(){const rows=await fetch('/api/age-groups').then(r=>r.json());new Chart(document.getElementById('ageChart'),{type:'bar',data:{labels:rows.map(r=>r.age_group),datasets:[{data:rows.map(r=>r.total),backgroundColor:A,borderWidth:0,borderRadius:3,hoverBackgroundColor:A2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TT}},scales:{x:{grid:{display:false},ticks:{color:'#8a8a9a'}},y:{grid:{color:'#1a1a20'},ticks:{callback:v=>fmt(v),color:'#52525e'}}}}});}

/* ── AI INSIGHTS (overview) ── */
async function loadInsights(){
  const resp=await fetch('/api/ai-insights').then(r=>r.json());
  const grid=document.getElementById('insightsGrid');grid.innerHTML='';
  const LBL={trend:'TREND',demographic:'DEMOGRAPHIC',geographic:'GEOGRAPHIC',comparison:'COMPARISON'};
  resp.forEach((ins,i)=>{
    const c=document.createElement('div');c.className='insight-card';c.style.animationDelay=(i*0.12)+'s';
    let tbl='';if(ins.data&&ins.data.length>0){const h=Object.keys(ins.data[0]);tbl=`<table class="insight-data-table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${ins.data.map(r=>`<tr>${h.map(x=>`<td>${r[x]!=null?r[x]:'-'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
    c.innerHTML=`<span class="insight-type-tag">${LBL[ins.insight_type]||'INSIGHT'}</span><p class="insight-q">${ins.question}</p><p class="insight-answer">${ins.answer}</p>${tbl}`;
    grid.appendChild(c);
  });
}

/* ── EHE PAGE ── */
async function loadEHEPage(){
  const data=await fetch('/api/ehe-progress').then(r=>r.json());
  const prog=data.yearly_progress,latest=prog[prog.length-1];
  document.getElementById('val-ehe').textContent=latest.pct_of_ehe_goal_achieved+'%';
  document.getElementById('eheBaselineCases').textContent=data.baseline_diagnoses.toLocaleString();
  document.getElementById('eheCurrentCases').textContent=latest.diagnoses.toLocaleString();
  document.getElementById('eheTargetCases').textContent=data.target_2030.toLocaleString();
  document.getElementById('eheGoalPct').textContent=latest.pct_of_ehe_goal_achieved+'%';
  document.getElementById('eheProgressLabel').textContent=`${latest.pct_reduced_from_baseline}% reduced from ${data.baseline_year}`;
  setTimeout(()=>{document.getElementById('eheBarFill').style.width=Math.max(0,Math.min(100,latest.pct_of_ehe_goal_achieved))+'%';},400);

  new Chart(document.getElementById('eheChart'),{
    type:'line',data:{labels:prog.map(r=>r.year),datasets:[{label:'% of EHE Goal Achieved',data:prog.map(r=>r.pct_of_ehe_goal_achieved),borderColor:GOLD,backgroundColor:'rgba(212,168,67,0.08)',borderWidth:2,pointRadius:3,tension:0.4,fill:true},{label:'On-track',data:prog.map((_,i)=>parseFloat(((i/(prog.length+6))*100).toFixed(1))),borderColor:'rgba(255,255,255,0.12)',borderWidth:1.5,borderDash:[4,4],pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10}}},tooltip:{...TT,callbacks:{label:ctx=>` ${ctx.raw}% of EHE goal`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v+'%'},min:0,max:100}}}
  });

  // EHE Trend with target line
  const trendData=await fetch('/api/national-trend').then(r=>r.json());
  const target=data.target_2030;
  new Chart(document.getElementById('eheTrendChart'),{
    type:'line',data:{labels:trendData.map(r=>r.year),datasets:[
      {label:'Actual Diagnoses',data:trendData.map(r=>r.total_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,0.07)',borderWidth:2,pointRadius:3,tension:0.35,fill:true},
      {label:'2030 EHE Target',data:trendData.map(()=>target),borderColor:GOLD,borderWidth:1.5,borderDash:[6,4],pointRadius:0}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10}}},tooltip:{...TT}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}
  });

  // PNR chart
  const pnr=await fetch('/api/pnr-bottom').then(r=>r.json());
  if(pnr.length) new Chart(document.getElementById('pnrChart'),{type:'bar',data:{labels:pnr.map(r=>r.state),datasets:[{data:pnr.map(r=>r.pnr_ratio),backgroundColor:pnr.map(r=>r.pnr_ratio<2?A2:GOLD),borderWidth:0,borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TT,callbacks:{label:ctx=>` PNR: ${ctx.raw.toFixed(2)}`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:10}}}}}});
}

/* ── FUNDING GAP ── */
async function loadFundingGap(){
  const data=await fetch('/api/funding-gap').then(r=>r.json());
  document.getElementById('val-gap').textContent='$'+data.total_funding_gap_billions+'B';
  document.getElementById('fsbTotal').textContent='$'+data.total_funding_gap_billions+'B';
  document.getElementById('fsbPatients').textContent=data.total_additional_prep_needed.toLocaleString();
  const grid=document.getElementById('fundingGrid');grid.innerHTML='';
  data.states.forEach((s,i)=>{
    const p=s.priority.toLowerCase();
    const card=document.createElement('div');card.className=`funding-card ${p}`;card.style.animationDelay=(i*0.04)+'s';
    card.innerHTML=`<div class="funding-state">${s.state}</div><div class="funding-pnr">PNR: ${s.pnr_ratio} &nbsp;·&nbsp; Current PrEP: ${s.current_prep.toLocaleString()}</div><div class="funding-amount">$${s.funding_gap_millions}M</div><div class="funding-prep">+${s.additional_prep_needed.toLocaleString()} additional patients needed</div><span class="funding-badge ${p}">${s.priority} PRIORITY</span>`;
    grid.appendChild(card);
  });
}

/* ── EPIDEMIC SIMULATOR ── */
function updateSimLabels(){
  document.getElementById('prepPctLabel').textContent=document.getElementById('prepSlider').value+'%';
  document.getElementById('targetYearLabel').textContent=document.getElementById('yearSlider').value;
}
let simInst=null;
async function runSimulation(){
  const prepPct=parseInt(document.getElementById('prepSlider').value);
  const targetYear=parseInt(document.getElementById('yearSlider').value);
  const btn=document.querySelector('#page-simulator .run-btn');
  btn.disabled=true;btn.textContent='Simulating…';
  const data=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prep_increase_pct:prepPct,target_year:targetYear})}).then(r=>r.json());
  document.getElementById('simStats').innerHTML=`
    <div class="sim-kpi"><div class="sim-kpi-label">Infections Prevented</div><div class="sim-kpi-value good">${data.diagnoses_prevented.toLocaleString()}</div></div>
    <div class="sim-kpi"><div class="sim-kpi-label">${targetYear} Projected Diagnoses</div><div class="sim-kpi-value">${data.projected_diagnoses.toLocaleString()}</div></div>
    <div class="sim-kpi"><div class="sim-kpi-label">EHE Goal Progress</div><div class="sim-kpi-value ${data.ehe_reduction_from_2017_pct>=50?'good':'warn'}">${data.ehe_reduction_from_2017_pct}%</div></div>
    <div class="sim-kpi"><div class="sim-kpi-label">Additional PrEP Users</div><div class="sim-kpi-value">${(data.projected_prep_users-data.current_prep_users).toLocaleString()}</div></div>`;
  document.getElementById('simChartTag').textContent=`${data.baseline_year}–${targetYear} projection · +${prepPct}% PrEP coverage`;
  if(simInst) simInst.destroy();
  const proj=data.yearly_projection;
  simInst=new Chart(document.getElementById('simChart'),{type:'line',data:{labels:proj.map(r=>r.year),datasets:[{label:'Projected Diagnoses',data:proj.map(r=>r.projected_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,0.08)',borderWidth:2,borderDash:[6,3],pointRadius:3,tension:0.4,fill:true},{label:'Projected PrEP Users',data:proj.map(r=>r.projected_prep),borderColor:GREEN,borderWidth:2,borderDash:[6,3],pointRadius:3,tension:0.4,yAxisID:'y2'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10}}},tooltip:{...TT}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:A,callback:v=>fmt(v)}},y2:{position:'right',grid:{display:false},ticks:{color:GREEN,callback:v=>fmt(v)}}}}});
  if(data.commentary) document.getElementById('simCommentary').textContent=data.commentary;
  document.getElementById('simResults').style.display='block';
  btn.disabled=false;btn.textContent='Run Simulation →';
}

/* ── STATE CHART ── */
let stateData=[];
async function loadStates(){
  stateData=await fetch('/api/state-prevalence').then(r=>r.json());
  new Chart(document.getElementById('stateChart'),{
    type:'bar',
    data:{labels:stateData.map(r=>r.state),datasets:[{label:'Rate per 100k',data:stateData.map(r=>r.rate_per_100k),backgroundColor:stateData.map(r=>r.state==='District of Columbia'?GOLD:A),borderWidth:0,borderRadius:2,hoverBackgroundColor:A2}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...TT,callbacks:{label:ctx=>` ${ctx.raw.toFixed(1)} per 100k — click for full profile`}}},
    scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:10}}}},
    onClick(evt,els){if(els.length>0) openStateModal(stateData[els[0].index]);},
    onHover(evt,els){evt.native.target.style.cursor=els.length?'pointer':'default';}}
  });
}

/* ── STATE COMPARISON ── */
const STATES=[{a:'AL',n:'Alabama'},{a:'AK',n:'Alaska'},{a:'AZ',n:'Arizona'},{a:'AR',n:'Arkansas'},{a:'CA',n:'California'},{a:'CO',n:'Colorado'},{a:'CT',n:'Connecticut'},{a:'DE',n:'Delaware'},{a:'DC',n:'District of Columbia'},{a:'FL',n:'Florida'},{a:'GA',n:'Georgia'},{a:'HI',n:'Hawaii'},{a:'ID',n:'Idaho'},{a:'IL',n:'Illinois'},{a:'IN',n:'Indiana'},{a:'IA',n:'Iowa'},{a:'KS',n:'Kansas'},{a:'KY',n:'Kentucky'},{a:'LA',n:'Louisiana'},{a:'ME',n:'Maine'},{a:'MD',n:'Maryland'},{a:'MA',n:'Massachusetts'},{a:'MI',n:'Michigan'},{a:'MN',n:'Minnesota'},{a:'MS',n:'Mississippi'},{a:'MO',n:'Missouri'},{a:'MT',n:'Montana'},{a:'NE',n:'Nebraska'},{a:'NV',n:'Nevada'},{a:'NH',n:'New Hampshire'},{a:'NJ',n:'New Jersey'},{a:'NM',n:'New Mexico'},{a:'NY',n:'New York'},{a:'NC',n:'North Carolina'},{a:'ND',n:'North Dakota'},{a:'OH',n:'Ohio'},{a:'OK',n:'Oklahoma'},{a:'OR',n:'Oregon'},{a:'PA',n:'Pennsylvania'},{a:'PR',n:'Puerto Rico'},{a:'RI',n:'Rhode Island'},{a:'SC',n:'South Carolina'},{a:'SD',n:'South Dakota'},{a:'TN',n:'Tennessee'},{a:'TX',n:'Texas'},{a:'UT',n:'Utah'},{a:'VT',n:'Vermont'},{a:'VA',n:'Virginia'},{a:'WA',n:'Washington'},{a:'WV',n:'West Virginia'},{a:'WI',n:'Wisconsin'},{a:'WY',n:'Wyoming'}];

function populateStateSelects(){
  ['selectA','selectB'].forEach((id,i)=>{
    const sel=document.getElementById(id);
    STATES.forEach(s=>{const o=document.createElement('option');o.value=s.a;o.textContent=s.n;sel.appendChild(o);});
    sel.value=i===0?'FL':'CA';
  });
}

let cmpTrend=null,cmpRate=null;
async function runComparison(){
  const a=document.getElementById('selectA').value,b=document.getElementById('selectB').value;
  if(!a||!b||a===b){alert('Please select two different states.');return;}
  const btn=document.querySelector('#page-states .run-btn');btn.disabled=true;btn.textContent='Loading…';
  const data=await fetch(`/api/compare-states?a=${a}&b=${b}`).then(r=>r.json());
  if(data.error){alert(data.error);btn.disabled=false;btn.textContent='Compare →';return;}
  const {state_a,state_b,commentary}=data,la=state_a.latest,lb=state_b.latest;
  document.getElementById('compareHeaderRow').innerHTML=`
    <div class="compare-state-card"><div class="compare-state-name">${la.state}</div><div class="compare-stats-mini">
      <div><div class="cstat-label">Diagnoses</div><div class="cstat-value">${fmt(la.total_cases)}</div></div>
      <div><div class="cstat-label">Rate/100k</div><div class="cstat-value">${la.rate_per_100k?.toFixed(1)||'—'}</div></div>
      <div><div class="cstat-label">PrEP</div><div class="cstat-value">${fmt(la.prep_users)}</div></div>
      <div><div class="cstat-label">PNR</div><div class="cstat-value">${la.pnr_ratio?.toFixed(2)||'—'}</div></div>
      <div><div class="cstat-label">MSM%</div><div class="cstat-value">${la.msm_pct?.toFixed(1)||'—'}%</div></div>
    </div></div>
    <div class="compare-state-card"><div class="compare-state-name">${lb.state}</div><div class="compare-stats-mini">
      <div><div class="cstat-label">Diagnoses</div><div class="cstat-value">${fmt(lb.total_cases)}</div></div>
      <div><div class="cstat-label">Rate/100k</div><div class="cstat-value">${lb.rate_per_100k?.toFixed(1)||'—'}</div></div>
      <div><div class="cstat-label">PrEP</div><div class="cstat-value">${fmt(lb.prep_users)}</div></div>
      <div><div class="cstat-label">PNR</div><div class="cstat-value">${lb.pnr_ratio?.toFixed(2)||'—'}</div></div>
      <div><div class="cstat-label">MSM%</div><div class="cstat-value">${lb.msm_pct?.toFixed(1)||'—'}%</div></div>
    </div></div>`;
  if(cmpTrend) cmpTrend.destroy();if(cmpRate) cmpRate.destroy();
  cmpTrend=new Chart(document.getElementById('compareTrendChart'),{type:'line',data:{labels:state_a.trend.map(r=>r.year),datasets:[{label:la.state,data:state_a.trend.map(r=>r.total_cases),borderColor:A,borderWidth:2,pointRadius:2,tension:0.4,fill:false},{label:lb.state,data:state_b.trend.map(r=>r.total_cases),borderColor:BLUE,borderWidth:2,pointRadius:2,tension:0.4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:8,padding:6,font:{size:10}}},tooltip:{...TT}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',font:{size:9}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}});
  cmpRate=new Chart(document.getElementById('compareRateChart'),{type:'line',data:{labels:state_a.trend.map(r=>r.year),datasets:[{label:la.state,data:state_a.trend.map(r=>r.rate_per_100k),borderColor:A,borderWidth:2,pointRadius:2,tension:0.4,fill:false},{label:lb.state,data:state_b.trend.map(r=>r.rate_per_100k),borderColor:BLUE,borderWidth:2,pointRadius:2,tension:0.4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:8,padding:6,font:{size:10}}},tooltip:{...TT,callbacks:{label:ctx=>` ${ctx.raw?.toFixed(1)} per 100k`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',font:{size:9}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v?.toFixed(1)}}}}});
  document.getElementById('compareCommentary').innerHTML=`<strong>AI Commentary:</strong> ${commentary}`;
  document.getElementById('compareInlineResults').style.display='block';
  btn.disabled=false;btn.textContent='Compare →';
}

/* ── STATE MODAL ── */
let mTrend=null,mDemo=null;
async function openStateModal(row){
  const abbr=row.state_abbr||row.state.substring(0,2).toUpperCase();
  document.getElementById('modalAbbr').textContent=abbr;
  document.getElementById('modalName').textContent=row.state;
  document.getElementById('modalStatsRow').innerHTML='<div style="color:var(--dim);font-family:var(--mono);font-size:0.75rem;padding:0.5rem">Loading…</div>';
  document.getElementById('stateModal').classList.add('open');
  document.body.style.overflow='hidden';
  if(mTrend){mTrend.destroy();mTrend=null;}if(mDemo){mDemo.destroy();mDemo=null;}
  const data=await fetch(`/api/state-profile/${abbr}`).then(r=>r.json());
  if(data.error) return;
  const c=data.current,nat=data.national_avg_rate;
  const diff=c.rate_per_100k&&nat?((c.rate_per_100k-nat)/nat*100).toFixed(0):null;
  const cls=diff>0?'vs-above':'vs-below',sign=diff>0?'+':'';
  document.getElementById('modalStatsRow').innerHTML=`
    <div class="modal-stat"><div class="modal-stat-label">New Diagnoses</div><div class="modal-stat-value">${fmt(c.total_cases)}</div><div class="modal-stat-sub">${c.year}</div></div>
    <div class="modal-stat"><div class="modal-stat-label">Rate/100k</div><div class="modal-stat-value">${c.rate_per_100k?.toFixed(1)||'—'}</div><div class="modal-stat-sub ${cls}">${diff!=null?sign+diff+'% vs national':''}</div></div>
    <div class="modal-stat"><div class="modal-stat-label">PrEP Users</div><div class="modal-stat-value">${fmt(c.prep_users)}</div><div class="modal-stat-sub">${c.year}</div></div>
    <div class="modal-stat"><div class="modal-stat-label">PNR Ratio</div><div class="modal-stat-value">${c.pnr_ratio?.toFixed(2)||'—'}</div><div class="modal-stat-sub">PrEP-to-Need</div></div>`;
  const trend=data.trend;
  mTrend=new Chart(document.getElementById('modalTrendChart'),{type:'line',data:{labels:trend.map(r=>r.year),datasets:[{label:'Diagnoses',data:trend.map(r=>r.total_cases),borderColor:A,borderWidth:2,pointRadius:3,tension:0.4,fill:false},{label:'PrEP Users',data:trend.map(r=>r.prep_users),borderColor:GREEN,borderWidth:2,pointRadius:3,tension:0.4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:8,padding:8,font:{size:10}}},tooltip:{...TT}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',font:{size:10}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}});
  mDemo=new Chart(document.getElementById('modalDemoChart'),{type:'doughnut',data:{labels:['Black','Hispanic','White','Asian'],datasets:[{data:[c.black_cases,c.hispanic_cases,c.white_cases,c.asian_cases],backgroundColor:PAL,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{color:'#8a8a9a',boxWidth:8,padding:6,font:{size:10}}},tooltip:{...TT}}}});
  document.getElementById('modalComparison').innerHTML=`<strong>MSM:</strong> ${c.msm_pct?.toFixed(1)||'—'}% &nbsp;·&nbsp; <strong>IDU:</strong> ${c.idu_pct?.toFixed(1)||'—'}% &nbsp;·&nbsp; <strong>Male:</strong> ${fmt(c.male_cases)} · <strong>Female:</strong> ${fmt(c.female_cases)} &nbsp;·&nbsp; <strong>Peak age:</strong> 25–34 (${fmt(c.age_25_34)} cases)`;
}
function closeModal(e){if(e.target.id==='stateModal') closeModalDirect();}
function closeModalDirect(){document.getElementById('stateModal').classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeModalDirect();});

/* ── POLICY BRIEF ── */
let currentTopic='overall HIV epidemic trends and progress toward Ending the HIV Epidemic goals';
function selectTopic(btn,topic){document.querySelectorAll('.topic-pill').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentTopic=topic;document.getElementById('briefTopic').value=topic;document.getElementById('briefOutput').style.display='none';}
async function generateBrief(){
  const btn=document.getElementById('briefBtn'),topic=document.getElementById('briefTopic').value.trim()||currentTopic;
  btn.disabled=true;btn.textContent='Generating…';document.getElementById('briefOutput').style.display='none';
  try{const resp=await fetch('/api/policy-brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic})});const data=await resp.json();document.getElementById('briefDoc').textContent=data.brief;document.getElementById('briefOutput').style.display='block';}
  catch(e){document.getElementById('briefDoc').textContent='Error generating brief.';document.getElementById('briefOutput').style.display='block';}
  btn.disabled=false;btn.textContent='Generate →';
}
function copyBrief(){navigator.clipboard.writeText(document.getElementById('briefDoc').textContent).then(()=>{const b=document.querySelector('.brief-actions .outline-btn'),o=b.textContent;b.textContent='✓ Copied!';setTimeout(()=>b.textContent=o,2000);});}
function exportBriefPDF(){
  const text=document.getElementById('briefDoc').textContent,topic=document.getElementById('briefTopic').value||'HIV Policy Brief';
  const blob=new Blob([`HIV/AIDS POLICY BRIEF\namfAR — The Foundation for AIDS Research\nTopic: ${topic}\nGenerated: ${new Date().toLocaleDateString()}\nData: AIDSVu/CDC NHSS 2014–2023\n\n${'─'.repeat(60)}\n\n${text}\n\n${'─'.repeat(60)}\nData: CDC National HIV Surveillance System via AIDSVu`],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`amfAR_PolicyBrief_${Date.now()}.txt`;a.click();
}

/* ── NEWS ── */
async function loadNews(){
  const grid=document.getElementById('newsGrid');grid.innerHTML='<div class="loading-row">Loading policy news…</div>';
  const data=await fetch('/api/news').then(r=>r.json());
  if(!data.items||!data.items.length){grid.innerHTML='<div class="loading-row">No news loaded.</div>';return;}
  grid.innerHTML='';
  data.items.forEach(item=>{
    const card=document.createElement('div');card.className='news-card';
    const cat=(item.category||'research').toLowerCase();
    card.innerHTML=`<span class="news-cat ${cat}">${item.category||'Research'}</span><div class="news-headline">${item.headline}</div><div class="news-summary">${item.summary}</div><div class="news-relevance">↳ ${item.relevance}</div>`;
    grid.appendChild(card);
  });
}

/* ── CHAT ── */
function appendMsg(role,content){const win=document.getElementById('chatWindow');const wrap=document.createElement('div');wrap.className=`chat-msg ${role==='user'?'user-msg':'assistant-msg'}`;wrap.innerHTML=role==='user'?`<div class="user-badge">U</div><div class="msg-body"><p>${content}</p></div>`:`<span class="msg-icon">◈</span><div class="msg-body">${content}</div>`;win.appendChild(wrap);win.scrollTop=win.scrollHeight;}
function showTyping(){const win=document.getElementById('chatWindow');const w=document.createElement('div');w.className='chat-msg assistant-msg';w.id='typing';w.innerHTML=`<span class="msg-icon">◈</span><div class="msg-body"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;win.appendChild(w);win.scrollTop=win.scrollHeight;}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}
function buildChatResponse(data){let h=`<p>${data.answer}</p>`;if(data.sql)h+=`<div class="msg-sql">${data.sql}</div>`;if(data.data&&data.data.length>0){const k=Object.keys(data.data[0]);h+=`<table class="msg-table"><thead><tr>${k.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${data.data.slice(0,8).map(r=>`<tr>${k.map(x=>`<td>${r[x]!=null?r[x]:'–'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}return h;}
async function sendChat(){const input=document.getElementById('chatInput'),btn=document.getElementById('sendBtn'),q=input.value.trim();if(!q)return;input.value='';btn.disabled=true;appendMsg('user',q);showTyping();try{const resp=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});const data=await resp.json();removeTyping();appendMsg('assistant',data.error?`<p style="color:var(--accent2)">Error: ${data.error}</p>`:buildChatResponse(data));}catch(e){removeTyping();appendMsg('assistant','<p style="color:var(--accent2)">Network error.</p>');}btn.disabled=false;}
function askSuggestion(btn){document.getElementById('chatInput').value=btn.textContent;sendChat();}
document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter') sendChat();});
document.getElementById('briefTopic').addEventListener('keydown',e=>{if(e.key==='Enter') generateBrief();});

/* ── FULL PDF REPORT ── */
async function generateFullReport() {
  const navBtn = document.querySelector('.sidebar-footer .nav-item');
  navBtn.querySelector('.nav-label').textContent = 'Building PDF…';
  navBtn.style.pointerEvents = 'none';

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297, ML = 18, MR = 18, MT = 18, usableW = PW - ML - MR;

    // ── colour helpers ──────────────────────────────────────────────
    const hex2rgb = h => { const n=parseInt(h.replace('#',''),16); return [n>>16&255,(n>>8)&255,n&255]; };
    const setFill  = h => { const [r,g,b]=hex2rgb(h); pdf.setFillColor(r,g,b); };
    const setStroke= h => { const [r,g,b]=hex2rgb(h); pdf.setDrawColor(r,g,b); };
    const setTxt   = h => { const [r,g,b]=hex2rgb(h); pdf.setTextColor(r,g,b); };

    // brand colours
    const BG='#09090b', SURF='#111114', SURF2='#18181d', BORDER='#27272f';
    const TXT='#ededf0', DIM='#8a8a9a', ACCENT='#c8102e', GOLD='#d4a843', GREEN='#4ade80', BLUE='#60a5fa';

    let y = 0; // running cursor

    // ── helper: new page with dark background ──────────────────────
    function newPage() {
      pdf.addPage();
      setFill(BG); pdf.rect(0, 0, PW, PH, 'F');
      y = MT;
    }

    // ── helper: draw horizontal rule ──────────────────────────────
    function rule(color=BORDER, thickness=0.3) {
      setStroke(color); pdf.setLineWidth(thickness);
      pdf.line(ML, y, PW-MR, y); y += 4;
    }

    // ── helper: text block with word-wrap ─────────────────────────
    function textBlock(str, x, maxW, lineH=5) {
      const lines = pdf.splitTextToSize(str, maxW);
      pdf.text(lines, x, y);
      y += lines.length * lineH + 1;
    }

    // ── helper: stat box ──────────────────────────────────────────
    function statBox(label, value, subVal, bx, by, bw, bh, accentColor=ACCENT) {
      setFill(SURF2); pdf.roundedRect(bx, by, bw, bh, 2, 2, 'F');
      setFill(accentColor); pdf.rect(bx, by, 2.5, bh, 'F');
      setTxt(DIM); pdf.setFontSize(6); pdf.setFont('helvetica','normal');
      pdf.text(label.toUpperCase(), bx+5, by+5);
      setTxt(TXT); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
      pdf.text(String(value), bx+5, by+12);
      if(subVal) { setTxt(DIM); pdf.setFontSize(6.5); pdf.setFont('helvetica','normal'); pdf.text(String(subVal), bx+5, by+17); }
    }

    // ── helper: capture canvas → PDF image ────────────────────────
    async function embedCanvas(canvasId, x, iy, w, h) {
      const el = document.getElementById(canvasId);
      if (!el) return;
      try {
        const snap = await html2canvas(el, { backgroundColor:'#111114', scale:2, logging:false, useCORS:true });
        const img = snap.toDataURL('image/png');
        pdf.addImage(img, 'PNG', x, iy, w, h);
      } catch(e) { console.warn('canvas capture failed:', canvasId, e); }
    }

    // ── helper: section heading ────────────────────────────────────
    function sectionHeading(title, color=ACCENT) {
      setFill(color); pdf.rect(ML, y, 3, 7, 'F');
      setTxt(TXT); pdf.setFontSize(12); pdf.setFont('helvetica','bold');
      pdf.text(title, ML+6, y+5.5);
      y += 11;
    }

    // ════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════════
    setFill(BG); pdf.rect(0, 0, PW, PH, 'F');

    // red top band
    setFill(ACCENT); pdf.rect(0, 0, PW, 48, 'F');

    // amfAR wordmark
    setTxt('#ffffff'); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('amfAR', ML, 16);
    pdf.setFontSize(7); pdf.setFont('helvetica','normal');
    pdf.text('The Foundation for AIDS Research', ML, 22);

    // title
    pdf.setFontSize(22); pdf.setFont('helvetica','bold');
    pdf.text('HIV/AIDS Policy', ML, 34);
    pdf.text('Intelligence Report', ML, 42);

    y = 58;

    // fetch data
    const data = await fetch('/api/report-data').then(r=>r.json());
    const fundData = await fetch('/api/funding-gap').then(r=>r.json()).catch(()=>null);
    const eheData  = await fetch('/api/ehe-progress').then(r=>r.json()).catch(()=>null);

    // subtitle block
    setTxt(DIM); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
    pdf.text(`Data: AIDSVu / CDC National HIV Surveillance System · 2014–${data.generated}`, ML, y); y+=6;
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`, ML, y); y+=6;
    pdf.text('AI Analysis: GPT-4o-mini · Dashboard: Python / Flask / Chart.js', ML, y); y+=12;

    rule(BORDER);

    // ── 4 stat boxes row 1 ──
    const bw=40, bh=22, gap=3.5;
    const bx1=ML, bx2=ML+bw+gap, bx3=ML+(bw+gap)*2, bx4=ML+(bw+gap)*3;
    statBox('New Diagnoses', data.new_diagnoses.toLocaleString(), `Year ${data.generated}`, bx1,y,bw,bh, ACCENT);
    statBox('PrEP Users',    data.prep_users.toLocaleString(),    `Year ${data.generated}`, bx2,y,bw,bh, BLUE);
    statBox('EHE Progress',  data.ehe_reduction_pct+'%',          'Toward 90% by 2030',    bx3,y,bw,bh, GOLD);
    statBox('Funding Gap',   fundData?'$'+fundData.total_funding_gap_billions+'B':'—', 'Est. PrEP gap', bx4,y,bw,bh, GREEN);
    y += bh + 8;

    // ── national avg rate & EHE target ──
    statBox('Avg Rate / 100k',   data.national_avg_rate,               'National average',        bx1,y,bw,bh,'#a78bfa');
    statBox('2017 EHE Baseline', data.ehe_baseline.toLocaleString(),   'Reference year',           bx2,y,bw,bh,'#fb923c');
    statBox('2030 EHE Target',   data.ehe_target.toLocaleString(),     '−90% from baseline',       bx3,y,bw,bh, GOLD);
    statBox('Total PrEP Needed', fundData?fundData.total_additional_prep_needed.toLocaleString():'—','Additional patients', bx4,y,bw,bh, GREEN);
    y += bh + 10;

    rule();

    // ── EHE progress bar on cover ──
    if(eheData) {
      const prog = eheData.yearly_progress, latest = prog[prog.length-1];
      const pct = Math.max(0,Math.min(100,latest.pct_of_ehe_goal_achieved));
      setTxt(DIM); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
      pdf.text('EHE GOAL PROGRESS', ML, y); y+=4;
      const trackW=usableW, trackH=5;
      setFill(SURF2); pdf.roundedRect(ML,y,trackW,trackH,2,2,'F');
      const fillW = (pct/100)*trackW;
      // gradient simulation: draw ACCENT then GOLD over fill
      setFill(ACCENT); pdf.rect(ML,y,fillW/2,trackH,'F');
      setFill(GOLD);   pdf.rect(ML+fillW/2,y,fillW/2,trackH,'F');
      setTxt('#ffffff'); pdf.setFontSize(6); pdf.text(pct+'% of 90% goal achieved', ML+2, y+3.5);
      y += trackH+6;
    }

    // ── race table on cover ──
    setTxt(TXT); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('Race / Ethnicity Breakdown', ML, y); y+=5;
    rule(BORDER, 0.2);
    data.race_breakdown.forEach(r=>{
      setFill(SURF2); pdf.rect(ML,y-3.5,usableW,6,  'F');
      setTxt(TXT); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
      pdf.text(r.grp, ML+2, y);
      const cnt=(r.n||0).toLocaleString();
      setTxt(DIM); pdf.text(cnt, PW-MR-2, y, {align:'right'});
      // mini bar
      const maxN=Math.max(...data.race_breakdown.map(x=>x.n||0));
      const barW=(r.n/maxN)*(usableW*0.35);
      setFill(ACCENT+'99'); pdf.rect(PW-MR-2-barW-35, y-3, barW, 4,'F');
      y+=7;
    });
    y+=4;

    // footer on cover
    setFill(SURF2); pdf.rect(0,PH-18,PW,18,'F');
    setTxt(DIM); pdf.setFontSize(6.5); pdf.setFont('helvetica','normal');
    pdf.text('amfAR — The Foundation for AIDS Research · HIV/AIDS Policy Intelligence Dashboard · aidsvu.org · cdc.gov/hiv', ML, PH-9);
    pdf.text('Page 1', PW-MR, PH-9, {align:'right'});

    // ════════════════════════════════════════════════════
    // PAGE 2 — NATIONAL TREND + PREP CHARTS
    // ════════════════════════════════════════════════════
    newPage();
    sectionHeading('National HIV Diagnosis Trend', ACCENT);

    // Ensure overview page is loaded so canvases exist
    if(!loaded['overview']) { loadPage('overview'); loaded['overview']=true; await new Promise(r=>setTimeout(r,1800)); }
    else { await new Promise(r=>setTimeout(r,400)); }

    await embedCanvas('trendChart', ML, y, usableW, 68);
    y += 72;

    setTxt(DIM); pdf.setFontSize(7); pdf.setFont('helvetica','italic');
    pdf.text('Source: CDC National HIV Surveillance System via AIDSVu · 2014–2023 · COVID-19 annotation marks 2020 disruption', ML, y); y+=8;

    sectionHeading('PrEP Uptake vs. New Diagnoses', GREEN);
    await embedCanvas('prepChart', ML, y, usableW, 68);
    y += 72;

    setTxt(DIM); pdf.setFontSize(7); pdf.setFont('helvetica','italic');
    pdf.text('Growing PrEP uptake (left axis) vs. declining new diagnoses (right axis) illustrates prevention impact', ML, y); y+=10;

    // trend data table
    sectionHeading('Year-by-Year Data', DIM);
    const colW = [20,40,40,40,20];
    const headers = ['Year','Diagnoses','EHE Baseline','EHE Target','YoY'];
    let tx = ML;
    setFill(SURF2); pdf.rect(ML, y-4, usableW, 7,'F');
    setTxt(DIM); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    headers.forEach((h,i)=>{ pdf.text(h, tx+1, y); tx+=colW[i]; }); y+=4;
    rule(BORDER,0.2);

    const baseline17 = data.ehe_baseline;
    data.trend.forEach((r,i)=>{
      if(i%2===0) { setFill(SURF2+'88'); pdf.rect(ML,y-3.5,usableW,6,'F'); }
      const yoy = i===0?'—': (((r.dx-data.trend[i-1].dx)/data.trend[i-1].dx)*100).toFixed(1)+'%';
      tx=ML;
      setTxt(TXT); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
      [String(r.year),(r.dx||0).toLocaleString(),baseline17.toLocaleString(),data.ehe_target.toLocaleString(),yoy].forEach((v,j)=>{
        if(j===4 && yoy!=='—') { const isDown=parseFloat(yoy)<0; setTxt(isDown?'#4ade80':'#e8304e'); }
        else setTxt(TXT);
        pdf.text(v, tx+1, y); tx+=colW[j];
      });
      y+=6;
    });

    // page footer
    setFill(SURF2); pdf.rect(0,PH-12,PW,12,'F');
    setTxt(DIM); pdf.setFontSize(6.5);
    pdf.text('amfAR HIV/AIDS Policy Intelligence', ML, PH-5);
    pdf.text('Page 2', PW-MR, PH-5, {align:'right'});

    // ════════════════════════════════════════════════════
    // PAGE 3 — DEMOGRAPHICS + EHE TRACKER
    // ════════════════════════════════════════════════════
    newPage();
    sectionHeading('Demographics — Race / Ethnicity & Age', '#a78bfa');

    await embedCanvas('raceChart', ML, y, usableW*0.55, 56);
    await embedCanvas('ageChart',  ML+usableW*0.57, y, usableW*0.43, 56);
    y += 62;

    await embedCanvas('transmissionChart', ML, y, usableW*0.45, 60);

    // EHE progress bar section
    if(eheData) {
      const prog=eheData.yearly_progress, latest=prog[prog.length-1];
      const pct=Math.max(0,Math.min(100,latest.pct_of_ehe_goal_achieved));
      const ex=ML+usableW*0.48, ey=y, ew=usableW*0.52;
      setTxt(TXT); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
      pdf.text('EHE Goal Progress', ex, ey+4);
      setTxt(DIM); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
      pdf.text(`${latest.pct_reduced_from_baseline}% reduction from 2017 baseline`, ex, ey+10);
      const barH=6, barW=ew, barY=ey+14;
      setFill(SURF2); pdf.roundedRect(ex,barY,barW,barH,2,2,'F');
      setFill(ACCENT); pdf.rect(ex,barY,(pct/100)*barW/2,barH,'F');
      setFill(GOLD);   pdf.rect(ex+(pct/100)*barW/2,barY,(pct/100)*barW/2,barH,'F');
      setTxt('#fff');  pdf.setFontSize(6); pdf.text(pct+'% of goal',ex+2,barY+4);
      setTxt(DIM); pdf.setFontSize(7);
      pdf.text(`Current: ${latest.diagnoses.toLocaleString()} · Baseline 2017: ${data.ehe_baseline.toLocaleString()} · Target: ${data.ehe_target.toLocaleString()}`, ex, barY+13);
      y += 66;
    } else { y += 66; }

    sectionHeading('Top High-Burden States', GOLD);
    const scols=[70,35,35,35];
    tx=ML;
    setFill(SURF2); pdf.rect(ML,y-4,usableW,7,'F');
    setTxt(DIM); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    ['State','Cases','Rate/100k','Rank'].forEach((h,i)=>{pdf.text(h,tx+1,y);tx+=scols[i];}); y+=4;
    rule(BORDER,0.2);
    data.top_burden_states.forEach((s,i)=>{
      if(i%2===0){setFill(SURF2+'88');pdf.rect(ML,y-3.5,usableW,6,'F');}
      tx=ML;
      setTxt(TXT); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
      [s.state,(s.total_cases||0).toLocaleString(),String(s.rate_per_100k),'#'+(i+1)].forEach((v,j)=>{
        if(j===2){setTxt(i===0?'#e8304e':i<=2?GOLD:TXT);}else setTxt(TXT);
        pdf.text(v,tx+1,y);tx+=scols[j];
      });
      y+=6;
    });

    setFill(SURF2); pdf.rect(0,PH-12,PW,12,'F');
    setTxt(DIM); pdf.setFontSize(6.5);
    pdf.text('amfAR HIV/AIDS Policy Intelligence', ML, PH-5);
    pdf.text('Page 3', PW-MR, PH-5, {align:'right'});

    // ════════════════════════════════════════════════════
    // PAGE 4 — FUNDING GAP
    // ════════════════════════════════════════════════════
    newPage();
    sectionHeading('Federal PrEP Funding Gap Analysis', GREEN);
    setTxt(DIM); pdf.setFontSize(7.5); pdf.setFont('helvetica','normal');
    if(fundData){
      const lines=[
        `Estimated total national PrEP funding gap: $${fundData.total_funding_gap_billions}B`,
        `Additional PrEP patients needed to reach EHE targets: ${fundData.total_additional_prep_needed.toLocaleString()}`,
        `Cost assumption: $${fundData.cost_assumption_per_patient.toLocaleString()}/patient/year (CDC generic PrEP estimate) · Target PNR: ${fundData.target_pnr}`,
      ];
      lines.forEach(l=>{pdf.text(l,ML,y);y+=5;});
      y+=3; rule();

      // funding table
      const fcols=[62,22,22,28,20,18];
      const fh=['State','PNR','PrEP Users','Funding Gap','+Patients','Priority'];
      tx=ML;
      setFill(SURF2); pdf.rect(ML,y-4,usableW,7,'F');
      setTxt(DIM); pdf.setFontSize(6); pdf.setFont('helvetica','bold');
      fh.forEach((h,i)=>{pdf.text(h,tx+1,y);tx+=fcols[i];}); y+=4;

      fundData.states.slice(0,18).forEach((s,i)=>{
        if(i%2===0){setFill(SURF2+'88');pdf.rect(ML,y-3.5,usableW,6,'F');}
        const pColor = s.priority==='CRITICAL'?'#e8304e': s.priority==='HIGH'?GOLD: BLUE;
        tx=ML;
        [s.state,String(s.pnr_ratio),(s.current_prep||0).toLocaleString(),'$'+s.funding_gap_millions+'M',(s.additional_prep_needed||0).toLocaleString(),s.priority].forEach((v,j)=>{
          if(j===5) setTxt(pColor); else setTxt(TXT);
          pdf.setFontSize(6.5); pdf.setFont('helvetica','normal');
          pdf.text(v,tx+1,y); tx+=fcols[j];
        });
        y+=6;
      });
    }

    setFill(SURF2); pdf.rect(0,PH-12,PW,12,'F');
    setTxt(DIM); pdf.setFontSize(6.5);
    pdf.text('amfAR HIV/AIDS Policy Intelligence', ML, PH-5);
    pdf.text('Page 4', PW-MR, PH-5, {align:'right'});

    // ════════════════════════════════════════════════════
    // PAGE 5 — METHODOLOGY & DATA NOTES
    // ════════════════════════════════════════════════════
    newPage();
    sectionHeading('Data Sources & Methodology', BLUE);

    const methodLines = [
      ['Primary Data Source', 'AIDSVu (aidsvu.org) — powered by the CDC National HIV Surveillance System (NHSS)'],
      ['PrEP Coverage Data',  'AIDSVu State-Level PrEP Data (annual)'],
      ['PNR Metric',          'AIDSVu PrEP-to-Need Ratio — ratio of PrEP users to estimated eligible population'],
      ['EHE Initiative',      'Ending the HIV Epidemic — launched 2019, goal: 90% reduction in new HIV infections by 2030'],
      ['EHE Baseline Year',   '2017 — per official EHE initiative definition'],
      ['Suppressed Data',     'Values <5 reported as NULL per CDC methodology to protect privacy'],
      ['AI Analysis',         'GPT-4o-mini (OpenAI) — policy insights, state comparison commentary, brief generation'],
      ['Dashboard Stack',     'Python 3 · Flask · MySQL 8 · Chart.js 4 · Vanilla JavaScript'],
      ['PDF Export',          'jsPDF 2.5 + html2canvas 1.4 — live chart capture at 2x resolution'],
      ['Data Years',          '2014–2023 (most recent complete AIDSVu release)'],
    ];
    methodLines.forEach(([label,val])=>{
      setFill(SURF2); pdf.rect(ML,y-3.5,usableW,7,'F');
      setTxt(DIM); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
      pdf.text(label, ML+2, y);
      setTxt(TXT); pdf.setFont('helvetica','normal');
      const wrapped = pdf.splitTextToSize(val, usableW-62);
      pdf.text(wrapped, ML+62, y);
      y += Math.max(7, wrapped.length*5+2);
    });

    y+=6; rule();
    sectionHeading('Important Notes', GOLD);
    const notes=[
      'This dashboard is built for portfolio demonstration purposes. All statistics should be verified against primary CDC/AIDSVu sources before use in policy documents.',
      'The PrEP-to-Need Ratio (PNR) methodology follows AIDSVu definitions. A PNR of 10 or above indicates adequate coverage.',
      'Funding gap calculations use CDC\'s estimated generic PrEP cost of $4,200 per patient per year. Brand-name PrEP costs are significantly higher.',
      'EHE progress percentages are calculated as: (1 − current diagnoses / 2017 baseline) × 100.',
      'AI-generated insights and commentary are illustrative and should not be used as the sole basis for policy decisions.',
    ];
    notes.forEach((n,i)=>{
      setTxt(GOLD); pdf.setFontSize(8); pdf.text(`${i+1}.`, ML, y);
      setTxt(TXT); pdf.setFontSize(7.5); pdf.setFont('helvetica','normal');
      const wrapped=pdf.splitTextToSize(n,usableW-8);
      pdf.text(wrapped,ML+6,y);
      y+=wrapped.length*5+3;
    });

    // final footer band
    y = PH-32;
    setFill(ACCENT); pdf.rect(0, y, PW, 0.5, 'F');
    setFill(SURF2);  pdf.rect(0, y+0.5, PW, 32, 'F');
    setTxt('#fff');  pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('amfAR — The Foundation for AIDS Research', ML, y+10);
    setTxt(DIM); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
    pdf.text('HIV/AIDS Policy Intelligence Dashboard · Built with real AIDSVu/CDC data · For demonstration purposes', ML, y+17);
    pdf.text('aidsvu.org  ·  cdc.gov/hiv  ·  amfar.org', ML, y+23);
    pdf.text('Page 5', PW-MR, y+10, {align:'right'});

    // ── save ──────────────────────────────────────────────────────
    pdf.save(`amfAR_HIV_PolicyReport_${data.generated}.pdf`);

  } catch(err) {
    console.error('PDF generation error:', err);
    alert('PDF generation failed: ' + err.message);
  } finally {
    navBtn.querySelector('.nav-label').textContent = 'Export PDF';
    navBtn.style.pointerEvents = '';
  }
}

/* ── BOOT ── */
(async()=>{
  await loadGlobalStats();
  await loadTrend();
  loadPage('overview');
  loaded['overview']=true;
})();