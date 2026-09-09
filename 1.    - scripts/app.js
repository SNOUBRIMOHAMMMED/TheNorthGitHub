(() => {
const APP_KEY="lifeos_v11_accounts", SESSION_KEY="lifeos_v11_session";
const palette=["#5B8CFF","#37C98A","#FF6A64","#A57BFF","#FF9A4D","#39C7D2","#E7B94B","#F06CB5","#7D91FF"];
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const iso=()=>window.LifeCore.day();
const uid=()=>window.LifeCore.id();
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmtDate=()=>new Intl.DateTimeFormat(currentLang()==="ar"?"ar-MA":"en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());

const dict={
en:{

commandCenter:"EXECUTIVE COMMAND CENTER",dashboardSubtitle:"Your goals, signals and next decisions — in one view.",
activeGoals:"Active goals",activeGoalsHint:"in your system",onTrackGoals:"On track",onTrackGoalsHint:"above your line",
atRiskGoals:"Needs attention",atRiskGoalsHint:"below your line",todayExecution:"Today's execution",todayExecutionHint:"planned actions completed",
authExec1:"Direction before activity",authExec2:"Signals before distraction",authExec3:"Execution before complexity",privateWorkspace:"Private workspace",onTrackChart:"ON-TRACK",categoryLearning:"Learning",categoryBusiness:"Business",categoryHealth:"Health",categoryReading:"Reading",categoryFinance:"Finance",categoryPersonal:"Personal",

startNow:"Start now",heroPill:"YOUR PERSONAL EXECUTION SYSTEM",landingHeadline:"One life. A clear direction.",landingSub:"Bring your projects, goals and daily actions together. Protect your attention with focused work sessions, track every minute and build a rhythm that lasts.",buildMyLifeOS:"Build my LifeOS",seeHow:"See how it works",startsEmpty:"Starts completely empty",bilingual:"Arabic + English",mobileReady:"Built for phone and desktop",goalMoving:"Goal moving",belowTrackShort:"Below on-track level",oneSystem:"ONE SYSTEM",fromGoalToToday:"From the big goal to what you do today.",fromGoalToTodaySub:"LifeOS keeps the chain visible, so today's task always has a reason.",yearGoal:"Big goal",yearGoalSub:"Your destination",milestone:"Milestone",monthlyOutcome:"Outcome",weeklyOutcome:"Outcome",dailyAction:"Action",marketMindset:"MOMENTUM, NOT A TO-DO LIST",allGoalsOneChart:"All your goals. One market-style chart.",allGoalsOneChartSub:"Each goal gets its own color and line. Complete meaningful work and the line rises. Neglect it and momentum falls. The on-track line tells you what needs attention immediately.",featureLine1:"Every new goal starts at zero.",featureLine2:"One colored line for every goal.",featureLine3:"Risk becomes visible before you forget the goal.",clarityFirst:"CLARITY FIRST",openKnow:"Open LifeOS and know what matters in seconds.",seeMomentum:"See momentum",seeMomentumSub:"Know which goal is strongest, improving, flat or at risk.",smartSignals:"Smart signals",smartSignalsSub:"Dismissible in-app alerts highlight what is going well and what needs action.",nextMove:"Know the next move",nextMoveSub:"Your daily actions stay connected to the goal they are supposed to move.",yourSystem:"Make it yours",yourSystemSub:"Profile, Arabic or English, custom on-track level and your own goals from a blank start.",startZero:"START FROM ZERO",readyBuild:"Ready to build a life you can see moving?",readyBuildSub:"Create your account, define the first goal and let your daily actions build the line.",startNowFree:"Start now",back:"Back",
authKicker:"YOUR PERSONAL EXECUTION SYSTEM",authHeadline:"Lead your life with the same clarity you expect from your business.",authSub:"Goals, signals, execution and recovery — one private operating system for people who refuse to run on noise.",
authPoint1:"One board for the direction of every goal",authPoint2:"Know where your attention has the highest return",authPoint3:"Turn execution into visible momentum",
signIn:"Sign in",createAccount:"Create account",welcomeBack:"Welcome back to your command center",loginHint:"Continue from the exact point where your execution stopped.",email:"Email",password:"Password",
localAccountNote:"Trial account: your data is stored on this browser until cloud sync is connected.",buildYourSystem:"Create your private operating system",signupHint:"Start with your identity. Your workspace stays intentionally empty until you define what matters.",
yourName:"Your name",createMyAccount:"Create my account",dashboard:"Dashboard",goals:"Goals",today:"Today",planner:"Planner",notifications:"Notifications",account:"Account",accountSettings:"Account & settings",
addTask:"Add task",momentum:"Momentum",startHere:"START HERE",emptyHeadline:"What do you want to move forward first?",emptySub:"Create your first big goal. LifeOS will build its line from zero and connect your daily actions to it.",
createFirstGoal:"Create my first goal",todaySignals:"TODAY'S SIGNALS",whatMatters:"Executive signals",goalMarket:"GOAL MARKET",momentumDashboard:"Goal momentum map",
marketHint:"See direction, not noise. Every goal starts at zero and moves only when meaningful execution happens.",nextActions:"Highest-value actions",add:"Add",currentPosition:"Goal positions",
yourGoals:"Your goal portfolio",goalsHint:"Every important outcome, its current direction and the next horizon that matters.",newGoal:"New goal",executeToday:"Today’s execution",todayHint:"Do the work that moves important outcomes. Ignore the rest.",
planCascade:"From strategy to execution",plannerHint:"Keep the big picture intact while reducing it into actions you can execute.",goalSignals:"Signal center",notifHint:"Progress, risk, recovery and the wins that actually matter.",clearAll:"Clear all",
profileSettings:"Profile & control",accountHint:"Identity, language and control over your private workspace.",saveProfile:"Save profile",preferences:"Preferences",language:"Language",languageHint:"Switch the entire interface.",
onTrackLevel:"On-track level",onTrackHint:"The horizontal line your momentum should rise above.",backup:"Backup",backupHint:"Export before changing device or clearing browser data.",export:"Export",import:"Import",
signOut:"Sign out",signOutHint:"Your local data stays on this browser.",defineGoal:"Define your next destination",goalName:"Goal name",deadline:"Deadline",category:"Category",whyGoal:"Why does this matter?",
startsZero:"This goal will start at zero momentum and zero progress.",breakItDown:"BREAK IT DOWN",sixMonths:"6 months",threeMonths:"3 months",thisMonth:"This month",thisWeek:"This week",cancel:"Cancel",createGoal:"Create goal",
todayAction:"TODAY'S ACTION",moveGoal:"Move a goal today",task:"Task",linkedGoal:"Linked goal",momentumImpact:"Momentum impact",goalProgressImpact:"Goal progress",
goodMorning:"Good morning",goodAfternoon:"Good afternoon",goodEvening:"Good evening",peace:"Hello",strongest:"Strongest right now",needsAttention:"Needs attention",allSafe:"All goals are above the line",
keepRhythm:"Keep the rhythm. This is currently your strongest goal.",belowLine:"is below the on-track line. Complete one linked task today to start the recovery.",protectSystem:"Protect the system by completing today's key actions.",
noTasks:"No tasks yet. Add a concrete action linked to one of your goals.",noGoals:"No goals yet.",noNotifications:"No notifications yet.",noPlan:"Not defined yet",goalProgress:"Goal progress",noDeadline:"No deadline",
strong:"Strong",onTrack:"On track",attention:"Needs attention",atRisk:"At risk",delete:"Delete",viewGoal:"View goal",created:"Goal created",taskAdded:"Task added",saved:"Saved",wrongLogin:"Email or password is incorrect.",
accountExists:"An account with this email already exists.",accountCreated:"Account created.",createGoalFirst:"Create a goal first.",completed:"Completed",movedUp:"moved up",below:"Below on-track",historyEmpty:"Your line will grow as you execute."
},
ar:{

commandCenter:"مركز القيادة التنفيذي",dashboardSubtitle:"أهدافك، إشاراتك، والقرار التالي الذي يستحق وقتك — في شاشة واحدة.",
activeGoals:"الأهداف النشطة",activeGoalsHint:"داخل نظامك",onTrackGoals:"على المسار",onTrackGoalsHint:"فوق خطك المحدد",
atRiskGoals:"تحتاج انتباهك",atRiskGoalsHint:"تحت خط المسار",todayExecution:"تنفيذ اليوم",todayExecutionHint:"من أعمال اليوم المخططة",
authExec1:"الاتجاه قبل كثرة الحركة",authExec2:"الإشارات قبل التشتيت",authExec3:"التنفيذ قبل التعقيد",privateWorkspace:"مساحة عمل خاصة",onTrackChart:"المسار المطلوب",categoryLearning:"التعلّم",categoryBusiness:"الأعمال",categoryHealth:"الصحة",categoryReading:"القراءة",categoryFinance:"المال",categoryPersonal:"الحياة الشخصية",

startNow:"ابدأ الآن",heroPill:"نظامك الشخصي للتنفيذ",landingHeadline:"حياتك، بوضوح أكبر.",landingSub:"اجمع مشاريعك وأهدافك وأعمالك اليومية في مكان واحد. احمِ انتباهك بجلسات تركيز، وتتبع وقتك، وابنِ إيقاعًا تستطيع الاستمرار عليه.",buildMyLifeOS:"ابنِ نظام LifeOS الخاص بي",seeHow:"كيف يعمل؟",startsEmpty:"يبدأ فارغًا تمامًا",bilingual:"العربية + الإنجليزية",mobileReady:"مصمم للهاتف والكمبيوتر",goalMoving:"الهدف يتحرك",belowTrackShort:"تحت مستوى المسار الجيد",oneSystem:"نظام واحد",fromGoalToToday:"من الهدف الكبير إلى ما ستفعله اليوم.",fromGoalToTodaySub:"يحافظ LifeOS على السلسلة واضحة حتى يكون لكل مهمة يومية سبب.",yearGoal:"الهدف الكبير",yearGoalSub:"وجهتك",milestone:"مرحلة",monthlyOutcome:"نتيجة",weeklyOutcome:"نتيجة",dailyAction:"عمل",marketMindset:"الزخم، وليس مجرد قائمة مهام",allGoalsOneChart:"كل أهدافك في رسم واحد مثل البورصة.",allGoalsOneChartSub:"لكل هدف لون وخط خاص. عندما تنجز عملاً حقيقيًا يصعد الخط، وعندما تهمله ينخفض الزخم. وخط المسار الجيد يخبرك فورًا بما يحتاج انتباهك.",featureLine1:"كل هدف جديد يبدأ من الصفر.",featureLine2:"خط ملوّن مستقل لكل هدف.",featureLine3:"ترى الخطر قبل أن تنسى الهدف.",clarityFirst:"الوضوح أولًا",openKnow:"افتح LifeOS واعرف خلال ثوانٍ ما الذي يهم.",seeMomentum:"شاهد الزخم",seeMomentumSub:"اعرف أقوى هدف، وما يتحسن، وما توقف، وما أصبح في خطر.",smartSignals:"إشارات ذكية",smartSignalsSub:"تنبيهات داخل التطبيق قابلة للإغلاق تبين لك ما يسير جيدًا وما يحتاج تدخلك.",nextMove:"اعرف الخطوة التالية",nextMoveSub:"تبقى أعمالك اليومية مرتبطة بالهدف الذي يفترض أن تحركه.",yourSystem:"اجعله نظامك",yourSystemSub:"ملف شخصي، عربية أو إنجليزية، مستوى مسار خاص بك، وأهدافك أنت من بداية فارغة.",startZero:"ابدأ من الصفر",readyBuild:"هل أنت مستعد لبناء حياة تستطيع أن ترى تقدمها؟",readyBuildSub:"أنشئ حسابك، حدد هدفك الأول، ودع أعمالك اليومية تبني الخط.",startNowFree:"ابدأ الآن",back:"رجوع",
authKicker:"نظامك الشخصي للتنفيذ",authHeadline:"قُد حياتك بالوضوح نفسه الذي تقود به أعمالك.",authSub:"أهداف، إشارات، تنفيذ، واستعادة للمسار — في نظام خاص لمن يرفض أن يدير حياته بالارتجال.",
authPoint1:"لوحة واحدة ترى فيها اتجاه كل هدف",authPoint2:"اعرف أين يحقق انتباهك أعلى عائد",authPoint3:"حوّل التنفيذ اليومي إلى زخم تراه بوضوح",
signIn:"تسجيل الدخول",createAccount:"إنشاء حساب",welcomeBack:"مرحبًا بعودتك إلى مركز قيادتك",loginHint:"أكمل التنفيذ من النقطة التي توقفت عندها، دون ضوضاء أو تشتيت.",email:"البريد الإلكتروني",password:"كلمة المرور",
localAccountNote:"حساب تجريبي: بياناتك محفوظة في هذا المتصفح إلى أن نربط المزامنة السحابية.",buildYourSystem:"أنشئ نظامك التنفيذي الخاص",signupHint:"ابدأ بهويتك فقط. ستبقى مساحة العمل فارغة حتى تحدد أنت ما يستحق أن يدخلها.",
yourName:"اسمك",createMyAccount:"إنشاء حسابي",dashboard:"القيادة",goals:"الأهداف",today:"التنفيذ",planner:"الخطة",notifications:"الإشارات",account:"الحساب",accountSettings:"الملف الشخصي والتحكم",
addTask:"إضافة مهمة",momentum:"الزخم",startHere:"ابدأ من هنا",emptyHeadline:"حدّد أول نتيجة تستحق أن تتحرك الآن.",emptySub:"ابدأ بهدف واحد مهم. سيبدأ من الصفر، ثم تبني تقدمه بما تنفذه كل يوم.",
createFirstGoal:"تحديد أول هدف",todaySignals:"إشارات اليوم",whatMatters:"الإشارات التنفيذية الآن",goalMarket:"مؤشر الأهداف",momentumDashboard:"خريطة زخم الأهداف",
marketHint:"راقب الاتجاه، لا الضوضاء. كل هدف يبدأ من الصفر، ولا يتحرك إلا عندما يحدث تنفيذ حقيقي.",nextActions:"الأعمال الأعلى قيمة الآن",add:"إضافة",currentPosition:"مواقع أهدافك الآن",
yourGoals:"محفظة أهدافك",goalsHint:"كل نتيجة مهمة، اتجاهها الحالي، والمرحلة التالية التي تستحق التركيز.",newGoal:"هدف جديد",executeToday:"تنفيذ اليوم",todayHint:"نفّذ ما يحرك النتائج المهمة فعلًا، واترك ما سواه.",
planCascade:"من الرؤية إلى التنفيذ",plannerHint:"احتفظ بالصورة الكبرى، ثم حوّلها إلى مراحل وأعمال قابلة للتنفيذ.",goalSignals:"مركز الإشارات",notifHint:"التقدم، المخاطر، التعافي، والإنجازات التي تستحق انتباهك.",clearAll:"مسح الإشعارات",
profileSettings:"الملف الشخصي والتحكم",accountHint:"هويتك، لغتك، وتحكمك في مساحة عملك الخاصة.",saveProfile:"حفظ الملف",preferences:"التفضيلات",language:"لغة الواجهة",languageHint:"اختر اللغة التي تريد إدارة LifeOS بها.",
onTrackLevel:"حدّ المسار المطلوب",onTrackHint:"الحدّ المرجعي الذي تريد أن يبقى زخم أهدافك فوقه.",backup:"النسخة الاحتياطية",backupHint:"احتفظ بنسخة من بياناتك قبل تغيير الجهاز أو حذف بيانات المتصفح.",export:"تصدير",import:"استيراد",
signOut:"تسجيل الخروج",signOutHint:"سيتم تسجيل خروجك، بينما تبقى بيانات هذه النسخة محفوظة على الجهاز.",defineGoal:"حدّد النتيجة التي تريد الوصول إليها",goalName:"اسم الهدف",deadline:"الموعد النهائي",category:"المجال",whyGoal:"لماذا يستحق هذا الهدف وقتك؟",
startsZero:"سيبدأ هذا الهدف بزخم 0 وتقدّم 0.",breakItDown:"حوّل الهدف إلى مراحل تنفيذ",sixMonths:"6 أشهر",threeMonths:"3 أشهر",thisMonth:"هذا الشهر",thisWeek:"هذا الأسبوع",cancel:"إلغاء",createGoal:"إنشاء الهدف",
todayAction:"تنفيذ اليوم",moveGoal:"أضف عملاً يحرك أحد أهدافك",task:"العمل المطلوب",linkedGoal:"الهدف الذي سيحرّكه هذا العمل",momentumImpact:"قوة تأثير العمل في الزخم",goalProgressImpact:"أثرها في نسبة تقدم الهدف",
goodMorning:"صباح الخير",goodAfternoon:"مساء الخير",goodEvening:"مساء الخير",peace:"السلام عليكم",strongest:"الأفضل الآن",needsAttention:"يحتاج انتباهك",allSafe:"كل الأهداف فوق الخط",
keepRhythm:"استمر على هذا الإيقاع. هذا هو هدفك الأقوى حاليًا.",belowLine:"تحت خط المسار الجيد. أنجز مهمة مرتبطة به اليوم لتبدأ العودة.",protectSystem:"حافظ على النظام بإتمام أهم أعمال اليوم.",
noTasks:"لا توجد مهام بعد. أضف عملًا واضحًا مرتبطًا بأحد أهدافك.",noGoals:"لا توجد أهداف بعد.",noNotifications:"لا توجد إشعارات بعد.",noPlan:"لم تحدده بعد",goalProgress:"تقدم الهدف",noDeadline:"دون موعد نهائي",
strong:"زخم قوي",onTrack:"على المسار المطلوب",attention:"يحتاج تدخلك",atRisk:"خارج المسار",delete:"حذف",viewGoal:"عرض الهدف",created:"تم إنشاء الهدف",taskAdded:"تمت إضافة المهمة",saved:"تم الحفظ",wrongLogin:"البريد الإلكتروني أو كلمة المرور غير صحيحة.",
accountExists:"يوجد حساب بهذا البريد بالفعل.",accountCreated:"تم إنشاء الحساب.",createGoalFirst:"أنشئ هدفًا أولًا.",completed:"تم الإنجاز",movedUp:"ارتفع",below:"تحت المسار",historyEmpty:"سيبدأ الخط بالنمو كلما نفذت."
}};
function t(k){return dict[currentLang()][k]||k}
function getAccounts(){try{return JSON.parse(localStorage.getItem(APP_KEY)||"{}")}catch{return {}}}
function setAccounts(v){try{localStorage.setItem(APP_KEY,JSON.stringify(v))}catch(e){toast(currentLang()==="ar"?"تعذر الحفظ. تحقق من مساحة التخزين وصدّر نسخة احتياطية.":"Could not save. Check storage and export a backup.");throw e}}
function currentEmail(){return localStorage.getItem(SESSION_KEY)||""}
function account(){return getAccounts()[currentEmail()]||null}
function currentLang(){return account()?.data?.profile?.lang === "ar" ? "ar" : account()?.data?.profile?.lang === "en" ? "en" : document.documentElement.lang === "ar" ? "ar" : "en"}
async function hash(text){const b=new TextEncoder().encode(text);const h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function freshData(name,email,lang="en"){return {profile:{name,email,lang,avatar:"",threshold:60},goals:[],tasks:[],notifications:[],dismissed:{},range:7,lastOpened:iso(),lastActivityByGoal:{}}}
function saveData(mutator, updatedData){
  const all=getAccounts(), email=currentEmail(); if(!all[email])return;
  if(updatedData) all[email].data=updatedData;
  if(mutator) mutator(all[email].data);
  all[email].data.lastOpened=iso(); setAccounts(all);
}
function data(){return account()?.data}
function applyLang(){
  const lang=currentLang(); document.documentElement.lang=lang; document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  $$("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  $$("[data-placeholder-en]").forEach(el=>{
    el.placeholder = lang==="ar" ? (el.dataset.placeholderAr||"") : (el.dataset.placeholderEn||"");
  });
  const cat=$("#goalCategory");
  if(cat){
    const categoryKeys=["categoryLearning","categoryBusiness","categoryHealth","categoryReading","categoryFinance","categoryPersonal"];
    [...cat.options].forEach((opt,i)=>{ if(categoryKeys[i]) opt.textContent=t(categoryKeys[i]); });
  }
  const ar=lang==="ar";
  $("#authLangBtn").textContent=ar?"English":"العربية";
  $("#landingLangBtn").textContent=ar?"English":"العربية";
  $("#langBtn").textContent=ar?"English":"العربية";
  $("#mobileLangBtn").textContent=ar?"EN":"AR";
  $("#accountLangBtn").textContent=ar?"English":"العربية";
  if(account())renderAll();
}
function toggleLang(){
  if(account()){
    saveData(d=>d.profile.lang=currentLang()==="ar"?"en":"ar");
  }else{
    document.documentElement.lang=document.documentElement.lang==="ar"?"en":"ar";
  }
  applyLang();
}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1700)}


function showLanding(){
  $("#landingScreen").classList.remove("hidden");
  $("#authScreen").classList.add("hidden");
  $("#appScreen").classList.add("hidden");
  applyLang();
  window.scrollTo({top:0,behavior:"auto"});
}
function openAuth(tab="signup"){
  $("#landingScreen").classList.add("hidden");
  $("#authScreen").classList.remove("hidden");
  $("#appScreen").classList.add("hidden");
  authTab(tab);
  applyLang();
  window.scrollTo({top:0,behavior:"auto"});
}
function showAuth(){
  $("#landingScreen").classList.add("hidden");$("#authScreen").classList.remove("hidden");$("#appScreen").classList.add("hidden");
  applyLang();
}
function showApp(){
  $("#landingScreen").classList.add("hidden");$("#authScreen").classList.add("hidden");$("#appScreen").classList.remove("hidden");
  rollover();generateSignals();applyLang();renderAll();
}
function authTab(tab){
  $$(".auth-tab").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
  $("#loginPane").classList.toggle("hidden",tab!=="login");$("#signupPane").classList.toggle("hidden",tab!=="signup");
}
$$(".auth-tab").forEach(b=>b.onclick=()=>authTab(b.dataset.authTab));
$$("[data-go-signup]").forEach(b=>b.onclick=()=>openAuth("signup"));
$$("[data-go-login]").forEach(b=>b.onclick=()=>openAuth("login"));
$("#backToLandingBtn").onclick=showLanding;
$("#landingLogo").onclick=(e)=>{e.preventDefault();showLanding()};
$$("[data-scroll-how]").forEach(b=>b.onclick=()=>$("#howItWorks").scrollIntoView({behavior:"smooth"}));
$("#authLangBtn").onclick=toggleLang;$("#landingLangBtn").onclick=toggleLang;$("#langBtn").onclick=toggleLang;$("#mobileLangBtn").onclick=toggleLang;$("#accountLangBtn").onclick=toggleLang;

$("#signupForm").addEventListener("submit",async e=>{
  e.preventDefault(); const name=$("#signupName").value.trim(), email=$("#signupEmail").value.trim().toLowerCase(), pw=$("#signupPassword").value;
  const all=getAccounts(); if(all[email])return toast(t("accountExists"));
  const lang=document.documentElement.lang==="ar"?"ar":"en";
  all[email]={passwordHash:await hash(pw),data:freshData(name,email,lang)};setAccounts(all);localStorage.setItem(SESSION_KEY,email);
  toast(t("accountCreated"));showApp();
});
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); const email=$("#loginEmail").value.trim().toLowerCase(), pw=$("#loginPassword").value; const a=getAccounts()[email];
  if(!a || a.passwordHash!==await hash(pw))return toast(t("wrongLogin"));localStorage.setItem(SESSION_KEY,email);showApp();
});

function rollover(){
  const d=data(); if(!d)return; const today=iso(), last=d.lastOpened||today;if(last===today){ensureToday();return}
  const start=new Date(last+"T12:00:00"), end=new Date(today+"T12:00:00");
  const diff=Math.max(1,Math.round((end-start)/86400000));
  d.goals.forEach(g=>{
    for(let i=1;i<=diff;i++){
      const dt=new Date(start);dt.setDate(dt.getDate()+i);const day=window.LifeCore.day(+dt);
      const hadAction=d.tasks.some(x=>x.goalId===g.id&&x.done&&x.completedDate===day);
      if(!hadAction)g.momentum=clamp(g.momentum-5);
      if(!g.history.some(h=>h.date===day))g.history.push({date:day,value:g.momentum});
    }
    g.history=g.history.slice(-120);
  });
  d.lastOpened=today;d.dismissed={};saveData(null,d);
}
function ensureToday(){
  const d=data(); if(!d)return; d.goals.forEach(g=>{if(!g.history.some(h=>h.date===iso()))g.history.push({date:iso(),value:g.momentum})});saveData(null,d);
}
function updateHistory(g){const h=g.history.find(x=>x.date===iso());if(h)h.value=g.momentum;else g.history.push({date:iso(),value:g.momentum})}
function status(g){
  const th=data().profile.threshold||60;if(g.momentum>=th+15)return [t("strong"),"good"];if(g.momentum>=th)return [t("onTrack"),"good"];if(g.momentum>=Math.max(1,th-15))return [t("attention"),"warn"];return [t("atRisk"),"risk"]
}
function generateSignals(){
  const d=data();if(!d||!d.goals.length)return;
  const sorted=[...d.goals].sort((a,b)=>b.momentum-a.momentum), strongest=sorted[0], weakest=sorted[sorted.length-1], list=[];
  if(strongest.momentum>0) list.push({id:"strong-"+iso()+"-"+strongest.id,type:"success",title:`${t("strongest")}: ${strongest.name}`,body:`${strongest.name} — ${Math.round(strongest.momentum)}. ${t("keepRhythm")}`,ts:Date.now()});
  if(weakest.momentum < d.profile.threshold){
    list.push({id:"risk-"+iso()+"-"+weakest.id,type:"risk",title:`${t("needsAttention")}: ${weakest.name}`,body:`${weakest.name} — ${Math.round(weakest.momentum)}. ${t("belowLine")}`,ts:Date.now()-1});
  }else{
    list.push({id:"safe-"+iso(),type:"info",title:t("allSafe"),body:t("protectSystem"),ts:Date.now()-1});
  }
  const ids=new Set(d.notifications.map(n=>n.id));list.forEach(n=>{if(!ids.has(n.id))d.notifications.unshift(n)});d.notifications=d.notifications.slice(0,80);saveData(null,d);
}
function renderAll(){
  if(!account())return;
  const d=data(), h=new Date().getHours(), greeting=h<12?t("goodMorning"):h<18?t("goodAfternoon"):t("goodEvening");
  $("#greetingLine").textContent=`${greeting}, ${d.profile.name}`;
  $("#dateLine").textContent=fmtDate();
  $("#sideName").textContent=d.profile.name;$("#accountNameHeading").textContent=d.profile.name;$("#accountEmailHeading").textContent=d.profile.email;
  $("#accountNameInput").value=d.profile.name;$("#accountEmailInput").value=d.profile.email;$("#thresholdInput").value=d.profile.threshold||60;
  setAvatar($("#sideAvatar"));setAvatar($("#accountAvatar"));setAvatar($("#mobileProfileBtn"));setAvatar($("#bottomAvatar"));
  const empty=!d.goals.length;$("#emptyOnboarding").classList.toggle("hidden",!empty);$("#dashboardData").classList.toggle("hidden",empty);
  renderSummary();renderChart();renderLegend();renderGoalLists();renderTasks();renderPlanner();renderInsights();renderNotifications();
  const count=d.notifications.length;if($("#sideNotifCount"))$("#sideNotifCount").textContent=count;$("#topNotifCount").textContent=count;
  document.dispatchEvent(new CustomEvent("lifeos:render"));
}
function setAvatar(el){if(!el)return;const p=data().profile;if(p.avatar){el.style.backgroundImage=`url(${p.avatar})`;el.textContent=""}else{el.style.backgroundImage="";el.textContent=(p.name||"?").slice(0,1).toUpperCase()}}


function renderSummary(){
  const d=data(); if(!d)return;
  const th=d.profile.threshold||60;
  const total=d.goals.length;
  const onTrack=d.goals.filter(g=>g.momentum>=th).length;
  const risk=d.goals.filter(g=>g.momentum<th).length;
  const todays=d.tasks.filter(x=>x.date===iso());
  const done=todays.filter(x=>x.done).length;
  const execution=todays.length?Math.round(done/todays.length*100):0;
  if($("#statGoals"))$("#statGoals").textContent=total;
  if($("#statOnTrack"))$("#statOnTrack").textContent=onTrack;
  if($("#statRisk"))$("#statRisk").textContent=risk;
  if($("#statToday"))$("#statToday").textContent=execution+"%";
}

function renderChart(){
  const svg=$("#marketChart"), d=data();if(!svg||!d.goals.length){if(svg)svg.innerHTML="";return}
  const W=1100,H=430,p={l:55,r:24,t:25,b:42},iw=W-p.l-p.r,ih=H-p.t-p.b,n=d.range||7;
  const dates=[...new Set(d.goals.flatMap(g=>g.history.map(h=>h.date)))].sort().slice(-n);if(!dates.length)return;
  const x=i=>p.l+(dates.length===1?iw/2:i/(dates.length-1)*iw), y=v=>p.t+(1-v/100)*ih;
  let out="";
  for(let v=0;v<=100;v+=20){out+=`<line x1="${p.l}" y1="${y(v)}" x2="${W-p.r}" y2="${y(v)}" stroke="#252b36"/><text x="${p.l-11}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#7e8798">${v}</text>`}
  const th=d.profile.threshold||60;out+=`<line x1="${p.l}" y1="${y(th)}" x2="${W-p.r}" y2="${y(th)}" stroke="#d8dce5" stroke-width="2" stroke-dasharray="9 7" opacity=".72"/><rect x="${W-190}" y="${y(th)-16}" width="145" height="22" rx="8" fill="#e9e6df"/><text x="${W-118}" y="${y(th)-1}" text-anchor="middle" font-size="10" font-weight="800" fill="#17191e">${t("onTrackChart")} ${th}</text>`;
  dates.forEach((dt,i)=>{if(dates.length<=8||i%Math.ceil(dates.length/7)===0||i===dates.length-1){const label=new Intl.DateTimeFormat(currentLang()==="ar"?"ar-MA":"en-GB",{month:"short",day:"numeric"}).format(new Date(dt+"T12:00:00"));out+=`<text x="${x(i)}" y="${H-15}" text-anchor="middle" font-size="10" fill="#7e8798">${label}</text>`}});
  d.goals.forEach(g=>{
    const map=new Map(g.history.map(h=>[h.date,h.value]));let last=0;const pts=dates.map((dt,i)=>{if(map.has(dt))last=map.get(dt);return[x(i),y(last)]});
    const path=pts.map((pt,i)=>`${i?"L":"M"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(" ");out+=`<path d="${path}" fill="none" stroke="#0d1016" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/><path d="${path}" fill="none" stroke="${g.color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const end=pts[pts.length-1];out+=`<circle cx="${end[0]}" cy="${end[1]}" r="8" fill="${g.color}" stroke="white" stroke-width="4"/>`;
  });svg.innerHTML=out;
}
function renderLegend(){const el=$("#marketLegend"),d=data();if(!el)return;el.innerHTML=d.goals.map(g=>`<div class="legend-pill"><i class="dot" style="background:${g.color}"></i>${esc(g.name)} <b>${Math.round(g.momentum)}</b></div>`).join("")}
function smallGoal(g){const [label,cls]=status(g);return `<div class="goal-row"><div class="goal-row-top"><div class="goal-title"><i class="dot" style="background:${g.color}"></i>${esc(g.name)}</div><div class="momentum-score">${Math.round(g.momentum)}</div></div><div class="goal-status ${cls}">${label}</div><div class="goal-foot"><span>${t("goalProgress")}</span><b>${Number(g.progress||0).toFixed(1)}%</b></div><div class="progress-line"><i style="width:${clamp(g.progress||0)}%;background:${g.color}"></i></div></div>`}
function renderGoalLists(){
  const d=data();$("#dashboardGoals").innerHTML=d.goals.length?d.goals.map(smallGoal).join(""):`<div class="empty-block">${t("noGoals")}</div>`;
  $("#goalsPage").innerHTML=d.goals.length?d.goals.map(g=>{const [label,cls]=status(g);return `<article class="goal-large"><div class="goal-large-head"><div><div class="goal-title"><i class="dot" style="background:${g.color}"></i><h3>${esc(g.name)}</h3></div><div class="goal-status ${cls}">${label}</div></div><div class="goal-actions"><button class="icon-btn" data-delete-goal="${g.id}" title="${t("delete")}">🗑</button></div></div><div class="goal-big-score">${Math.round(g.momentum)} <small>${t("momentum")}</small></div><div class="goal-foot"><span>${t("goalProgress")}</span><b>${Number(g.progress||0).toFixed(1)}%</b></div><div class="progress-line"><i style="width:${clamp(g.progress||0)}%;background:${g.color}"></i></div><div class="why-box">${esc(g.why||"—")}</div><div class="goal-foot"><span>${esc(g.category||"")}</span><span>${g.deadline?esc(g.deadline):t("noDeadline")}</span></div></article>`}).join(""):`<div class="empty-block">${t("noGoals")}</div>`;
  $$("[data-delete-goal]").forEach(b=>b.onclick=()=>deleteGoal(b.dataset.deleteGoal));
}
function taskHtml(tk){const g=data().goals.find(g=>g.id===tk.goalId);return `<div class="task-row ${tk.done?"done":""}"><button class="task-check" data-task="${tk.id}">${tk.done?"✓":""}</button><div><div class="task-name">${esc(tk.title)}</div><div class="task-meta"><i class="dot" style="display:inline-block;background:${g?.color||"#aaa"}"></i> ${esc(g?.name||"")} · +${tk.progressImpact}%</div></div><span class="impact-chip">+${tk.impact}</span></div>`}
function renderTasks(){
  const tasks=data().tasks.filter(x=>x.date===iso());const html=tasks.length?tasks.map(taskHtml).join(""):`<div class="empty-block">${t("noTasks")}</div>`;
  $("#dashboardTasks").innerHTML=html;$("#todayPageTasks").innerHTML=html;$$("[data-task]").forEach(b=>b.onclick=()=>toggleTask(b.dataset.task));
}
function renderPlanner(){
  const d=data();$("#plannerPage").innerHTML=d.goals.length?d.goals.map(g=>`<article class="plan-card"><div class="plan-title"><i class="dot" style="background:${g.color}"></i>${esc(g.name)}</div><div class="cascade">${step(t("sixMonths"),g.plan.m6)}${step(t("threeMonths"),g.plan.m3)}${step(t("thisMonth"),g.plan.month)}${step(t("thisWeek"),g.plan.week)}</div></article>`).join(""):`<div class="empty-block">${t("noGoals")}</div>`;
}
function step(label,text){return `<div class="cascade-step"><b>${label.toUpperCase()}</b><span>${esc(text||t("noPlan"))}</span></div>`}
function renderInsights(){
  const d=data(),visible=d.notifications.filter(n=>!d.dismissed[n.id]).slice(0,2);$("#insightPopups").innerHTML=visible.map(n=>`<div class="insight ${n.type}"><button class="dismiss" data-dismiss="${n.id}">✕</button><strong>${n.type==="success"?"🟢":n.type==="risk"?"🔴":"🔵"} ${esc(n.title)}</strong><p>${esc(n.body)}</p></div>`).join("");$$("[data-dismiss]").forEach(b=>b.onclick=()=>{saveData(d=>d.dismissed[b.dataset.dismiss]=true);renderInsights()})
}
function renderNotifications(){const d=data();$("#notificationsPage").innerHTML=d.notifications.length?d.notifications.map(n=>`<div class="notice-row"><div><strong>${n.type==="success"?"🟢":n.type==="risk"?"🔴":"🔵"} ${esc(n.title)}</strong><p>${esc(n.body)}</p></div><time>${new Date(n.ts).toLocaleTimeString(currentLang()==="ar"?"ar-MA":"en-GB",{hour:"2-digit",minute:"2-digit"})}</time></div>`).join(""):`<div class="empty-block">${t("noNotifications")}</div>`}

function showView(view){
  $$(".view").forEach(v=>v.classList.toggle("active",v.dataset.viewPanel===view));$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(window.LifeWorkspace){window.LifeWorkspace.navigate(view);return;}
  window.scrollTo({top:0,behavior:"smooth"});if(view==="account")renderAll()
}
$$("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));$("#profileBtn").onclick=()=>showView("account");$("#mobileProfileBtn").onclick=()=>showView("account");$$("[data-open-notifs]").forEach(b=>b.onclick=()=>showView("notifications"));

const goalDialog=$("#goalDialog"),taskDialog=$("#taskDialog");
$$("[data-add-goal]").forEach(b=>b.onclick=()=>goalDialog.showModal());
$$("[data-add-task]").forEach(b=>b.onclick=()=>{if(!data().goals.length)return toast(t("createGoalFirst"));$("#taskGoal").innerHTML=data().goals.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("");taskDialog.showModal()});
$$(".close-dialog").forEach(b=>b.onclick=()=>b.closest("dialog").close());

$("#goalForm").addEventListener("submit",e=>{
  e.preventDefault();const d=data();const g={id:uid(),name:$("#goalName").value.trim(),deadline:$("#goalDeadline").value,category:$("#goalCategory").value,why:$("#goalWhy").value.trim(),color:palette[d.goals.length%palette.length],momentum:0,progress:0,history:[{date:iso(),value:0}],plan:{m6:$("#goal6m").value.trim(),m3:$("#goal3m").value.trim(),month:$("#goalMonth").value.trim(),week:$("#goalWeek").value.trim()}};
  saveData(x=>x.goals.push(g));goalDialog.close();e.target.reset();generateSignals();renderAll();toast(t("created"));
});
$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault();const tk={id:uid(),title:$("#taskTitle").value.trim(),goalId:$("#taskGoal").value,impact:Number($("#taskImpact").value),progressImpact:Number($("#taskProgress").value||0),date:iso(),done:false,completedDate:""};saveData(d=>d.tasks.push(tk));taskDialog.close();e.target.reset();renderAll();toast(t("taskAdded"));
});
function toggleTask(id){
  saveData(d=>{const tk=d.tasks.find(x=>x.id===id);if(!tk)return;const g=d.goals.find(x=>x.id===tk.goalId);if(!g)return;if(!tk.done){tk.done=true;tk.completedDate=iso();g.momentum=clamp(g.momentum+tk.impact);g.progress=clamp(g.progress+tk.progressImpact);updateHistory(g);d.notifications.unshift({id:"done-"+id+"-"+Date.now(),type:"success",title:`${g.name} ${t("movedUp")}`,body:`${t("completed")}: ${tk.title}. ${t("momentum")}: ${Math.round(g.momentum)}.`,ts:Date.now()})}else{tk.done=false;tk.completedDate="";g.momentum=clamp(g.momentum-tk.impact);g.progress=clamp(g.progress-tk.progressImpact);updateHistory(g)}});generateSignals();renderAll();
}
function deleteGoal(id){if(!confirm(t("delete")+"?"))return;saveData(d=>{d.goals=d.goals.filter(g=>g.id!==id);d.tasks=d.tasks.filter(t=>t.goalId!==id)});renderAll()}
$$(".range-btn").forEach(b=>b.onclick=()=>{saveData(d=>d.range=Number(b.dataset.range));$$(".range-btn").forEach(x=>x.classList.toggle("active",x===b));renderChart()});
$("#clearNotifications").onclick=()=>{saveData(d=>{d.notifications=[];d.dismissed={}});renderAll()};
$("#saveProfileBtn").onclick=()=>{saveData(d=>{d.profile.name=$("#accountNameInput").value.trim()||d.profile.name;d.profile.threshold=clamp(Number($("#thresholdInput").value||60),10,90)});renderAll();toast(t("saved"))};
$("#thresholdInput").addEventListener("change",()=>{saveData(d=>d.profile.threshold=clamp(Number($("#thresholdInput").value||60),10,90));renderAll()});
$("#avatarInput").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{saveData(d=>d.profile.avatar=r.result);renderAll()};r.readAsDataURL(f)});
$("#logoutBtn").onclick=()=>{localStorage.removeItem(SESSION_KEY);showLanding()};
$("#exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify({schemaVersion:4,exportedAt:Date.now(),data:data()},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`lifeos-backup-${iso()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),400)};
$("#importInput").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>10000000){toast(currentLang()==="ar"?"الملف كبير جدًا":"File is too large");return;}const r=new FileReader();r.onload=()=>{try{window.LifeWorkspace.importData(JSON.parse(r.result));}catch{toast(currentLang()==="ar"?"ملف غير صالح. لم تتغير بياناتك.":"Invalid file. Your data was not changed.");}e.target.value="";};r.onerror=()=>toast(currentLang()==="ar"?"تعذر قراءة الملف":"Could not read file");r.readAsText(f)});

window.LifeLegacy={renderAll,applyLang,toggleLang};
if(currentEmail()&&account())showApp();else showLanding();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
