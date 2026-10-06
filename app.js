const $=id=>document.getElementById(id);
const cargoSel=$('cargo'),candSel=$('candidato'),munSel=$('municipio'),conteudo=$('conteudo'),resumo=$('resumo'),toolbar=$('toolbar'),busca=$('busca'),intro=$('intro'),voltar=$('voltar'),home=$('home');
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const pct=n=>Number(String(n??0).replace(',','.'))||0;
let catalog=null,data=null,details=null,munNames={},history=[];
const state={cand:'',mun:''}; let sort={key:'votos',dir:'desc'};

async function init(){
 [catalog,munNames]=await Promise.all([fetch('dados/catalogo.json').then(r=>r.json()),fetch('dados/municipios.json').then(r=>r.json())]);
 cargoSel.innerHTML='<option value="">Escolha o cargo</option>'+catalog.cargos.map((c,i)=>`<option value="${i}">${c.nome}</option>`).join('');
 munSel.innerHTML='<option value="">Todos os municípios</option>'+Object.entries(munNames).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
}
function reset(all=true){state.cand='';state.mun='';history=[];details=null; candSel.value='';munSel.value='';busca.value='';voltar.classList.add('hidden'); if(all){cargoSel.value='';data=null;candSel.disabled=true;munSel.disabled=true;intro.classList.remove('hidden');toolbar.classList.add('hidden');conteudo.classList.add('hidden');resumo.innerHTML='';}}
async function loadCargo(){
 busca.oninput=render;
 if(cargoSel.value===''){reset(true);return} reset(false); intro.classList.add('hidden');conteudo.classList.remove('hidden');toolbar.classList.remove('hidden');conteudo.innerHTML='<div class="loading">Carregando...</div>';
 const c=catalog.cargos[+cargoSel.value]; data=await fetch(c.arquivo).then(r=>r.json());
 candSel.disabled=false;munSel.disabled=false;
 candSel.innerHTML='<option value="">Todos os candidatos</option>'+data.candidatos.map(x=>`<option value="${x.id}">${x.numero} · ${x.urna||x.nome} · ${x.partido}</option>`).join('');
 render();
}
function snapshot(){return {cand:state.cand,mun:state.mun}}
function setState(next,push=true){busca.oninput=render;if(push && (state.cand!==next.cand||state.mun!==next.mun)) history.push(snapshot()); state.cand=next.cand||'';state.mun=next.mun||'';candSel.value=state.cand;munSel.value=state.mun;busca.value='';details=null;render();}
function currentCandidate(){return data?.candidatos.find(c=>String(c.id)===String(state.cand))}
function indicator(k){return sort.key===k?(sort.dir==='asc'?' ▲':' ▼'):''}
function toggle(k,def){if(sort.key===k)sort.dir=sort.dir==='asc'?'desc':'asc';else{sort.key=k;sort.dir=def}render();}
function nav(){voltar.classList.toggle('hidden',history.length===0);voltar.textContent='← VOLTAR';}
function titleKpis(items){resumo.innerHTML=items.map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong>${x[2]?`<div class="sub">${x[2]}</div>`:''}</div>`).join('')}
function qmatch(s){const q=busca.value.trim().toLocaleUpperCase('pt-BR');return !q||String(s).toLocaleUpperCase('pt-BR').includes(q)}
function candidateRows(arr){return arr.map((c,i)=>`<div class="row" data-cand="${c.id}"><div class="rank">${i+1}</div><div><div class="name linkname">${c.urna||c.nome}</div><div class="sub">${c.numero} · ${c.partido} · ${c.situacao||''}</div></div><div class="votes">${fmt(c.votos??c.total)}</div><div class="pct">${c.extra??''}</div></div>`).join('')}
function render(){if(!data)return; nav(); if(!state.cand&&!state.mun)return renderAllCandidates(); if(state.cand&&!state.mun)return renderCandidateMunicipios(); if(!state.cand&&state.mun)return renderMunicipioCandidates(); return renderCandidateMunicipio();}
function renderAllCandidates(){
 busca.placeholder='Buscar candidato...'; let arr=data.candidatos.filter(c=>qmatch(`${c.numero} ${c.nome} ${c.urna} ${c.partido}`)).sort((a,b)=>b.total-a.total);
 titleKpis([['CARGO',data.cargo],['CANDIDATOS',fmt(data.candidatos.length)],['ELEIÇÃO','2026','1º turno · Mato Grosso']]);
 conteudo.innerHTML=`<div class="list-title"><h2>Candidatos</h2><p>Clique no candidato para consultar os municípios onde obteve votos.</p></div><div class="table-head"><div>#</div><div>Candidato</div><div style="text-align:right">Votos MT</div><div style="text-align:right">Municípios</div></div>`+candidateRows(arr.map(c=>({...c,votos:c.total,extra:fmt(c.municipios_com_votos)})));
 bindClicks();
}
function renderCandidateMunicipios(){
 const c=currentCandidate();busca.placeholder='Buscar município...';let arr=data.resultados.filter(r=>String(r[0])===String(c.id)&&Number(r[4])>0&&qmatch(r[3]));
 arr.sort((a,b)=>sort.key==='municipio'?(sort.dir==='asc'?1:-1)*a[3].localeCompare(b[3],'pt-BR'):(sort.dir==='asc'?1:-1)*(Number(a[4])-Number(b[4])));
 titleKpis([['CANDIDATO',c.urna||c.nome,`${c.numero} · ${c.partido}`],['TOTAL MT',fmt(c.total)],['MUNICÍPIOS COM VOTOS',fmt(c.municipios_com_votos),'de 142 municípios']]);
 conteudo.innerHTML=`<div class="list-title"><h2>Votação por município</h2><p>Clique no município para detalhar Local de votação → Seção.</p></div><div class="table-head"><div>#</div><button class="sort" data-sort="municipio">Município${indicator('municipio')}</button><button class="sort right" data-sort="votos">Votos${indicator('votos')}</button><div></div></div>`+arr.map((r,i)=>`<div class="row" data-mun="${r[1]}"><div class="rank">${i+1}</div><div><div class="name linkname">${r[3]}</div><div class="sub">TSE ${r[1]}</div></div><div class="votes">${fmt(r[4])}</div><div class="pct">${r[5]}%</div></div>`).join(''); bindClicks();
}
function renderMunicipioCandidates(){
 busca.placeholder='Buscar candidato...';const cmap=new Map(data.candidatos.map(c=>[String(c.id),c]));let arr=data.resultados.filter(r=>String(r[1])===state.mun&&Number(r[4])>0).map(r=>({...cmap.get(String(r[0])),votos:Number(r[4]),extra:`${r[5]}%`})).filter(c=>c.id&&qmatch(`${c.numero} ${c.nome} ${c.urna} ${c.partido}`)).sort((a,b)=>b.votos-a.votos);
 titleKpis([['MUNICÍPIO',munNames[state.mun],`TSE ${state.mun}`],['CARGO',data.cargo],['CANDIDATOS COM VOTOS',fmt(arr.length)]]);
 conteudo.innerHTML=`<div class="list-title"><h2>Candidatos votados em ${munNames[state.mun]}</h2><p>Clique no candidato para abrir seu detalhamento neste município.</p></div><div class="table-head"><div>#</div><div>Candidato</div><div style="text-align:right">Votos</div><div style="text-align:right">%</div></div>`+candidateRows(arr);bindClicks();
}
async function renderCandidateMunicipio(){
 const c=currentCandidate();busca.placeholder='Buscar bairro ou local de votação...';titleKpis([['CANDIDATO',c.urna||c.nome,`${c.numero} · ${c.partido}`],['MUNICÍPIO',munNames[state.mun]],['TOTAL NO MUNICÍPIO',fmt((data.resultados.find(r=>String(r[0])===state.cand&&String(r[1])===state.mun)||[])[4]||0)]]);
 conteudo.innerHTML='<div class="loading">Carregando detalhamento territorial...</div>';
 if(!details){const cf=catalog.cargos[+cargoSel.value];details=await fetch(cf.detalhes).then(r=>r.json())}
 const allRows=(details[state.cand]?.[state.mun]||[]);
 let territorialTab='bairro';
 function localGroups(rows){
  const groups=new Map();for(const r of rows){const k=`${r[3]}|${r[0]}`;if(!groups.has(k))groups.set(k,{z:r[3],l:r[0],n:r[1],b:r[2]||'SEM BAIRRO INFORMADO',v:0,s:[]});const g=groups.get(k);g.v+=Number(r[5]);g.s.push(r)}
  return [...groups.values()].sort((a,b)=>b.v-a.v||a.n.localeCompare(b.n,'pt-BR'));
 }
 function sections(g){return `<div class="sections hidden">${g.s.sort((a,b)=>Number(a[4])-Number(b[4])).map(s=>`<div class="section-row"><span>Seção ${s[4]}</span><strong>${fmt(s[5])} votos</strong></div>`).join('')}</div>`}
 function localBlock(g){return `<div class="local-block"><div class="local-row toggle-next"><div><div class="name linkname">${g.n||'Local '+g.l}</div><div class="sub">Local ${g.l} · Zona ${g.z} · ${g.b}</div></div><div class="votes">${fmt(g.v)} votos <span class="chev">⌄</span></div></div>${sections(g)}</div>`}
 function draw(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  const rows=allRows.filter(r=>!q||`${r[2]} ${r[1]} ${r[0]}`.toLocaleUpperCase('pt-BR').includes(q));
  const gs=localGroups(rows);
  const bairroMap=new Map();for(const g of gs){const b=g.b||'SEM BAIRRO INFORMADO';if(!bairroMap.has(b))bairroMap.set(b,{b,v:0,locais:[]});const x=bairroMap.get(b);x.v+=g.v;x.locais.push(g)}
  const bairros=[...bairroMap.values()].sort((a,b)=>b.v-a.v||a.b.localeCompare(b.b,'pt-BR'));
  const body=territorialTab==='bairro' ? (bairros.length?bairros.map(x=>`<div class="bairro-block"><div class="bairro-row toggle-next"><div><div class="name linkname">${x.b}</div><div class="sub">${x.locais.length} local(is)</div></div><div class="votes">${fmt(x.v)} <span class="chev">⌄</span></div></div><div class="bairro-locais hidden">${x.locais.map(localBlock).join('')}</div></div>`).join(''):'<div class="empty">Nenhum bairro encontrado.</div>') : (gs.length?gs.map(localBlock).join(''):'<div class="empty">Nenhum local encontrado.</div>');
  conteudo.innerHTML=`<div class="list-title"><h2>Detalhamento territorial</h2><p>Bairro → Local de votação → Seção</p></div><div class="territorial-tabs"><button data-tab="bairro" class="${territorialTab==='bairro'?'active':''}">🏘️ Bairros</button><button data-tab="local" class="${territorialTab==='local'?'active':''}">🏫 Locais de votação</button></div>${body}`;
  conteudo.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>{territorialTab=x.dataset.tab;draw()});
  conteudo.querySelectorAll('.toggle-next').forEach(x=>x.onclick=()=>{const next=x.nextElementSibling;if(next)next.classList.toggle('hidden')});
 }
 draw();
 busca.oninput=draw;
}
function bindClicks(){conteudo.querySelectorAll('[data-cand]').forEach(x=>x.onclick=()=>setState({cand:x.dataset.cand,mun:state.mun}));conteudo.querySelectorAll('[data-mun]').forEach(x=>x.onclick=()=>setState({cand:state.cand,mun:x.dataset.mun}));conteudo.querySelectorAll('[data-sort]').forEach(x=>x.onclick=()=>toggle(x.dataset.sort,x.dataset.sort==='municipio'?'asc':'desc'));}
cargoSel.onchange=loadCargo;candSel.onchange=()=>setState({cand:candSel.value,mun:state.mun});munSel.onchange=()=>setState({cand:state.cand,mun:munSel.value});busca.oninput=render;
voltar.onclick=()=>{if(!history.length)return;const s=history.pop();state.cand=s.cand;state.mun=s.mun;candSel.value=state.cand;munSel.value=state.mun;busca.value='';details=null;render()};home.onclick=()=>reset(true);init();
