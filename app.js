"use strict";

// ---------- answer matching ----------
function norm(s){
  return (s||"").toLowerCase().replace(/ё/g,"е")
    .replace(/[^a-zа-я0-9\s]/gi," ").replace(/\s+/g," ").trim();
}
function lev(a,b){
  const m=a.length,n=b.length,d=[];
  for(let i=0;i<=m;i++){d[i]=[i];}
  for(let j=0;j<=n;j++){d[0][j]=j;}
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}
function isCorrect(input, ans){
  const u=norm(input); if(!u) return false;
  const cands=[ans.text].concat(ans.alt||[]).map(norm);
  const ut = u.split(" ").filter(w=>w.length>=4);
  for(const c of cands){
    if(!c) continue;
    if(u===c) return true;
    {const sh=u.length<=c.length?u:c, lo=u.length<=c.length?c:u;
     if(lo.includes(sh) && (sh.indexOf(" ")>=0 || sh.length>=0.6*lo.length)) return true;}
    const tol = c.length>8?3 : c.length>5?2 : 1;
    if(lev(u,c)<=tol) return true;
    // допуск к верному, но сокращённому ответу (покрыто >= половины значимых слов)
    const at = c.split(" ").filter(w=>w.length>=4);
    if(ut.length && at.length>1){
      const shared = ut.filter(w=>at.includes(w)).length;
      if(ut.every(w=>at.includes(w)) && shared>=Math.ceil(at.length/2)) return true;
    }
  }
  return false;
}

// ---------- state ----------
const S = {
  user:null, setFilter:"all", deck:[], pos:0,
  done:0, totalCorrect:0, totalFields:0
};
const $ = (s,r)=> (r||document).querySelector(s);

function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function buildDeck(){
  let idx = SLIDES.map((s,i)=>i)
    .filter(i => S.setFilter==="all" || SLIDES[i].set===S.setFilter);
  S.deck = shuffle(idx);
  S.pos = 0;
}

// ---------- login ----------
function doLogin(){
  const name=$("#u").value.trim(), pwd=$("#p").value;
  if(USERS[name] && USERS[name]===pwd){
    S.user=name;
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#who").textContent=name;
    buildDeck(); renderSlide();
  } else {
    $("#loginErr").textContent="Неверное имя или пароль";
  }
}
function logout(){
  S.user=null;
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
  $("#p").value="";
}

// ---------- render slide ----------
function renderSlide(){
  const slide = SLIDES[S.deck[S.pos]];
  $("#sid").textContent = slide.id;
  $("#imgEl").src = "images/"+slide.img;
  $("#imgEl").alt = slide.title;
  $("#tTitle").textContent = slide.title;
  $("#tSub").textContent = slide.sub || "";
  $("#counter").textContent = (S.pos+1)+" / "+S.deck.length;
  $("#prepNote").classList.toggle("hidden", slide.set!=="П");

  const wrap=$("#fields"); wrap.innerHTML="";
  slide._inputs=[];
  slide.answers.forEach((a,i)=>{
    const row=document.createElement("div"); row.className="row";
    const line=document.createElement("div"); line.className="line";
    const num=document.createElement("span"); num.className="num"; num.textContent=a.n;
    const ib=document.createElement("div"); ib.className="inp";
    const inp=document.createElement("input");
    inp.type="text"; inp.placeholder="введите структуру…"; inp.autocomplete="off";
    inp.addEventListener("keydown",e=>{
      if(e.key==="Enter"){ const ins=slide._inputs;
        if(i<ins.length-1) ins[i+1].focus(); else checkSlide(); }
    });
    const mark=document.createElement("span"); mark.className="mark";
    ib.appendChild(inp); ib.appendChild(mark);
    line.appendChild(num); line.appendChild(ib);
    const ansEl=document.createElement("div"); ansEl.className="ans hidden";
    row.appendChild(line); row.appendChild(ansEl);
    wrap.appendChild(row);
    slide._inputs.push(inp); inp._mark=mark; inp._ans=ansEl; inp._a=a;
  });

  $("#checkBtn").classList.remove("hidden");
  $("#result").classList.add("hidden");
  slide._checked=false;
  $("#prevBtn").disabled = S.pos===0;
  if(slide._inputs[0]) slide._inputs[0].focus();
  $("#stat").textContent = S.done
    ? `Пройдено: ${S.done} · верно ${S.totalCorrect}/${S.totalFields}` : "";
}

// ---------- check ----------
function checkSlide(){
  const slide = SLIDES[S.deck[S.pos]];
  if(slide._checked) return;
  let correct=0;
  slide._inputs.forEach(inp=>{
    const ok=isCorrect(inp.value, inp._a);
    inp.classList.remove("ok","bad"); inp.classList.add(ok?"ok":"bad");
    inp.disabled=true;
    inp._mark.textContent = ok?"✓":"✗";
    inp._mark.className = "mark "+(ok?"ok":"bad");
    inp._ans.classList.remove("hidden","ok","bad");
    inp._ans.classList.add(ok?"ok":"bad");
    inp._ans.innerHTML = "Правильный ответ: <b>"+inp._a.text+"</b>";
    if(ok) correct++;
  });
  slide._checked=true;
  S.done++; S.totalCorrect+=correct; S.totalFields+=slide._inputs.length;
  $("#checkBtn").classList.add("hidden");
  $("#result").classList.remove("hidden");
  $("#scoreVal").textContent = correct+" / "+slide._inputs.length;
}

function retry(){ renderSlide(); }
function nextSlide(){
  S.pos++;
  if(S.pos>=S.deck.length){ shuffle(S.deck); S.pos=0; } // новый случайный круг
  renderSlide();
}
function prevSlide(){ if(S.pos>0){ S.pos--; renderSlide(); } }
function setFilter(f){
  S.setFilter=f;
  document.querySelectorAll("#seg button").forEach(b=>b.classList.toggle("on",b.dataset.f===f));
  buildDeck(); renderSlide();
}
function reshuffle(){ buildDeck(); renderSlide(); }

// ---------- wire up ----------
window.addEventListener("DOMContentLoaded",()=>{
  $("#loginBtn").addEventListener("click",doLogin);
  $("#p").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
  $("#u").addEventListener("keydown",e=>{if(e.key==="Enter")$("#p").focus();});
  $("#logoutBtn").addEventListener("click",logout);
  $("#checkBtn").addEventListener("click",checkSlide);
  $("#retryBtn").addEventListener("click",retry);
  $("#nextBtn").addEventListener("click",nextSlide);
  $("#prevBtn").addEventListener("click",prevSlide);
  $("#shuffleBtn").addEventListener("click",reshuffle);
  document.querySelectorAll("#seg button").forEach(b=>
    b.addEventListener("click",()=>setFilter(b.dataset.f)));
});
