const $=id=>document.getElementById(id);
const cargoSel=$('cargo'),candSel=$('candidato'),municipioSel=$('municipio'),cargoMunSel=$('cargoMunicipio'),
conteudo=$('conteudo'),resumo=$('resumo'),toolbar=$('toolbar'),busca=$('busca'),intro=$('intro'),
voltar=$('voltar'),home=$('home'),filtrosCand=$('filtrosCandidato'),filtrosMun=$('filtrosMunicipio'),
porCandidato=$('porCandidato'),porMunicipio=$('porMunicipio');

const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const pct=n=>Number(String(n??0).replace(',','.'))||0;
let catalog=null,data=null,current=null,mode=null,sort={key:'votos',dir:'desc'},municipios=[];

async function init(){
  catalog=await fetch('dados/catalogo.json').then(r=>r.json());
  const opts=catalog.cargos.map((c,i)=>`<option value="${i}">${c.nome}</option>`).join('');
  cargoSel.innerHTML='<option value="">Escolha o cargo</option>'+opts;
  cargoMunSel.innerHTML='<option value="">Escolha o cargo</option>'+opts;
  await buildMunicipios();
}

async function buildMunicipios(){
  const c=catalog.cargos[0];
  const d=await fetch(c.arquivo).then(r=>r.json());
  const map=new Map();
  d.resultados.forEach(r=>map.set(String(r[1]),{codigo:String(r[1]),ibge:String(r[2]),nome:r[3]}));
  municipios=[...map.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'}));
  municipioSel.innerHTML='<option value="">Escolha o município</option>'+
    municipios.map(m=>`<option value="${m.codigo}">${m.nome}</option>`).join('');
}

function clearView(){
  resumo.innerHTML='';conteudo.innerHTML='';conteudo.classList.add('hidden');
  toolbar.classList.add('hidden');busca.value='';current=null;
}

function goHome(){
  mode=null;clearView();intro.classList.remove('hidden');filtrosCand.classList.add('hidden');
  filtrosMun.classList.add('hidden');voltar.classList.add('hidden');
  cargoSel.value='';candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';candSel.disabled=true;
  municipioSel.value='';cargoMunSel.value='';
}

function startCandidate(){
  mode='candidate';clearView();intro.classList.add('hidden');filtrosMun.classList.add('hidden');
  filtrosCand.classList.remove('hidden');voltar.classList.remove('hidden');voltar.textContent='← Voltar à página inicial';
}

function startMunicipio(){
  mode='municipio';clearView();intro.classList.add('hidden');filtrosCand.classList.add('hidden');
  filtrosMun.classList.remove('hidden');voltar.classList.remove('hidden');voltar.textContent='← Voltar à página inicial';
}

async function loadCargo(){
  if(cargoSel.value===''){clearView();candSel.disabled=true;return}
  const c=catalog.cargos[+cargoSel.value];data=await fetch(c.arquivo).then(r=>r.json());
  candSel.disabled=false;candSel.innerHTML='<option value="">Escolha o candidato</option>'+
    data.candidatos.map(x=>`<option value="${x.id}">${x.numero} · ${x.urna||x.nome} · ${x.partido}</option>`).join('');
  current=null;busca.value='';busca.placeholder='Buscar candidato...';toolbar.classList.remove('hidden');
  conteudo.classList.remove('hidden');renderCandidates();
}

function renderCandidates(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  const arr=data.candidatos.filter(c=>!q||(`${c.numero} ${c.nome} ${c.urna} ${c.partido}`).toLocaleUpperCase('pt-BR').includes(q));
  resumo.innerHTML=`<div class="kpi"><small>CARGO</small><strong>${data.cargo}</strong></div><div class="kpi"><small>CANDIDATOS</small><strong>${fmt(data.candidatos.length)}</strong></div><div class="kpi"><small>ANO</small><strong>2026</strong><div class="sub">1º turno · Mato Grosso</div></div>`;
  conteudo.innerHTML=`<div class="list-title"><h2>Candidatos</h2><p>Selecione um candidato para consultar sua votação nos municípios.</p></div><div class="table-head"><div>#</div><div>Candidato</div><div style="text-align:right">Votos MT</div><div style="text-align:right">Municípios</div></div>`+
    arr.map((c,i)=>`<div class="row" data-id="${c.id}"><div class="rank">${i+1}</div><div><div class="name">${c.urna||c.nome}</div><div class="sub">${c.numero} · ${c.partido} · ${c.situacao}</div></div><div class="votes">${fmt(c.total)}</div><div class="pct">${fmt(c.municipios_com_votos)}</div></div>`).join('');
  conteudo.querySelectorAll('[data-id]').forEach(x=>x.onclick=()=>selectCandidate(x.dataset.id));
}

function selectCandidate(id){
  current=data.candidatos.find(c=>String(c.id)===String(id));candSel.value=id;busca.value='';
  busca.placeholder='Buscar município...';sort={key:'votos',dir:'desc'};renderMunicipios();
}

function indicator(k){return sort.key===k?(sort.dir==='asc'?' ▲':' ▼'):''}
function toggleCandidate(k,def){
  if(sort.key===k)sort.dir=sort.dir==='asc'?'desc':'asc';else{sort.key=k;sort.dir=def}
  renderMunicipios();
}
function renderMunicipios(){
  let arr=data.resultados.filter(r=>String(r[0])===String(current.id));
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  arr=arr.filter(r=>!q||r[3].toLocaleUpperCase('pt-BR').includes(q));
  arr.sort((a,b)=>{let c=sort.key==='municipio'?a[3].localeCompare(b[3],'pt-BR',{sensitivity:'base'}):sort.key==='percentual'?pct(a[6])-pct(b[6]):Number(a[4])-Number(b[4]);if(sort.dir==='desc')c=-c;return c||a[3].localeCompare(b[3],'pt-BR')});
  resumo.innerHTML=`<div class="kpi"><small>CANDIDATO</small><strong>${current.urna||current.nome}</strong><div class="sub">${current.numero} · ${current.partido}</div></div><div class="kpi"><small>TOTAL MT</small><strong>${fmt(current.total)}</strong></div><div class="kpi"><small>MUNICÍPIOS COM VOTOS</small><strong>${fmt(current.municipios_com_votos)}</strong><div class="sub">de 142 municípios</div></div>`;
  conteudo.innerHTML=`<div class="list-title"><h2>Votação por município</h2><p>Percentual oficial do TSE no município.</p></div><div class="table-head"><div>#</div><button class="sort" data-sort="municipio">Município${indicator('municipio')}</button><button class="sort right" data-sort="votos">Votos${indicator('votos')}</button><button class="sort right" data-sort="percentual">%${indicator('percentual')}</button></div>`+
    (arr.length?arr.map((r,i)=>`<div class="row static-row"><div class="rank">${i+1}</div><div><div class="name">${r[3]}</div><div class="sub">TSE ${r[1]}</div></div><div class="votes">${fmt(r[4])}</div><div class="pct">${r[5]}%</div></div>`).join(''):'<div class="empty">Nenhum município encontrado.</div>');
  conteudo.querySelectorAll('[data-sort]').forEach(x=>x.onclick=()=>toggleCandidate(x.dataset.sort,x.dataset.sort==='municipio'?'asc':'desc'));
}

async function renderMunicipioCargo(){
  if(!municipioSel.value||cargoMunSel.value===''){clearView();return}
  const c=catalog.cargos[+cargoMunSel.value];data=await fetch(c.arquivo).then(r=>r.json());
  const m=municipios.find(x=>x.codigo===municipioSel.value);current=m;
  sort={key:'votos',dir:'desc'};busca.value='';busca.placeholder='Buscar candidato...';
  toolbar.classList.remove('hidden');conteudo.classList.remove('hidden');renderCandidatosMunicipio();
}
function toggleMun(k,def){
  if(sort.key===k)sort.dir=sort.dir==='asc'?'desc':'asc';else{sort.key=k;sort.dir=def}
  renderCandidatosMunicipio();
}
function renderCandidatosMunicipio(){
  const byId=new Map(data.candidatos.map(c=>[String(c.id),c]));
  let arr=data.resultados.filter(r=>String(r[1])===String(current.codigo)&&Number(r[4])>0)
    .map(r=>({r,c:byId.get(String(r[0]))})).filter(x=>x.c);
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  arr=arr.filter(x=>!q||(`${x.c.numero} ${x.c.nome} ${x.c.urna} ${x.c.partido}`).toLocaleUpperCase('pt-BR').includes(q));
  arr.sort((a,b)=>{let c=sort.key==='nome'?(a.c.urna||a.c.nome).localeCompare((b.c.urna||b.c.nome),'pt-BR',{sensitivity:'base'}):sort.key==='percentual'?pct(a.r[6])-pct(b.r[6]):Number(a.r[4])-Number(b.r[4]);if(sort.dir==='desc')c=-c;return c||(a.c.urna||a.c.nome).localeCompare((b.c.urna||b.c.nome),'pt-BR',{sensitivity:'base'})});
  resumo.innerHTML=`<div class="kpi"><small>MUNICÍPIO</small><strong>${current.nome}</strong><div class="sub">TSE ${current.codigo}</div></div><div class="kpi"><small>CARGO</small><strong>${data.cargo}</strong></div><div class="kpi"><small>CANDIDATOS COM VOTOS</small><strong>${fmt(arr.length)}</strong></div>`;
  conteudo.innerHTML=`<div class="list-title"><h2>Candidatos votados em ${current.nome}</h2><p>Ordene por candidato, votos ou percentual.</p></div><div class="table-head"><div>#</div><button class="sort" data-sort="nome">Candidato${indicator('nome')}</button><button class="sort right" data-sort="votos">Votos${indicator('votos')}</button><button class="sort right" data-sort="percentual">%${indicator('percentual')}</button></div>`+
    (arr.length?arr.map((x,i)=>`<div class="row static-row"><div class="rank">${i+1}</div><div><div class="name">${x.c.urna||x.c.nome}</div><div class="sub">${x.c.numero} · ${x.c.partido} · ${x.c.situacao}</div></div><div class="votes">${fmt(x.r[4])}</div><div class="pct">${x.r[5]}%</div></div>`).join(''):'<div class="empty">Nenhum candidato com votos encontrado.</div>');
  conteudo.querySelectorAll('[data-sort]').forEach(x=>x.onclick=()=>toggleMun(x.dataset.sort,x.dataset.sort==='nome'?'asc':'desc'));
}

porCandidato.onclick=startCandidate;porMunicipio.onclick=startMunicipio;
cargoSel.onchange=loadCargo;candSel.onchange=()=>candSel.value?selectCandidate(candSel.value):renderCandidates();
municipioSel.onchange=renderMunicipioCargo;cargoMunSel.onchange=renderMunicipioCargo;
busca.oninput=()=>mode==='municipio'?renderCandidatosMunicipio():(current?renderMunicipios():renderCandidates());
voltar.onclick=goHome;home.onclick=goHome;init();
