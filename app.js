/* ═══════════════════════════════════════════════════════
   BHARGAVA PHYTOLAB — Sales Command Center v5
   app.js — Full application logic
   
   ▸ REPLACE API_URL BELOW WITH YOUR DEPLOYED WEB APP URL
══════════════════════════════════════════════════════ */

const API_URL = "https://script.google.com/macros/s/AKfycbyiGH9qP6URop3x61QMC8V9GXjAE9o3mjKqoym9zMVHoyoE33OPtlbijGCvsE-BmQbPCg/exec";

// ── State ────────────────────────────────────────────
let G = {
  emp:"", desg:"", isSeller:false,
  products:[], targets:[],
  tree:null, fsoNode:null,
  fsoTab:"pob",
  activeZone:"all",
  modalNode:null, modalTab:"sum"
};

// ── Zone tab definitions ─────────────────────────────
const ZONE_DEFS = [
  {id:"all",   label:"All Zones",     zones:null},
  {id:"ez",    label:"East Zone",     zones:["EAST ZONE-1","EAST ZONE-2","EAST ZONE-3"]},
  {id:"nz12",  label:"North Zone 1-2",zones:["NORTH ZONE-1","NORTH ZONE-2"]},
  {id:"nz34",  label:"North Zone 3-4",zones:["NORTH ZONE-3","NORTH ZONE-4"]},
  {id:"sz",    label:"South Zone",    zones:["SOUTH ZONE-1"]},
  {id:"wz",    label:"West Zone",     zones:["WEST ZONE-1","WEST ZONE-2"]},
];

// ── Helpers ──────────────────────────────────────────
const sum   = a => (a||[]).reduce((t,v)=>t+(isNaN(+v)?0:+v||0),0);
const pct   = (a,t) => t>0 ? Math.min(999,Math.round(a/t*100)) : 0;
const fmt   = n => (n||0).toLocaleString("en-IN");
const clamp = v => isNaN(+v)?0:Math.max(0,+v||0);

function roleClass(d){
  const m={GM:"rb-GM",SM:"rb-SM",ZSM:"rb-ZSM",RSM:"rb-RSM",DRSM:"rb-DRSM",ASM:"rb-ASM"};
  return m[String(d||"").replace(/[\s.]/g,"").toUpperCase()] || "rb-FSO";
}

function statusTag(s){
  if(s==="VACANT") return `<span class="sv">● Vacant</span>`;
  if(s==="STOP")   return `<span class="sv st">● Stop</span>`;
  return "";
}

function isSeller(d){
  return ["FSO","SR. FSO","SR.FSO","BDE"].indexOf(String(d||"").trim().toUpperCase())!==-1;
}

function nodeInZones(node, zones){
  if(!zones) return true;
  if(zones.indexOf(node.zone)!==-1) return true;
  return (node.children||[]).some(c=>nodeInZones(c,zones));
}

// ── API ──────────────────────────────────────────────
async function api(params){
  const qs = Object.entries(params)
    .map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&");
  const res  = await fetch(API_URL+"?"+qs,{method:"GET",redirect:"follow"});
  const text = await res.text();
  const clean= text.trim().replace(/^[a-zA-Z_$][\w$]*\s*\(/,"").replace(/\);\s*$/,"");
  return JSON.parse(clean);
}

// ══════════════ LOGIN ══════════════
async function doLogin(){
  const emp  = document.getElementById("empCode").value.trim().toUpperCase();
  const pass = document.getElementById("password").value.trim();
  const btn  = document.getElementById("loginBtn");
  const err  = document.getElementById("loginErr");

  if(!emp||!pass){err.textContent="EMP Code aur Password daalein.";return;}
  btn.classList.add("loading");
  document.getElementById("loginTxt").textContent="Logging in…";
  err.textContent="";

  try{
    const d = await api({action:"login", emp, password:pass});
    if(d.status!=="success"){
      err.textContent=d.message||"Login failed.";
      btn.classList.remove("loading");
      document.getElementById("loginTxt").textContent="Login →";
      return;
    }

    G.emp=emp; G.desg=d.designation; G.isSeller=d.isSeller;
    G.products=d.products; G.targets=d.targets; G.tree=d.tree;

    document.getElementById("loginPage").style.display="none";
    document.getElementById("app").style.display="flex";

    document.getElementById("tbName").textContent=d.tree.name;
    document.getElementById("tbMeta").textContent=
      d.designation+(d.tree.hq?" · "+d.tree.hq:"")+(d.tree.zone?" · "+d.tree.zone:"");

    updTopbar(d.tree);
    d.isSeller ? initFso(d.tree) : initMgr(d.tree);

  }catch(e){
    err.textContent="Connection error — check internet / Apps Script URL.";
    console.error(e);
    btn.classList.remove("loading");
    document.getElementById("loginTxt").textContent="Login →";
  }
}

function updTopbar(node){
  document.getElementById("tbPob").textContent=fmt(node.rollPob||node.pobTotal||0);
  document.getElementById("tbSec").textContent=fmt(node.rollSec||node.secTotal||0);
  document.getElementById("tbDef").textContent=fmt(node.rollDef||node.defTotal||0);
}

// ══════════════ FSO VIEW ══════════════
function initFso(node){
  G.fsoNode=node; G.fsoTab="pob";
  document.getElementById("fsoView").style.display="block";
  renderFsoKpis();
  renderFsoTable();
}

function setFsoTab(tab){
  G.fsoTab=tab;
  document.querySelectorAll(".tab-pills .pill").forEach(b=>{
    b.classList.toggle("active", b.dataset.t===tab);
  });
  document.getElementById("fsoTabTitle").textContent=
    tab==="pob"?"POB Entry":tab==="sec"?"Secondary Sale Entry":"Stock Entry";
  renderFsoTable();
}

function renderFsoKpis(){
  const n=G.fsoNode, tgt=sum(G.targets);
  const pob=n.pobTotal||0, sec=n.secTotal||0, def=n.defTotal||0;
  const p=pct(pob,tgt);
  document.getElementById("fsoKpis").innerHTML=`
    <div class="kpi"><div class="kl">Target (POB)</div><div class="kv">${fmt(tgt)}</div><div class="ks">22 products</div></div>
    <div class="kpi ${p>=100?"":p>=60?"am":"rd"}"><div class="kl">POB Achieved</div><div class="kv">${fmt(pob)}</div><div class="ks">${p}% of target</div></div>
    <div class="kpi bl"><div class="kl">Secondary Sale</div><div class="kv">${fmt(sec)}</div><div class="ks">Offtake</div></div>
    <div class="kpi rd"><div class="kl">Deficit</div><div class="kv">${fmt(def)}</div><div class="ks">Remaining</div></div>`;
}

function renderFsoTable(){
  const node=G.fsoNode, tab=G.fsoTab;
  const ach=tab==="pob"?node.pob:tab==="sec"?node.secondary:node.stock;
  const tgts=G.targets;
  let rows="", tA=0, tT=0, tD=0;

  G.products.forEach((p,i)=>{
    const t=tgts[i]||0, a=ach[i]||0;
    const def=Math.max(0,t-a), pp=pct(a,t);
    const pc=tab!=="stock"?(pp>=100?"grn":pp>=60?"amb":"red"):"";
    const pb=tab!=="stock"?(pp>=100?"":"w"):"";
    tA+=a; tT+=t; tD+=def;
    rows+=`<tr>
      <td class="mono">${i+1}</td>
      <td class="tl">${p}</td>
      <td class="mono">${tab!=="stock"?fmt(t):"—"}</td>
      <td class="mono" id="ach-${i}">${fmt(a)}</td>
      <td><input type="number" class="add" id="add-${i}" value="0" min="0" oninput="liveCalc(${i})"></td>
      <td class="mono ${tab!=="stock"?"red":""}" id="def-${i}">${tab!=="stock"?fmt(def):"—"}</td>
      <td class="${pc}" id="pct-${i}">${tab!=="stock"?pp+"%":"—"}</td>
    </tr>`;
  });

  document.getElementById("fsoBody").innerHTML=rows;
  document.getElementById("fsoFoot").innerHTML=`<tr>
    <td colspan="2" style="text-align:left">TOTAL</td>
    <td>${tab!=="stock"?fmt(tT):"—"}</td>
    <td>${fmt(tA)}</td><td>—</td>
    <td style="color:var(--r5)">${tab!=="stock"?fmt(tD):"—"}</td><td>—</td>
  </tr>`;
}

function liveCalc(i){
  const tab=G.fsoTab;
  if(tab==="stock") return;
  const node=G.fsoNode;
  const ach=(tab==="pob"?node.pob:node.secondary)[i]||0;
  const add=clamp(document.getElementById("add-"+i)?.value||0);
  const nv=ach+add, t=G.targets[i]||0;
  const def=Math.max(0,t-nv), pp=pct(nv,t);
  const de=document.getElementById("def-"+i), pe=document.getElementById("pct-"+i);
  if(de) de.textContent=fmt(def);
  if(pe){
    pe.textContent=pp+"%";
    pe.className=pp>=100?"grn":pp>=60?"amb":"red";
  }
}

async function saveFso(){
  const node=G.fsoNode, tab=G.fsoTab;
  const src=tab==="pob"?node.pob:tab==="sec"?node.secondary:node.stock;
  const vals=src.map((v,i)=>(v||0)+clamp(document.getElementById("add-"+i)?.value||0));
  const msg=document.getElementById("saveMsg");

  msg.textContent="Saving…"; msg.style.color="var(--gy5)";
  try{
    const action=tab==="pob"?"savePob":tab==="sec"?"saveSecondary":"saveStock";
    const res=await api({action, emp:G.emp, data:JSON.stringify(vals)});
    if(res.status==="success"){
      if(tab==="pob"){node.pob=vals;node.pobTotal=sum(vals);node.deficit=G.targets.map((t,i)=>Math.max(0,t-(vals[i]||0)));node.defTotal=sum(node.deficit);}
      if(tab==="sec"){node.secondary=vals;node.secTotal=sum(vals);}
      if(tab==="stock"){node.stock=vals;node.stkTotal=sum(vals);}
      updTopbar(node);
      renderFsoKpis();
      renderFsoTable();
      msg.textContent="✓ Saved at "+new Date().toLocaleTimeString();
      msg.style.color="var(--g5)";
    } else {
      msg.textContent="❌ "+res.message; msg.style.color="var(--r5)";
    }
  }catch(e){
    msg.textContent="❌ Network error. Retry."; msg.style.color="var(--r5)";
  }
}

// ══════════════ MANAGER VIEW ══════════════
function initMgr(tree){
  document.getElementById("mgrView").style.display="block";
  const isGM=["GM"].indexOf(String(G.desg).toUpperCase())!==-1;
  const isSM=["SM","ZSM"].indexOf(String(G.desg).replace(/[\s.]/g,"").toUpperCase())!==-1;

  if(isGM||isSM){
    const zt=document.getElementById("zoneTabs");
    zt.style.display="flex";
    zt.innerHTML=ZONE_DEFS.map(z=>
      `<button class="ztab${z.id==="all"?" active":""}" data-z="${z.id}" onclick="selZone('${z.id}')">${z.label}</button>`
    ).join("");
  }

  document.getElementById("treeTitle").textContent=G.desg+" → Team Hierarchy";
  renderMgrKpis();
  renderTree();
}

function selZone(zid){
  G.activeZone=zid;
  document.querySelectorAll(".ztab").forEach(b=>b.classList.toggle("active",b.dataset.z===zid));
  renderMgrKpis();
  renderTree();
}

function flatFsos(node){
  const zd=ZONE_DEFS.find(z=>z.id===G.activeZone);
  const zones=zd&&zd.zones?zd.zones:null;
  function collect(n){
    const arr=[];
    if(isSeller(n.designation)){
      if(!zones||zones.indexOf(n.zone)!==-1) arr.push(n);
    }
    (n.children||[]).forEach(c=>arr.push(...collect(c)));
    return arr;
  }
  return collect(node);
}

function renderMgrKpis(){
  const fsos=flatFsos(G.tree).filter(n=>n.status==="PRESENT");
  const tPob=fsos.reduce((a,n)=>a+(n.pobTotal||0),0);
  const tSec=fsos.reduce((a,n)=>a+(n.secTotal||0),0);
  const tTgt=fsos.length*sum(G.targets);
  const tDef=Math.max(0,tTgt-tPob), p=pct(tPob,tTgt);

  document.getElementById("mgrKpis").innerHTML=`
    <div class="kpi"><div class="kl">Active FSOs</div><div class="kv">${fsos.length}</div><div class="ks">Present</div></div>
    <div class="kpi ${p>=100?"":p>=60?"am":"rd"}"><div class="kl">Total POB</div><div class="kv">${fmt(tPob)}</div><div class="ks">${p}% of ${fmt(tTgt)}</div></div>
    <div class="kpi bl"><div class="kl">Secondary Sales</div><div class="kv">${fmt(tSec)}</div><div class="ks">Offtake</div></div>
    <div class="kpi rd"><div class="kl">Total Deficit</div><div class="kv">${fmt(tDef)}</div><div class="ks">Units remaining</div></div>`;
}

// ── Tree rendering ──
function renderTree(){
  const box=document.getElementById("treeBox");
  box.innerHTML="";
  const zd=ZONE_DEFS.find(z=>z.id===G.activeZone);
  const zones=zd&&zd.zones?zd.zones:null;

  const kids=(G.tree.children||[]).filter(c=>!zones||nodeInZones(c,zones));
  if(!kids.length){
    box.innerHTML=`<p style="color:var(--gy5);padding:20px">No data for selected zone.</p>`;
    return;
  }
  kids.sort((a,b)=>(b.rollPob||0)-(a.rollPob||0))
      .forEach(k=>box.appendChild(buildNode(k,zones)));
}

function buildNode(node, zoneFilter){
  const wrap=document.createElement("div");
  wrap.className="tn";
  wrap.dataset.name=(node.name||"").toLowerCase();
  wrap.dataset.hq=(node.hq||"").toLowerCase();

  const leaf=isSeller(node.designation);
  const hasKids=!leaf&&(node.children||[]).length>0;
  const pob=node.rollPob||node.pobTotal||0;
  const def=node.rollDef||node.defTotal||0;
  const tgt=node.fsoCount*sum(G.targets)||sum(G.targets);
  const p=pct(pob,tgt);
  const rc=roleClass(node.designation);

  const card=document.createElement("div");
  card.className="nc";
  card.innerHTML=`
    <div class="tog">${hasKids?"+":leaf?"⊞":"·"}</div>
    <span class="rbadge ${rc}">${node.designation}</span>
    <div class="ni">
      <div class="nn">${node.name}${statusTag(node.status)}</div>
      <div class="nm">${node.hq||""}${node.empCode?" · "+node.empCode:""} · ${node.zone||""}</div>
    </div>
    <div class="ns">
      <div class="nk"><span>FSOs</span><b>${node.fsoCount}</b></div>
      <div class="nk ${p>=100?"g":p>=60?"a":"r"}"><span>POB%</span><b>${p}%</b></div>
      <div class="nk"><span>POB</span><b>${fmt(pob)}</b></div>
      <div class="nk r"><span>Deficit</span><b>${fmt(def)}</b></div>
    </div>
    <button class="nd-btn" onclick="event.stopPropagation();openModal('${node.empCode||""}')">Details</button>`;

  card._node=node;
  wrap.appendChild(card);

  let cw=null;
  if(hasKids){
    cw=document.createElement("div"); cw.className="cw";
    (node.children||[])
      .filter(c=>!zoneFilter||nodeInZones(c,zoneFilter))
      .sort((a,b)=>(b.rollPob||0)-(a.rollPob||0))
      .forEach(k=>cw.appendChild(buildNode(k,zoneFilter)));
    wrap.appendChild(cw);
  } else if(leaf){
    cw=document.createElement("div"); cw.className="cw";
    cw.appendChild(buildLeafTable(node));
    wrap.appendChild(cw);
    card.querySelector(".tog").textContent="⊞";
  }

  if(cw){
    card.addEventListener("click",e=>{
      if(e.target.closest(".nd-btn")) return;
      const open=cw.classList.toggle("open");
      card.classList.toggle("open",open);
      card.querySelector(".tog").textContent=open?"−":leaf?"⊞":"+";
    });
  }

  return wrap;
}

function buildLeafTable(node){
  const tbl=document.createElement("table");
  tbl.className="m-table"; tbl.style.margin="8px 0 4px";
  let rows="";
  G.products.forEach((p,i)=>{
    const t=G.targets[i]||0, a=node.pob[i]||0;
    const s=node.secondary?node.secondary[i]||0:0;
    const def=Math.max(0,t-a), pp=pct(a,t);
    rows+=`<tr><td>${p}</td><td>${fmt(t)}</td><td>${fmt(a)}</td><td>${fmt(s)}</td>
      <td class="dc">${fmt(def)}</td><td class="${pp>=100?"grn":pp>=60?"amb":"red"}">${pp}%</td></tr>`;
  });
  rows+=`<tfoot><tr><td>TOTAL</td><td>${fmt(sum(G.targets))}</td><td>${fmt(node.pobTotal)}</td>
    <td>${fmt(node.secTotal)}</td><td class="dc">${fmt(node.defTotal)}</td><td></td></tr></tfoot>`;
  tbl.innerHTML=`<thead><tr>
    <th style="text-align:left">Product</th><th>Target</th>
    <th>POB</th><th>2° Sale</th><th>Deficit</th><th>%</th>
  </tr></thead><tbody>${rows}</tbody>`;
  return tbl;
}

// ── Search ──
function filterTree(){
  const q=document.getElementById("srch").value.toLowerCase().trim();
  document.querySelectorAll(".tn").forEach(el=>{
    el.style.display=(!q||el.dataset.name.includes(q)||el.dataset.hq.includes(q))?"":"none";
  });
}

function expandAll(){
  document.querySelectorAll(".cw").forEach(el=>{
    el.classList.add("open");
    const c=el.previousSibling;
    if(c&&c.classList){c.classList.add("open");const t=c.querySelector(".tog");if(t)t.textContent="−";}
  });
}

function collapseAll(){
  document.querySelectorAll(".cw").forEach(el=>{
    el.classList.remove("open");
    const c=el.previousSibling;
    if(c&&c.classList){c.classList.remove("open");const t=c.querySelector(".tog");if(t)t.textContent="+";}
  });
}

// ══════════════ MODAL ══════════════
function findNode(emp, node){
  if(!node) return null;
  if(String(node.empCode||"")=== emp) return node;
  for(const c of(node.children||[])){const f=findNode(emp,c);if(f)return f;}
  return null;
}

function openModal(empCode){
  const node=empCode?findNode(empCode,G.tree):null;
  if(!node) return;
  G.modalNode=node; G.modalTab="sum";
  document.getElementById("mName").textContent=node.name;
  document.getElementById("mSub").textContent=
    node.designation+" · "+(node.hq||"")+" · "+(node.zone||"");
  document.querySelectorAll(".mt").forEach(b=>b.classList.toggle("active",b.dataset.tab==="sum"));
  renderModal("sum");
  document.getElementById("modal").style.display="flex";
}

function modalBg(e){ if(e.target.id==="modal") closeModal(); }
function closeModal(){ document.getElementById("modal").style.display="none"; }

function mTab(btn, tab){
  G.modalTab=tab;
  document.querySelectorAll(".mt").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  renderModal(tab);
}

function renderModal(tab){
  const node=G.modalNode, body=document.getElementById("mBody");
  const pob=node.rollPob||node.pobTotal||0;
  const sec=node.rollSec||node.secTotal||0;
  const def=node.rollDef||node.defTotal||0;
  const tgt=node.fsoCount?node.fsoCount*sum(G.targets):sum(G.targets);
  const p=pct(pob,tgt);

  if(tab==="sum"){
    body.innerHTML=`
      <div class="m-grid">
        <div class="ms"><span>Target (POB)</span><b>${fmt(tgt)}</b></div>
        <div class="ms ${p>=100?"gn":p>=60?"":"rd"}"><span>POB Achieved</span><b>${fmt(pob)}</b></div>
        <div class="ms"><span>Secondary Sales</span><b>${fmt(sec)}</b></div>
        <div class="ms rd"><span>Deficit</span><b>${fmt(def)}</b></div>
        ${!isSeller(node.designation)?`<div class="ms"><span>Total FSOs</span><b>${node.fsoCount}</b></div>`:""}
        <div class="ms ${p>=100?"gn":p>=60?"am":"rd"}"><span>Achievement %</span><b>${p}%</b></div>
      </div>
      <div class="prog" style="margin-bottom:14px;height:8px">
        <div class="prog-b ${p>=100?"":"w"}" style="width:${Math.min(p,100)}%"></div>
      </div>`;
  }

  else if(tab==="prod"){
    if(!node.pob){body.innerHTML=`<p style="color:var(--gy5)">Product data available for FSOs only.</p>`;return;}
    let rows="";
    G.products.forEach((pr,i)=>{
      const t=G.targets[i]||0, a=node.pob[i]||0;
      const s=node.secondary?node.secondary[i]||0:0;
      const sk=node.stock?node.stock[i]||0:0;
      const def2=Math.max(0,t-a), pp=pct(a,t);
      rows+=`<tr>
        <td>${pr}</td><td>${fmt(t)}</td><td>${fmt(a)}</td>
        <td>${fmt(s)}</td><td>${fmt(sk)}</td>
        <td class="dc">${fmt(def2)}</td>
        <td style="min-width:80px">
          <div style="font-size:10.5px;margin-bottom:2px;color:${pp>=100?"var(--g5)":pp>=60?"var(--a5)":"var(--r5)"}">${pp}%</div>
          <div class="prog"><div class="prog-b ${pp>=100?"":"w"}" style="width:${Math.min(pp,100)}%"></div></div>
        </td></tr>`;
    });
    const tA=node.pobTotal||0,tS=node.secTotal||0,tSk=node.stkTotal||0;
    const tT2=sum(G.targets),tD2=Math.max(0,tT2-tA),tp=pct(tA,tT2);
    body.innerHTML=`<div style="overflow-x:auto"><table class="m-table">
      <thead><tr>
        <th style="text-align:left">Product</th>
        <th>Target</th><th>POB</th><th>2° Sale</th>
        <th>Stock</th><th>Deficit</th><th>%</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td>TOTAL</td><td>${fmt(tT2)}</td><td>${fmt(tA)}</td>
        <td>${fmt(tS)}</td><td>${fmt(tSk)}</td>
        <td class="dc">${fmt(tD2)}</td><td>${tp}%</td>
      </tr></tfoot>
    </table></div>`;
  }

  else if(tab==="team"){
    const kids=node.children||[];
    if(!kids.length){body.innerHTML=`<p style="color:var(--gy5)">No direct reportees.</p>`;return;}
    const items=kids
      .sort((a,b)=>(b.rollPob||b.pobTotal||0)-(a.rollPob||a.pobTotal||0))
      .map(k=>{
        const kp=k.rollPob||k.pobTotal||0;
        const kt=k.fsoCount*sum(G.targets)||sum(G.targets);
        const kpc=pct(kp,kt);
        return `<li class="ti">
          <div>
            <div class="ti-name">${k.name}${statusTag(k.status)}</div>
            <div class="ti-meta">${k.designation} · ${k.hq||""} · FSOs: ${k.fsoCount}</div>
          </div>
          <div>
            <div class="ti-pob">${fmt(kp)}</div>
            <div class="ti-pct" style="color:${kpc>=100?"var(--g5)":kpc>=60?"var(--a5)":"var(--r5)"}">${kpc}% of tgt</div>
          </div>
        </li>`;
      }).join("");
    body.innerHTML=`<ul class="team-ul">${items}</ul>`;
  }

  else if(tab==="info"){
    const fields=[
      ["EMP Code",node.empCode],["Designation",node.designation],
      ["HQ",node.hq],["Zone",node.zone],["State",node.state],
      ["Mobile",node.mobile],["Email",node.email],["DOJ",node.doj],
      ["ASM",node.asm],["RSM",node.rsm],["ZSM",node.zsm],["SM",node.sm],
    ].filter(([,v])=>v&&v!=="-"&&v!=="");
    body.innerHTML=`<div class="info-grid">${
      fields.map(([l,v])=>`<div class="ig"><span>${l}</span><b>${v}</b></div>`).join("")
    }</div>`;
  }
}

// ══════════════ LOGOUT ══════════════
function logout(){
  G={emp:"",desg:"",isSeller:false,products:[],targets:[],tree:null,fsoNode:null,
     fsoTab:"pob",activeZone:"all",modalNode:null,modalTab:"sum"};
  document.getElementById("app").style.display="none";
  document.getElementById("loginPage").style.display="flex";
  document.getElementById("fsoView").style.display="none";
  document.getElementById("mgrView").style.display="none";
  document.getElementById("modal").style.display="none";
  document.getElementById("empCode").value="";
  document.getElementById("password").value="";
  document.getElementById("loginErr").textContent="";
  document.getElementById("loginBtn").classList.remove("loading");
  document.getElementById("loginTxt").textContent="Login →";
}

// ══════════════ KEYBOARD ══════════════
document.addEventListener("DOMContentLoaded",()=>{
  ["empCode","password"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener("keydown",e=>{ if(e.key==="Enter") doLogin(); });
  });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); });
});
