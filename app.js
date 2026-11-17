'use strict';
let KEYS={};
function loadKeys(file){const bin=atob(file.p||'');const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));const raw=JSON.parse(new TextDecoder().decode(bytes));for(const id of Object.keys(raw)){const k=raw[id];KEYS[id]={correct:k.correct,reference:k.reference,source:k.source}}}
function checkAnswer(id,value){if(typeof value!=='string'||!value.trim()||value.length>12000)return null;const k=KEYS[id];if(!k)return null;const q=((data&&data.questions)||[]).find(x=>x.id===id);if(k.correct!==null){if(!q||!q.options.some((_,i)=>String(i)===value))return null;const reference=(typeof k.reference==='string'&&k.reference.length<=2&&q)?q.options[k.correct]:k.reference;return{correct:String(k.correct)===value,reference,source:k.source}}return{correct:null,reference:k.reference,source:k.source}}

const root=document.querySelector('main');
const fmt=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let data,state={},persistent=true;
try{state=JSON.parse(localStorage.getItem('fieldnotes.v1')||'{}')||{}}catch{persistent=false}
function save(){try{localStorage.setItem('fieldnotes.v1',JSON.stringify(state))}catch{persistent=false}}
const items=n=>data.questions.filter(q=>q.lesson===n);
const count=qs=>qs.filter(q=>state[q.id]?.result).length;
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
 root.innerHTML=(landing?'<section class="hero">'+artwork()+'<div class="copy"><div class="eyebrow">PSYC 150 · MIDTERM</div><h1>Leadership<br><em>Fieldnotes</em></h1><h2>领导力期中研习室</h2><div class="links"><a class="btn gold" href="#/notes">阅读知识点 ↗</a><a class="btn ghost" href="#/work">练习 Worksheet →</a></div></div></section>':'')+'<div class="sectionhead"><div><div class="kicker">LESSON DIRECTORY</div><h2>课程目录</h2></div>'+tabs(mode)+'</div><div class="stats"><span>'+data.lessons.length+' 个单元</span><span class="track"><i style="width:'+100*count(data.questions)/data.questions.length+'%"></i></span><span>已核对 '+count(data.questions)+' / '+data.questions.length+' 题</span></div><div class="grid">'+data.lessons.map(l=>{const qs=items(l.id);return '<a class="lesson" href="#/'+mode+'/'+l.id+'"><div class="num">LESSON '+fmt(l.id)+'</div><h3>'+esc(l.zh)+'</h3><div class="en">'+esc(l.title)+'</div><div class="low"><span>'+(mode==='work'?'已核对 '+count(qs)+' / '+qs.length+' 题':l.sections.length+' 个知识点')+'</span><span class="go">↗</span></div></a>'}).join('')+'</div>'
}
function feedback(r){
 if(!r)return '';const title=r.correct===null?'Reference answer · Self-check':r.correct?'Correct':'Incorrect · Review the answer';
 return '<div class="feedback '+(r.correct===false?'wrong':'')+'"><b>'+title+'</b><p>'+esc(r.reference)+'</p><small>'+esc(r.source)+'</small></div>'
}
function question(q,j,origin=""){
 const s=state[q.id]||{};let control;
 if(q.options.length)control='<select aria-label="Answer for question '+j+'" required><option value="">Choose an answer…</option>'+q.options.map((o,k)=>'<option value="'+k+'" '+(String(k)===s.value?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';
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
function updateProgress(qs){let p=document.querySelector('#progress');if(p)p.textContent='已核对 '+count(qs)+' / '+qs.length+' 题 · '+(persistent?'进度保存在此设备':'浏览器存储不可用，本次进度仅保留在当前页面')}
function render(){if(!data)return;const [,kind,n]=location.hash.slice(1).split('/'),mode=kind==='work'?'work':'notes',l=data.lessons.find(l=>l.id===Number(n));if(kind==='jobs')jobs();else if(l)detail(mode,l);else home(mode,!kind);window.scrollTo(0,0)}
root.addEventListener('input',e=>{const f=e.target.closest('form');if(!f)return;state[f.dataset.id]={value:e.target.value};save();f.querySelector('.response').innerHTML='';refreshProgress()});
root.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,id=f.dataset.id,input=f.querySelector('select,textarea'),value=input.value,area=f.querySelector('.response'),btn=f.querySelector('button');if(!value.trim()){area.textContent='Please enter an answer first.';return}btn.disabled=true;try{const result=await checkAnswer(id,value);if(!result)throw Error();if(state[id]?.value!==value&&input.value!==value)return;if(input.value!==value)return;state[id]={value,result};save();area.innerHTML=feedback(result);refreshProgress()}catch{area.textContent='Could not check your answer. Please try again.'}finally{btn.disabled=false}});
window.addEventListener('hashchange',render);
Promise.all([fetch('catalog.json'),fetch('keys.json')]).then(async rs=>{if(rs.some(r=>!r.ok))throw Error();const j=await Promise.all(rs.map(r=>r.json()));data=j[0];loadKeys(j[1]);render()}).catch(()=>root.textContent='课程暂时无法加载，请刷新后重试。');
