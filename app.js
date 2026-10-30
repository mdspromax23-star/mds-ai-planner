const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const fa=n=>new Intl.NumberFormat('fa-IR').format(n);
const KEY='mds-planner-v1',cats=['مطالعه','تکالیف','استراحت','ورزش','تفریح','سایر'];
let tasks=[];
try{tasks=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(tasks))tasks=[]}catch{tasks=[]}
let filter='all',pending=[];
$('#date').textContent=new Intl.DateTimeFormat('fa-IR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());

function save(){
  try{localStorage.setItem(KEY,JSON.stringify(tasks));$('#saved').textContent='● ذخیره شد روی این دستگاه'}
  catch{$('#saved').textContent='ذخیره‌سازی این دستگاه در دسترس نیست'}
  render();
}
function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
  const done=tasks.filter(t=>t.done).length,total=tasks.length,p=total?Math.round(done/total*100):0;
  const mins=tasks.reduce((a,t)=>a+Number(t.duration||0),0);
  $('#total').textContent=fa(total);$('#done').textContent=fa(done);$('#minutes').textContent=fa(mins);
  $('#percent').textContent=fa(p)+'٪';$('#reportPct').textContent=fa(p)+'٪';$('#ringText').textContent=fa(p)+'٪';
  $('#ring').style.background='conic-gradient(var(--purple) '+(p*3.6)+'deg,#342b40 0deg)';
  $('#reportText').textContent=total?fa(done)+' کار از '+fa(total)+' کار انجام شده است.':'با ثبت اولین کار، گزارش تو اینجا نمایش داده می‌شود.';
  const sorted=[...tasks].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
  const row=t=>'<div class="task '+(t.done?'done':'')+'"><button class="check" data-toggle="'+safe(t.id)+'">'+(t.done?'✓':'')+'</button><div class="task-info"><b>'+safe(t.title)+'</b><small>'+safe(t.category)+(t.time?' · '+safe(t.time):'')+'</small></div><span class="duration">'+fa(t.duration)+' دقیقه</span><button class="delete" data-delete="'+safe(t.id)+'">×</button></div>';
  $('#todayTasks').innerHTML=sorted.filter(t=>!t.done).slice(0,5).map(row).join('');
  $('#empty').style.display=tasks.some(t=>!t.done)?'none':'block';
  $('#allTasks').innerHTML=sorted.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done)).map(row).join('')||'<div class="empty">فعلاً کاری در این بخش نیست.</div>';
  $('#categories').innerHTML=cats.map(c=>'<div class="category">'+c+'<b>'+fa(tasks.filter(t=>t.category===c).length)+'</b></div>').join('');
}
function open(page){
  $$('.page').forEach(x=>x.classList.toggle('show',x.id===page));
  $$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  $('#title').textContent=({home:'داشبورد',tasks:'کارهای من',assistant:'دستیار برنامه‌ریز',reports:'گزارش پیشرفت'})[page];
  $('#sidebar').classList.remove('open');
}
$$('[data-page]').forEach(b=>b.onclick=()=>open(b.dataset.page));
$$('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));
$('#menu').onclick=()=>$('#sidebar').classList.toggle('open');
$('#add').onclick=()=>$('#taskDialog').showModal();
$('#cancel').onclick=()=>$('#taskDialog').close();
$('#taskForm').onsubmit=e=>{
  e.preventDefault();
  tasks.push({id:Date.now().toString(),title:$('#taskTitle').value.trim(),category:$('#taskCategory').value,duration:Number($('#taskDuration').value),time:$('#taskTime').value,done:false});
  $('#taskDialog').close();$('#taskForm').reset();$('#taskDuration').value=30;save();
};
$$('[data-filter]').forEach(b=>b.onclick=()=>{
  filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render();
});
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-toggle]'),d=e.target.closest('[data-delete]');
  if(t){tasks=tasks.map(x=>x.id===t.dataset.toggle?{...x,done:!x.done}:x);save()}
  if(d){tasks=tasks.filter(x=>x.id!==d.dataset.delete);save()}
});

/* موتور برنامه‌ریز محلی: متن فارسی را تحلیل می‌کند و بر اساس زمان، انرژی، درس و کارهای موجود پیشنهاد می‌دهد. */
function normalize(s){
  return String(s).toLowerCase()
    .replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/ي/g,'ی').replace(/ك/g,'ک')
    .replace(/[؟?،,!.؛:]/g,' ').replace(/\s+/g,' ').trim();
}
const wordNumbers={'یک':1,'یه':1,'دو':2,'سه':3,'چهار':4,'پنج':5,'شش':6,'شیش':6,'هفت':7,'هشت':8,'نه':9,'ده':10};
function requestedMinutes(raw){
  const s=normalize(raw);
  let m=s.match(/(\d+)\s*(ساعت|ساعته|دقیقه)/);
  if(m)return Math.max(20,Math.min(480,Number(m[1])*(m[2]==='دقیقه'?1:60)));
  if(/نیم\s*ساعت/.test(s))return 30;
  for(const [w,n] of Object.entries(wordNumbers)){
    if(new RegExp(w+'\\s*(ساعت|ساعته)').test(s))return n*60;
    if(new RegExp(w+'\\s*دقیقه').test(s))return n;
  }
  return null;
}
function say(text,who){
  const el=document.createElement('div');el.className='bubble '+who;el.textContent=text;
  $('#messages').append(el);$('#messages').scrollTop=$('#messages').scrollHeight;
}
function addPlanButton(){
  const b=document.createElement('button');b.className='primary';b.textContent='＋ افزودن پیشنهادها به برنامه';
  b.onclick=()=>{
    let added=0,skipped=0;
    pending.forEach((x,i)=>{
      const exists=tasks.some(t=>normalize(t.title)===normalize(x.title)&&!t.done);
      if(exists){skipped++;return}
      tasks.push({id:Date.now()+'-'+i+'-'+Math.random().toString(16).slice(2,6),title:x.title,category:x.category,duration:x.duration,time:'',done:false});added++;
    });
    save();
    say(added?'✅ '+fa(added)+' کار به فهرستت اضافه شد.'+(skipped?' '+fa(skipped)+' مورد تکراری رد شد.':''):'این پیشنهادها از قبل در فهرستت هستند.','bot');
    b.remove();
  };
  $('#messages').append(b);
}
function assistantReply(raw){
  const s=normalize(raw);
  const energyLow=/خسته|کم انرژی|بی حال|بی‌حال|حوصله ندارم|انرژی ندارم/.test(s);
  const energyHigh=/انرژی زیاد|سرحال|پرانرژی|تمرکز بالا/.test(s);
  const exam=/امتحان|آزمون|تست|فردا امتحان|پس فردا/.test(s);
  const tomorrow=/فردا|پس فردا|پس‌فردا/.test(s);
  const subjectList=['ریاضی','علوم','فارسی','ادبیات','عربی','انگلیسی','زبان','مطالعات اجتماعی','مطالعات','قرآن','هندسه','فیزیک','شیمی','زیست','جغرافیا','تاریخ'];
  const subject=subjectList.find(x=>s.includes(normalize(x)));
  const study=/درس|مطالعه|بخون|بخوان|مرور|امتحان|آزمون|ریاضی|علوم|فارسی|عربی|انگلیسی/.test(s);
  const homework=/تکلیف|مشق|تمرین|واجب/.test(s);
  const sport=/ورزش|پیاده روی|پیاده‌روی|تمرین بدنی/.test(s);
  const fun=/بازی|تفریح|سرگرمی/.test(s);
  const rest=/استراحت|خسته|خواب/.test(s);
  const schedule=/برنامه|برنامه ریزی|برنامه‌ریزی|بچین|مرتب کن|پیشنهاد|امروز/.test(s)||study||homework||sport;
  const minutes=requestedMinutes(raw);
  const openTasks=tasks.filter(t=>!t.done);
  if(/چند کار|تعداد کار|گزارش|وضعیت برنامه/.test(s)){
    const done=tasks.filter(t=>t.done).length;
    return 'گزارش فعلی تو: '+fa(openTasks.length)+' کار باقی مانده و '+fa(done)+' کار انجام‌شده داری. مجموع زمان ثبت‌شده '+fa(tasks.reduce((a,t)=>a+Number(t.duration||0),0))+' دقیقه است.';
  }
  if(/سلام|درود|خوبی/.test(s)&&!schedule){
    return 'سلام! 🌟 من می‌تونم درخواستت رو به کارهای کوچک‌تر تبدیل کنم، زمان مطالعه رو با انرژی و وقتت هماهنگ کنم و از فهرست فعلی‌ات کمک بگیرم. مثلاً بگو «فردا امتحان ریاضی دارم، ۹۰ دقیقه وقت دارم و کمی خسته‌ام».';
  }
  if(!schedule&&!/کمک|چیکار|چه کار/.test(s)){
    return 'متوجه شدم. برای اینکه پیشنهاد دقیق‌تری بدهم، بگو هدفت مطالعه است، انجام تکلیف، استراحت یا ترکیبی از این‌ها؟ زمان آزاد و میزان انرژی‌ات را هم بنویس.';
  }

  if(/مرتب کن|برنامه امروز|کارهای امروز|فهرست کارها|برنامه ام|برنامه‌ام/.test(s)&&openTasks.length){
    const sorted=[...openTasks].sort((a,b)=>{
      const rank=t=>t.category==='مطالعه'?0:t.category==='تکالیف'?1:t.category==='ورزش'?2:3;
      return rank(a)-rank(b)||Number(b.duration||0)-Number(a.duration||0);
    });
    return 'این ترتیب پیشنهادی بر اساس تمرکز و نوع کارهاست:\n'+sorted.slice(0,8).map((t,i)=>(i+1)+'. '+t.title+' · '+fa(t.duration)+' دقیقه').join('\n')+'\n\nکارها را حذف یا جابه‌جا نکردم؛ فقط ترتیب پیشنهادی را نشان دادم. کار مهم‌تر را اول انجام بده و بین دو کار سنگین استراحت کوتاه بگذار.';
  }

  const plan=[];
  const push=(title,category,duration)=>plan.push({title,category,duration});
  if(exam){
    push(subject?'مرور '+subject+' برای '+(tomorrow?'امتحان فردا':'امتحان'):'مرور درس امتحانی','مطالعه',energyLow?25:40);
    push('حل نمونه‌سؤال و بررسی نکته‌های سخت','تکالیف',energyLow?20:30);
    push('مرور نکته‌ها بدون نگاه به جزوه','مطالعه',20);
  }else{
    if(study){
      push(subject?'مطالعه '+subject:'مطالعه درس اصلی','مطالعه',energyLow?25:energyHigh?50:40);
      push('تمرین و یادآوری نکته‌های مهم','مطالعه',energyLow?15:25);
    }
    if(homework)push('انجام تکالیف و تمرین‌ها','تکالیف',energyLow?20:35);
    if(!study&&!homework&&openTasks.length&&/برنامه|مرتب|بچین/.test(s)){
      openTasks.slice(0,4).forEach(t=>push(t.title,t.category,Number(t.duration)||25));
    }
  }
  if(sport)push('ورزش یا پیاده‌روی سبک','ورزش',20);
  if(fun)push('زمان تفریح و سرگرمی','تفریح',20);
  if(rest&&!energyLow)push('استراحت و فاصله گرفتن از صفحه‌نمایش','استراحت',15);
  if(energyLow&&!study&&!homework&&!sport&&!fun){push('شروع آرام: مرور کوتاه یک درس','مطالعه',20);push('استراحت کوتاه','استراحت',10);}
  if(!plan.length&&openTasks.length&&/برنامه|امروز|بچین/.test(s)){
    openTasks.slice(0,4).forEach(t=>push(t.title,t.category,Number(t.duration)||25));
  }
  if(!plan.length){
    return 'برای ساختن یک برنامه عملی، هدفت را مشخص کن؛ مثلاً «مطالعه علوم و انجام تکالیف، یک ساعت و نیم وقت دارم». لازم نیست همه جزئیات را دقیق بنویسی.';
  }

  const budget=minutes||Math.max(60,Math.min(150,plan.reduce((a,x)=>a+x.duration,0)+15));
  let breaks=Math.min(2,Math.max(0,Math.floor((plan.length-1)/2)));
  let workBudget=Math.max(15,budget-breaks*10);
  if(plan.length*10>workBudget)plan.splice(Math.max(1,Math.floor(workBudget/10)));
  breaks=Math.min(2,Math.max(0,Math.floor((plan.length-1)/2)));
  workBudget=Math.max(15,budget-breaks*10);
  const desired=plan.reduce((a,x)=>a+x.duration,0);
  if(desired>workBudget){
    let left=workBudget;
    plan.forEach((x,i)=>{
      const reserve=(plan.length-i-1)*10;
      const take=i===plan.length-1?left:Math.max(10,Math.min(x.duration,left-reserve));
      x.duration=take;left-=take;
    });
  }
  const finalPlan=[];
  plan.forEach((x,i)=>{
    finalPlan.push(x);
    if(breaks&&i<plan.length-1&&(i%2===1))finalPlan.push({title:'استراحت کوتاه و نوشیدن آب',category:'استراحت',duration:10});
  });
  pending=finalPlan;
  const total=finalPlan.reduce((a,x)=>a+x.duration,0);
  const intro=exam?'چون امتحان نزدیک است، مرور و حل سؤال را در اولویت گذاشتم. ':energyLow?'چون گفتی انرژی‌ات کم است، بازه‌ها را کوتاه‌تر چیدم. ':energyHigh?'با توجه به انرژی خوبی که داری، یک بازه تمرکز بلندتر گذاشتم. ':'برنامه را به چند بخش قابل‌انجام تقسیم کردم. ';
  return intro+'\n\n'+finalPlan.map((x,i)=>(i+1)+'. '+x.title+' · '+fa(x.duration)+' دقیقه').join('\n')+'\n\nمجموع زمان: '+fa(total)+' دقیقه. '+(minutes?'این برنامه با زمان آزادی که گفتی تنظیم شده.':'زمان را می‌توانی با گفتن تعداد دقیقه یا ساعت تغییر بدهی.')+'\nاین پیشنهاد محلی است؛ هنوز به هوش مصنوعی آنلاین وصل نیستم.';
}
$('#chatForm').onsubmit=e=>{
  e.preventDefault();
  const s=$('#chatInput').value.trim();if(!s)return;
  say(s,'user');$('#chatInput').value='';
  const answer=assistantReply(s);say(answer,'bot');
  if(pending.length&&/\d+\. /.test(answer))addPlanButton();
};
$$('.quick button').forEach(b=>b.onclick=()=>{$('#chatInput').value=b.textContent;$('#chatForm').requestSubmit()});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
