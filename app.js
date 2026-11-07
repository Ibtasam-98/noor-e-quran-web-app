'use strict';
/* Noor-e-Quran – zero-dependency PWA. All content comes from public APIs; nothing religious is hardcoded
   except short UI labels and Dhikr phrases. */
const $=s=>document.querySelector(s),app=$('#app'),player=$('#player');
const store={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('noor.'+k))??d}catch{return d}},set:(k,v)=>localStorage.setItem('noor.'+k,JSON.stringify(v))};
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='show';setTimeout(()=>t.className='',1800)};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const settings=Object.assign({theme:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light',arfs:2,reciter:'ar.alafasy',method:2,school:0,lat:null,lng:null,trans:'en.sahih',urdu:true},store.get('settings',{}));
const save=()=>store.set('settings',settings);
const applyTheme=()=>{document.documentElement.dataset.theme=settings.theme;document.documentElement.style.setProperty('--arfs',settings.arfs+'rem')};
applyTheme();
/* ---------- API with cache + offline fallback ---------- */
async function api(url){
 const k='c:'+url;
 try{const r=await fetch(url);if(!r.ok)throw Error(r.status);const j=await r.json();try{store.set(k,j)}catch{};return j}
 catch(e){const c=store.get(k);if(c){toast('Offline – showing saved data');return c}throw e}}
const Q='https://api.alquran.cloud/v1',AL='https://api.aladhan.com/v1',HD='https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
const loading=()=>app.innerHTML='<div class="skel"></div><br><div class="skel"></div><br><div class="skel"></div>';
const fail=(e,retry)=>app.innerHTML=`<div class="card"><h3>Couldn't load this page</h3><p class="mute">Check your connection. (${esc(e.message)})</p><button class="pri" onclick="${retry}">Try again</button></div>`;
/* ---------- navigation ---------- */
const pages=[['home','Home'],['quran','Quran'],['prayer','Prayer'],['qibla','Qibla'],['tasbeeh','Tasbeeh'],['hadith','Hadith'],['names','99 Names'],['dua','Duas'],['tools','Tools'],['calendar','Calendar'],['bookmarks','Saved'],['settings','Settings']];
const ICON={home:'',quran:'',prayer:'',qibla:'',tasbeeh:'',hadith:'',names:'',dua:'',tools:'',calendar:'',bookmarks:'',settings:''};
function nav(){const h=location.hash.slice(2).split('/')[0]||'home',L=p=>`<a href="#/${p[0]}" class="${p[0]===h?'on':''}" title="${p[1]}"><i>${ICON[p[0]]}</i><span>${p[1]}</span></a>`;
 $('#nav').innerHTML=pages.map(L).join('');
 $('#tabs').innerHTML=pages.slice(0,4).map(L).join('')+'<a href="#" id="more"><i>☰</i><span>More</span></a>';
 $('#more').onclick=e=>{e.preventDefault();document.body.classList.add('drawer')}}
const R={};
async function route(skip){nav();document.body.classList.remove('drawer');if(skip!==true){app.classList.add('enter');scrollTo(0,0)}player.pause();document.body.classList.remove('full');const [p,...a]=location.hash.slice(2).split('/');
 try{await (R[p||'home']||R.home)(...a.map(decodeURIComponent))}catch(e){fail(e,'route()')}document.querySelectorAll('.grid>*').forEach((e,i)=>e.style.setProperty('--i',Math.min(i,16)));clearTimeout(window._en);window._en=setTimeout(()=>app.classList.remove('enter'),1200);app.focus({preventScroll:true})}
addEventListener('hashchange',route);
/* ---------- bookmarks / history / checklist ---------- */
const bm=()=>store.get('bm',[]);
const toggleBm=(type,id,label)=>{let b=bm();const i=b.findIndex(x=>x.type===type&&x.id===id);i>=0?b.splice(i,1):b.push({type,id,label});store.set('bm',b);toast(i>=0?'Removed':'Saved')};
const isBm=(t,i)=>bm().some(x=>x.type===t&&x.id===i);
const prog=()=>store.get('prog:'+today(),{});
const tick=k=>{const p=prog();p[k]=!p[k];store.set('prog:'+today(),p);route(true)};
function streak(){let n=0,d=new Date();for(;;){const p=store.get('prog:'+d.toISOString().slice(0,10),{});if(Object.values(p).some(Boolean))n++;else if(n||d.toISOString().slice(0,10)!==today())break;d.setDate(d.getDate()-1)}return n}
function pushHistory(x){const h=store.get('hist',[]).filter(y=>y.hash!==x.hash);h.unshift(x);store.set('hist',h.slice(0,15))}
/* ---------- prayer data ---------- */
async function loc(){if(settings.lat!=null)return settings;
 return new Promise((res,rej)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{settings.lat=p.coords.latitude;settings.lng=p.coords.longitude;save();res(settings)},()=>rej(Error('Location permission denied – set it manually in Settings')),{timeout:10000}):rej(Error('Geolocation unavailable')))}
async function timings(){const l=await loc();const d=new Date();
 return api(`${AL}/timings/${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}?latitude=${l.lat}&longitude=${l.lng}&method=${settings.method}&school=${settings.school}`)}
const PR=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
function nextPrayer(t){const n=new Date();for(const p of PR){const [h,m]=t[p].split(':');const d=new Date(n);d.setHours(+h,+m,0,0);if(d>n)return{p,d}}
 const [h,m]=t.Fajr.split(':');const d=new Date(n);d.setDate(d.getDate()+1);d.setHours(+h,+m,0,0);return{p:'Fajr',d}}
const cd=ms=>{const s=Math.max(0,ms/1000|0);return[s/3600|0,(s%3600)/60|0,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
/* ---------- HOME ---------- */
R.home=async()=>{const pr=prog(),tasks=[['quran','Quran reading'],['morning','Morning Azkar'],['evening','Evening Azkar'],['hadith','Hadith reading'],['tasbeeh','Tasbeeh'],...PR.map(p=>['pr'+p,p+' prayer'])];
 const t=store.get('tas',{}),hist=store.get('hist',[]),kh=store.get('khatam',{goal:30,done:[]});
 app.innerHTML=`<h1>Assalamu alaykum</h1><div class="card"><div id="hd" class="mute">Loading date…</div><div id="np" class="big"></div></div>
 <div class="card"><h3>Daily Ayah</h3><div id="dayah"><div class="skel"></div></div></div>
 <div class="grid"><div class="card"><h3>Today's checklist</h3>${tasks.map(([k,l])=>`<label class="row"><input type="checkbox" ${pr[k]?'checked':''} onchange="tick('${k}')"> ${l}</label>`).join('')}</div>
 <div class="card"><h3>Progress</h3><p>Worship streak: <b>${streak()}</b> day(s)</p><p>Tasbeeh today: <b>${(t.days||{})[today()]||0}</b> · lifetime: <b>${t.total||0}</b></p><p>Khatam: <b>${kh.done.length}/${kh.goal}</b> Juz</p><a href="#/quran/khatam">Open Khatam tracker</a></div>
 <div class="card"><h3>Recent</h3>${hist.slice(0,5).map(h=>`<div><a href="${h.hash}">${esc(h.label)}</a></div>`).join('')||'<span class="mute">Nothing yet – start reading.</span>'}${store.get('last')?`<p><a class="pri" href="${store.get('last')}">Resume reading</a></p>`:''}</div></div>`;
 const d=new Date();
 api(`${AL}/gToH/${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`).then(j=>{const h=j.data.hijri;$('#hd').textContent=`${h.day} ${h.month.en} ${h.year} AH · ${d.toDateString()}`}).catch(()=>$('#hd').textContent=d.toDateString());
 const n=1+((d.getFullYear()*366+d.getMonth()*31+d.getDate())*7919)%6236;
 api(`${Q}/ayah/${n}/editions/quran-uthmani,${settings.trans}`).then(j=>{const[a,b]=j.data;$('#dayah').innerHTML=`<div class="ar">${a.text}</div><p>${esc(b.text)}</p><span class="mute">${a.surah.englishName} ${a.surah.number}:${a.numberInSurah}</span>`}).catch(()=>$('#dayah').textContent='Unavailable offline.');
 timings().then(j=>{const tt=j.data.timings;const run=()=>{if(!$('#np'))return clearInterval(iv);const x=nextPrayer(tt);$('#np').textContent=`${x.p} in ${cd(x.d-new Date())}`};run();var iv=setInterval(run,1000)}).catch(e=>$('#np').innerHTML=`<span class="mute" style="font-size:1rem">${esc(e.message)}</span>`)};
/* ---------- QURAN ---------- */
R.quran=async(a,b)=>{if(a==='juz')return juzList();if(a==='khatam')return khatam();if(a==='search')return qsearch(b);if(a)return surah(+a,+b||1);
 loading();const j=await api(Q+'/surah'),S=j.data;
 app.innerHTML=`<h1>Quran</h1><div class="row"><input id="q" placeholder="Search Arabic or English…" style="flex:1"><button class="pri" id="go">Search</button><a href="#/quran/juz">Juz</a><a href="#/quran/khatam">Khatam</a></div>
 <div class="row" style="margin-top:8px"><input id="f" placeholder="Filter surahs…"></div><div class="grid" id="sl" style="margin-top:12px"></div>`;
 const draw=f=>$('#sl').innerHTML=S.filter(s=>(s.englishName+s.name+s.englishNameTranslation).toLowerCase().includes(f.toLowerCase())).map(s=>`<a class="card" style="text-decoration:none;color:inherit" href="#/quran/${s.number}"><div class="row"><b>${s.number}. ${esc(s.englishName)}</b><span class="mute">${s.numberOfAyahs} ayahs · ${s.revelationType}</span></div><div class="ar" style="font-size:1.4rem;line-height:1.6">${s.name}</div><div class="mute">${esc(s.englishNameTranslation)}</div></a>`).join('');
 draw('');$('#f').oninput=e=>draw(e.target.value);$('#go').onclick=()=>location.hash='#/quran/search/'+encodeURIComponent($('#q').value);$('#q').onkeydown=e=>e.key==='Enter'&&$('#go').click()};
async function qsearch(k){loading();const j=await api(`${Q}/search/${encodeURIComponent(k)}/all/${/[\u0600-\u06FF]/.test(k)?'quran-simple':settings.trans}`);
 const m=j.data.matches||[];app.innerHTML=`<h1>Results for “${esc(k)}”</h1><p class="mute">${j.data.count} match(es), showing ${Math.min(50,m.length)}</p>`+m.slice(0,50).map(x=>`<div class="card"><a href="#/quran/${x.surah.number}/${x.numberInSurah}">${esc(x.surah.englishName)} ${x.surah.number}:${x.numberInSurah}</a><p>${esc(x.text)}</p></div>`).join('')}
async function juzList(){app.innerHTML='<h1>Juz</h1><div class="grid">'+Array.from({length:30},(_,i)=>`<a class="card" href="#/juzview/${i+1}">Juz ${i+1}</a>`).join('')+'</div>'}
R.juzview=async n=>{loading();const j=await api(`${Q}/juz/${n}/quran-uthmani`);let last=0;
 app.innerHTML=`<h1>Juz ${n}</h1>`+j.data.ayahs.map(a=>`<div class="ar">${a.text} <small>﴿${a.numberInSurah}﴾</small></div>`).join('')+`<p><button onclick="markJuz(${n})" class="pri">Mark Juz complete</button></p>`};
window.markJuz=n=>{const k=store.get('khatam',{goal:30,done:[]});if(!k.done.includes(n))k.done.push(n);store.set('khatam',k);toast('Juz '+n+' marked')};
function khatam(){const k=store.get('khatam',{goal:30,done:[]});
 app.innerHTML=`<h1>Khatam tracker</h1><div class="card"><p>Complete the Quran in <input id="g" type="number" min="1" value="${k.goal}" style="width:80px"> days → read about <b>${Math.ceil((30-k.done.length)/k.goal*1000)/1000}</b> Juz/day.</p><div class="grid">${Array.from({length:30},(_,i)=>`<label class="card"><input type="checkbox" ${k.done.includes(i+1)?'checked':''} onchange="markJuzT(${i+1})"> Juz ${i+1}</label>`).join('')}</div><p><button onclick="localStorage.removeItem('noor.khatam');route()">Reset</button></p></div>`;
 $('#g').onchange=e=>{k.goal=+e.target.value||30;store.set('khatam',k);khatam()}}
window.markJuzT=n=>{const k=store.get('khatam',{goal:30,done:[]});k.done=k.done.includes(n)?k.done.filter(x=>x!==n):[...k.done,n];store.set('khatam',k);khatam()};
async function surah(n,from){loading();
 const eds=['quran-uthmani',settings.trans].concat(settings.urdu?['ur.jalandhry']:[]),j=await api(`${Q}/surah/${n}/editions/${eds.join(',')}`);
 const [ar,en,ur]=j.data;store.set('last','#/quran/'+n+'/'+from);pushHistory({hash:'#/quran/'+n,label:`${ar.englishName} (${n})`});
 const pr=prog();pr.quran=true;store.set('prog:'+today(),pr);
 const A=ar.ayahs;let cur=-1;
 app.innerHTML=`<div class="row"><button onclick="history.back()">←</button><h1 style="flex:1">${n}. ${esc(ar.englishName)} <span class="ar" style="font-size:1.6rem">${ar.name}</span></h1>
 <button id="fs">Full screen</button></div>
 <div class="card row"><button id="pa" class="pri">▶ Play surah</button><label>Speed <select id="sp"><option>0.75<option selected>1<option>1.25<option>1.5</select></label>
 <label>Reciter <select id="rc"></select></label><label>Repeat <select id="rp"><option value="0">off<option value="a">ayah<option value="s">surah</select></label>
 <label>Arabic <input id="fz" type="range" min="1.2" max="3.5" step=".1" value="${settings.arfs}"></label>
 ${n>1?`<a href="#/quran/${n-1}">← prev</a>`:''}${n<114?`<a href="#/quran/${n+1}">next →</a>`:''}</div>
 ${n!==1&&n!==9?'<div class="ar" style="text-align:center">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>':''}
 <div id="ays">${A.map((a,i)=>`<div class="card ayah" id="a${a.numberInSurah}"><div class="ar">${a.text} <small>﴿${a.numberInSurah}﴾</small></div><p>${esc(en.ayahs[i].text)}</p>${ur?`<p class="ur">${esc(ur.ayahs[i].text)}</p>`:''}
 <div class="row"><button data-p="${i}">▶</button><button data-b="${a.numberInSurah}">${isBm('ayah',n+':'+a.numberInSurah)?'★':'☆'}</button><button data-c="${i}">Copy</button><button data-s="${i}">Share</button></div></div>`).join('')}</div>`;
 const rc=$('#rc');api(`${Q}/edition?format=audio&language=ar&type=versebyverse`).then(r=>{rc.innerHTML=r.data.map(e=>`<option value="${e.identifier}" ${e.identifier===settings.reciter?'selected':''}>${esc(e.englishName)}</option>`).join('')}).catch(()=>rc.innerHTML=`<option>${settings.reciter}</option>`);
 rc.onchange=()=>{settings.reciter=rc.value;save()};$('#fz').oninput=e=>{settings.arfs=+e.target.value;save();applyTheme()};
 $('#sp').onchange=e=>player.playbackRate=+e.target.value;
 const playAt=i=>{cur=i;const a=A[i];player.src=`https://cdn.islamic.network/quran/audio/128/${settings.reciter}/${a.number}.mp3`;player.playbackRate=+$('#sp').value;player.play().catch(()=>toast('Audio unavailable'));
  document.querySelectorAll('.ayah').forEach(x=>x.classList.remove('playing'));const el=$('#a'+a.numberInSurah);el.classList.add('playing');el.scrollIntoView({block:'center',behavior:'smooth'});$('#pa').textContent='⏸ Pause';
  if('mediaSession'in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:`${ar.englishName} ${a.numberInSurah}`,artist:'Noor-e-Quran'})};
 player.onended=()=>{const r=$('#rp').value;if(r==='a')return playAt(cur);if(cur<A.length-1)playAt(cur+1);else if(r==='s')playAt(0);else $('#pa').textContent='▶ Play surah'};
 $('#pa').onclick=()=>{if(cur<0)playAt(0);else if(player.paused){player.play();$('#pa').textContent='⏸ Pause'}else{player.pause();$('#pa').textContent='▶ Resume'}};
 $('#ays').onclick=e=>{const t=e.target,A_=x=>A[+x];
  if(t.dataset.p!=null)playAt(+t.dataset.p);
  if(t.dataset.b){toggleBm('ayah',n+':'+t.dataset.b,`${ar.englishName} ${n}:${t.dataset.b}`);t.textContent=isBm('ayah',n+':'+t.dataset.b)?'★':'☆'}
  if(t.dataset.c!=null){const i=+t.dataset.c,s=`${A[i].text}\n${en.ayahs[i].text}\n(${ar.englishName} ${n}:${A[i].numberInSurah})`;navigator.clipboard.writeText(s).then(()=>toast('Copied'))}
  if(t.dataset.s!=null){const i=+t.dataset.s,s=`${A[i].text}\n${en.ayahs[i].text}\n(${ar.englishName} ${n}:${A[i].numberInSurah})`;navigator.share?navigator.share({text:s}):navigator.clipboard.writeText(s).then(()=>toast('Copied'))}};
 $('#fs').onclick=()=>{document.body.classList.toggle('full');document.documentElement.requestFullscreen?.().catch(()=>{})};
 if(from>1)$('#a'+from)?.scrollIntoView()}
/* ---------- PRAYER ---------- */
R.prayer=async()=>{loading();const j=await timings(),t=j.data.timings,h=j.data.date.hijri;
 const rem=store.get('rem',false);
 app.innerHTML=`<h1>Prayer times</h1><div class="card"><div class="mute">${h.day} ${h.month.en} ${h.year} AH · ${j.data.meta.timezone}</div><div class="big" id="np"></div></div>
 <div class="grid">${['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha','Sunset'].map(p=>`<div class="card"><b>${p}</b><div class="big">${t[p]}</div>${PR.includes(p)?`<label><input type="checkbox" ${prog()['pr'+p]?'checked':''} onchange="tick('pr${p}')"> prayed</label>`:''}</div>`).join('')}</div>
 <div class="card row"><label>Method <select id="m">${[[1,'Karachi'],[2,'ISNA'],[3,'MWL'],[4,'Umm al-Qura'],[5,'Egyptian'],[7,'Tehran'],[8,'Gulf'],[9,'Kuwait'],[10,'Qatar'],[11,'Singapore'],[12,'France'],[13,'Turkey']].map(([v,l])=>`<option value="${v}" ${v==settings.method?'selected':''}>${l}</option>`).join('')}</select></label>
 <label>Asr <select id="sc"><option value="0" ${!settings.school?'selected':''}>Shafi / standard<option value="1" ${settings.school?'selected':''}>Hanafi</select></label>
 <button id="nt">${rem?'Adhan alerts: on':'Enable Adhan alerts'}</button><a href="#/monthly">Monthly schedule</a><a href="#/ramadan">Ramadan</a></div>
 <p class="mute">Browser notifications work while the app is open or installed. Methods &amp; times from the Aladhan API.</p>`;
 const run=()=>{if(!$('#np'))return clearInterval(iv);const x=nextPrayer(t);$('#np').textContent=`${x.p} in ${cd(x.d-new Date())}`;if(store.get('rem')&&cd(x.d-new Date())==='00:00:00'&&Notification.permission==='granted')new Notification('Noor-e-Quran',{body:`It is time for ${x.p}`,icon:'icon.svg'})};run();var iv=setInterval(run,1000);
 $('#m').onchange=e=>{settings.method=+e.target.value;save();R.prayer()};$('#sc').onchange=e=>{settings.school=+e.target.value;save();R.prayer()};
 $('#nt').onclick=async()=>{const p=await Notification.requestPermission();store.set('rem',p==='granted');toast(p==='granted'?'Alerts enabled':'Permission denied');R.prayer()}};
R.monthly=async()=>{loading();const l=await loc(),d=new Date();const j=await api(`${AL}/calendar/${d.getFullYear()}/${d.getMonth()+1}?latitude=${l.lat}&longitude=${l.lng}&method=${settings.method}&school=${settings.school}`);
 app.innerHTML=`<h1>Monthly schedule</h1><div style="overflow-x:auto"><table class="card" style="width:100%;border-collapse:collapse"><tr><th>Date</th><th>Hijri</th>${PR.map(p=>`<th>${p}</th>`).join('')}</tr>${j.data.map(x=>`<tr style="border-top:1px solid var(--line)"><td>${x.date.gregorian.day}</td><td>${x.date.hijri.day} ${x.date.hijri.month.en}</td>${PR.map(p=>`<td>${x.timings[p].slice(0,5)}</td>`).join('')}</tr>`).join('')}</table></div>`};
R.ramadan=async()=>{loading();const l=await loc(),hy=(await api(`${AL}/gToH/${new Date().getDate()}-${new Date().getMonth()+1}-${new Date().getFullYear()}`)).data.hijri.year;
 const j=await api(`${AL}/hijriCalendar/9/${hy}?latitude=${l.lat}&longitude=${l.lng}&method=${settings.method}&school=${settings.school}`);
 const tt=await timings(),T=tt.data.timings,now=new Date(),mk=s=>{const[h,m]=s.split(':');const d=new Date();d.setHours(+h,+m,0,0);return d};
 let iftar=mk(T.Maghrib),suhoor=mk(T.Fajr);if(now>iftar)iftar.setDate(iftar.getDate()+1);if(now>suhoor)suhoor.setDate(suhoor.getDate()+1);
 app.innerHTML=`<h1>Ramadan ${hy} AH</h1><div class="card"><div>Suhoor ends in <span class="big" id="su"></span></div><div>Iftar in <span class="big" id="if"></span></div></div>
 <div style="overflow-x:auto"><table class="card" style="width:100%"><tr><th>Day</th><th>Date</th><th>Suhoor (Fajr)</th><th>Iftar (Maghrib)</th></tr>${j.data.map(x=>`<tr><td>${x.date.hijri.day}</td><td>${x.date.gregorian.date}</td><td>${x.timings.Fajr.slice(0,5)}</td><td>${x.timings.Maghrib.slice(0,5)}</td></tr>`).join('')}</table></div>`;
 const run=()=>{if(!$('#su'))return clearInterval(iv);$('#su').textContent=cd(suhoor-new Date());$('#if').textContent=cd(iftar-new Date())};run();var iv=setInterval(run,1000)};
/* ---------- QIBLA ---------- */
R.qibla=async()=>{loading();const l=await loc(),j=await api(`${AL}/qibla/${l.lat}/${l.lng}`),q=j.data.direction;
 app.innerHTML=`<h1>Qibla</h1><div class="card" style="text-align:center"><p class="big">${q.toFixed(1)}° from North</p>
 <svg id="cmp" viewBox="-110 -110 220 220" width="260" style="transition:transform .2s"><circle r="100" fill="none" stroke="#bc935d" stroke-width="3"/><text y="-84" text-anchor="middle" fill="#bc935d" font-size="14">N</text>
 <g transform="rotate(${q})"><path d="M0-80L10 0L0 14L-10 0Z" fill="#bc935d"/><text y="-88" x="0" text-anchor="middle" font-size="18">🕋</text></g></svg>
 <p class="mute" id="hd">Rotate your phone: the compass turns to match your heading where sensors are available. Otherwise, point the Kaaba marker relative to North.</p><button id="en" class="pri">Enable compass</button></div>`;
 $('#en').onclick=async()=>{try{if(DeviceOrientationEvent.requestPermission&&await DeviceOrientationEvent.requestPermission()!=='granted')return}catch{}
  addEventListener('deviceorientationabsolute',o=>{if(o.alpha!=null)$('#cmp').style.transform=`rotate(${o.alpha}deg)`},true);
  addEventListener('deviceorientation',o=>{const h=o.webkitCompassHeading;if(h!=null&&$('#cmp'))$('#cmp').style.transform=`rotate(${-h}deg)`},true)}};
/* ---------- TASBEEH (offline) ---------- */
const DHIKR=[['SubhanAllah','سُبْحَانَ ٱللَّٰهِ'],['Alhamdulillah','ٱلْحَمْدُ لِلَّٰهِ'],['Allahu Akbar','ٱللَّٰهُ أَكْبَرُ'],['Astaghfirullah','أَسْتَغْفِرُ ٱللَّٰهَ'],['La ilaha illallah','لَا إِلَٰهَ إِلَّا ٱللَّٰهُ'],['Durood Sharif','ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ']];
R.tasbeeh=()=>{let s=store.get('tas',{total:0,days:{},sessions:[],custom:[],cur:0,count:0,target:33,sound:false,vib:true});s.custom=s.custom||[];
 const all=()=>DHIKR.concat(s.custom),C=2*Math.PI*110;
 const draw=()=>{const d=all()[s.cur]||all()[0],p=Math.min(1,s.count/s.target);
  app.innerHTML=`<h1>Tasbeeh</h1><div class="card" style="text-align:center"><select id="dh">${all().map((x,i)=>`<option value="${i}" ${i==s.cur?'selected':''}>${esc(x[0])}</option>`).join('')}</select> <select id="tg">${[33,99,100,500,1000].map(v=>`<option ${v==s.target?'selected':''}>${v}</option>`).join('')}</select>
  <div class="ar" style="text-align:center">${esc(d[1])}</div><div class="ring" id="rg"><svg width="260" height="260"><circle cx="130" cy="130" r="110" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="130" cy="130" r="110" fill="none" stroke="#bc935d" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-p)}"/></svg><button id="tp" aria-label="Count">${s.count}</button></div>
  <div class="row" style="justify-content:center"><button id="un">Undo</button><button id="rs">Reset</button><button id="sv">Save session</button><label><input type="checkbox" id="sn" ${s.sound?'checked':''}> Sound</label><label><input type="checkbox" id="vb" ${s.vib?'checked':''}> Vibrate</label></div>
  <p class="mute">Today ${s.days[today()]||0} · Lifetime ${s.total}</p><div class="row"><input id="cn" placeholder="Custom dhikr"><button id="ca">Add</button></div></div>
  <div class="card"><h3>Sessions</h3>${s.sessions.slice(-8).reverse().map(x=>`<div>${esc(x.n)} — ${x.c} <span class="mute">${x.d}</span></div>`).join('')||'<span class="mute">No saved sessions.</span>'}</div>`;
  const W=()=>store.set('tas',s);
  $('#tp').onclick=()=>{s.count++;s.total++;s.days[today()]=(s.days[today()]||0)+1;const pr=prog();pr.tasbeeh=true;store.set('prog:'+today(),pr);
   if(s.vib)navigator.vibrate?.(s.count>=s.target?[80,40,80]:15);if(s.sound)beep(s.count>=s.target);W();const done=s.count===s.target;draw();$('#tp').classList.add('tap');if(done){$('#rg').classList.add('done');toast('Target reached – masha’Allah!')}};
  $('#un').onclick=()=>{if(s.count>0){s.count--;s.total--;s.days[today()]--;W();draw()}};$('#rs').onclick=()=>{s.count=0;W();draw()};
  $('#sv').onclick=()=>{if(s.count){s.sessions.push({n:d[0],c:s.count,d:new Date().toLocaleString()});s.count=0;W();draw()}};
  $('#dh').onchange=e=>{s.cur=+e.target.value;s.count=0;W();draw()};$('#tg').onchange=e=>{s.target=+e.target.value;W();draw()};
  $('#sn').onchange=e=>{s.sound=e.target.checked;W()};$('#vb').onchange=e=>{s.vib=e.target.checked;W()};
  $('#ca').onclick=()=>{const v=$('#cn').value.trim();if(v){s.custom.push([v,v]);s.cur=all().length-1;s.count=0;W();draw()}}};draw()};
function beep(big){try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=big?880:520;g.gain.value=.08;o.start();o.stop(c.currentTime+(big?.3:.05))}catch{}}
/* ---------- HADITH (fawazahmed0 hadith-api via jsDelivr; grades shown only when provided) ---------- */
const HB=[['bukhari','Sahih al-Bukhari'],['muslim','Sahih Muslim'],['abudawud','Sunan Abu Dawood'],['tirmidhi','Jami at-Tirmidhi'],['nasai',"Sunan an-Nasa'i"],['ibnmajah','Sunan Ibn Majah'],['nawawi40','Forty Hadith of Imam Nawawi']];
R.hadith=async(b,sec)=>{if(b&&sec)return hadithSec(b,+sec);
 if(b){loading();const j=await api(`${HD}/eng-${b}.json`);const secs=j.metadata.section,det=j.metadata.section_detail;
  return app.innerHTML=`<h1>${esc(HB.find(x=>x[0]===b)?.[1])}</h1><div class="grid">${Object.keys(secs).filter(k=>secs[k]).map(k=>`<a class="card" href="#/hadith/${b}/${k}">${k}. ${esc(secs[k])}<div class="mute">#${det[k]?.hadithnumber_first}–${det[k]?.hadithnumber_last}</div></a>`).join('')}</div>`}
 app.innerHTML=`<h1>Hadith</h1><p class="mute">Sunnah collections via the open Hadith API. Grading is shown only where the source provides it.</p><div class="grid">${HB.map(x=>`<a class="card" href="#/hadith/${x[0]}">${x[1]}</a>`).join('')}</div>
 <div class="card"><h3>Hadith of the day</h3><div id="hod"><div class="skel"></div></div></div>`;
 const d=new Date(),n=1+(d.getFullYear()*400+d.getMonth()*31+d.getDate())%40;
 api(`${HD}/eng-nawawi40/${n}.json`).then(j=>{const h=j.hadiths[0];$('#hod').innerHTML=`<p>${esc(h.text)}</p><span class="mute">Forty Hadith of Imam Nawawi #${h.hadithnumber}</span>`;const pr=prog();pr.hadith=true;store.set('prog:'+today(),pr)}).catch(()=>$('#hod').textContent='Unavailable offline.')};
async function hadithSec(b,s){loading();const[e,a]=await Promise.all([api(`${HD}/eng-${b}/sections/${s}.json`),api(`${HD}/ara-${b}/sections/${s}.json`).catch(()=>null)]);
 const name=HB.find(x=>x[0]===b)[1];pushHistory({hash:`#/hadith/${b}/${s}`,label:`${name} – section ${s}`});
 app.innerHTML=`<h1>${esc(name)}</h1><p class="mute">${esc(e.metadata.section?.[s]||'')}</p><input id="hs" placeholder="Search in this section…" style="width:100%">`+
 `<div id="hl">${e.hadiths.map((h,i)=>{const ar=a?.hadiths?.[i];const g=(h.grades||[]).map(x=>`${esc(x.name)}: ${esc(x.grade)}`).join(' · ');
  return`<div class="card hh">${ar?`<div class="ar" style="font-size:1.4rem">${esc(ar.text)}</div>`:''}<p>${esc(h.text)}</p><div class="mute">${name} #${h.hadithnumber} · ${g||'Grading not provided by this source'}</div>
  <div class="row"><button onclick="toggleBm('hadith','${b}:${h.hadithnumber}','${esc(name)} #${h.hadithnumber}')">★ Save</button><button onclick="navigator.clipboard.writeText(\`${esc(h.text).replace(/`/g,'')}\n— ${esc(name)} #${h.hadithnumber}\`).then(()=>toast('Copied'))">Copy</button></div></div>`}).join('')}</div>`;
 $('#hs').oninput=ev=>document.querySelectorAll('.hh').forEach(c=>c.style.display=c.textContent.toLowerCase().includes(ev.target.value.toLowerCase())?'':'none')}
/* ---------- ASMA UL HUSNA ---------- */
R.names=async()=>{loading();const j=await api(AL+'/asmaAlHusna');
 app.innerHTML=`<h1>99 Names of Allah</h1><div class="grid">${j.data.map(n=>`<div class="card"><div class="ar" style="text-align:center;font-size:2rem">${n.name}</div><b>${n.number}. ${esc(n.transliteration)}</b><p>${esc(n.en.meaning)}</p></div>`).join('')}</div><p class="mute">Source: Aladhan API. Use your device's text-to-speech or a trusted reciter for pronunciation.</p>`};
/* ---------- DUAS (Quranic duas fetched by verse from AlQuran Cloud; no invented text) ---------- */
const DUAS=[['Seeking good in both worlds','2:201'],['Forgiveness & mercy','2:286'],['Guidance of the heart','3:8'],['Parents','17:24'],['Ease & expanded chest','20:25-28'],['Increase in knowledge','20:114'],['Relief from distress','21:87'],['Protection from whisperings','23:97-98'],['Righteous family','25:74'],['Gratitude','27:19'],['Istighfar of Adam','7:23'],['Steadfastness','2:250'],['Travel','43:13-14']];
R.dua=async d=>{if(d!=null)return duaView(+d);
 app.innerHTML=`<h1>Duas &amp; Azkar</h1><p class="mute">Quranic supplications loaded verse by verse from the Quran API. Hadith-based Azkar: browse <a href="#/hadith">collections</a> (e.g. Riyad as-Salihin sections) for authenticated references.</p>
 <div class="grid">${DUAS.map((x,i)=>`<a class="card" href="#/dua/${i}">${x[0]}<div class="mute">Quran ${x[1]}</div></a>`).join('')}</div>`};
async function duaView(i){loading();const[t,r]=DUAS[i],[s,v]=t.split(':'),[v1,v2]=v.split('-').map(Number),ids=Array.from({length:(v2||v1)-v1+1},(_,k)=>v1+k);
 const rows=await Promise.all(ids.map(a=>api(`${Q}/ayah/${s}:${a}/editions/quran-uthmani,${settings.trans},ur.jalandhry,en.transliteration`)));
 const c=store.get('dc:'+i+':'+today(),0);
 app.innerHTML=`<h1>${t?'':''}${DUAS[i][0]}</h1>`+rows.map(j=>{const[a,e,u,tr]=j.data;return`<div class="card"><div class="ar">${a.text}</div><p><i>${esc(tr.text)}</i></p><p>${esc(e.text)}</p><p class="ur">${esc(u.text)}</p><span class="mute">Quran ${a.surah.englishName} ${a.surah.number}:${a.numberInSurah}</span>
 <div class="row"><button onclick="player.src='https://cdn.islamic.network/quran/audio/128/${settings.reciter}/${a.number}.mp3';player.play()">▶ Listen</button><button onclick="toggleBm('dua','${i}','${esc(DUAS[i][0])}')">★ Save</button></div></div>`}).join('')+
 `<div class="card row">Repetition today: <b id="dc">${c}</b><button class="pri" onclick="store.set('dc:${i}:${today()}',${c+1});duaView(${i})">+1</button></div>`}
/* ---------- TOOLS ---------- */
R.tools=()=>{app.innerHTML=`<h1>Islamic tools</h1><div class="grid"><a class="card" href="#/zakat">Zakat calculator</a><a class="card" href="#/sadaqah">Sadaqah tracker</a><a class="card" href="#/calendar">Hijri converter</a><a class="card" href="#/ramadan">Ramadan planner</a><a class="card" href="#/qibla">Qibla compass</a></div>
 <div class="card"><h3>Hajj &amp; Umrah guides</h3><p class="mute">Use official sources, e.g. the Saudi Ministry of Hajj and Umrah (<a href="https://www.haj.gov.sa" target="_blank" rel="noopener">haj.gov.sa</a>).</p></div>`};
R.zakat=()=>{const f=[['cash','Cash & savings'],['gold','Gold (value)'],['silver','Silver (value)'],['inv','Investments / trade goods'],['recv','Money owed to you'],['debt','Liabilities (due now)']];
 app.innerHTML=`<h1>Zakat calculator</h1><div class="card">${f.map(([k,l])=>`<p><label>${l}<br><input id="${k}" type="number" min="0" value="0"></label></p>`).join('')}<p><label>Nisab (value of 87.48 g gold or 612.36 g silver – enter today's value)<br><input id="nisab" type="number" min="0" value="0"></label></p><button class="pri" id="cz">Calculate</button><div id="zr" class="big"></div>
 <p class="mute">Assumptions: 2.5% on net zakatable wealth held for one lunar year, if it reaches the nisab. Many scholars favour the silver nisab. Opinions differ on details (jewellery, debts); consult a scholar. Estimate only.</p></div>`;
 $('#cz').onclick=()=>{const v=k=>+$('#'+k).value||0,net=v('cash')+v('gold')+v('silver')+v('inv')+v('recv')-v('debt');$('#zr').textContent=net>=v('nisab')&&net>0?`Zakat due ≈ ${(net*.025).toFixed(2)}`:`Below nisab (net ${net.toFixed(2)}): no zakat due`}};
R.sadaqah=()=>{const L=store.get('sad',[]);app.innerHTML=`<h1>Sadaqah tracker</h1><div class="card row"><input id="am" type="number" placeholder="Amount"><input id="nt" placeholder="Note"><button class="pri" id="ad">Add</button></div><div class="card"><b>Total: ${L.reduce((a,x)=>a+x.a,0)}</b>${L.slice().reverse().map(x=>`<div>${x.d} — ${x.a} ${esc(x.n)}</div>`).join('')}</div>`;
 $('#ad').onclick=()=>{const a=+$('#am').value;if(a>0){L.push({a,n:$('#nt').value,d:today()});store.set('sad',L);R.sadaqah()}}};
/* ---------- CALENDAR ---------- */
R.calendar=async()=>{loading();const d=new Date(),h=(await api(`${AL}/gToH/${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`)).data.hijri;
 const ev=await api(`${AL}/specialDays`).catch(()=>({data:[]}));
 app.innerHTML=`<h1>Islamic calendar</h1><div class="card"><div class="big">${h.day} ${h.month.en} ${h.year} AH</div><div class="mute">${d.toDateString()}</div></div>
 <div class="card"><h3>Convert</h3><div class="row"><input type="date" id="gd" value="${today()}"><button id="g2h">Gregorian → Hijri</button></div><div class="row" style="margin-top:8px"><input id="hd" placeholder="DD-MM-YYYY (Hijri)"><button id="h2g">Hijri → Gregorian</button></div><div id="cr" class="big"></div></div>
 <div class="card"><h3>Islamic events</h3>${(ev.data||[]).map(e=>`<div>${e.day}/${e.month} Hijri — ${esc(e.name)}</div>`).join('')||'<span class="mute">Unavailable.</span>'}</div>`;
 $('#g2h').onclick=async()=>{const[y,m,dd]=$('#gd').value.split('-');const r=await api(`${AL}/gToH/${dd}-${m}-${y}`);$('#cr').textContent=`${r.data.hijri.day} ${r.data.hijri.month.en} ${r.data.hijri.year} AH`};
 $('#h2g').onclick=async()=>{try{const r=await api(`${AL}/hToG/${$('#hd').value}`);$('#cr').textContent=r.data.gregorian.date}catch{toast('Use DD-MM-YYYY')}}};
/* ---------- BOOKMARKS / SETTINGS ---------- */
R.bookmarks=()=>{const b=bm(),hr={ayah:x=>'#/quran/'+x.id.split(':').join('/'),hadith:x=>'#/hadith/'+x.id.split(':')[0],dua:x=>'#/dua/'+x.id};
 app.innerHTML=`<h1>Saved</h1>${b.map(x=>`<div class="card"><a href="${hr[x.type](x)}">${esc(x.label)}</a> <span class="mute">${x.type}</span></div>`).join('')||'<p class="mute">Bookmark ayahs, hadith and duas to find them here.</p>'}
 <div class="card"><h3>Search everything</h3><input id="gs" placeholder="Quran keyword…"><button id="gg" class="pri">Search</button></div>`;
 $('#gg').onclick=()=>location.hash='#/quran/search/'+encodeURIComponent($('#gs').value)};
R.settings=()=>{app.innerHTML=`<h1>Settings</h1><div class="card">
 <p><label>Theme <select id="th"><option value="dark" ${settings.theme=='dark'?'selected':''}>Dark<option value="light" ${settings.theme=='light'?'selected':''}>Light</select></label></p>
 <p><label>Translation <select id="tr"><option value="en.sahih">English – Saheeh International<option value="en.yusufali">English – Yusuf Ali<option value="en.pickthall">English – Pickthall</select></label></p>
 <p><label><input type="checkbox" id="ur" ${settings.urdu?'checked':''}> Show Urdu (Jalandhry)</label></p>
 <p>Location: <b>${settings.lat!=null?settings.lat.toFixed(3)+', '+settings.lng.toFixed(3):'not set'}</b><br><input id="la" placeholder="Latitude"> <input id="ln" placeholder="Longitude"> <button id="sl">Set</button> <button id="gp">Use GPS</button></p>
 <p><button id="ex">Export my data</button> <button id="cl">Clear cached data</button></p>
 <p class="mute">Optional cloud sync/accounts require a backend; this build stores everything on-device and exports JSON backup.</p></div>`;
 $('#th').onchange=e=>{settings.theme=e.target.value;save();applyTheme()};$('#tr').value=settings.trans;$('#tr').onchange=e=>{settings.trans=e.target.value;save()};$('#ur').onchange=e=>{settings.urdu=e.target.checked;save()};
 $('#sl').onclick=()=>{const a=parseFloat($('#la').value),o=parseFloat($('#ln').value);if(isNaN(a)||isNaN(o))return toast('Enter valid numbers');settings.lat=a;settings.lng=o;save();R.settings()};
 $('#gp').onclick=()=>{settings.lat=null;loc().then(()=>R.settings()).catch(e=>toast(e.message))};
 $('#ex').onclick=()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('noor.')&&!k.startsWith('noor.c:'))o[k]=localStorage.getItem(k)}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));a.download='noor-backup.json';a.click()};
 $('#cl').onclick=()=>{Object.keys(localStorage).filter(k=>k.startsWith('noor.c:')).forEach(k=>localStorage.removeItem(k));toast('Cache cleared')}};
/* ---------- top bar, ripple, scroll progress ---------- */
const setTT=()=>$('#tt').textContent=settings.theme==='dark'?'☀':'☾';setTT();
$('#tt').onclick=()=>{settings.theme=settings.theme==='dark'?'light':'dark';save();applyTheme();setTT();$('#tt').classList.add('spin');setTimeout(()=>$('#tt').classList.remove('spin'),500)};
$('#mb').onclick=()=>document.body.classList.toggle(innerWidth<640?'drawer':'rail');
$('#scrim').onclick=()=>document.body.classList.remove('drawer');
if(innerWidth<1024)document.body.classList.add('rail');
$('#sq').onkeydown=e=>{const v=e.target.value.trim();if(e.key==='Enter'&&v){location.hash='#/quran/search/'+encodeURIComponent(v);e.target.blur()}};
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b)return;const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),d=document.createElement('span');d.className='rp';d.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.appendChild(d);setTimeout(()=>d.remove(),600)});
addEventListener('scroll',()=>{$('#bar').style.width=(scrollY/((document.documentElement.scrollHeight-innerHeight)||1)*100)+'%'},{passive:true});
{const d=new Date();api(`${AL}/gToH/${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`).then(r=>{const h=r.data.hijri;$('#hj').textContent=`${h.day} ${h.month.en} ${h.year} AH`}).catch(()=>{})}
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js');
route();
