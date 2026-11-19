'use strict';
let KEYS={};
function loadKeys(file){const bin=atob(file.p||'');const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));const raw=JSON.parse(new TextDecoder().decode(bytes));for(const id of Object.keys(raw)){const k=raw[id];KEYS[id]={correct:k.correct,reference:k.reference,source:k.source}}}
function checkAnswer(id,value){if(typeof value!=='string'||!value.trim()||value.length>12000)return null;const k=KEYS[id];if(!k)return null;const q=((data&&data.questions)||[]).find(x=>x.id===id);if(k.correct!==null){if(!q||!q.options.some((_,i)=>String(i)===value))return null;const reference=(typeof k.reference==='string'&&k.reference.length<=2&&q)?q.options[k.correct]:k.reference;return{correct:String(k.correct)===value,reference,source:k.source}}return{correct:null,reference:k.reference,source:k.source}}

const themeToggle=document.querySelector('#theme-toggle');
themeToggle.checked=document.documentElement.dataset.theme==='dark';
themeToggle.addEventListener('change',()=>{const dark=themeToggle.checked;if(dark)document.documentElement.dataset.theme='dark';else delete document.documentElement.dataset.theme;try{localStorage.setItem('fieldnotes.theme',dark?'dark':'light')}catch{}});
const root=document.querySelector('main');
const fmt=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let data,state={},persistent=true;
try{state=JSON.parse(localStorage.getItem('fieldnotes.v1')||'{}')||{}}catch{persistent=false}
function save(){try{localStorage.setItem('fieldnotes.v1',JSON.stringify(state))}catch{persistent=false}}
const items=n=>data.questions.filter(q=>q.lesson===n);
const count=qs=>qs.filter(q=>state[q.id]?.result).length;
let query='';
let exam=null;
const termsOf=()=>query.trim().toLowerCase().split(/\s+/).filter(Boolean);
const termRe=(terms,flags)=>new RegExp(terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),flags);
function markify(text,terms){
 const s=String(text??'');
 if(!terms.length||!s)return esc(s);
 const re=termRe(terms,'gi');let out='',last=0,m;
 while((m=re.exec(s))){
  if(!m[0].length){re.lastIndex++;continue}
  out+=esc(s.slice(last,m.index))+'<mark class="hit">'+esc(m[0])+'</mark>';
  last=m.index+m[0].length;
 }
 return out+esc(s.slice(last));
}
function excerpt(text,terms,max=520){
 const s=String(text??'');
 if(s.length<=max)return markify(s,terms);
 const m=termRe(terms,'i').exec(s);
 const start=Math.max(0,(m?m.index:0)-120);
 return (start>0?'…':'')+markify(s.slice(start,start+max),terms)+(start+max<s.length?'…':'');
}
function searchIndex(terms){
 const groups=[];let paraCount=0;
 data.lessons.forEach(l=>{
  const head=[l.title,l.zh,l.headingZh].join(' ').toLowerCase();
  const titleHit=terms.every(t=>head.includes(t));
  const secs=[];
  l.sections.forEach((row,idx)=>{
   const fields=[['原文 · 标题',row[0]],['原文 · 正文',row[1]],['中文 · 标题',row[2]],['中文 · 译文',row[3]]];
   if(!terms.every(t=>fields.map(f=>String(f[1]??'')).join('\n').toLowerCase().includes(t)))return;
   paraCount++;
   secs.push({idx,shown:fields.filter(f=>terms.some(t=>String(f[1]??'').toLowerCase().includes(t)))});
  });
  if(titleHit||secs.length)groups.push({lesson:l,titleHit,secs});
 });
 return {groups,paraCount};
}
function searchBox(){
 return '<section class="find"><div class="findlabel">检索知识点 / SEARCH</div><div class="findrow"><input id="q" type="search" autocomplete="off" spellcheck="false" value="'+esc(query)+'" placeholder="输入关键词：integrity、charisma、团队、授权…（空格分隔多个词则需同时命中）"><button type="button" class="findclear">清除</button></div><p class="findhint">在 '+data.lessons.length+' 个单元的讲义正文（英文原文 + 中文译文）与单元标题里检索，命中的文字标红。</p><div class="chips" id="chips"><span>试试</span><button type="button" data-q="integrity">integrity</button><button type="button" data-q="charisma">charisma</button><button type="button" data-q="vision">vision</button><button type="button" data-q="resilience">resilience</button><button type="button" data-q="团队">团队</button><button type="button" data-q="授权">授权</button></div><div id="results" class="results"></div></section>';
}
function runSearch(){
 const box=root.querySelector('#results'),dir=root.querySelector('#directory'),chips=root.querySelector('#chips');
 if(!box)return;
 const terms=termsOf();
 if(!terms.length){box.innerHTML='';if(dir)dir.style.display='';if(chips)chips.style.display='';return}
 if(dir)dir.style.display='none';
 const found=searchIndex(terms);
 if(!found.groups.length){if(chips)chips.style.display='';box.innerHTML='<p class="noresult">没有命中「'+esc(query.trim())+'」。试试下面的关键词，或换英文原词（integrity / charisma / task / vision）。</p>';return}
 if(chips)chips.style.display='none';
 box.innerHTML='<div class="searchmeta"><span>命中 <b>'+found.groups.length+'</b> 个单元 · <b>'+found.paraCount+'</b> 处段落</span><span>'+terms.map(t=>'<code>'+esc(t)+'</code>').join(' ')+'</span></div>'+found.groups.map(g=>{
  const l=g.lesson;
  return '<article class="hitlesson"><header><div><div class="num">LESSON '+fmt(l.id)+'</div><h3>'+esc(l.title)+'</h3><div class="zh">'+esc(l.zh)+'</div></div><a class="open" href="#/notes/'+l.id+'">打开本课 →</a></header>'+(g.titleHit&&!g.secs.length?'<p class="titlehit">命中单元标题：'+esc(l.headingZh||l.zh)+'</p>':'')+g.secs.map(s=>'<div class="hitpara"><div class="where">'+s.shown.map(f=>f[0]).join(' / ')+'</div>'+s.shown.map(f=>'<p>'+excerpt(f[1],terms)+'</p>').join('')+'</div>').join('')+'</article>';
 }).join('');
}
function wireSearch(){
 const input=root.querySelector('#q');
 if(!input)return;
 let timer;
 input.addEventListener('input',()=>{query=input.value;clearTimeout(timer);timer=setTimeout(runSearch,150)});
 const clear=root.querySelector('.findclear');
 if(clear)clear.addEventListener('click',()=>{query='';input.value='';runSearch();input.focus()});
 root.querySelectorAll('#chips [data-q]').forEach(b=>b.addEventListener('click',()=>{query=b.dataset.q;input.value=query;runSearch();input.focus()}));
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){query='';input.value='';runSearch()}});
 runSearch();
}
function artwork(){
 let lines='';
 for(let k=0;k<62;k++){
  const radius=10+k*5.8,pts=[];
  for(let j=0;j<=150;j++){const a=j*Math.PI/75,v=radius*(1+.13*Math.sin(3*a+.3)+.074*Math.cos(5*a+k*.023)+.048*Math.sin(7*a-k*.018));pts.push((320+v*Math.cos(a)*1.28+.19*radius).toFixed(1)+','+(168+v*Math.sin(a)*.74-.19*radius).toFixed(1))}
  lines+='<polygon points="'+pts.join(' ')+'" fill="none" stroke="'+(k%5===0?'#d6cd8d':'#88a783')+'" stroke-opacity="'+(k%5===0?'.73':'.46')+'" stroke-width="'+(k%5===0?'1.3':'.8')+'"/>'
 }
 return '<svg class="atlas" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="fade"><stop stop-color="black"/><stop offset=".30" stop-color="white"/></linearGradient><mask id="m"><rect width="600" height="340" fill="url(#fade)"/></mask></defs><g mask="url(#m)">'+lines+'<path d="M138 310 Q258 280 252 236T319 168" fill="none" stroke="#e9ac70" stroke-width="2" stroke-dasharray="4 5"/><circle cx="319" cy="168" r="5" fill="#f4d296"/><circle cx="319" cy="168" r="10" fill="none" stroke="#f4d296"/></g></svg>'
}
function tabs(mode,n=''){const tail=n?'/'+n:'';return '<div class="seg"><a class="'+(mode==='notes'?'on':'')+'" href="#/notes'+tail+'">知识点</a><a class="'+(mode==='work'?'on':'')+'" href="#/work'+tail+'">Worksheet</a></div>'}
function home(mode,landing){
 root.innerHTML=(landing?'<section class="hero">'+artwork()+'<div class="copy"><div class="eyebrow">PSYC 150 · MIDTERM</div><h1>Leadership<br><em>Fieldnotes</em></h1><h2>领导力期中研习室</h2><div class="links"><a class="btn gold" href="#/notes">阅读知识点 ↗</a><a class="btn ghost" href="#/work">练习 Worksheet →</a><a class="btn gold" href="#/exam">生成模拟卷</a></div></div></section>':'')+searchBox()+'<div id="directory"><div class="sectionhead"><div><div class="kicker">LESSON DIRECTORY</div><h2>课程目录</h2></div>'+tabs(mode)+'</div><div class="stats"><span>'+data.lessons.length+' 个单元</span><span class="track"><i style="width:'+100*count(data.questions)/data.questions.length+'%"></i></span><span>已核对 '+count(data.questions)+' / '+data.questions.length+' 题</span></div><div class="grid">'+data.lessons.map(l=>{const qs=items(l.id);return '<a class="lesson" href="#/'+mode+'/'+l.id+'"><div class="num">LESSON '+fmt(l.id)+'</div><h3>'+esc(l.zh)+'</h3><div class="en">'+esc(l.title)+'</div><div class="low"><span>'+(mode==='work'?'已核对 '+count(qs)+' / '+qs.length+' 题':l.sections.length+' 个知识点')+'</span><span class="go">↗</span></div></a>'}).join('')+'</div></div>';wireSearch()
}
function feedback(r){
 if(!r)return '';const title=r.correct===null?'Reference answer · Self-check':r.correct?'Correct':'Incorrect · Review the answer';
 return '<div class="feedback '+(r.correct===false?'wrong':'')+'"><b>'+title+'</b><p>'+esc(r.reference)+'</p><small>'+esc(r.source)+'</small></div>'
}
function choiceButtons(q,selected=''){
 return '<fieldset class="choices"><legend class="sr-only">Choose one answer</legend>'+q.options.map((o,k)=>'<label class="choice"><input type="radio" name="answer-'+esc(q.id)+'" value="'+k+'" '+(String(k)===selected?'checked':'')+'><span><b aria-hidden="true">'+String.fromCharCode(65+k)+'</b><span>'+esc(o)+'</span></span></label>').join('')+'</fieldset>'
}
function question(q,j,origin=""){
 const s=state[q.id]||{};let control;
 if(q.options.length)control=choiceButtons(q,s.value);
 else control='<textarea aria-label="Answer for question '+j+'" maxlength="12000" placeholder="Write your answer in English…" required>'+esc(s.value||'')+'</textarea>';
 return '<form class="q" data-id="'+q.id+'"><div class="num">QUESTION '+fmt(j)+(origin?' · '+esc(origin):'')+'</div><div class="prompt">'+esc(q.prompt)+'</div>'+control+'<button type="submit">Check answer</button><div class="response" aria-live="polite">'+feedback(s.result)+'</div></form>'
}
const diagrams={
  '7/Administrative skills':['skills.png','Three categories and nine core leadership skills','三类九项核心领导技能。来源：Worksheet 9，Figure 6.1。'],
  '16/Performance · energy · use':['capp.png','CAPP model comparing performance, energy and frequency of use','据 Lesson 16 绘制。先看表现和能量，再比较使用频率。'],
  '18/Jobs: resilience and vision':['jobs.jpg','Steve Jobs with the original Macintosh','乔布斯与初代 Macintosh。图片取自 Lesson 18，第 12 页（课件署名 @explaining.tech）。']
};
function reading(lesson,[title,body,titleZh,bodyZh]){
  const image=diagrams[lesson+'/'+title];
  const figure=image?'<figure class="concept-figure"><img loading="lazy" src="'+image[0]+'" alt="'+esc(image[1])+'"><figcaption>'+esc(image[2])+'</figcaption></figure>':'';
  return '<article class="reading"><h2 lang="en">'+esc(title)+'</h2><div class="section-zh">'+esc(titleZh)+'</div><p lang="en">'+esc(body)+'</p><p class="translation">'+esc(bodyZh)+'</p>'+figure+'</article>'
}
function jobsLink(){
  return '<aside class="practice-link"><div><strong>Steve Jobs 专练</strong><small>4 道课堂原题 · 4 道课件延伸简答</small></div><a class="btn" href="#/jobs">开始专练 →</a></aside>'
}
function jobs(){
  const qs=data.jobsPractice.map(id=>data.questions.find(q=>q.id===id));
  root.innerHTML='<div class="detail"><a class="back" href="#/work/18">← Lesson 18 Worksheet</a><div class="detailtop"><div class="kicker">LESSON 18 / MIDTERM</div><h1>Steve Jobs</h1><p class="title-zh">史蒂夫·乔布斯案例专练</p><a class="back" href="#/notes/18">阅读本课知识点 →</a></div><p class="help" id="progress"></p>'+qs.map((q,i)=>question(q,i+1,q.extension?'Lesson 18 extension':'Worksheet 18 · Q'+q.id.split('-')[1])).join('')+'</div>';
  updateProgress(qs)
}
function refreshProgress(){
  const forms=[...root.querySelectorAll('form[data-id]')];
  updateProgress(forms.map(f=>({id:f.dataset.id})))
}
function detail(mode,l){
 const qs=items(l.id).filter(q=>!q.extension),index=data.lessons.indexOf(l),prev=data.lessons[index-1],next=data.lessons[index+1];
 root.innerHTML='<div class="detail"><a class="back" href="#/'+mode+'">← 返回课程目录</a><div class="detailtop"><div class="kicker">PSYC 150 / LESSON '+fmt(l.id)+'</div><h1 lang="en">'+esc(l.title)+'</h1><p class="title-zh">'+esc(l.headingZh)+'</p>'+tabs(mode,l.id)+'</div>'+(l.id===18?jobsLink():'')+(mode==='notes'?l.sections.map(row=>reading(l.id,row)).join('')+'<a class="btn" href="#/work/'+l.id+'">进入本课 Worksheet →</a>':'<p class="help" id="progress"></p>'+(l.id===9?'<figure class="q"><img src="skills.png" alt="Core leadership skills model: administrative, interpersonal and conceptual skills"></figure>':'')+qs.map((q,i)=>question(q,i+1)).join(''))+'<div class="next">'+(prev?'<a href="#/'+mode+'/'+prev.id+'">← Lesson '+fmt(prev.id)+'</a>':'<span></span>')+(next?'<a href="#/'+mode+'/'+next.id+'">Lesson '+fmt(next.id)+' →</a>':'')+'</div></div>';
 updateProgress(qs)
}
function shuffled(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function examPage(){
 const mc=data.questions.filter(q=>!q.extension&&q.options.length),short=data.questions.filter(q=>!q.extension&&!q.options.length);
 root.innerHTML='<div class="detail"><a class="back" href="#/">← 返回首页</a><div class="detailtop"><div class="kicker">PRACTICE EXAM</div><h1>随机模拟卷</h1><p class="title-zh">从所有 Worksheet 原题中随机抽取：20 或 40 道选择 / 判断题，加 1 道简答题。</p><div class="exam-actions"><button type="button" data-exam="20">生成 20 题模拟卷</button><button type="button" data-exam="40">生成 40 题模拟卷</button></div><p class="help">题库共 '+mc.length+' 道选择 / 判断题、'+short.length+' 道简答题。简答题提供参考答案供自评；模拟卷不会改变 Worksheet 的练习进度。</p></div><div id="exam-content"></div></div>';
 root.querySelectorAll('[data-exam]').forEach(b=>b.addEventListener('click',()=>{exam={questions:[...shuffled(mc).slice(0,Number(b.dataset.exam)),...shuffled(short).slice(0,1)]};drawExam()}));
 if(exam)drawExam();
}
function drawExam(){
 const qs=exam.questions,box=root.querySelector('#exam-content');
 box.innerHTML='<form class="exam-form"><p class="help">共 '+(qs.length-1)+' 道选择 / 判断题 + 1 道简答题。提交后查看得分和参考答案；未作答的选择题按未答计。</p><div class="exam-result" aria-live="polite"></div>'+qs.map((q,i)=>'<section class="q exam-question" data-id="'+esc(q.id)+'"><div class="num">'+(q.options.length?'QUESTION '+fmt(i+1):'SHORT ANSWER')+' · Worksheet '+q.lesson+' · Q'+esc(q.id.split('-')[1])+'</div><div class="prompt">'+esc(q.prompt)+'</div>'+(q.options.length?choiceButtons(q):'<textarea aria-label="Short answer" maxlength="12000" placeholder="Write your answer in English…"></textarea>')+'<div class="response"></div></section>').join('')+'<button type="submit">提交并查看答案</button></form>';
}
async function checkExam(form){
 const btn=form.querySelector('button[type=submit]'),result=form.querySelector('.exam-result'),rows=[...form.querySelectorAll('.exam-question')];btn.disabled=true;result.textContent='正在核对答案…';
 try{let correct=0,answered=0,fail=0;await Promise.all(rows.map(async row=>{const input=row.querySelector('input[type=radio]:checked,textarea'),area=row.querySelector('.response'),isChoice=!!row.querySelector('.choices');const unanswered=isChoice&&!input;if(isChoice&&!unanswered)answered++;const value=(input?.value||'').trim()||(isChoice?'0':' ');try{const r=checkAnswer(row.dataset.id,isChoice?value:(value.trim()||'See reference answer'));if(!r)throw Error();if(isChoice&&!unanswered&&r.correct)correct++;area.innerHTML=(unanswered?'<div class="feedback wrong"><b>未作答 · 参考答案</b><p>'+esc(r.reference)+'</p><small>'+esc(r.source)+'</small></div>':feedback(r))}catch{fail++;area.innerHTML='<div class="feedback wrong">答案暂时无法加载，请重新提交。</div>'}}));result.innerHTML='<div class="feedback"><b>选择 / 判断题：'+correct+' / '+(rows.length-1)+' 正确</b><p>已作答 '+answered+' 题；简答题请对照参考答案自评。'+(fail?'有 '+fail+' 题核对失败，请重新提交。':'')+'</p></div>';result.scrollIntoView({behavior:'smooth',block:'center'})}finally{btn.disabled=false}
}

function updateProgress(qs){let p=document.querySelector('#progress');if(p)p.textContent='已核对 '+count(qs)+' / '+qs.length+' 题 · '+(persistent?'进度保存在此设备':'浏览器存储不可用，本次进度仅保留在当前页面')}
function render(){if(!data)return;const [,kind,n]=location.hash.slice(1).split('/'),mode=kind==='work'?'work':'notes',l=data.lessons.find(l=>l.id===Number(n));if(kind==='exam')examPage();else if(kind==='jobs')jobs();else if(l)detail(mode,l);else home(mode,!kind);window.scrollTo(0,0)}
root.addEventListener('input',e=>{const f=e.target.closest('form');if(f?.classList.contains('exam-form'))return;if(!f)return;state[f.dataset.id]={value:e.target.value};save();f.querySelector('.response').innerHTML='';refreshProgress()});
root.addEventListener('submit',async e=>{e.preventDefault();if(e.target.classList.contains('exam-form')){await checkExam(e.target);return}const f=e.target,id=f.dataset.id,input=f.querySelector('input[type=radio]:checked,textarea'),value=input?.value||'',area=f.querySelector('.response'),btn=f.querySelector('button');if(!value.trim()){area.textContent='Please enter an answer first.';return}btn.disabled=true;try{const result=await checkAnswer(id,value);if(!result)throw Error();if(state[id]?.value!==value&&input.value!==value)return;if(input.value!==value)return;state[id]={value,result};save();area.innerHTML=feedback(result);refreshProgress()}catch{area.textContent='Could not check your answer. Please try again.'}finally{btn.disabled=false}});
window.addEventListener('hashchange',render);
Promise.all([fetch('catalog.json'),fetch('keys.json')]).then(async rs=>{if(rs.some(r=>!r.ok))throw Error();const j=await Promise.all(rs.map(r=>r.json()));data=j[0];loadKeys(j[1]);render()}).catch(()=>root.textContent='课程暂时无法加载，请刷新后重试。');
