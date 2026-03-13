/* ════════════════════════════════════════════
   amfAR HIV/AIDS Policy Intelligence Dashboard
   v3 — Choropleth · Disparity · Forecast
        Dark/Light · URL Routing · Story · Mobile
════════════════════════════════════════════ */
Chart.defaults.color='#8a8a9a';Chart.defaults.borderColor='#27272f';
Chart.defaults.font.family="'DM Mono',monospace";Chart.defaults.font.size=11;
const A='#c8102e',A2='#e8304e',GOLD='#d4a843',BLUE='#60a5fa',GREEN='#4ade80';
const PAL=['#c8102e','#e8304e','#d4a843','#60a5fa','#4ade80','#a78bfa','#fb923c'];
const TT={backgroundColor:'#18181d',borderColor:'#27272f',borderWidth:1,titleColor:'#8a8a9a',bodyColor:'#ededf0',padding:10,cornerRadius:4};
function getTT(){const t=document.documentElement.getAttribute('data-theme');return t==='light'?{...TT,backgroundColor:'#fff',borderColor:'#dde1e7',titleColor:'#52525e',bodyColor:'#111114'}:TT;}
const fmt=n=>n==null?'—':n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'k':String(n);

/* ── URL ROUTING ── */
const PAGE_META={
  overview: {title:'Overview',       sub:'United States HIV/AIDS Surveillance · AIDSVu/CDC'},
  map:      {title:'US Choropleth Map',    sub:'HIV Diagnosis Rate Filled by State · Click for Profile'},
  disparity:{title:'Racial Disparity Index',sub:'Composite Equity Score per State · B/W Rate Ratio'},
  forecast: {title:'2030 ML Forecast',    sub:'Linear Regression Projection + Confidence Bands'},
  ehe:      {title:'EHE Tracker',    sub:'Ending the HIV Epidemic · 90% Reduction Goal by 2030'},
  funding:  {title:'Funding Gap',    sub:'Federal PrEP Funding Needed to Reach EHE Targets'},
  simulator:{title:'Epidemic Simulator',sub:'Model PrEP Expansion Impact on Future Diagnoses'},
  states:   {title:'State Explorer', sub:'State-by-State HIV Data · Click for Full Profiles'},
  policy:   {title:'Policy Tools',   sub:'AI Policy Brief Generator + HIV/AIDS News Feed'},
  chat:     {title:'Ask the Data',   sub:'Natural Language Queries Against Real Surveillance Data'},
};
const loaded={};

function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page],.mnav-btn[data-page]').forEach(b=>b.classList.remove('active'));
  const page=document.getElementById('page-'+id);
  if(page) page.classList.add('active');
  document.querySelectorAll('[data-page="'+id+'"]').forEach(b=>b.classList.add('active'));
  const m=PAGE_META[id]||{title:id,sub:''};
  document.getElementById('pageTitle').textContent=m.title;
  document.getElementById('pageSub').textContent=m.sub;
  history.pushState({page:id},'','/dashboard/'+id);
  if(!loaded[id]){loadPage(id);loaded[id]=true;}
  window.scrollTo(0,0);
}

window.onpopstate=e=>{if(e.state?.page) showPage(e.state.page,null);};


function loadPage(id){
  if(id==='overview')  loadOverviewPage();
  if(id==='map')       loadChoroplethPage();
  if(id==='disparity') loadDisparityPage();
  if(id==='forecast')  loadForecastPage();
  if(id==='ehe')       loadEHEPage();
  if(id==='funding')   loadFundingGap();
  if(id==='states')    {loadStates();populateStateSelects();}
  if(id==='policy')    loadNews();
}

/* ── DARK / LIGHT THEME ── */
function toggleTheme(){
  const html=document.documentElement;
  const next=html.getAttribute('data-theme')==='dark'?'light':'dark';
  html.setAttribute('data-theme',next);
  document.getElementById('themeIcon').textContent=next==='dark'?'☀':'☾';
  document.querySelector('.theme-btn .nav-label').textContent=next==='dark'?'Light Mode':'Dark Mode';
  localStorage.setItem('amfar-theme',next);
  Chart.defaults.color=next==='dark'?'#8a8a9a':'#52525e';
  Chart.defaults.borderColor=next==='dark'?'#27272f':'#dde1e7';
}
(()=>{const t=localStorage.getItem('amfar-theme');if(t){document.documentElement.setAttribute('data-theme',t);if(t==='light'){document.getElementById('themeIcon').textContent='☾';document.querySelector('.theme-btn .nav-label').textContent='Dark Mode';}}})();

/* ── GLOBAL STATS ── */
async function loadGlobalStats(){
  const d=await fetch('/api/summary-stats').then(r=>r.json());
  document.getElementById('val-diagnoses').textContent=fmt(d.new_diagnoses);
  document.getElementById('val-prep').textContent=fmt(d.prep_users);
  document.getElementById('val-year').textContent=d.year;
  const sub=document.getElementById('val-yoy');
  sub.textContent=`${d.yoy_change_pct>0?'+':''}${d.yoy_change_pct}% vs prior year`;
  sub.className='tstat-sub '+(d.yoy_change_pct<0?'up':'down');
}

/* ── OVERVIEW PAGE ── */
let trendRaw=[],trendInst=null;
async function loadOverviewPage(){
  trendRaw=await fetch('/api/national-trend').then(r=>r.json());
  renderTrendAbsolute();
  const rows=await fetch('/api/prep-trend').then(r=>r.json());
  if(rows.length) new Chart(document.getElementById('prepChart'),{type:'line',data:{labels:rows.map(r=>r.year),datasets:[{label:'PrEP Users',data:rows.map(r=>r.prep_users),borderColor:GREEN,backgroundColor:'rgba(74,222,128,.07)',borderWidth:2,pointRadius:3,tension:.35,fill:true,yAxisID:'y1'},{label:'New Diagnoses',data:rows.map(r=>r.new_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,.06)',borderWidth:2,pointRadius:3,tension:.35,fill:true,yAxisID:'y2'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:12}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y1:{position:'left',grid:{color:'#1a1a20'},ticks:{color:GREEN,callback:v=>fmt(v)}},y2:{position:'right',grid:{display:false},ticks:{color:A,callback:v=>fmt(v)}}}}});
  const tx=await fetch('/api/transmission').then(r=>r.json());
  new Chart(document.getElementById('transmissionChart'),{type:'doughnut',data:{labels:tx.map(r=>r.transmission_category),datasets:[{data:tx.map(r=>r.total),backgroundColor:PAL,borderWidth:0,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#8a8a9a',boxWidth:10,padding:8,font:{size:10}}},tooltip:getTT()}}});
  const ra=await fetch('/api/demographics').then(r=>r.json());
  new Chart(document.getElementById('raceChart'),{type:'bar',data:{labels:ra.map(r=>r.race_ethnicity),datasets:[{data:ra.map(r=>r.total),backgroundColor:ra.map((_,i)=>PAL[i]||'#888'),borderWidth:0,borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{callback:v=>fmt(v),color:'#52525e'}},y:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:10}}}}}});
  const ag=await fetch('/api/age-groups').then(r=>r.json());
  new Chart(document.getElementById('ageChart'),{type:'bar',data:{labels:ag.map(r=>r.age_group),datasets:[{data:ag.map(r=>r.total),backgroundColor:A,borderWidth:0,borderRadius:3,hoverBackgroundColor:A2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:getTT()},scales:{x:{grid:{display:false},ticks:{color:'#8a8a9a'}},y:{grid:{color:'#1a1a20'},ticks:{callback:v=>fmt(v),color:'#52525e'}}}}});
  loadInsights();
}
function renderTrendAbsolute(){
  if(trendInst) trendInst.destroy();
  trendInst=new Chart(document.getElementById('trendChart'),{type:'line',data:{labels:trendRaw.map(r=>r.year),datasets:[{label:'New HIV Diagnoses',data:trendRaw.map(r=>r.total_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,.07)',borderWidth:2.5,pointRadius:4,pointHoverRadius:7,pointBackgroundColor:A,tension:.35,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...getTT(),callbacks:{label:ctx=>' '+ctx.raw.toLocaleString()+' diagnoses'}},annotation:{annotations:{covid:{type:'line',xMin:'2020',xMax:'2020',borderColor:GOLD,borderWidth:1.5,borderDash:[5,4],label:{content:'COVID-19',display:true,color:GOLD,font:{size:10},position:'start',yAdjust:-8}}}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}});
}
function renderTrendYOY(){
  if(trendInst) trendInst.destroy();
  const yoy=trendRaw.map((r,i)=>i===0?null:parseFloat(((r.total_diagnoses-trendRaw[i-1].total_diagnoses)/trendRaw[i-1].total_diagnoses*100).toFixed(1))).filter(v=>v!==null);
  trendInst=new Chart(document.getElementById('trendChart'),{type:'bar',data:{labels:trendRaw.slice(1).map(r=>r.year),datasets:[{data:yoy,backgroundColor:yoy.map(v=>v<0?'rgba(74,222,128,.7)':'rgba(200,16,46,.7)'),borderRadius:3,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...getTT(),callbacks:{label:ctx=>` ${ctx.raw}% year-over-year`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v+'%'}}}}});
}
function switchTrendView(m){
  document.getElementById('btnAbsolute').classList.toggle('active',m==='absolute');
  document.getElementById('btnYOY').classList.toggle('active',m==='yoy');
  m==='absolute'?renderTrendAbsolute():renderTrendYOY();
}
async function loadInsights(){
  const resp=await fetch('/api/ai-insights').then(r=>r.json());
  const grid=document.getElementById('insightsGrid');grid.innerHTML='';
  const LBL={trend:'TREND',demographic:'DEMOGRAPHIC',geographic:'GEOGRAPHIC',comparison:'COMPARISON'};
  resp.forEach((ins,i)=>{
    const c=document.createElement('div');c.className='insight-card';c.style.animationDelay=(i*.12)+'s';
    let tbl='';if(ins.data?.length>0){const h=Object.keys(ins.data[0]);tbl=`<table class="insight-data-table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${ins.data.map(r=>`<tr>${h.map(x=>`<td>${r[x]!=null?r[x]:'-'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
    c.innerHTML=`<span class="insight-type-tag">${LBL[ins.insight_type]||'INSIGHT'}</span><p class="insight-q">${ins.question}</p><p class="insight-answer">${ins.answer}</p>${tbl}`;
    grid.appendChild(c);
  });
}

/* ── CHOROPLETH MAP PAGE ── */
let choroplethData=null, mapMetric='rate', mapTooltip=null;
async function loadChoroplethPage(){
  choroplethData=await fetch('/api/choropleth').then(r=>r.json());
  const resp=await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
  const us=await resp.json();
  renderChoropleth(us);
  renderMapRankList();
}
function switchMapMetric(m){
  ['Rate','Cases','PNR'].forEach(x=>document.getElementById('mapMetric'+x).classList.remove('active'));
  document.getElementById('mapMetric'+m.charAt(0).toUpperCase()+m.slice(1)).classList.add('active');
  mapMetric=m;
  if(choroplethData) renderChoroplethColors();
}
const FIPS={AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',DC:'11',FL:'12',GA:'13',HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',PR:'72',RI:'44',SC:'45',SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56'};
let svgSelection=null;
function getMetricVal(s){
  if(mapMetric==='rate') return parseFloat(s.rate_per_100k||0);
  if(mapMetric==='cases') return parseInt(s.total_cases||0);
  if(mapMetric==='pnr') return parseFloat(s.pnr_ratio||0);
  return 0;
}
function renderChoropleth(us){
  const container=document.getElementById('choroplethMap');
  container.innerHTML='';
  const W=container.offsetWidth||700, H=container.offsetHeight||460;
  const svg=d3.select('#choroplethMap').append('svg').attr('width',W).attr('height',H);
  const proj=d3.geoAlbersUsa().fitSize([W,H],topojson.feature(us,us.objects.states));
  const path=d3.geoPath().projection(proj);
  const stateMap={};
  choroplethData.states.forEach(s=>{stateMap[FIPS[s.state_abbr]||'']=s;});
  const vals=choroplethData.states.map(s=>getMetricVal(s)).filter(v=>v>0);
  const colorScale=d3.scaleSequential([d3.min(vals),d3.max(vals)],d3.interpolateRgb('#fff5f0',A));
  svgSelection=svg.selectAll('path').data(topojson.feature(us,us.objects.states).features).enter().append('path')
    .attr('class','state-path').attr('d',path)
    .attr('fill',d=>{const s=stateMap[String(d.id).padStart(2,'0')];return s?colorScale(getMetricVal(s)):'#2a2a30';})
    .on('mouseover',function(event,d){
      const s=stateMap[String(d.id).padStart(2,'0')];if(!s) return;
      showMapTooltip(event,s);d3.select(this).attr('opacity',.75);
    })
    .on('mousemove',moveMapTooltip)
    .on('mouseout',function(){hideMapTooltip();d3.select(this).attr('opacity',1);})
    .on('click',(_,d)=>{const s=stateMap[String(d.id).padStart(2,'0')];if(s) openStateModal(s);});
  renderMapLegend(d3.min(vals),d3.max(vals));
}
function renderChoroplethColors(){
  if(!svgSelection) return;
  const stateMap={};choroplethData.states.forEach(s=>{stateMap[FIPS[s.state_abbr]||'']=s;});
  const vals=choroplethData.states.map(s=>getMetricVal(s)).filter(v=>v>0);
  const colorScale=d3.scaleSequential([d3.min(vals),d3.max(vals)],d3.interpolateRgb('#fff5f0',A));
  svgSelection.attr('fill',d=>{const s=stateMap[String(d.id).padStart(2,'0')];return s?colorScale(getMetricVal(s)):'#2a2a30';});
  renderMapLegend(d3.min(vals),d3.max(vals));
}
function renderMapLegend(mn,mx){
  const lbl=mapMetric==='rate'?['Low rate','High rate']:mapMetric==='cases'?['Fewer cases','More cases']:['Lower PNR','Higher PNR'];
  document.getElementById('mapLegend').innerHTML=`<span>${mn.toFixed(1)}</span><div class="legend-bar"></div><span>${mx.toFixed(1)}</span><span style="font-family:var(--mono);font-size:.6rem;color:var(--dim);margin-left:.5rem">${mapMetric==='rate'?'per 100k':mapMetric==='cases'?'total cases':'PNR ratio'}</span>`;
}
function showMapTooltip(event,s){
  if(!mapTooltip){mapTooltip=document.createElement('div');mapTooltip.className='map-tooltip';document.body.appendChild(mapTooltip);}
  mapTooltip.innerHTML=`<div class="map-tooltip-name">${s.state}</div><div style="font-family:var(--mono);font-size:.68rem;color:var(--muted)">Rate: <strong style="color:var(--txt)">${s.rate_per_100k?.toFixed(1)||'—'}</strong> per 100k<br>Cases: <strong style="color:var(--txt)">${fmt(s.total_cases)}</strong><br>PrEP: <strong style="color:var(--green)">${fmt(s.prep_users)}</strong><br>PNR: <strong style="color:var(--gold)">${s.pnr_ratio?.toFixed(2)||'—'}</strong></div>`;
  mapTooltip.style.display='block';
  moveMapTooltip(event);
  showMapInfo(s);
}
function moveMapTooltip(event){if(mapTooltip) {mapTooltip.style.left=(event.clientX+14)+'px';mapTooltip.style.top=(event.clientY-40)+'px';}}
function hideMapTooltip(){if(mapTooltip) mapTooltip.style.display='none';}
function showMapInfo(s){
  document.getElementById('mapInfoPanel').innerHTML=`<h3 style="font-family:var(--serif);font-size:1rem;font-weight:700;margin-bottom:.8rem">${s.state}</h3><div class="map-state-info"><div class="msi-kpi"><span class="msi-label">Diagnosis Rate</span><span class="msi-value" style="color:var(--accent2)">${s.rate_per_100k?.toFixed(1)||'—'} / 100k</span></div><div class="msi-kpi"><span class="msi-label">New Cases</span><span class="msi-value">${fmt(s.total_cases)}</span></div><div class="msi-kpi"><span class="msi-label">PrEP Users</span><span class="msi-value" style="color:var(--green)">${fmt(s.prep_users)}</span></div><div class="msi-kpi"><span class="msi-label">PNR Ratio</span><span class="msi-value" style="color:var(--gold)">${s.pnr_ratio?.toFixed(2)||'—'}</span></div><div class="msi-kpi"><span class="msi-label">Black Cases</span><span class="msi-value">${fmt(s.black_cases)}</span></div><div class="msi-kpi"><span class="msi-label">Hispanic Cases</span><span class="msi-value">${fmt(s.hispanic_cases)}</span></div></div><button class="run-btn" style="width:100%;margin-top:.8rem;font-size:.7rem" onclick="openStateModal(${JSON.stringify(s).replace(/"/g,'&quot;')})">Full Profile →</button>`;
}
function renderMapRankList(){
  const top=choroplethData.states.slice(0,10);
  document.getElementById('mapRankList').innerHTML=top.map((s,i)=>`<div class="map-rank-row"><span class="map-rank-num">${i+1}</span><span class="map-rank-state">${s.state_abbr}</span><span class="map-rank-rate">${s.rate_per_100k?.toFixed(1)||'—'}</span></div>`).join('');
}

/* ── DISPARITY INDEX PAGE ── */
async function loadDisparityPage(){
  const data=await fetch('/api/disparity-index').then(r=>r.json());
  document.getElementById('dispBWNational').textContent=data.national_avg_bw_ratio+'×';
  const high=data.states.filter(s=>s.bw_ratio&&s.bw_ratio>5).length;
  document.getElementById('dispHighCount').textContent=high;
  document.getElementById('dispWorst').textContent=data.states[0]?.state_abbr||'—';
  document.getElementById('dispBest').textContent=data.states[data.states.length-1]?.state_abbr||'—';
  if(data.commentary){const c=document.getElementById('disparityCommentary');c.textContent=data.commentary;c.classList.add('visible');}
  const valid=data.states.filter(s=>s.bw_ratio!=null).slice(0,30);
  const natLine=data.national_avg_bw_ratio;
  new Chart(document.getElementById('disparityChart'),{
    type:'bar',
    data:{labels:valid.map(s=>s.state_abbr),datasets:[{label:'B/W Rate Ratio',data:valid.map(s=>s.bw_ratio),backgroundColor:valid.map(s=>s.bw_ratio>5?A:s.bw_ratio>3?GOLD:'rgba(96,165,250,.6)'),borderWidth:0,borderRadius:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...getTT(),callbacks:{label:ctx=>{const s=valid[ctx.dataIndex];return [` B/W ratio: ${ctx.raw}×`,` Black rate: ${s.black_rate?.toFixed(1)||'—'}`,` White rate: ${s.white_rate?.toFixed(1)||'—'}`];}}},annotation:{annotations:{nat:{type:'line',yMin:natLine,yMax:natLine,borderColor:GOLD,borderWidth:1.5,borderDash:[5,4],label:{content:'National avg: '+natLine+'×',display:true,color:GOLD,font:{size:10},position:'end'}}}}},
    scales:{x:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:9}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v+'×'}}}}
  });
  const top15=data.states.slice(0,15);
  const maxScore=Math.max(...top15.map(s=>s.disparity_score||0));
  document.getElementById('disparityTable').innerHTML=top15.map((s,i)=>{
    const w=(s.disparity_score||0)/maxScore*100;
    const c=s.bw_ratio>5?A:s.bw_ratio>3?GOLD:BLUE;
    return `<div class="disp-table-row"><span class="dtr-rank">${i+1}</span><span class="dtr-state">${s.state_abbr}</span><div class="dtr-bar"><div class="dtr-fill" style="width:${w}%;background:${c}"></div></div><span class="dtr-ratio" style="color:${c}">${s.bw_ratio||'—'}×</span></div>`;
  }).join('');
  const scat=data.states.filter(s=>s.black_rate&&s.white_rate);
  new Chart(document.getElementById('disparityScatter'),{
    type:'scatter',
    data:{datasets:[{label:'States',data:scat.map(s=>({x:s.white_rate,y:s.black_rate,label:s.state_abbr})),backgroundColor:A+'99',pointRadius:5,pointHoverRadius:8},{label:'Equal (1:1)',data:[{x:0,y:0},{x:50,y:50}],type:'line',borderColor:'rgba(255,255,255,.15)',borderWidth:1,borderDash:[4,4],pointRadius:0,showLine:true}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...getTT(),callbacks:{label:ctx=>` ${ctx.raw.label}: W=${ctx.raw.x?.toFixed(1)} B=${ctx.raw.y?.toFixed(1)}`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'},title:{display:true,text:'White rate/100k',color:'#52525e',font:{size:10}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'},title:{display:true,text:'Black rate/100k',color:'#52525e',font:{size:10}}}}}
  });
}

/* ── FORECAST PAGE ── */
async function loadForecastPage(){
  const data=await fetch('/api/forecast').then(r=>r.json()).catch(e=>({error:e.message}));
  if(!data||data.error){
    document.getElementById('forecastHero').innerHTML=`<p style="font-family:var(--mono);color:var(--accent2);padding:1rem">⚠ ${data?.error||'Network error'}.<br><span style="color:var(--dim)">Fix: run <code style="background:var(--surf3);padding:.1rem .4rem;border-radius:3px">pip install numpy scipy</code> then restart Flask.</span></p>`;
    return;
  }
  // API returns {projections:[{year,actual,forecast,lower80,upper80,is_historical}], ...}
  const proj=data.projections||[];
  const hist=proj.filter(r=>r.is_historical);
  const future=proj.filter(r=>!r.is_historical);
  const currentDx=hist.length?hist[hist.length-1].actual:0;
  document.getElementById('fcCurrent').textContent=fmt(currentDx);
  document.getElementById('fc2030').textContent=fmt(data.forecast_2030);
  document.getElementById('fcTarget').textContent=fmt(data.ehe_target_2030);
  const onTrack=data.on_track_for_ehe;
  const otEl=document.getElementById('fcOnTrack');
  otEl.textContent=onTrack?'Yes ✓':'No ✗';
  otEl.style.color=onTrack?'var(--green)':'var(--accent2)';
  const allYears=proj.map(r=>r.year);
  new Chart(document.getElementById('forecastChart'),{
    type:'line',
    data:{labels:allYears,datasets:[
      {label:'Actual',data:proj.map(r=>r.is_historical?r.actual:null),borderColor:A,backgroundColor:'rgba(200,16,46,.08)',borderWidth:2.5,pointRadius:4,tension:.35,fill:true},
      {label:'Forecast',data:proj.map(r=>r.forecast),borderColor:GOLD,borderWidth:2,borderDash:[6,3],pointRadius:r=>r.dataIndex>=hist.length?3:0,tension:.35,fill:false},
      {label:'80% Upper',data:proj.map(r=>r.is_historical?null:r.upper80),borderColor:'rgba(212,168,67,.3)',backgroundColor:'rgba(212,168,67,.12)',borderWidth:1,borderDash:[2,2],pointRadius:0,fill:'+1'},
      {label:'80% Lower',data:proj.map(r=>r.is_historical?null:r.lower80),borderColor:'rgba(212,168,67,.3)',backgroundColor:'transparent',borderWidth:1,borderDash:[2,2],pointRadius:0,fill:false},
      {label:'EHE Target',data:allYears.map(()=>data.ehe_target_2030),borderColor:'rgba(74,222,128,.5)',borderWidth:1.5,borderDash:[4,4],pointRadius:0,fill:false},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10},filter:i=>!['80% Upper','80% Lower'].includes(i.text)}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}
  });
  const fc30=Math.max(0,data.forecast_2030),tgt=data.ehe_target_2030;
  new Chart(document.getElementById('forecastGapChart'),{
    type:'doughnut',data:{labels:['Gap to EHE target','EHE target cases'],datasets:[{data:[Math.max(0,fc30-tgt),tgt],backgroundColor:[A,GREEN],borderWidth:0,hoverOffset:4}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{legend:{position:'bottom',labels:{color:'#8a8a9a',boxWidth:10,padding:8,font:{size:10}}},tooltip:{...getTT(),callbacks:{label:ctx=>` ${fmt(ctx.raw)} diagnoses`}}}}
  });
  const grid=document.getElementById('forecastStateGrid');
  const improving=(data.most_improving||[]).slice(0,4);
  const worsening=(data.most_worsening||[]).slice(0,4);
  grid.innerHTML=[
    ...improving.map(s=>`<div class="forecast-state-card improving"><div class="fsc-name">${s.state}</div><div class="fsc-val">Trend: ${s.slope_per_year}/yr → 2030: ${fmt(s.projected_2030)}</div><div class="fsc-trend good">↓ Improving</div></div>`),
    ...worsening.map(s=>`<div class="forecast-state-card worsening"><div class="fsc-name">${s.state}</div><div class="fsc-val">Trend: +${s.slope_per_year}/yr → 2030: ${fmt(s.projected_2030)}</div><div class="fsc-trend bad">↑ Worsening</div></div>`)
  ].join('');
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
  new Chart(document.getElementById('eheChart'),{type:'line',data:{labels:prog.map(r=>r.year),datasets:[{label:'% of EHE Goal Achieved',data:prog.map(r=>r.pct_of_ehe_goal_achieved),borderColor:GOLD,backgroundColor:'rgba(212,168,67,.08)',borderWidth:2,pointRadius:3,tension:.4,fill:true},{label:'On-track path',data:prog.map((_,i)=>parseFloat(((i/(prog.length+6))*100).toFixed(1))),borderColor:'rgba(255,255,255,.12)',borderWidth:1.5,borderDash:[4,4],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10}}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v+'%'},min:0,max:100}}}});
  const td=await fetch('/api/national-trend').then(r=>r.json());
  new Chart(document.getElementById('eheTrendChart'),{type:'line',data:{labels:td.map(r=>r.year),datasets:[{label:'Actual Diagnoses',data:td.map(r=>r.total_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,.07)',borderWidth:2,pointRadius:3,tension:.35,fill:true},{label:'2030 EHE Target',data:td.map(()=>data.target_2030),borderColor:GOLD,borderWidth:1.5,borderDash:[6,4],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10}}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}});
  const pnr=await fetch('/api/pnr-bottom').then(r=>r.json());
  if(pnr.length) new Chart(document.getElementById('pnrChart'),{type:'bar',data:{labels:pnr.map(r=>r.state),datasets:[{data:pnr.map(r=>r.pnr_ratio),backgroundColor:pnr.map(r=>r.pnr_ratio<2?A2:GOLD),borderWidth:0,borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...getTT(),callbacks:{label:ctx=>` PNR: ${ctx.raw.toFixed(2)}`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:10}}}}}});
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
    const card=document.createElement('div');card.className=`funding-card ${p}`;card.style.animationDelay=(i*.03)+'s';
    card.innerHTML=`<div class="funding-state">${s.state}</div><div class="funding-pnr">PNR: ${s.pnr_ratio} · PrEP: ${s.current_prep.toLocaleString()}</div><div class="funding-amount">$${s.funding_gap_millions}M</div><div class="funding-prep">+${s.additional_prep_needed.toLocaleString()} patients needed</div><span class="funding-badge ${p}">${s.priority}</span>`;
    grid.appendChild(card);
  });
}

/* ── SIMULATOR ── */
function updateSimLabels(){document.getElementById('prepPctLabel').textContent=document.getElementById('prepSlider').value+'%';document.getElementById('targetYearLabel').textContent=document.getElementById('yearSlider').value;}
let simInst=null;
async function runSimulation(){
  const prepPct=parseInt(document.getElementById('prepSlider').value),targetYear=parseInt(document.getElementById('yearSlider').value);
  const btn=document.querySelector('#page-simulator .run-btn');btn.disabled=true;btn.textContent='Simulating…';
  const data=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prep_increase_pct:prepPct,target_year:targetYear})}).then(r=>r.json());
  document.getElementById('simStats').innerHTML=`<div class="sim-kpi"><div class="sim-kpi-label">Infections Prevented</div><div class="sim-kpi-value good">${data.diagnoses_prevented.toLocaleString()}</div></div><div class="sim-kpi"><div class="sim-kpi-label">${targetYear} Diagnoses</div><div class="sim-kpi-value">${data.projected_diagnoses.toLocaleString()}</div></div><div class="sim-kpi"><div class="sim-kpi-label">EHE Goal Progress</div><div class="sim-kpi-value ${data.ehe_reduction_from_2017_pct>=50?'good':'warn'}">${data.ehe_reduction_from_2017_pct}%</div></div><div class="sim-kpi"><div class="sim-kpi-label">Add. PrEP Users</div><div class="sim-kpi-value">${(data.projected_prep_users-data.current_prep_users).toLocaleString()}</div></div>`;
  document.getElementById('simChartTag').textContent=`${data.baseline_year}–${targetYear} · +${prepPct}% PrEP`;
  if(simInst) simInst.destroy();
  const proj=data.yearly_projection;
  simInst=new Chart(document.getElementById('simChart'),{type:'line',data:{labels:proj.map(r=>r.year),datasets:[{label:'Projected Diagnoses',data:proj.map(r=>r.projected_diagnoses),borderColor:A,backgroundColor:'rgba(200,16,46,.08)',borderWidth:2,borderDash:[6,3],pointRadius:3,tension:.4,fill:true},{label:'Projected PrEP',data:proj.map(r=>r.projected_prep),borderColor:GREEN,borderWidth:2,borderDash:[6,3],pointRadius:3,tension:.4,yAxisID:'y2'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:10,padding:10,font:{size:10}}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{color:'#1a1a20'},ticks:{color:A,callback:v=>fmt(v)}},y2:{position:'right',grid:{display:false},ticks:{color:GREEN,callback:v=>fmt(v)}}}}});
  if(data.commentary) document.getElementById('simCommentary').textContent=data.commentary;
  document.getElementById('simResults').style.display='block';
  btn.disabled=false;btn.textContent='Run Simulation →';
}

/* ── STATES PAGE ── */
let stateData=[];
async function loadStates(){
  stateData=await fetch('/api/state-prevalence').then(r=>r.json());
  new Chart(document.getElementById('stateChart'),{type:'bar',data:{labels:stateData.map(r=>r.state),datasets:[{label:'Rate per 100k',data:stateData.map(r=>r.rate_per_100k),backgroundColor:stateData.map(r=>r.state==='District of Columbia'?GOLD:A),borderWidth:0,borderRadius:2,hoverBackgroundColor:A2}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...getTT(),callbacks:{label:ctx=>` ${ctx.raw.toFixed(1)} per 100k`}}},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e'}},y:{grid:{display:false},ticks:{color:'#8a8a9a',font:{size:10}}}},onClick(_,els){if(els.length>0) openStateModal(stateData[els[0].index]);},onHover(_,els,chart){chart.canvas.style.cursor=els.length?'pointer':'default';}}});
}
const STATES=[{a:'AL',n:'Alabama'},{a:'AK',n:'Alaska'},{a:'AZ',n:'Arizona'},{a:'AR',n:'Arkansas'},{a:'CA',n:'California'},{a:'CO',n:'Colorado'},{a:'CT',n:'Connecticut'},{a:'DE',n:'Delaware'},{a:'DC',n:'District of Columbia'},{a:'FL',n:'Florida'},{a:'GA',n:'Georgia'},{a:'HI',n:'Hawaii'},{a:'ID',n:'Idaho'},{a:'IL',n:'Illinois'},{a:'IN',n:'Indiana'},{a:'IA',n:'Iowa'},{a:'KS',n:'Kansas'},{a:'KY',n:'Kentucky'},{a:'LA',n:'Louisiana'},{a:'ME',n:'Maine'},{a:'MD',n:'Maryland'},{a:'MA',n:'Massachusetts'},{a:'MI',n:'Michigan'},{a:'MN',n:'Minnesota'},{a:'MS',n:'Mississippi'},{a:'MO',n:'Missouri'},{a:'MT',n:'Montana'},{a:'NE',n:'Nebraska'},{a:'NV',n:'Nevada'},{a:'NH',n:'New Hampshire'},{a:'NJ',n:'New Jersey'},{a:'NM',n:'New Mexico'},{a:'NY',n:'New York'},{a:'NC',n:'North Carolina'},{a:'ND',n:'North Dakota'},{a:'OH',n:'Ohio'},{a:'OK',n:'Oklahoma'},{a:'OR',n:'Oregon'},{a:'PA',n:'Pennsylvania'},{a:'PR',n:'Puerto Rico'},{a:'RI',n:'Rhode Island'},{a:'SC',n:'South Carolina'},{a:'SD',n:'South Dakota'},{a:'TN',n:'Tennessee'},{a:'TX',n:'Texas'},{a:'UT',n:'Utah'},{a:'VT',n:'Vermont'},{a:'VA',n:'Virginia'},{a:'WA',n:'Washington'},{a:'WV',n:'West Virginia'},{a:'WI',n:'Wisconsin'},{a:'WY',n:'Wyoming'}];
function populateStateSelects(){['selectA','selectB'].forEach((id,i)=>{const sel=document.getElementById(id);STATES.forEach(s=>{const o=document.createElement('option');o.value=s.a;o.textContent=s.n;sel.appendChild(o);});sel.value=i===0?'FL':'CA';});}
let cmpT=null,cmpR=null;
async function runComparison(){
  const a=document.getElementById('selectA').value,b=document.getElementById('selectB').value;
  if(!a||!b||a===b){alert('Select two different states.');return;}
  const btn=document.querySelector('#page-states .run-btn');btn.disabled=true;btn.textContent='Loading…';
  const data=await fetch(`/api/compare-states?a=${a}&b=${b}`).then(r=>r.json());
  if(data.error){alert(data.error);btn.disabled=false;btn.textContent='Compare →';return;}
  const {state_a,state_b,commentary}=data,la=state_a.latest,lb=state_b.latest;
  document.getElementById('compareHeaderRow').innerHTML=`<div class="compare-state-card"><div class="compare-state-name">${la.state}</div><div class="compare-stats-mini"><div><div class="cstat-label">Diagnoses</div><div class="cstat-value">${fmt(la.total_cases)}</div></div><div><div class="cstat-label">Rate/100k</div><div class="cstat-value">${la.rate_per_100k?.toFixed(1)||'—'}</div></div><div><div class="cstat-label">PrEP</div><div class="cstat-value">${fmt(la.prep_users)}</div></div></div></div><div class="compare-state-card"><div class="compare-state-name">${lb.state}</div><div class="compare-stats-mini"><div><div class="cstat-label">Diagnoses</div><div class="cstat-value">${fmt(lb.total_cases)}</div></div><div><div class="cstat-label">Rate/100k</div><div class="cstat-value">${lb.rate_per_100k?.toFixed(1)||'—'}</div></div><div><div class="cstat-label">PrEP</div><div class="cstat-value">${fmt(lb.prep_users)}</div></div></div></div>`;
  if(cmpT) cmpT.destroy();if(cmpR) cmpR.destroy();
  cmpT=new Chart(document.getElementById('compareTrendChart'),{type:'line',data:{labels:state_a.trend.map(r=>r.year),datasets:[{label:la.state,data:state_a.trend.map(r=>r.total_cases),borderColor:A,borderWidth:2,pointRadius:2,tension:.4,fill:false},{label:lb.state,data:state_b.trend.map(r=>r.total_cases),borderColor:BLUE,borderWidth:2,pointRadius:2,tension:.4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:8,padding:6,font:{size:10}}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',font:{size:9}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}});
  cmpR=new Chart(document.getElementById('compareRateChart'),{type:'line',data:{labels:state_a.trend.map(r=>r.year),datasets:[{label:la.state,data:state_a.trend.map(r=>r.rate_per_100k),borderColor:A,borderWidth:2,pointRadius:2,tension:.4,fill:false},{label:lb.state,data:state_b.trend.map(r=>r.rate_per_100k),borderColor:BLUE,borderWidth:2,pointRadius:2,tension:.4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:8,padding:6,font:{size:10}}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',font:{size:9}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>v?.toFixed(1)}}}}});
  document.getElementById('compareCommentary').innerHTML=`<strong>AI:</strong> ${commentary}`;
  document.getElementById('compareInlineResults').style.display='block';
  btn.disabled=false;btn.textContent='Compare →';
}

/* ── STATE MODAL ── */
let mT=null,mD=null;
async function openStateModal(row){
  const abbr=row.state_abbr||row.state?.substring(0,2)?.toUpperCase();
  document.getElementById('modalAbbr').textContent=abbr;
  document.getElementById('modalName').textContent=row.state||abbr;
  document.getElementById('modalStatsRow').innerHTML='<div style="color:var(--dim);font-family:var(--mono);font-size:.75rem;padding:.5rem">Loading…</div>';
  document.getElementById('stateModal').classList.add('open');
  document.body.style.overflow='hidden';
  if(mT){mT.destroy();mT=null;}if(mD){mD.destroy();mD=null;}
  const data=await fetch(`/api/state-profile/${abbr}`).then(r=>r.json());
  if(data.error) return;
  const c=data.current,nat=data.national_avg_rate;
  const diff=c.rate_per_100k&&nat?((c.rate_per_100k-nat)/nat*100).toFixed(0):null;
  const cls=diff>0?'vs-above':'vs-below',sign=diff>0?'+':'';
  document.getElementById('modalStatsRow').innerHTML=`<div class="modal-stat"><div class="modal-stat-label">New Diagnoses</div><div class="modal-stat-value">${fmt(c.total_cases)}</div><div class="modal-stat-sub">${c.year}</div></div><div class="modal-stat"><div class="modal-stat-label">Rate/100k</div><div class="modal-stat-value">${c.rate_per_100k?.toFixed(1)||'—'}</div><div class="modal-stat-sub ${cls}">${diff!=null?sign+diff+'% vs national':''}</div></div><div class="modal-stat"><div class="modal-stat-label">PrEP Users</div><div class="modal-stat-value">${fmt(c.prep_users)}</div><div class="modal-stat-sub">${c.year}</div></div><div class="modal-stat"><div class="modal-stat-label">PNR Ratio</div><div class="modal-stat-value">${c.pnr_ratio?.toFixed(2)||'—'}</div><div class="modal-stat-sub">PrEP-to-Need</div></div>`;
  mT=new Chart(document.getElementById('modalTrendChart'),{type:'line',data:{labels:data.trend.map(r=>r.year),datasets:[{label:'Diagnoses',data:data.trend.map(r=>r.total_cases),borderColor:A,borderWidth:2,pointRadius:3,tension:.4,fill:false},{label:'PrEP',data:data.trend.map(r=>r.prep_users),borderColor:GREEN,borderWidth:2,pointRadius:3,tension:.4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#8a8a9a',boxWidth:8,padding:8,font:{size:10}}},tooltip:getTT()},scales:{x:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',font:{size:10}}},y:{grid:{color:'#1a1a20'},ticks:{color:'#52525e',callback:v=>fmt(v)}}}}});
  mD=new Chart(document.getElementById('modalDemoChart'),{type:'doughnut',data:{labels:['Black','Hispanic','White','Asian'],datasets:[{data:[c.black_cases,c.hispanic_cases,c.white_cases,c.asian_cases],backgroundColor:PAL,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{color:'#8a8a9a',boxWidth:8,padding:6,font:{size:10}}},tooltip:getTT()}}});
  document.getElementById('modalComparison').innerHTML=`<strong>MSM:</strong> ${c.msm_pct?.toFixed(1)||'—'}% · <strong>IDU:</strong> ${c.idu_pct?.toFixed(1)||'—'}% · <strong>M/F:</strong> ${fmt(c.male_cases)}/${fmt(c.female_cases)} · <strong>Peak age:</strong> 25–34`;
  history.pushState({page:'states',state:abbr},'',`/dashboard/states/${abbr}`);
}
function closeModal(e){if(e.target.id==='stateModal') closeModalDirect();}
function closeModalDirect(){document.getElementById('stateModal').classList.remove('open');document.body.style.overflow='';history.pushState({page:'states'},'','/dashboard/states');}
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeModalDirect();});

/* ── POLICY TOOLS ── */
function selectTopic(btn,topic){document.querySelectorAll('.topic-pill').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.getElementById('briefTopic').value=topic;document.getElementById('briefOutput').style.display='none';}
async function generateBrief(){
  const btn=document.getElementById('briefBtn'),topic=document.getElementById('briefTopic').value.trim();
  btn.disabled=true;btn.textContent='Generating…';document.getElementById('briefOutput').style.display='none';
  try{const data=await fetch('/api/policy-brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic})}).then(r=>r.json());document.getElementById('briefDoc').textContent=data.brief;document.getElementById('briefOutput').style.display='block';}
  catch(e){document.getElementById('briefDoc').textContent='Error.';document.getElementById('briefOutput').style.display='block';}
  btn.disabled=false;btn.textContent='Generate →';
}
function copyBrief(){navigator.clipboard.writeText(document.getElementById('briefDoc').textContent).then(()=>{const b=document.querySelector('.brief-actions .outline-btn'),o=b.textContent;b.textContent='✓ Copied!';setTimeout(()=>b.textContent=o,2000);});}
function exportBriefPDF(){const text=document.getElementById('briefDoc').textContent,topic=document.getElementById('briefTopic').value;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download=`amfAR_Brief_${Date.now()}.txt`;a.click();}
async function loadNews(){
  const grid=document.getElementById('newsGrid');grid.innerHTML='<div class="loading-row">Loading…</div>';
  const data=await fetch('/api/news').then(r=>r.json());
  if(!data.items?.length){grid.innerHTML='<div class="loading-row">No items.</div>';return;}
  grid.innerHTML='';
  data.items.forEach(item=>{
    const card=document.createElement('div');card.className='news-card';
    const cat=(item.category||'research').toLowerCase();
    card.innerHTML=`<span class="news-cat ${cat}">${item.category||'Research'}</span><div class="news-headline">${item.headline}</div><div class="news-summary">${item.summary}</div><div class="news-relevance">↳ ${item.relevance}</div>`;
    grid.appendChild(card);
  });
}

/* ── CHAT ── */
function appendMsg(role,content){const win=document.getElementById('chatWindow');const w=document.createElement('div');w.className=`chat-msg ${role==='user'?'user-msg':'assistant-msg'}`;w.innerHTML=role==='user'?`<div class="user-badge">U</div><div class="msg-body"><p>${content}</p></div>`:`<span class="msg-icon">◈</span><div class="msg-body">${content}</div>`;win.appendChild(w);win.scrollTop=win.scrollHeight;}
function showTyping(){const win=document.getElementById('chatWindow');const w=document.createElement('div');w.className='chat-msg assistant-msg';w.id='typing';w.innerHTML=`<span class="msg-icon">◈</span><div class="msg-body"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;win.appendChild(w);win.scrollTop=win.scrollHeight;}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}
function buildChatResp(d){let h=`<p>${d.answer}</p>`;if(d.sql)h+=`<div class="msg-sql">${d.sql}</div>`;if(d.data?.length>0){const k=Object.keys(d.data[0]);h+=`<table class="msg-table"><thead><tr>${k.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${d.data.slice(0,8).map(r=>`<tr>${k.map(x=>`<td>${r[x]!=null?r[x]:'–'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}return h;}
async function sendChat(){const input=document.getElementById('chatInput'),btn=document.getElementById('sendBtn'),q=input.value.trim();if(!q)return;input.value='';btn.disabled=true;appendMsg('user',q);showTyping();try{const data=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})}).then(r=>r.json());removeTyping();appendMsg('assistant',data.error?`<p style="color:var(--accent2)">Error: ${data.error}</p>`:buildChatResp(data));}catch(e){removeTyping();appendMsg('assistant','<p style="color:var(--accent2)">Network error.</p>');}btn.disabled=false;}
function askSuggestion(b){document.getElementById('chatInput').value=b.textContent;sendChat();}
document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter') sendChat();});
document.getElementById('briefTopic').addEventListener('keydown',e=>{if(e.key==='Enter') generateBrief();});

/* ── DATA STORY ── */
let storyIndex=0,storySteps=[];
async function startStory(){
  const stats=await fetch('/api/summary-stats').then(r=>r.json());
  const ehe=await fetch('/api/ehe-progress').then(r=>r.json()).catch(()=>null);
  const fund=await fetch('/api/funding-gap').then(r=>r.json()).catch(()=>null);
  const disp=await fetch('/api/disparity-index').then(r=>r.json()).catch(()=>null);
  storySteps=[
    {tag:'The epidemic today',title:'39,000 Americans diagnosed with HIV in 2023',body:`Despite decades of progress, HIV remains a critical public health crisis. In ${stats.year}, <strong>${stats.new_diagnoses?.toLocaleString()}</strong> people received new HIV diagnoses in the United States — that's over 100 people every single day.`,stats:[{val:stats.new_diagnoses?.toLocaleString(),lbl:'New diagnoses'},{val:stats.year,lbl:'Data year'},{val:stats.prep_users?.toLocaleString(),lbl:'PrEP users'}],page:'overview'},
    {tag:'The national trend',title:'Progress is real — but slowing',body:'New diagnoses have declined over the past decade, driven by expanded testing, treatment, and prevention programs. However, the pace of decline is not fast enough to meet the federal Ending the HIV Epidemic goal.',stats:[],page:'overview'},
    {tag:'The EHE goal',title:`Only ${ehe?.yearly_progress?.slice(-1)[0]?.pct_of_ehe_goal_achieved||'—'}% of the way to the 90% target`,body:`The Ending the HIV Epidemic initiative set an ambitious goal: reduce new HIV infections by 90% by 2030. The baseline was ${ehe?.baseline_diagnoses?.toLocaleString()} diagnoses in 2017. We need to reach ${ehe?.target_2030?.toLocaleString()} by 2030. At the current pace, we will fall short.`,stats:[{val:ehe?.baseline_diagnoses?.toLocaleString()||'—',lbl:'2017 baseline'},{val:ehe?.target_2030?.toLocaleString()||'—',lbl:'2030 target'}],page:'ehe'},
    {tag:'The equity crisis',title:`Black Americans face ${disp?.national_avg_bw_ratio||'—'}× higher rates than White Americans`,body:`The HIV epidemic does not affect all communities equally. Black Americans are diagnosed at dramatically higher rates than White Americans — a disparity rooted in structural inequities in healthcare access, housing, and economic opportunity. ${disp?.states?.[0]?.state||''} has the worst equity score nationally.`,stats:[{val:(disp?.national_avg_bw_ratio||'—')+'×',lbl:'B/W rate ratio'},{val:disp?.states?.filter(s=>s.bw_ratio>5)?.length||'—',lbl:'States >5× disparity'}],page:'disparity'},
    {tag:'The prevention gap',title:`$${fund?.total_funding_gap_billions||'—'}B in PrEP funding goes unmet`,body:`PrEP (pre-exposure prophylaxis) is a highly effective HIV prevention medication. But millions of people who need it cannot access it. Closing the PrEP coverage gap would require an estimated $${fund?.total_funding_gap_billions}B in additional federal investment — serving ${fund?.total_additional_prep_needed?.toLocaleString()} additional patients.`,stats:[{val:'$'+fund?.total_funding_gap_billions+'B',lbl:'Funding gap'},{val:fund?.total_additional_prep_needed?.toLocaleString()||'—',lbl:'Patients unserved'}],page:'funding'},
    {tag:'What we can do',title:'Every 10% more PrEP coverage prevents thousands of infections',body:'The data shows a clear path forward: expand PrEP access, address racial disparities in healthcare, and sustain federal investment in the EHE initiative. Use the simulator to model different scenarios, or generate a policy brief to share findings with decision-makers.',stats:[],page:'simulator'},
  ];
  storyIndex=0;
  renderStoryStep();
  document.getElementById('storyOverlay').style.display='flex';
  document.body.style.overflow='hidden';
}
function renderStoryStep(){
  const s=storySteps[storyIndex],total=storySteps.length;
  document.getElementById('storyProgressFill').style.width=((storyIndex+1)/total*100)+'%';
  document.getElementById('storyCounter').textContent=`${storyIndex+1} / ${total}`;
  document.querySelector('.story-prev').disabled=storyIndex===0;
  const statsHtml=s.stats?.length?`<div class="story-stat-row">${s.stats.map(st=>`<div class="story-stat"><span class="story-stat-val">${st.val}</span><span class="story-stat-lbl">${st.lbl}</span></div>`).join('')}</div>`:'';
  const navBtn=s.page?`<button class="run-btn" style="margin-top:1rem;font-size:.75rem" onclick="endStory();showPage('${s.page}',document.querySelector('[data-page=${s.page}]'))">Explore this data →</button>`:'';
  document.getElementById('storyContent').innerHTML=`<span class="story-step-tag">${s.tag}</span><h2 class="story-step-title">${s.title}</h2><p class="story-step-body">${s.body}</p>${statsHtml}${navBtn}`;
  document.querySelector('.story-next').textContent=storyIndex===total-1?'Finish':'Next →';
}
function storyStep(dir){
  storyIndex+=dir;
  if(storyIndex>=storySteps.length){endStory();return;}
  if(storyIndex<0) storyIndex=0;
  renderStoryStep();
}
function endStory(){document.getElementById('storyOverlay').style.display='none';document.body.style.overflow='';}

function copyShareLink(){
  // Share the current page URL (without story overlay state)
  const url=window.location.origin+window.location.pathname;
  navigator.clipboard.writeText(url).then(()=>{
    const b=document.querySelector('.topbar-share-btn'),o=b.textContent;
    b.textContent='✓ Copied!';setTimeout(()=>b.textContent=o,2000);
  });
}
/* ── PDF EXPORT ── */
async function generateFullReport(){
  const lbl=document.getElementById('pdfLabel');lbl.textContent='Building…';
  try{
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const PW=210,PH=297,ML=18,MR=18,MT=18,UW=PW-ML-MR;
    const h2r=h=>{const n=parseInt(h.replace('#',''),16);return[n>>16&255,(n>>8)&255,n&255];};
    const sf=(h)=>{const[r,g,b]=h2r(h);pdf.setFillColor(r,g,b);};
    const st=(h)=>{const[r,g,b]=h2r(h);pdf.setTextColor(r,g,b);};
    const BG='#09090b',SURF='#111114',SURF2='#18181d',BORDER='#27272f',TXT='#ededf0',DIM='#8a8a9a';
    let y=0;
    function newPage(){pdf.addPage();sf(BG);pdf.rect(0,0,PW,PH,'F');y=MT;}
    function rule(c=BORDER){const[r,g,b]=h2r(c);pdf.setDrawColor(r,g,b);pdf.setLineWidth(.3);pdf.line(ML,y,PW-MR,y);y+=4;}
    function statBox(label,value,sub,bx,by,bw,bh,ac=A){sf(SURF2);pdf.roundedRect(bx,by,bw,bh,2,2,'F');sf(ac);pdf.rect(bx,by,2.5,bh,'F');st(DIM);pdf.setFontSize(6);pdf.setFont('helvetica','normal');pdf.text(label.toUpperCase(),bx+5,by+5);st(TXT);pdf.setFontSize(14);pdf.setFont('helvetica','bold');pdf.text(String(value),bx+5,by+12);if(sub){st(DIM);pdf.setFontSize(6.5);pdf.setFont('helvetica','normal');pdf.text(String(sub),bx+5,by+17);}}
    async function embedCanvas(id,x,iy,w,h){const el=document.getElementById(id);if(!el)return;try{const snap=await html2canvas(el,{backgroundColor:'#111114',scale:2,logging:false,useCORS:true});pdf.addImage(snap.toDataURL('image/png'),'PNG',x,iy,w,h);}catch(e){console.warn(id,e);}}
    // Cover
    sf(BG);pdf.rect(0,0,PW,PH,'F');
    sf(A);pdf.rect(0,0,PW,48,'F');
    st('#ffffff');pdf.setFontSize(9);pdf.setFont('helvetica','bold');pdf.text('amfAR',ML,16);
    pdf.setFontSize(7);pdf.setFont('helvetica','normal');pdf.text('The Foundation for AIDS Research',ML,22);
    pdf.setFontSize(22);pdf.setFont('helvetica','bold');pdf.text('HIV/AIDS Policy',ML,34);pdf.text('Intelligence Report',ML,42);
    y=58;
    const [data,fund,ehe]=await Promise.all([fetch('/api/report-data').then(r=>r.json()),fetch('/api/funding-gap').then(r=>r.json()).catch(()=>null),fetch('/api/ehe-progress').then(r=>r.json()).catch(()=>null)]);
    st(DIM);pdf.setFontSize(8);pdf.setFont('helvetica','normal');
    pdf.text(`Data: AIDSVu / CDC NHSS · 2014–${data.generated}`,ML,y);y+=6;
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`,ML,y);y+=6;
    pdf.text('AI: GPT-4o-mini · Stack: Python / Flask / MySQL / d3.js / Chart.js',ML,y);y+=10;
    rule();
    const bw=40,bh=22,gap=3.5;
    statBox('New Diagnoses',data.new_diagnoses?.toLocaleString(),'Year '+data.generated,ML,y,bw,bh,A);
    statBox('PrEP Users',data.prep_users?.toLocaleString(),'Same year',ML+bw+gap,y,bw,bh,'#60a5fa');
    statBox('EHE Progress',data.ehe_reduction_pct+'%','Toward 90%',ML+(bw+gap)*2,y,bw,bh,'#d4a843');
    statBox('Funding Gap',fund?'$'+fund.total_funding_gap_billions+'B':'—','PrEP gap est.',ML+(bw+gap)*3,y,bw,bh,'#4ade80');
    y+=bh+6;
    if(ehe){const prog=ehe.yearly_progress,latest=prog[prog.length-1],pct=Math.max(0,Math.min(100,latest.pct_of_ehe_goal_achieved));st(DIM);pdf.setFontSize(7);pdf.text('EHE GOAL PROGRESS',ML,y);y+=4;sf(SURF2);pdf.roundedRect(ML,y,UW,5,2,2,'F');sf(A);pdf.rect(ML,y,(pct/100)*UW/2,5,'F');sf('#d4a843');pdf.rect(ML+(pct/100)*UW/2,y,(pct/100)*UW/2,5,'F');st('#fff');pdf.setFontSize(6);pdf.text(pct+'% of goal',ML+2,y+3.5);y+=10;}
    data.race_breakdown.forEach(r=>{sf(SURF2);pdf.rect(ML,y-3.5,UW,6,'F');st(TXT);pdf.setFontSize(8);pdf.setFont('helvetica','normal');pdf.text(r.grp,ML+2,y);st(DIM);pdf.text((r.n||0).toLocaleString(),PW-MR-2,y,{align:'right'});y+=7;});
    y=PH-18;sf(SURF2);pdf.rect(0,PH-18,PW,18,'F');st(DIM);pdf.setFontSize(6.5);pdf.text('amfAR HIV/AIDS Policy Intelligence · aidsvu.org · cdc.gov/hiv',ML,PH-9);pdf.text('Page 1',PW-MR,PH-9,{align:'right'});
    // Page 2 - charts
    newPage();
    st(TXT);pdf.setFontSize(12);pdf.setFont('helvetica','bold');pdf.text('National Trend + PrEP Uptake',ML,y);y+=8;
    if(!loaded['overview']){loadPage('overview');loaded['overview']=true;await new Promise(r=>setTimeout(r,2000));}
    else await new Promise(r=>setTimeout(r,400));
    await embedCanvas('trendChart',ML,y,UW,64);y+=68;
    await embedCanvas('prepChart',ML,y,UW,64);y+=68;
    const cols=[20,40,40,40,20];const hds=['Year','Diagnoses','Baseline','Target','YoY'];
    let tx=ML;sf(SURF2);pdf.rect(ML,y-4,UW,7,'F');st(DIM);pdf.setFontSize(6.5);pdf.setFont('helvetica','bold');hds.forEach((h,i)=>{pdf.text(h,tx+1,y);tx+=cols[i];});y+=4;rule(BORDER);
    data.trend.forEach((r,i)=>{if(i%2===0){sf(SURF2+'88');pdf.rect(ML,y-3.5,UW,6,'F');}const yoy=i===0?'—':(((r.dx-data.trend[i-1].dx)/data.trend[i-1].dx)*100).toFixed(1)+'%';tx=ML;st(TXT);pdf.setFontSize(7);pdf.setFont('helvetica','normal');[String(r.year),(r.dx||0).toLocaleString(),data.ehe_baseline.toLocaleString(),data.ehe_target.toLocaleString(),yoy].forEach((v,j)=>{if(j===4&&yoy!=='—')st(parseFloat(yoy)<0?'#4ade80':'#e8304e');else st(TXT);pdf.text(v,tx+1,y);tx+=cols[j];});y+=6;});
    sf(SURF2);pdf.rect(0,PH-12,PW,12,'F');st(DIM);pdf.setFontSize(6.5);pdf.text('amfAR HIV/AIDS Policy Intelligence',ML,PH-5);pdf.text('Page 2',PW-MR,PH-5,{align:'right'});
    pdf.save(`amfAR_HIV_PolicyReport_${data.generated}.pdf`);
  }catch(err){console.error(err);alert('PDF error: '+err.message);}
  finally{lbl.textContent='Export PDF';}
}

/* ── BOOT ── */
(async()=>{
  await loadGlobalStats();
  const path=window.location.pathname;
  const match=path.match(/\/dashboard\/(\w+)/);
  const startPage=match?match[1]:'overview';
  const startBtn=document.querySelector(`[data-page="${startPage}"]`);
  showPage(startPage,startBtn);
  loaded[startPage]=true;
  if(startPage==='overview') loadPage('overview');
})();