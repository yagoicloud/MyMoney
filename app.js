
const APP_KEY = 'mi_presupuesto_definitivo_v2';
const OLD_KEY = 'mi_presupuesto_v1';

const defaultCategories = [
  'Supermercado','Comida fuera','Transporte','Hogar','Salud','Ocio',
  'Ropa','Suscripciones','Mascotas','Educación','Regalos','Viajes','Otros'
];

function uid(prefix='id'){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
function nowISO(){ return new Date().toISOString(); }
function currentYM(date=new Date()){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; }
function monthStart(ym){ const [y,m]=ym.split('-').map(Number); return new Date(y,m-1,1); }
function addMonths(ym,n){ const d=monthStart(ym); d.setMonth(d.getMonth()+n); return currentYM(d); }
function monthDiff(a,b){
  const [ay,am]=a.split('-').map(Number), [by,bm]=b.split('-').map(Number);
  return (by-ay)*12 + (bm-am);
}
function monthName(ym, short=false){
  const d=monthStart(ym);
  return new Intl.DateTimeFormat('es-ES',{month:short?'short':'long',year:short?undefined:'numeric'}).format(d).replace(/^./,c=>c.toUpperCase());
}
function num(v){
  if(typeof v === 'number') return Number.isFinite(v)?v:0;
  if(v===null || v===undefined || v==='') return 0;
  let normalized=String(v).trim().replace(/\s/g,'').replace(/[^0-9,.-]/g,'');
  if(normalized.includes(',')) normalized=normalized.replace(/\./g,'').replace(',','.');
  else if((normalized.match(/\./g)||[]).length>1) normalized=normalized.replace(/\./g,'');
  const n=parseFloat(normalized);
  return Number.isFinite(n)?n:0;
}
function eur(v){
  return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
}
function pct(v){ return `${Math.round(v*100)}%`; }
function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function clamp(v,min,max){ return Math.min(max,Math.max(min,v)); }
function daysInMonth(ym){ const [y,m]=ym.split('-').map(Number); return new Date(y,m,0).getDate(); }
function todayDay(){ return new Date().getDate(); }
function remainingDays(){
  const d=new Date(), last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  return Math.max(1,last-d.getDate()+1);
}

function baseState(){
  return {
    version:2,
    createdAt:nowISO(),
    incomes:[],
    fixed:[],
    finances:[],
    variables:[],
    categoryBudgets:[],
    goals:[],
    history:[],
    settings:{
      reserve:'',
      expectedVariable:'',
      warningThreshold:'0.15',
      budgetStartDay:'1',
      setupDismissed:false,
      lastBackup:null
    }
  };
}
let state=baseState();

function migrateOld(){
  const oldRaw=localStorage.getItem(OLD_KEY);
  if(!oldRaw) return false;
  try{
    const old=JSON.parse(oldRaw);
    const fresh=baseState();
    if(Array.isArray(old.incomes)) fresh.incomes=old.incomes.map(x=>({id:uid('inc'),name:x.name||'Ingreso',amount:x.amount||'',day:1,active:true}));
    if(Array.isArray(old.fixed)) fresh.fixed=old.fixed.map(x=>({id:uid('fix'),name:x.name||'Gasto fijo',amount:x.amount||'',day:1,category:'Hogar',active:true}));
    if(Array.isArray(old.finances)) fresh.finances=old.finances.map(x=>({
      id:uid('fin'),name:x.name||'Financiación',monthlyAmount:x.amount||'',dueDay:1,
      createdMonth:currentYM(),paidAtCreation:0,totalInstallments:'',
      endMonth:x.end||'',totalFinanced:'',active:true,notes:''
    }));
    if(Array.isArray(old.variables)) fresh.variables=old.variables.map(x=>({
      id:uid('var'),name:x.name||'Gasto',amount:x.amount||'',date:`${x.month||currentYM()}-01`,
      category:'Otros',notes:''
    }));
    fresh.settings.reserve=old.reserve||'';
    state=fresh;
    save();
    return true;
  }catch(e){ return false; }
}
function load(){
  try{
    const raw=localStorage.getItem(APP_KEY);
    if(raw){
      state={...baseState(),...JSON.parse(raw)};
      state.settings={...baseState().settings,...state.settings};
    }else{
      migrateOld();
    }
  }catch(e){ state=baseState(); }
  const incomeCountBeforeCleanup=(state.incomes||[]).length;
  state.incomes=(state.incomes||[]).filter(income=>{
    const isEmptyDefault=String(income.name||'').trim()==='Nómina' && String(income.amount??'').trim()==='';
    return !isEmptyDefault;
  });
  if(state.incomes.length!==incomeCountBeforeCleanup) save();
}
function save(){
  localStorage.setItem(APP_KEY,JSON.stringify(state));
}

function recurringIncome(ym=currentYM()){
  return state.incomes.filter(x=>x.active!==false).reduce((a,x)=>a+num(x.amount),0);
}
function recurringFixed(ym=currentYM()){
  return state.fixed.filter(x=>x.active!==false).reduce((a,x)=>a+num(x.amount),0);
}
function financeEndMonth(f){
  if(f.endMonth) return f.endMonth;
  const total=Math.max(0,parseInt(f.totalInstallments)||0);
  const paid=Math.max(0,parseInt(f.paidAtCreation)||0);
  if(!total) return '';
  const remaining=Math.max(0,total-paid);
  if(remaining<=0) return addMonths(f.createdMonth||currentYM(),-1);
  return addMonths(f.createdMonth||currentYM(),remaining-1);
}
function financeActiveInMonth(f,ym=currentYM()){
  if(f.active===false) return false;
  const start=f.createdMonth||currentYM();
  const end=financeEndMonth(f);
  if(ym<start) return false;
  if(end && ym>end) return false;
  return true;
}
function monthlyFinance(ym=currentYM()){
  return state.finances.filter(f=>financeActiveInMonth(f,ym)).reduce((a,f)=>a+num(f.monthlyAmount),0);
}
function goalMonthly(){
  return state.goals.filter(g=>g.active!==false && g.includeInBudget!==false).reduce((a,g)=>a+num(g.monthlyContribution),0);
}
function varsForMonth(ym=currentYM()){
  return state.variables.filter(v=>String(v.date||'').slice(0,7)===ym);
}
function variableSpent(ym=currentYM()){
  return varsForMonth(ym).reduce((a,v)=>a+num(v.amount),0);
}
function calcMonth(ym=currentYM(), useActual=true){
  const income=recurringIncome(ym);
  const fixed=recurringFixed(ym);
  const finance=monthlyFinance(ym);
  const savings=goalMonthly();
  const reserve=num(state.settings.reserve);
  const variable=useActual ? variableSpent(ym) : num(state.settings.expectedVariable);
  const committed=fixed+finance+savings+reserve;
  const available=income-committed-variable;
  return {income,fixed,finance,savings,reserve,variable,committed,available};
}
function financingPaidCount(f, targetYM=currentYM()){
  const total=Math.max(0,parseInt(f.totalInstallments)||0);
  const paid0=Math.max(0,parseInt(f.paidAtCreation)||0);
  if(!total) return paid0;
  const start=f.createdMonth||currentYM();
  const elapsed=Math.max(0,monthDiff(start,targetYM));
  return Math.min(total,paid0+elapsed);
}
function financingRemainingCount(f){
  const total=Math.max(0,parseInt(f.totalInstallments)||0);
  if(!total) return null;
  return Math.max(0,total-financingPaidCount(f));
}
function financingRemainingAmount(f){
  if(num(f.totalFinanced)>0 && (parseInt(f.totalInstallments)||0)>0){
    const paidRatio=financingPaidCount(f)/(parseInt(f.totalInstallments)||1);
    return Math.max(0,num(f.totalFinanced)*(1-paidRatio));
  }
  const rem=financingRemainingCount(f);
  return rem===null ? 0 : rem*num(f.monthlyAmount);
}
function categorySpent(category,ym=currentYM()){
  return varsForMonth(ym).filter(v=>v.category===category).reduce((a,v)=>a+num(v.amount),0);
}

function renderAll(){
  renderHeader();
  renderHome();
  renderMovements();
  renderFinancing();
  renderPlanning();
  renderMore();
}
function renderHeader(){
  document.getElementById('monthLabel').textContent=monthName(currentYM()).toUpperCase();
}
function renderHome(){
  const c=calcMonth();
  const safe=document.getElementById('safeToSpend');
  safe.textContent=eur(c.available);
  const threshold=c.income*num(state.settings.warningThreshold||0.15);
  let level='positive', statusClass='status-good', statusText='Buen margen', alertClass='ok', message='';
  if(c.available<0){
    level='negative';statusClass='status-danger';statusText='En negativo';alertClass='bad';
    message=`Vas ${eur(Math.abs(c.available))} por encima de lo que puedes permitirte este mes.`;
  }else if(c.income>0 && c.available<=threshold){
    level='warning';statusClass='status-warning';statusText='Margen ajustado';alertClass='warn';
    message=`Margen bajo: te quedan ${eur(c.available)}. Conviene frenar gastos no esenciales.`;
  }else if(c.income===0 && c.committed===0 && c.variable===0){
    statusClass='status-neutral';statusText='Sin configurar';
    message='Añade tus ingresos y gastos para empezar.';
  }else{
    message=`Con los datos actuales, puedes gastar hasta ${eur(c.available)} sin terminar el mes en negativo.`;
  }
  safe.className=`hero-amount ${level}`;
  document.getElementById('budgetStatus').className=`status-pill ${statusClass}`;
  document.getElementById('budgetStatusText').textContent=statusText;
  const alert=document.getElementById('mainAlert');
  alert.className=`hero-guidance ${alertClass}`; alert.textContent=message;

  const day=Math.max(0,c.available)/remainingDays();
  document.getElementById('perDay').textContent=eur(day);
  document.getElementById('perWeek').textContent=eur(day*7);
  const d=new Date();
  const elapsed=d.getDate()/new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const elapsedPct=Math.round(elapsed*100);
  document.getElementById('monthProgress').style.width=`${elapsedPct}%`;
  document.getElementById('monthProgress').setAttribute('aria-valuenow',String(elapsedPct));
  document.getElementById('monthProgressLabel').textContent=`${elapsedPct}%`;

  const assigned=c.committed+c.variable;
  const assignedPct=c.income>0?assigned/c.income*100:(assigned>0?100:0);
  const budgetProgress=document.getElementById('budgetProgress');
  budgetProgress.style.width=`${clamp(assignedPct,0,100)}%`;
  budgetProgress.setAttribute('aria-valuenow',String(Math.round(clamp(assignedPct,0,100))));
  budgetProgress.className=`progress-fill budget ${assignedPct>100?'danger':assignedPct>=85?'warning':''}`.trim();
  document.getElementById('budgetProgressLabel').textContent=c.income>0?`${Math.round(assignedPct)}%`:'0%';

  document.getElementById('kpiIncome').textContent=eur(c.income);
  document.getElementById('kpiCommitted').textContent=eur(c.committed);
  document.getElementById('kpiVariable').textContent=eur(c.variable);
  document.getElementById('kpiSavings').textContent=eur(c.savings+c.reserve);
  document.getElementById('commitmentPct').textContent=c.income>0?`${Math.round(c.committed/c.income*100)}% reservado`:'Sin ingresos';
  const setupDone={
    income:c.income>0,
    fixed:state.fixed.some(x=>x.active!==false && num(x.amount)>0),
    finance:state.finances.some(x=>x.active!==false && num(x.monthlyAmount)>0)
  };
  const setupGuide=document.getElementById('setupGuide');
  setupGuide.hidden=state.settings.setupDismissed || Object.values(setupDone).every(Boolean);
  setupGuide.querySelectorAll('[data-open-modal]').forEach((button,index)=>{
    const done=setupDone[button.dataset.openModal];
    button.classList.toggle('done',done);
    button.querySelector('span').textContent=done?'✓':String(index+1);
  });
  renderAllocation(c);
  renderUpcoming();
  renderSmartAlerts(c);
}
function renderAllocation(c){
  const total=Math.max(c.income,c.fixed+c.finance+c.savings+c.reserve+c.variable,1);
  const pieces=[
    ['Fijos',c.fixed,'var(--blue)'],
    ['Financiaciones',c.finance,'var(--purple)'],
    ['Variable',c.variable,'var(--orange)'],
    ['Ahorro + colchón',c.savings+c.reserve,'var(--cyan)'],
    ['Libre',Math.max(0,c.available),'var(--green)']
  ];
  const stack=document.getElementById('budgetStack');
  stack.innerHTML=pieces.some(([,v])=>v>0)
    ? pieces.filter(([,v])=>v>0).map(([n,v,color])=>`<span class="budget-segment" title="${esc(n)}: ${eur(v)}" style="width:${v/total*100}%;background:${color}"></span>`).join('')
    : '<span class="budget-segment" style="width:100%;background:#2a3952"></span>';
  stack.setAttribute('aria-label',pieces.map(([n,v])=>`${n}: ${eur(v)}`).join('. '));
  const free=document.getElementById('allocationFree');
  free.textContent=eur(c.available);
  free.className=c.available<0?'negative':c.income>0 && c.available<=c.income*num(state.settings.warningThreshold||0.15)?'warning':'positive';
  document.getElementById('budgetLegend').innerHTML=pieces.map(([n,v,color])=>`
    <div class="allocation-row"><i class="dot" style="background:${color}"></i><span>${esc(n)}</span><strong>${eur(v)}</strong></div>
  `).join('');
}
function upcomingItems(){
  const ym=currentYM(), today=todayDay();
  const rows=[];
  state.fixed.filter(x=>x.active!==false).forEach(x=>rows.push({name:x.name||'Gasto fijo',amount:num(x.amount),day:clamp(parseInt(x.day)||1,1,31),type:'Fijo'}));
  state.finances.filter(x=>financeActiveInMonth(x,ym)).forEach(x=>rows.push({name:x.name||'Financiación',amount:num(x.monthlyAmount),day:clamp(parseInt(x.dueDay)||1,1,31),type:'Cuota'}));
  return rows.sort((a,b)=>{
    const aa=a.day>=today?a.day:a.day+40, bb=b.day>=today?b.day:b.day+40;
    return aa-bb;
  });
}
function renderUpcoming(){
  const rows=upcomingItems().slice(0,5);
  document.getElementById('upcomingPayments').innerHTML=rows.length?rows.map(x=>`
    <div class="list-item">
      <div class="list-main"><div class="list-title">${esc(x.name)}</div><div class="list-meta">Día ${x.day} · ${x.type}</div></div>
      <div class="list-amount">${eur(x.amount)}</div>
    </div>`).join(''):'<div class="empty">No hay pagos recurrentes registrados.</div>';
}
function renderSmartAlerts(c){
  const alerts=[];
  if(c.available<0) alerts.push(['bad','Presupuesto en negativo',`Te faltan ${eur(Math.abs(c.available))} para cubrir todo el mes.`]);
  const financePct=c.income?c.finance/c.income:0;
  if(financePct>=.30) alerts.push(['warn','Cuotas elevadas',`Las financiaciones consumen ${Math.round(financePct*100)}% de tus ingresos mensuales.`]);
  state.categoryBudgets.forEach(b=>{
    const lim=num(b.limit), spent=categorySpent(b.category);
    if(lim>0 && spent>=lim) alerts.push(['bad',`${b.category} fuera de presupuesto`,`${eur(spent)} gastados de ${eur(lim)}.`]);
    else if(lim>0 && spent>=lim*.8) alerts.push(['warn',`${b.category} al ${Math.round(spent/lim*100)}%`,`Te quedan ${eur(Math.max(0,lim-spent))} en esa categoría.`]);
  });
  const soon=state.finances.filter(f=>financeActiveInMonth(f)).map(f=>({f,end:financeEndMonth(f)})).filter(x=>x.end && monthDiff(currentYM(),x.end)>=0 && monthDiff(currentYM(),x.end)<=2);
  soon.forEach(x=>alerts.push(['ok','Financiación a punto de terminar',`${x.f.name||'Una financiación'} termina en ${monthName(x.end)}.`]));
  if(!alerts.length) alerts.push(['ok','Todo bajo control','No detecto alertas importantes con tus datos actuales.']);
  document.getElementById('smartAlerts').innerHTML=alerts.slice(0,5).map(([t,title,txt])=>`
    <div class="alert ${t==='bad'?'bad':t==='warn'?'warn':'ok'}"><strong>${esc(title)}</strong><br>${esc(txt)}</div>`).join('');
}

function renderMovements(){
  const incomes=document.getElementById('incomeList');
  incomes.innerHTML=state.incomes.length?state.incomes.map(x=>listEditable(x,'income')).join(''):'<div class="empty">No hay ingresos.</div>';
  const fixed=document.getElementById('fixedList');
  fixed.innerHTML=state.fixed.length?state.fixed.map(x=>listEditable(x,'fixed')).join(''):'<div class="empty">No hay gastos fijos.</div>';

  const search=(document.getElementById('expenseSearch').value||'').toLowerCase();
  const cat=document.getElementById('expenseCategoryFilter').value||'';
  const vars=varsForMonth().filter(v=>(!search || `${v.name} ${v.notes||''}`.toLowerCase().includes(search)) && (!cat || v.category===cat)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  document.getElementById('variableList').innerHTML=vars.length?vars.map(v=>`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${esc(v.name||v.category||'Gasto')}</div>
        <div class="list-meta">${esc(v.category||'Otros')} · ${formatDate(v.date)}${v.notes?` · ${esc(v.notes)}`:''}</div>
      </div>
      <div class="list-amount">${eur(v.amount)}</div>
      <div class="item-actions">
        <button class="mini-btn" aria-label="Editar ${esc(v.name||'gasto')}" onclick="editEntity('variable','${v.id}')">Editar</button>
        <button class="mini-btn delete" aria-label="Eliminar ${esc(v.name||'gasto')}" onclick="deleteEntity('variable','${v.id}')">✕</button>
      </div>
    </div>`).join(''):'<div class="empty">No hay gastos que coincidan con el filtro.</div>';
  document.getElementById('variableTotalFooter').textContent=eur(variableSpent());
  populateCategoryFilter();
  renderCategoryBudgets();
}
function listEditable(x,type){
  const meta=type==='income'?`Día ${x.day||1}`:`${esc(x.category||'Sin categoría')} · Día ${x.day||1}`;
  const amount=type==='income'?num(x.amount):-num(x.amount);
  return `<div class="list-item">
    <div class="list-main"><div class="list-title">${esc(x.name|| (type==='income'?'Ingreso':'Gasto fijo'))}</div><div class="list-meta">${meta}${x.active===false?' · Inactivo':''}</div></div>
    <div class="list-amount">${type==='income'?'+':''}${eur(amount)}</div>
    <div class="item-actions">
      <button class="mini-btn" aria-label="Editar ${esc(x.name||'registro')}" onclick="editEntity('${type}','${x.id}')">Editar</button>
      <button class="mini-btn delete" aria-label="Eliminar ${esc(x.name||'registro')}" onclick="deleteEntity('${type}','${x.id}')">✕</button>
    </div>
  </div>`;
}
function formatDate(iso){
  if(!iso) return '';
  const [y,m,d]=iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short'}).format(new Date(y,m-1,d));
}
function populateCategoryFilter(){
  const sel=document.getElementById('expenseCategoryFilter');
  const old=sel.value;
  const cats=[...new Set([...defaultCategories,...state.variables.map(v=>v.category).filter(Boolean),...state.categoryBudgets.map(b=>b.category).filter(Boolean)])].sort();
  sel.innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value=old;
}
function renderCategoryBudgets(){
  const el=document.getElementById('categoryBudgets');
  if(!state.categoryBudgets.length){el.innerHTML='<div class="empty">No has definido límites por categoría.</div>';return;}
  el.innerHTML=state.categoryBudgets.map(b=>{
    const spent=categorySpent(b.category), lim=num(b.limit), ratio=lim?spent/lim:0;
    return `<div class="budget-row">
      <div class="budget-head"><span>${esc(b.category)}</span><span>${eur(spent)} / ${eur(lim)} <button class="mini-btn" aria-label="Editar límite de ${esc(b.category)}" onclick="editEntity('categoryBudget','${b.id}')">Editar</button> <button class="mini-btn delete" aria-label="Eliminar límite de ${esc(b.category)}" onclick="deleteEntity('categoryBudget','${b.id}')">✕</button></span></div>
      <div class="budget-track"><div class="budget-fill ${ratio>=1?'over':ratio>=.8?'warn':''}" style="width:${clamp(ratio*100,0,100)}%"></div></div>
    </div>`;
  }).join('');
}

function renderFinancing(){
  const active=state.finances.filter(f=>financeActiveInMonth(f));
  const monthly=active.reduce((a,f)=>a+num(f.monthlyAmount),0);
  const rem=active.reduce((a,f)=>a+financingRemainingAmount(f),0);
  const income=recurringIncome();
  document.getElementById('financeMonthlyTotal').textContent=eur(monthly);
  document.getElementById('financeRemainingTotal').textContent=eur(rem);
  document.getElementById('financeActiveCount').textContent=String(active.length);
  document.getElementById('financeIncomePct').textContent=`${income?Math.round(monthly/income*100):0}%`;

  document.getElementById('financeList').innerHTML=active.length?active.map(f=>{
    const total=parseInt(f.totalInstallments)||0, paid=financingPaidCount(f), remaining=financingRemainingCount(f);
    const ratio=total?paid/total:0, end=financeEndMonth(f);
    return `<div class="finance-card">
      <div class="finance-top">
        <div><div class="finance-name">${esc(f.name||'Financiación')}</div><div class="list-meta">Día ${f.dueDay||1}${end?` · termina ${monthName(end)}`:''}</div></div>
        <div class="finance-amount">${eur(f.monthlyAmount)}/mes</div>
      </div>
      <div class="finance-progress"><div class="budget-track"><div class="budget-fill" style="width:${clamp(ratio*100,0,100)}%"></div></div></div>
      <div class="finance-foot">
        <span>${total?`${paid} de ${total} cuotas estimadas`:'Sin nº total de cuotas'}</span>
        <span>${remaining===null?'':`${remaining} restantes`}</span>
      </div>
      <div class="finance-foot" style="margin-top:7px">
        <span>Pendiente aprox.: ${eur(financingRemainingAmount(f))}</span>
        <span><button class="mini-btn" aria-label="Editar ${esc(f.name||'financiación')}" onclick="editEntity('finance','${f.id}')">Editar</button> <button class="mini-btn delete" aria-label="Eliminar ${esc(f.name||'financiación')}" onclick="deleteEntity('finance','${f.id}')">✕</button></span>
      </div>
    </div>`;
  }).join(''):'<div class="empty">No tienes financiaciones activas.</div>';

  const timeline=active.map(f=>({f,end:financeEndMonth(f)})).filter(x=>x.end).sort((a,b)=>a.end.localeCompare(b.end));
  document.getElementById('financeTimeline').innerHTML=timeline.length?`<div class="timeline">${timeline.map(x=>`
    <div class="timeline-item"><div class="list-title">${esc(x.f.name)}</div><div class="list-meta">${monthName(x.end)} · libera ${eur(x.f.monthlyAmount)}/mes</div></div>`).join('')}</div>`:'<div class="empty">Añade el número total de cuotas o el mes final para ver la línea temporal.</div>';

  const pctIncome=income?monthly/income:0;
  let advice='Tus cuotas están en un nivel moderado respecto a los ingresos registrados.';
  if(!active.length) advice='No tienes financiaciones activas registradas.';
  else if(pctIncome>=.40) advice=`Las cuotas representan aproximadamente el ${Math.round(pctIncome*100)}% de tus ingresos. Es una carga alta: evita nuevas financiaciones si no son imprescindibles.`;
  else if(pctIncome>=.25) advice=`Las cuotas representan aproximadamente el ${Math.round(pctIncome*100)}% de tus ingresos. Antes de financiar algo nuevo, comprueba el simulador de la sección Planificar.`;
  else advice=`Las cuotas representan aproximadamente el ${Math.round(pctIncome*100)}% de tus ingresos. La app seguirá descontándolas automáticamente en cada mes activo.`;
  document.getElementById('financeAdvice').textContent=advice;
}

function renderPlanning(){
  document.getElementById('expectedVariable').value=state.settings.expectedVariable??'';
  const forecasts=[];
  for(let i=0;i<12;i++){
    const ym=addMonths(currentYM(),i);
    forecasts.push({ym,...calcMonth(ym,false)});
  }
  const max=Math.max(...forecasts.map(x=>Math.abs(x.available)),1);
  document.getElementById('forecastChart').innerHTML=forecasts.map(x=>{
    const h=Math.max(3,Math.abs(x.available)/max*100);
    return `<div class="forecast-col" title="${monthName(x.ym)}: ${eur(x.available)}"><div class="forecast-bar ${x.available<0?'negative':''}" style="height:${h}%"></div></div>`;
  }).join('');
  document.getElementById('forecastChart').insertAdjacentHTML('afterend','');
  let labels=document.getElementById('forecastLabelsGenerated');
  if(!labels){
    labels=document.createElement('div');labels.id='forecastLabelsGenerated';labels.className='forecast-labels';
    document.getElementById('forecastChart').after(labels);
  }
  labels.innerHTML=forecasts.map(x=>`<span>${monthName(x.ym,true).replace('.','')}</span>`).join('');
  document.getElementById('forecastTable').innerHTML=forecasts.map(x=>`
    <div class="forecast-table-row"><span>${monthName(x.ym,true)}</span><span>${x.available<0?'Déficit':'Margen'}</span><strong>${eur(x.available)}</strong></div>`).join('');

  renderPaymentCalendar();
  renderGoals();
  renderSimulator();
}
function renderPaymentCalendar(){
  const rows=upcomingItems().sort((a,b)=>a.day-b.day);
  const today=todayDay();
  document.getElementById('paymentCalendar').innerHTML=rows.length?rows.map(x=>{
    const cls=x.day===today?'today':x.day>today && x.day<=today+3?'soon':'';
    return `<div class="calendar-row ${cls}"><div class="calendar-day">${x.day}</div><div><div class="list-title">${esc(x.name)}</div><div class="list-meta">${x.type}</div></div><strong>${eur(x.amount)}</strong></div>`;
  }).join(''):'<div class="empty">No hay pagos recurrentes registrados.</div>';
}
function renderGoals(){
  const el=document.getElementById('goalList');
  if(!state.goals.length){el.innerHTML='<div class="empty">No tienes objetivos de ahorro.</div>';return;}
  el.innerHTML=state.goals.map(g=>{
    const cur=num(g.currentAmount), tar=num(g.targetAmount), ratio=tar?cur/tar:0;
    return `<div class="goal">
      <div class="goal-top"><div><div class="goal-name">${esc(g.name||'Objetivo')}</div><div class="list-meta">${g.deadline?`Objetivo: ${monthName(g.deadline)}`:'Sin fecha límite'} · ${g.includeInBudget===false?'No descuenta del presupuesto':'Reserva mensual incluida'}</div></div><strong>${eur(cur)} / ${eur(tar)}</strong></div>
      <div class="goal-progress"><div class="budget-track"><div class="budget-fill" style="width:${clamp(ratio*100,0,100)}%"></div></div></div>
      <div class="finance-foot" style="margin-top:8px"><span>Aporte mensual: ${eur(g.monthlyContribution)}</span><span><button class="mini-btn" aria-label="Editar ${esc(g.name||'objetivo')}" onclick="editEntity('goal','${g.id}')">Editar</button> <button class="mini-btn delete" aria-label="Eliminar ${esc(g.name||'objetivo')}" onclick="deleteEntity('goal','${g.id}')">✕</button></span></div>
    </div>`;
  }).join('');
}
function renderSimulator(){
  const price=num(document.getElementById('simPrice').value);
  const mode=document.getElementById('simMode').value;
  document.getElementById('simMonthsWrap').hidden=mode!=='finance';
  const out=document.getElementById('simResult');
  if(price<=0){out.className='sim-result neutral';out.textContent='Introduce un precio para simular.';return;}
  const c=calcMonth();
  if(mode==='cash'){
    const after=c.available-price;
    const threshold=c.income*num(state.settings.warningThreshold||0.15);
    if(after<0){out.className='sim-result bad';out.innerHTML=`<strong>No encaja este mes.</strong> Al pagarlo al contado, terminarías aproximadamente <strong>${eur(Math.abs(after))}</strong> en negativo.`;}
    else if(c.income>0 && after<=threshold){out.className='sim-result warn';out.innerHTML=`<strong>Encaja, pero te deja muy justo.</strong> Después de pagarlo te quedarían <strong>${eur(after)}</strong> este mes.`;}
    else{out.className='sim-result good';out.innerHTML=`<strong>Parece asumible este mes.</strong> Después de pagarlo todavía te quedarían <strong>${eur(after)}</strong>.`;}
  }else{
    const months=Math.max(1,parseInt(document.getElementById('simMonths').value)||1);
    const quota=price/months;
    const future=c.available-quota;
    const totalFinance=c.finance+quota;
    const totalFinancePct=c.income?totalFinance/c.income:0;
    const threshold=c.income*num(state.settings.warningThreshold||0.15);
    const verdict=future<0
      ? '<strong>No parece asumible:</strong> la nueva cuota dejaría tu margen mensual en negativo.'
      : c.income>0 && (future<=threshold || totalFinancePct>=.40)
        ? '<strong>Quedaría muy justo:</strong> revisa si puedes reducir el precio o el resto de cuotas.'
        : '<strong>La cuota parece encajar:</strong> conservarías margen mensual con los datos actuales.';
    const financeShare=c.income>0
      ? `Todas tus financiaciones supondrían aproximadamente el <strong>${Math.round(totalFinancePct*100)}%</strong> de tus ingresos.`
      : 'Añade tus ingresos mensuales para poder calcular qué porcentaje consumirían las cuotas.';
    out.className=`sim-result ${future<0?'bad':c.income>0 && (future<=threshold || totalFinancePct>=.40)?'warn':'good'}`;
    out.innerHTML=`${verdict}<br><br>Cuota estimada sin intereses: <strong>${eur(quota)}/mes</strong>. Margen mensual resultante: <strong>${eur(future)}</strong>. ${financeShare}`;
  }
}

function renderMore(){
  document.getElementById('reserveInput').value=state.settings.reserve??'';
  document.getElementById('warningThreshold').value=state.settings.warningThreshold||'0.15';
  document.getElementById('lastBackup').textContent=state.settings.lastBackup?new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.settings.lastBackup)):'Nunca';
  const rows=[{ym:currentYM(),...calcMonth(),current:true},...state.history.filter(x=>x.ym!==currentYM()).slice().sort((a,b)=>b.ym.localeCompare(a.ym))];
  document.getElementById('historyList').innerHTML=rows.length?rows.map(x=>`
    <div class="list-item">
      <div class="list-main"><div class="list-title">${monthName(x.ym)} ${x.current?'<span class="chip">actual</span>':''}</div><div class="list-meta">Ingresos ${eur(x.income)} · Gastos ${eur((x.fixed||0)+(x.finance||0)+(x.variable||0)+(x.savings||0))}</div></div>
      <div class="list-amount" style="color:${x.available<0?'var(--red)':'var(--green)'}">${eur(x.available)}</div>
    </div>`).join(''):'<div class="empty">Todavía no hay historial.</div>';
}

function openModal(type,id=null){
  const backdrop=document.getElementById('modalBackdrop');
  const form=document.getElementById('modalForm');
  const title=document.getElementById('modalTitle');
  let item=null;
  if(id) item=findEntity(type,id);
  const editing=!!item;
  const submitText=editing?'Guardar cambios':'Añadir';
  title.textContent={
    income:editing?'Editar ingreso':'Nuevo ingreso',
    fixed:editing?'Editar gasto fijo':'Nuevo gasto fijo',
    variable:editing?'Editar gasto':'Nuevo gasto variable',
    finance:editing?'Editar financiación':'Nueva financiación',
    categoryBudget:editing?'Editar presupuesto':'Presupuesto por categoría',
    goal:editing?'Editar objetivo':'Nuevo objetivo de ahorro'
  }[type]||'Editar';

  if(type==='income'){
    item=item||{name:'',amount:'',day:1,active:true};
    form.innerHTML=formWrap(`
      ${field('Nombre','name',item.name,'Ej. Nómina')}
      <div class="form-grid">${field('Importe mensual','amount',item.amount,'0','decimal')}${field('Día de cobro','day',item.day,'1','numeric')}</div>
      ${checkbox('active','Activo',item.active!==false)}
    `,submitText,type,id);
  }
  if(type==='fixed'){
    item=item||{name:'',amount:'',day:1,category:'Hogar',active:true};
    form.innerHTML=formWrap(`
      ${field('Nombre','name',item.name,'Ej. Alquiler')}
      <div class="form-grid">${field('Importe mensual','amount',item.amount,'0','decimal')}${field('Día de pago','day',item.day,'1','numeric')}</div>
      ${selectField('Categoría','category',item.category,defaultCategories)}
      ${checkbox('active','Activo',item.active!==false)}
    `,submitText,type,id);
  }
  if(type==='variable'){
    item=item||{name:'',amount:'',date:new Date().toISOString().slice(0,10),category:'Supermercado',notes:''};
    form.innerHTML=formWrap(`
      ${field('Concepto','name',item.name,'Ej. Compra semanal')}
      <div class="form-grid">${field('Importe','amount',item.amount,'0','decimal')}${dateField('Fecha','date',item.date)}</div>
      ${selectField('Categoría','category',item.category,defaultCategories)}
      ${textAreaField('Nota opcional','notes',item.notes,'Ej. Compra Mercadona')}
    `,submitText,type,id);
  }
  if(type==='finance'){
    item=item||{name:'',monthlyAmount:'',dueDay:1,createdMonth:currentYM(),paidAtCreation:0,totalInstallments:'',endMonth:'',totalFinanced:'',active:true,notes:''};
    form.innerHTML=formWrap(`
      ${field('Producto / financiación','name',item.name,'Ej. iPhone')}
      <div class="form-grid">${field('Cuota mensual','monthlyAmount',item.monthlyAmount,'0','decimal')}${field('Día de cobro','dueDay',item.dueDay,'1','numeric')}</div>
      <div class="form-grid">${monthField('Mes desde el que la controlas','createdMonth',item.createdMonth)}${field('Cuotas ya pagadas','paidAtCreation',item.paidAtCreation,'0','numeric')}</div>
      <div class="form-grid">${field('Número total de cuotas','totalInstallments',item.totalInstallments,'Ej. 24','numeric')}${monthField('O mes de última cuota','endMonth',item.endMonth)}</div>
      ${field('Importe total financiado (opcional)','totalFinanced',item.totalFinanced,'Sirve para estimar capital pendiente','decimal')}
      ${textAreaField('Notas','notes',item.notes,'Ej. Sin intereses')}
      ${checkbox('active','Financiación activa',item.active!==false)}
      <div class="info-box small">Puedes indicar el número total de cuotas o directamente el mes de la última cuota. Si completas ambos, la app prioriza el mes final.</div>
    `,submitText,type,id);
  }
  if(type==='categoryBudget'){
    item=item||{category:'Supermercado',limit:''};
    form.innerHTML=formWrap(`
      ${selectField('Categoría','category',item.category,defaultCategories)}
      ${field('Límite mensual','limit',item.limit,'Ej. 300','decimal')}
    `,submitText,type,id);
  }
  if(type==='goal'){
    item=item||{name:'',targetAmount:'',currentAmount:'',monthlyContribution:'',deadline:'',includeInBudget:true,active:true};
    form.innerHTML=formWrap(`
      ${field('Nombre del objetivo','name',item.name,'Ej. Fondo de emergencia')}
      <div class="form-grid">${field('Objetivo total','targetAmount',item.targetAmount,'0','decimal')}${field('Ahorrado actualmente','currentAmount',item.currentAmount,'0','decimal')}</div>
      <div class="form-grid">${field('Aporte mensual','monthlyContribution',item.monthlyContribution,'0','decimal')}${monthField('Fecha objetivo','deadline',item.deadline)}</div>
      ${checkbox('includeInBudget','Descontar el aporte mensual del dinero disponible',item.includeInBudget!==false)}
      ${checkbox('active','Objetivo activo',item.active!==false)}
    `,submitText,type,id);
  }

  form.dataset.type=type; form.dataset.id=id||'';
  backdrop.hidden=false;
  setTimeout(()=>form.querySelector('input,select,textarea')?.focus(),50);
}
function field(label,name,value='',placeholder='',mode='text'){
  const id=`field-${name}`;
  return `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" inputmode="${mode}"></div>`;
}
function dateField(label,name,value=''){
  const id=`field-${name}`;
  return `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" type="date" name="${name}" value="${esc(value)}"></div>`;
}
function monthField(label,name,value=''){
  const id=`field-${name}`;
  return `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" type="month" name="${name}" value="${esc(value)}"></div>`;
}
function selectField(label,name,value,opts){
  const id=`field-${name}`;
  return `<div class="field"><label for="${id}">${esc(label)}</label><select id="${id}" name="${name}">${opts.map(o=>`<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
}
function textAreaField(label,name,value,placeholder=''){
  const id=`field-${name}`;
  return `<div class="field"><label for="${id}">${esc(label)}</label><textarea id="${id}" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`;
}
function checkbox(name,label,checked){
  return `<label class="field" style="grid-template-columns:auto 1fr;align-items:center"><input type="checkbox" name="${name}" ${checked?'checked':''} style="width:auto"><span>${esc(label)}</span></label>`;
}
function formWrap(inner,submitText,type,id){
  return `${inner}<div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button type="submit" class="primary">${submitText}</button></div>`;
}
function closeModal(){ document.getElementById('modalBackdrop').hidden=true; }
function findEntity(type,id){
  const map={income:'incomes',fixed:'fixed',variable:'variables',finance:'finances',categoryBudget:'categoryBudgets',goal:'goals'};
  return state[map[type]]?.find(x=>x.id===id)||null;
}
window.editEntity=(type,id)=>openModal(type,id);
window.deleteEntity=(type,id)=>{
  const map={income:'incomes',fixed:'fixed',variable:'variables',finance:'finances',categoryBudget:'categoryBudgets',goal:'goals'};
  if(!confirm('¿Seguro que quieres eliminarlo?')) return;
  state[map[type]]=state[map[type]].filter(x=>x.id!==id);
  save();renderAll();toast('Eliminado');
};
function handleFormSubmit(e){
  e.preventDefault();
  const type=e.currentTarget.dataset.type, id=e.currentTarget.dataset.id||null;
  const fd=new FormData(e.currentTarget);
  const obj=Object.fromEntries(fd.entries());
  e.currentTarget.querySelectorAll('input[type=checkbox]').forEach(cb=>obj[cb.name]=cb.checked);
  if(type==='income') obj.day=clamp(parseInt(obj.day)||1,1,31);
  if(type==='fixed') obj.day=clamp(parseInt(obj.day)||1,1,31);
  if(type==='finance'){
    obj.dueDay=clamp(parseInt(obj.dueDay)||1,1,31);
    obj.paidAtCreation=Math.max(0,parseInt(obj.paidAtCreation)||0);
    obj.totalInstallments=obj.totalInstallments?Math.max(1,parseInt(obj.totalInstallments)||1):'';
  }
  const map={income:'incomes',fixed:'fixed',variable:'variables',finance:'finances',categoryBudget:'categoryBudgets',goal:'goals'};
  if(id){
    const idx=state[map[type]].findIndex(x=>x.id===id);
    state[map[type]][idx]={...state[map[type]][idx],...obj};
  }else{
    obj.id=uid(type.slice(0,3));
    state[map[type]].push(obj);
  }
  save();closeModal();renderAll();toast(id?'Cambios guardados':'Añadido');
}

function closeCurrentMonth(){
  const ym=currentYM(), c=calcMonth();
  const snap={ym,...c,closedAt:nowISO()};
  const idx=state.history.findIndex(x=>x.ym===ym);
  if(idx>=0) state.history[idx]=snap; else state.history.push(snap);
  save();renderMore();toast('Mes guardado en el historial');
}
function exportData(){
  state.settings.lastBackup=nowISO();save();renderMore();
  const payload={app:'MyMoney',version:2,exportedAt:nowISO(),data:state};
  downloadBlob(JSON.stringify(payload,null,2),`mymoney-copia-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  toast('Copia exportada');
}
function exportCSV(){
  const rows=[['Fecha','Concepto','Categoría','Importe','Nota'],...state.variables.sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(v=>[v.date,v.name,v.category,String(num(v.amount)).replace('.',','),v.notes||''])];
  const csv=rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  downloadBlob('\ufeff'+csv,`mis-gastos-${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8');
}
function downloadBlob(content,name,type){
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function normalizeImportedData(data){
  if(!data || !Array.isArray(data.incomes)) throw new Error('Formato');
  const looksLikeV1 =
    ('reserve' in data) ||
    (Array.isArray(data.finances) && data.finances.some(f=>'amount' in f && !('monthlyAmount' in f))) ||
    (Array.isArray(data.variables) && data.variables.some(v=>'month' in v && !('date' in v)));

  if(!looksLikeV1) return data;

  const fresh=baseState();
  fresh.incomes=(data.incomes||[]).map(x=>({
    id:x.id||uid('inc'),name:x.name||'Ingreso',amount:x.amount||'',day:x.day||1,active:x.active!==false
  }));
  fresh.fixed=(data.fixed||[]).map(x=>({
    id:x.id||uid('fix'),name:x.name||'Gasto fijo',amount:x.amount||'',day:x.day||1,
    category:x.category||'Hogar',active:x.active!==false
  }));
  fresh.finances=(data.finances||[]).map(x=>({
    id:x.id||uid('fin'),name:x.name||'Financiación',
    monthlyAmount:x.monthlyAmount??x.amount??'',dueDay:x.dueDay||1,
    createdMonth:x.createdMonth||currentYM(),paidAtCreation:x.paidAtCreation||0,
    totalInstallments:x.totalInstallments||'',endMonth:x.endMonth??x.end??'',
    totalFinanced:x.totalFinanced||'',active:x.active!==false,notes:x.notes||''
  }));
  fresh.variables=(data.variables||[]).map(x=>({
    id:x.id||uid('var'),name:x.name||'Gasto',amount:x.amount||'',
    date:x.date||`${x.month||currentYM()}-01`,category:x.category||'Otros',notes:x.notes||''
  }));
  fresh.categoryBudgets=Array.isArray(data.categoryBudgets)?data.categoryBudgets:[];
  fresh.goals=Array.isArray(data.goals)?data.goals:[];
  fresh.history=Array.isArray(data.history)?data.history:[];
  fresh.settings={...fresh.settings,...(data.settings||{})};
  if(data.reserve!==undefined && !fresh.settings.reserve) fresh.settings.reserve=data.reserve;
  return fresh;
}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const parsed=JSON.parse(r.result);
      const raw=parsed.data||parsed;
      const data=normalizeImportedData(raw);
      if(!Array.isArray(data.variables)) data.variables=[];
      state={...baseState(),...data};
      state.settings={...baseState().settings,...data.settings};
      save();renderAll();toast('Copia importada correctamente');
    }catch(e){ alert('No se pudo importar el archivo. Comprueba que sea una copia válida de MyMoney.'); }
  };
  r.readAsText(file);
}
function resetAll(){
  if(!confirm('Esto borrará todos los datos guardados en este dispositivo. ¿Quieres continuar?')) return;
  if(!confirm('Última confirmación: esta acción no se puede deshacer salvo que tengas una copia exportada.')) return;
  state=baseState();save();renderAll();toast('Datos borrados');
}
function toast(msg){
  const el=document.getElementById('toast'); el.textContent=msg; el.hidden=false;
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.hidden=true,2200);
}
function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const active=b.dataset.view===view;
    b.classList.toggle('active',active);
    if(active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
  document.getElementById(`view-${view}`).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='planning') renderPlanning();
}
function openSimulator(){
  navigate('planning');
  setTimeout(()=>document.getElementById('simPrice').focus(),180);
}
function bind(){
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
  document.querySelectorAll('[data-open-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.openModal)));
  document.getElementById('heroAddExpenseBtn').addEventListener('click',()=>openModal('variable'));
  document.getElementById('heroSimulatorBtn').addEventListener('click',openSimulator);
  document.getElementById('dismissSetupBtn').addEventListener('click',()=>{state.settings.setupDismissed=true;save();renderHome();});
  document.getElementById('addVariableLink').addEventListener('click',()=>openModal('variable'));
  document.getElementById('addIncomeBtn').addEventListener('click',()=>openModal('income'));
  document.getElementById('addFixedBtn').addEventListener('click',()=>openModal('fixed'));
  document.getElementById('addFinanceBtn').addEventListener('click',()=>openModal('finance'));
  document.getElementById('addCategoryBudgetBtn').addEventListener('click',()=>openModal('categoryBudget'));
  document.getElementById('addGoalBtn').addEventListener('click',()=>openModal('goal'));
  document.getElementById('modalCloseBtn').addEventListener('click',closeModal);
  document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
  document.getElementById('modalForm').addEventListener('submit',handleFormSubmit);
  document.getElementById('expenseSearch').addEventListener('input',renderMovements);
  document.getElementById('expenseCategoryFilter').addEventListener('change',renderMovements);
  document.getElementById('expectedVariable').addEventListener('input',e=>{state.settings.expectedVariable=e.target.value;save();renderPlanning();});
  document.getElementById('reserveInput').addEventListener('input',e=>{state.settings.reserve=e.target.value;save();renderHome();});
  document.getElementById('warningThreshold').addEventListener('change',e=>{state.settings.warningThreshold=e.target.value;save();renderHome();});
  document.getElementById('simPrice').addEventListener('input',renderSimulator);
  document.getElementById('simMode').addEventListener('change',renderSimulator);
  document.getElementById('simMonths').addEventListener('input',renderSimulator);
  document.getElementById('closeMonthBtn').addEventListener('click',closeCurrentMonth);
  document.getElementById('exportBtn').addEventListener('click',exportData);
  document.getElementById('exportCsvBtn').addEventListener('click',exportCSV);
  document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change',e=>{if(e.target.files?.[0])importData(e.target.files[0]);e.target.value='';});
  document.getElementById('resetBtn').addEventListener('click',resetAll);
}
load();
bind();
renderAll();

const LOCAL_HOSTS=new Set(['localhost','127.0.0.1','0.0.0.0','::1','[::1]']);

window.addEventListener('load',async()=>{
  const offlineStatus=document.getElementById('offlineStatus');

  if(!('serviceWorker' in navigator)){
    offlineStatus.textContent='No activo';
    return;
  }

  if(LOCAL_HOSTS.has(location.hostname)){
    try{
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration=>registration.unregister()));

      if('caches' in window){
        const cacheNames=await caches.keys();
        const myMoneyCaches=cacheNames.filter(name=>name.startsWith('mymoney-') || name.startsWith('mi-presupuesto-'));
        await Promise.all(myMoneyCaches.map(name=>caches.delete(name)));
      }

      offlineStatus.textContent='Desactivado en local';
    }catch(error){
      offlineStatus.textContent='No activo en local';
    }
    return;
  }

  try{
    await navigator.serviceWorker.register('./sw.js');
    offlineStatus.textContent='Disponible';
  }catch(error){
    offlineStatus.textContent='No activo';
  }
});
