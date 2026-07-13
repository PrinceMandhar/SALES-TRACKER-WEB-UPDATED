/*
 ╔══════════════════════════════════════════════════════════════╗
 ║   BHARGAVA PHYTOLAB — SALES COMMAND CENTER v5               ║
 ║   Google Apps Script Backend                                 ║
 ║   Sheets: Hierarchy | POB | Secondary Sales | Stock | Passwords ║
 ╚══════════════════════════════════════════════════════════════╝

  HIERARCHY SHEET COLUMNS (A–T):
   A: HQ CODE   B: STATUS    C: EMP CODE   D: NAME      E: MAIN HQ
   F: NEW HQ    G: DESIGN    H: DOJ        I: MOB       J: EMAIL
   K: IMMEDIATE REPORTING MANAGER
   L: ASM  M: RSM  N: ZSM  O: SM  P: GM
   Q: STATE  R: DIVISION  S: ZONE  T: PASSWORD

  POB / Secondary Sales / Stock COLUMNS:
   A: HQ CODE  B: EMP CODE  C: NAME  D: HQ  ... H–AC: 22 product values

  PASSWORDS SHEET (optional override):
   A: EMP CODE  B: NAME  C: DESIGNATION  D: PASSWORD
   Default password = EMP CODE if not in Passwords sheet.

  Login: EMP CODE + PASSWORD (default = EMP CODE)
  Tree built from col K (IMMEDIATE REPORTING MANAGER)
*/

var PRODUCTS = [
  "SPONDIN 30ML","ORAL SPRAY","TUMORIN 30ML","Garcinia Cambogia",
  "Gas Off","Kidflame","DIACARDIAC GOLD PLUS","Meniphib",
  "Osteo Strong","SCIAATI 30ML","Artharal","Lumboral",
  "Ague Nil","Neuro-Fit Forte","ONSTI","FRESH GEL",
  "MT 30ML","Ferroglob","Aciset","ANGEL GLOSS","OVINORM","SKEDIN Drops"
];

var TARGETS = [576,50,144,144,288,144,400,144,144,144,144,144,144,144,144,144,1000,144,144,144,144,144];

var SELLER_ROLES = ["FSO","SR. FSO","SR.FSO","BDE"];

// ─────────────────────────────────────────────────────────
function doGet(e) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hierSheet  = ss.getSheetByName("Hierarchy");
  var pobSheet   = ss.getSheetByName("POB");
  var secSheet   = ss.getSheetByName("Secondary Sales");
  var stockSheet = ss.getSheetByName("Stock");
  var pwSheet    = ss.getSheetByName("Passwords"); // optional

  function send(obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function ct(v) { return String(v||"").trim().replace(/\s+/g," ").toLowerCase(); }
  function num(v){ return isNaN(Number(v))?0:Number(v)||0; }
  function sumArr(a){ var t=0; (a||[]).forEach(function(v){t+=num(v);}); return t; }
  function isSeller(d){ return SELLER_ROLES.indexOf(String(d||"").trim().toUpperCase())!==-1; }

  var action = (e&&e.parameter&&e.parameter.action)||"";

  // ── Sheet guard ──
  var missing=[];
  if(!hierSheet)  missing.push("Hierarchy");
  if(!pobSheet)   missing.push("POB");
  if(!secSheet)   missing.push("Secondary Sales");
  if(!stockSheet) missing.push("Stock");
  if(missing.length) return send({status:"error",message:"Missing sheets: "+missing.join(", ")});

  // ── Product data map (empCode → 22 values) ──
  function productMap(sheet){
    var map={}, rows=sheet.getDataRange().getValues();
    for(var i=1;i<rows.length;i++){
      var emp=ct(rows[i][1]);
      if(!emp||emp==="emp code") continue;
      map[emp]=rows[i].slice(7,29).map(num);
    }
    return map;
  }

  // ── Password map ──
  function buildPwMap(){
    var map={};
    if(!pwSheet) return map;
    var rows=pwSheet.getDataRange().getValues();
    for(var i=1;i<rows.length;i++){
      var emp=String(rows[i][0]||"").trim();
      var pw =String(rows[i][3]||"").trim();
      if(emp) map[emp.toLowerCase()]=pw||emp;
    }
    return map;
  }

  // ── Load people from Hierarchy sheet ──
  var hRows=hierSheet.getDataRange().getValues(), people=[];
  for(var i=1;i<hRows.length;i++){
    var r=hRows[i];
    var nm=String(r[3]||"").trim();
    if(!nm||nm==="NAME") continue;
    people.push({
      hqCode:  String(r[0]||"").trim(),
      status:  String(r[1]||"").trim(),
      empCode: String(r[2]||"").trim(),
      name:    nm,
      mainHQ:  String(r[4]||"").trim(),
      newHQ:   String(r[5]||"").trim(),
      design:  String(r[6]||"").trim(),
      doj:     String(r[7]||"").trim(),
      mobile:  String(r[8]||"").trim(),
      email:   String(r[9]||"").trim(),
      manager: String(r[10]||"").trim(),
      asm:     String(r[11]||"").trim(),
      rsm:     String(r[12]||"").trim(),
      zsm:     String(r[13]||"").trim(),
      sm:      String(r[14]||"").trim(),
      gm:      String(r[15]||"").trim(),
      state:   String(r[16]||"").trim(),
      division:String(r[17]||"").trim(),
      zone:    String(r[18]||"").trim(),
      password:String(r[19]||"").trim()
    });
  }

  // ── Children index (manager name → array of people) ──
  var kidMap={};
  people.forEach(function(p){
    var mk=ct(p.manager);
    if(!mk||mk==="-"||mk==="") return;
    if(!kidMap[mk]) kidMap[mk]=[];
    kidMap[mk].push(p);
  });

  // ── Recursive tree builder ──
  function buildNode(p,pobM,secM,stkM){
    var ek=ct(p.empCode);
    var desg=String(p.design||"").trim().toUpperCase();
    var node={
      empCode:p.empCode, name:p.name, designation:p.design,
      hq:p.newHQ||p.mainHQ, status:p.status,
      zone:p.zone, state:p.state,
      mobile:p.mobile, email:p.email, doj:p.doj,
      asm:p.asm, rsm:p.rsm, zsm:p.zsm, sm:p.sm,
      children:[]
    };

    if(isSeller(desg)){
      node.pob       = pobM[ek]  || TARGETS.map(function(){return 0;});
      node.secondary = secM[ek]  || TARGETS.map(function(){return 0;});
      node.stock     = stkM[ek]  || TARGETS.map(function(){return 0;});
      node.targets   = TARGETS;
      node.pobTotal  = sumArr(node.pob);
      node.secTotal  = sumArr(node.secondary);
      node.stkTotal  = sumArr(node.stock);
      node.tgtTotal  = sumArr(TARGETS);
      node.deficit   = TARGETS.map(function(t,i){return Math.max(0,t-(node.pob[i]||0));});
      node.defTotal  = sumArr(node.deficit);
    }

    var kids=kidMap[ct(p.name)]||[];
    var rPob=0,rSec=0,rStk=0,rDef=0;
    kids.forEach(function(k){
      var ch=buildNode(k,pobM,secM,stkM);
      node.children.push(ch);
      rPob+=ch.rollPob||0; rSec+=ch.rollSec||0;
      rStk+=ch.rollStk||0; rDef+=ch.rollDef||0;
    });

    node.rollPob=(node.pobTotal||0)+rPob;
    node.rollSec=(node.secTotal||0)+rSec;
    node.rollStk=(node.stkTotal||0)+rStk;

    function cFso(n){
      var c=isSeller(String(n.designation||"").toUpperCase())?1:0;
      (n.children||[]).forEach(function(ch){c+=cFso(ch);});
      return c;
    }
    node.fsoCount=cFso(node);
    node.rollTgt =node.fsoCount*sumArr(TARGETS);
    node.rollDef =Math.max(0,node.rollTgt-node.rollPob);
    return node;
  }

  // ══════════ LOGIN ══════════
  if(action==="login"){
    var empIn=ct(e.parameter.emp||"");
    var pwIn =String(e.parameter.password||"").trim();

    // Find person
    var person=null;
    for(var i=0;i<people.length;i++){
      if(ct(people[i].empCode)===empIn){person=people[i];break;}
    }
    if(!person) return send({status:"fail",message:"EMP Code not found"});

    // Verify password: check Passwords sheet first, then fall back to empCode
    var pwMap=buildPwMap();
    var expPw=pwMap[empIn]||(person.password&&person.password!==""?person.password:person.empCode);
    if(String(expPw).trim()!==pwIn) return send({status:"fail",message:"Incorrect Password"});

    var pobM=productMap(pobSheet);
    var secM=productMap(secSheet);
    var stkM=productMap(stockSheet);
    var tree=buildNode(person,pobM,secM,stkM);

    return send({
      status:"success",
      products:PRODUCTS, targets:TARGETS,
      designation:person.design,
      isSeller:isSeller(String(person.design||"").trim().toUpperCase()),
      tree:tree
    });
  }

  // ══════════ SAVE HELPERS ══════════
  function saveRows(sheet,emp,values,startCol){
    var rows=sheet.getDataRange().getValues(),row=-1;
    for(var i=1;i<rows.length;i++){
      if(ct(rows[i][1])===emp){row=i+1;break;}
    }
    if(row===-1){row=sheet.getLastRow()+1;sheet.getRange(row,2).setValue(emp);}
    for(var j=0;j<values.length;j++) sheet.getRange(row,startCol+j).setValue(values[j]);
  }

  if(action==="savePob"){
    saveRows(pobSheet,ct(e.parameter.emp),JSON.parse(e.parameter.data),8);
    return send({status:"success",message:"POB Saved"});
  }
  if(action==="saveSecondary"){
    saveRows(secSheet,ct(e.parameter.emp),JSON.parse(e.parameter.data),8);
    return send({status:"success",message:"Secondary Sales Saved"});
  }
  if(action==="saveStock"){
    saveRows(stockSheet,ct(e.parameter.emp),JSON.parse(e.parameter.data),8);
    return send({status:"success",message:"Stock Saved"});
  }

  return send({status:"error",message:"Invalid action: "+action});
}
