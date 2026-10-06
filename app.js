const $=id=>document.getElementById(id),
cargoSel=$('cargo'), candSel=$('candidato'), conteudo=$('conteudo'),
resumo=$('resumo'), toolbar=$('toolbar'), busca=$('busca'),
intro=$('intro'), voltar=$('voltar'), home=$('home');

const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const pct=n=>Number(String(n??0).replace(',','.'))||0;

let catalog=null,data=null,current=null,currentMunicipio=null;
let view='candidatos';
let sort={key:'votos',dir:'desc'};

async function init(){
  catalog=await fetch('dados/catalogo.json').then(r=>r.json());
  cargoSel.innerHTML='<option value="">Escolha o cargo</option>'+
    catalog.cargos.map((c,i)=>`<option value="${i}">${c.nome}</option>`).join('');
}

function reset(){
  cargoSel.value='';
  candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';
  candSel.disabled=true;
  data=current=currentMunicipio=null;
  view='candidatos';
  conteudo.classList.add('hidden');
  toolbar.classList.add('hidden');
  voltar.classList.add('hidden');
  intro.classList.remove('hidden');
  resumo.innerHTML='';
  busca.value='';
}

async function loadCargo(){
  if(cargoSel.value===''){reset();return}
  intro.classList.add('hidden');
  resumo.innerHTML='';
  conteudo.classList.remove('hidden');
  conteudo.innerHTML='<div class="loading">Carregando...</div>';
  const c=catalog.cargos[+cargoSel.value];
  data=await fetch(c.arquivo).then(r=>r.json());
  candSel.disabled=false;
  candSel.innerHTML='<option value="">Escolha o candidato</option>'+
    data.candidatos.map(x=>`<option value="${x.id}">${x.numero} · ${x.urna||x.nome} · ${x.partido}</option>`).join('');
  current=currentMunicipio=null;
  view='candidatos';
  busca.value='';
  busca.placeholder='Buscar candidato...';
  toolbar.classList.remove('hidden');
  renderCandidates();
}

function renderCandidates(){
  view='candidatos';
  currentMunicipio=null;
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  const arr=data.candidatos.filter(c=>!q||
    (`${c.numero} ${c.nome} ${c.urna} ${c.partido}`).toLocaleUpperCase('pt-BR').includes(q));
  resumo.innerHTML=
    `<div class="kpi"><small>CARGO</small><strong>${data.cargo}</strong></div>`+
    `<div class="kpi"><small>CANDIDATOS</small><strong>${fmt(data.candidatos.length)}</strong></div>`+
    `<div class="kpi"><small>ANO</small><strong>2026</strong><div class="sub">1º turno · Mato Grosso</div></div>`;
  conteudo.innerHTML=
    `<div class="list-title"><h2>Candidatos</h2><p>Ordenados pela votação total em Mato Grosso.</p></div>`+
    `<div class="table-head"><div>#</div><div>Candidato</div><div style="text-align:right">Votos MT</div><div style="text-align:right">Municípios</div></div>`+
    arr.map((c,i)=>
      `<div class="row" data-id="${c.id}"><div class="rank">${i+1}</div>`+
      `<div><div class="name">${c.urna||c.nome}</div><div class="sub">${c.numero} · ${c.partido} · ${c.situacao}</div></div>`+
      `<div class="votes">${fmt(c.total)}</div><div class="pct">${fmt(c.municipios_com_votos)}</div></div>`
    ).join('');
  conteudo.querySelectorAll('[data-id]').forEach(x=>x.onclick=()=>selectCandidate(x.dataset.id));
  voltar.classList.add('hidden');
}

function selectCandidate(id){
  current=data.candidatos.find(c=>String(c.id)===String(id));
  currentMunicipio=null;
  view='municipios';
  candSel.value=id;
  busca.value='';
  busca.placeholder='Buscar município...';
  sort={key:'votos',dir:'desc'};
  renderMunicipios();
  voltar.textContent='← Voltar aos candidatos';
  voltar.classList.remove('hidden');
}

function indicator(k){
  return sort.key===k?(sort.dir==='asc'?' ▲':' ▼'):'';
}

function toggle(k,def){
  if(sort.key===k) sort.dir=sort.dir==='asc'?'desc':'asc';
  else {sort.key=k;sort.dir=def}
  if(view==='municipioCandidatos') renderCandidatosMunicipio();
  else renderMunicipios();
}

function renderMunicipios(){
  view='municipios';
  currentMunicipio=null;
  let arr=data.resultados.filter(r=>String(r[0])===String(current.id));
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  arr=arr.filter(r=>!q||r[3].toLocaleUpperCase('pt-BR').includes(q));
  arr.sort((a,b)=>{
    let c=0;
    if(sort.key==='municipio') c=a[3].localeCompare(b[3],'pt-BR',{sensitivity:'base'});
    else if(sort.key==='percentual') c=pct(a[6])-pct(b[6]);
    else c=Number(a[4])-Number(b[4]);
    if(sort.dir==='desc') c=-c;
    return c||a[3].localeCompare(b[3],'pt-BR');
  });
  resumo.innerHTML=
    `<div class="kpi"><small>CANDIDATO</small><strong>${current.urna||current.nome}</strong><div class="sub">${current.numero} · ${current.partido}</div></div>`+
    `<div class="kpi"><small>TOTAL MT</small><strong>${fmt(current.total)}</strong></div>`+
    `<div class="kpi"><small>MUNICÍPIOS COM VOTOS</small><strong>${fmt(current.municipios_com_votos)}</strong><div class="sub">de 142 municípios</div></div>`;
  conteudo.innerHTML=
    `<div class="list-title"><h2>Votação por município</h2><p>Clique em um município para ver todos os candidatos deste cargo que receberam votos nele.</p></div>`+
    `<div class="table-head"><div>#</div>`+
    `<button class="sort" data-sort="municipio">Município${indicator('municipio')}</button>`+
    `<button class="sort right" data-sort="votos">Votos${indicator('votos')}</button>`+
    `<button class="sort right" data-sort="percentual">%${indicator('percentual')}</button></div>`+
    (arr.length?arr.map((r,i)=>
      `<div class="row" data-municipio="${r[1]}"><div class="rank">${i+1}</div>`+
      `<div><div class="name">${r[3]}</div><div class="sub">TSE ${r[1]} · clique para abrir</div></div>`+
      `<div class="votes">${fmt(r[4])}</div><div class="pct">${r[5]}%</div></div>`
    ).join(''):'<div class="empty">Nenhum município encontrado.</div>');
  conteudo.querySelectorAll('[data-sort]').forEach(x=>x.onclick=()=>toggle(x.dataset.sort,x.dataset.sort==='municipio'?'asc':'desc'));
  conteudo.querySelectorAll('[data-municipio]').forEach(x=>x.onclick=()=>selectMunicipio(x.dataset.municipio));
  voltar.textContent='← Voltar aos candidatos';
}

function selectMunicipio(codigoTse){
  const base=data.resultados.find(r=>String(r[1])===String(codigoTse));
  if(!base) return;
  currentMunicipio={codigo:String(base[1]),ibge:String(base[2]),nome:base[3]};
  view='municipioCandidatos';
  busca.value='';
  busca.placeholder='Buscar candidato...';
  sort={key:'votos',dir:'desc'};
  renderCandidatosMunicipio();
  voltar.textContent='← Voltar aos municípios';
  voltar.classList.remove('hidden');
}

function renderCandidatosMunicipio(){
  view='municipioCandidatos';
  const candidatosPorId=new Map(data.candidatos.map(c=>[String(c.id),c]));
  let arr=data.resultados
    .filter(r=>String(r[1])===String(currentMunicipio.codigo) && Number(r[4])>0)
    .map(r=>({r,c:candidatosPorId.get(String(r[0]))}))
    .filter(x=>x.c);

  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  arr=arr.filter(x=>!q||
    (`${x.c.numero} ${x.c.nome} ${x.c.urna} ${x.c.partido}`).toLocaleUpperCase('pt-BR').includes(q));

  arr.sort((a,b)=>{
    let c=0;
    if(sort.key==='nome') c=(a.c.urna||a.c.nome).localeCompare((b.c.urna||b.c.nome),'pt-BR',{sensitivity:'base'});
    else if(sort.key==='percentual') c=pct(a.r[6])-pct(b.r[6]);
    else c=Number(a.r[4])-Number(b.r[4]);
    if(sort.dir==='desc') c=-c;
    return c||(a.c.urna||a.c.nome).localeCompare((b.c.urna||b.c.nome),'pt-BR',{sensitivity:'base'});
  });

  const totalValidos = arr.length ? Number(arr[0].r[7]||0) : 0;
  resumo.innerHTML=
    `<div class="kpi"><small>MUNICÍPIO</small><strong>${currentMunicipio.nome}</strong><div class="sub">TSE ${currentMunicipio.codigo}</div></div>`+
    `<div class="kpi"><small>CARGO</small><strong>${data.cargo}</strong></div>`+
    `<div class="kpi"><small>CANDIDATOS COM VOTOS</small><strong>${fmt(arr.length)}</strong><div class="sub">${totalValidos?fmt(totalValidos)+' votos válidos computados':''}</div></div>`;

  conteudo.innerHTML=
    `<div class="list-title"><h2>Candidatos votados em ${currentMunicipio.nome}</h2>`+
    `<p>Todos os candidatos de ${data.cargo} com votos neste município. Clique nos cabeçalhos para ordenar.</p></div>`+
    `<div class="table-head"><div>#</div>`+
    `<button class="sort" data-sort="nome">Candidato${indicator('nome')}</button>`+
    `<button class="sort right" data-sort="votos">Votos${indicator('votos')}</button>`+
    `<button class="sort right" data-sort="percentual">%${indicator('percentual')}</button></div>`+
    (arr.length?arr.map((x,i)=>
      `<div class="row static-row"><div class="rank">${i+1}</div>`+
      `<div><div class="name">${x.c.urna||x.c.nome}</div><div class="sub">${x.c.numero} · ${x.c.partido} · ${x.c.situacao}</div></div>`+
      `<div class="votes">${fmt(x.r[4])}</div><div class="pct">${x.r[5]}%</div></div>`
    ).join(''):'<div class="empty">Nenhum candidato com votos encontrado neste município.</div>');
  conteudo.querySelectorAll('[data-sort]').forEach(x=>x.onclick=()=>toggle(x.dataset.sort,x.dataset.sort==='nome'?'asc':'desc'));
  voltar.textContent='← Voltar aos municípios';
}

cargoSel.onchange=loadCargo;
candSel.onchange=()=>candSel.value?selectCandidate(candSel.value):renderCandidates();
busca.oninput=()=>{
  if(view==='municipioCandidatos') renderCandidatosMunicipio();
  else if(current) renderMunicipios();
  else renderCandidates();
};
voltar.onclick=()=>{
  if(view==='municipioCandidatos'){
    busca.value='';
    busca.placeholder='Buscar município...';
    sort={key:'votos',dir:'desc'};
    renderMunicipios();
    voltar.textContent='← Voltar aos candidatos';
  }else{
    current=null;
    currentMunicipio=null;
    view='candidatos';
    candSel.value='';
    busca.value='';
    busca.placeholder='Buscar candidato...';
    renderCandidates();
  }
};
home.onclick=reset;
init();
