(() => {
const APP_KEY="lifeos_v11_accounts", SESSION_KEY="lifeos_v11_session";
// NOTE: We intentionally do NOT wipe SESSION_KEY here anymore.
// The previous localStorage.removeItem(SESSION_KEY) caused an offline lockout:
// if Supabase can't reach the network, the local session was already gone and the
// user was thrown back to the landing screen even though their data was intact.
// Instead, the session is only cleared on an explicit SIGNED_OUT event from Supabase
// (see the onAuthStateChange listener at the bottom of this file).
const palette=["#5B8CFF","#37C98A","#FF6A64","#A57BFF","#FF9A4D","#39C7D2","#E7B94B","#F06CB5","#7D91FF"];
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const iso=()=>window.LifeCore.day();
const uid=()=>window.LifeCore.id();
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmtDate=()=>new Intl.DateTimeFormat(currentLang()==="ar"?"ar-MA":"en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());

const dict={
en:{
faqDifference:"I already use a task list. What does THE NORTH add?",faqDifferenceAnswer:"A task list tells you what needs doing. Here you connect a task to a goal, give it a focus session, and review the time invested. The aim is to connect what you want with what you do each day, rather than collect more tasks.",faqSetup:"Will I spend more time organizing than working?",faqSetupAnswer:"You do not need to set up every section. Start with one goal, one task, and a focus session. Add projects, habits and planning when you need them; you can keep your workflow simple.",faqFlexible:"What if Pomodoro does not suit me?",faqFlexibleAnswer:"Use the stopwatch for open-ended work, or a countdown when you want a time limit. If you choose Pomodoro, you can customize focus and break durations. Choose the method that fits your work.",faqTimer:"Do I lose my session if I close the page?",faqTimerAnswer:"The active session is saved locally and can be restored in the same browser as long as its data has not been cleared. If you leave it running, elapsed time while the page is closed also counts; pause before stepping away. Active sessions do not transfer between devices.",faqOffline:"What happens to my work if my connection drops?",faqOfflineAnswer:"If your workspace is already open, edits are saved in the browser and synchronization is retried when connectivity returns. Check the save status before changing devices, and do not clear browser data before syncing completes. Signing in requires an internet connection.",faqMissed:"What if I miss a day or fall short of my plan?",faqMissedAnswer:"Use your review to understand what happened: were the tasks larger than the time available, or did your priorities change? Adjust the plan and choose a realistic next step. The numbers support decisions; they do not measure your worth.",
nxClarity:"Productivity starts with what you choose.",nxClarityBody:"You do not need to fill every minute. Start with an outcome, then choose the work that brings it closer.",nxChoose:"A goal worth your time",nxChooseText:"A clear direction makes prioritizing easier. Keep your goals in sight, beyond the task list.",nxProtect:"Space for focused work",nxProtectText:"Choose one task for a focus session. Capture unexpected ideas in your inbox and return to them later.",nxLearn:"A review you can learn from",nxLearnText:"Compare your plans with what you completed. Recorded time helps you plan the next day more realistically.",nxSystem:"From the big goal to today’s next step.",nxSystemBody:"Every part has a purpose. Explore how an intention becomes work you can measure.",nxTabgoals:"Goals & tasks",nxTabfocus:"Focus & time",nxTabhabits:"Habits",nxTabreview:"Analytics",nxTitlegoals:"Know why this task matters.",nxBodygoals:"Link tasks to goals and projects, set priorities and deadlines, and see your next step in the context of your destination.",nxCapgoals:"Clear goal → specific task → daily action",nxTry:"Create your workspace",nxExample:"Illustration · not your account data",nxDemoGoal:"Launch your new service",nxDemo1:"Define your ideal customer",nxDemo2:"Shape your core offer",nxDemo3:"Prepare customer interviews",nxTitlefocus:"Give the task your attention. Let time be counted.",nxBodyfocus:"Choose a stopwatch, countdown or Pomodoro with your own durations. Pause, resume, then save time and notes against your work.",nxCapfocus:"Focus, rest, then begin with intention",nxIntent:"One task. Full attention.",nxMinute:"min focus",nxBreak:"min break",nxTitlehabits:"Build a rhythm you can sustain.",nxBodyhabits:"Make reading, movement and routine into clear habits. Track consistency without turning each day into a race.",nxCaphabits:"Small steps. Progress that adds up.",nxHabitWeek:"This week’s rhythm",nxRead:"Reading",nxMove:"Movement",nxPlan:"Daily planning",nxTitlereview:"Stop guessing where your day went.",nxBodyreview:"Review time invested in projects, goals and tasks. Use your reports to decide what needs your attention tomorrow.",nxCapreview:"Measure to learn, not to judge every minute.",nxInvest:"Time invested in your priorities",nxReport:"This week: 18 hours 40 minutes",nxDay:"A clear day, from intention to reflection.",nxDayBody:"You do not need to visit every screen. Follow a simple path and open the details when you need them.",nxMorning:"Before you begin",nxMorningBody:"Review your goal and choose today’s most important task.",nxDuring:"While you work",nxDuringBody:"Start a focus session. Capture distractions without leaving your task.",nxAfter:"After the session",nxAfterBody:"Save your time and accomplishments, then take a break.",nxEvening:"At the end of the day",nxEveningBody:"Review your progress and choose tomorrow’s next step.",nxBalance:"Your work is part of your life. See the whole picture.",nxBalanceBody:"Alongside focus, there is room for habits, money, notes and planning. Open what you need and keep the rest out of your way.",nxMoney:"Financial clarity",nxMoneyText:"Record income and expenses. Allocate your budget using percentages you choose.",nxInbox:"Room for ideas",nxInboxText:"Capture an idea in your inbox when it appears. Organize it after your focus session.",nxPlanning:"Plans you can revisit",nxPlanningText:"Bring priorities and notes together. Review your week to adjust your next plan.",
nrStart:"Start free",nrSkip:"Skip to content",nrHow:"How it works",nrInside:"Inside the app",nrFAQ:"Questions, answered",nrEyebrow:"DIRECTION, EVERY DAY",nrHeadline:"You know what you want to build.",nrHeadline2:"Make your day move it forward.",nrIntro:"Bring your goals, tasks and focus sessions together. Know where your time went, and what comes next.",nrWatch:"See how it works",nrDevices:"Arabic and English. On desktop and mobile.",nrSample:"Illustrative workspace · sample data",nrHome:"Home",nrGoals:"Goals",nrTasks:"Tasks",nrFocus:"Focus",nrReports:"Reports",nrToday:"Your direction today",nrOne:"A clear goal. A next step. Time well spent.",nrMainGoal:"PRIMARY GOAL",nrLaunch:"Launch the learning program",nrRemaining:"58% of the journey ahead",nrTrend:"PROGRESS OVER TIME",nrNext:"NEXT STEP",nrInterview:"Prepare customer interviews",nrGive:"Give it focused time",nrSession:"FOCUS SESSION",nrWorked:"Worked today: 2h 15m",nrProgress:"Make busy mean progress.",nrLess:"Move from a long list to a step worth your time.",nrDirection:"Choose your direction",nrDirectionBody:"Turn what is on your mind into a clear, actionable goal.",nrWork:"Work with focus",nrWorkBody:"Give each task dedicated time. Make room for what matters.",nrReview:"Review your progress",nrReviewBody:"See how your time turns into tangible progress.",nrBegin:"How do I start?",nrBeginAnswer:"Create your account, confirm your email, then add your first goal and one task that moves it forward.",nrArabic:"Does it support Arabic?",nrArabicAnswer:"Yes. A right-to-left Arabic interface and an English interface, with a language switch.",nrTime:"Can I track time for each task?",nrTimeAnswer:"Link a focus session to a task or goal. Your saved time appears in your reports.",nrEnd:"Start with one goal.",nrEndBody:"Give it time. See what changes.",

commandCenter:"EXECUTIVE COMMAND CENTER",dashboardSubtitle:"Your goals, signals and next decisions — in one view.",
activeGoals:"Active goals",activeGoalsHint:"in your system",onTrackGoals:"On track",onTrackGoalsHint:"above your line",
atRiskGoals:"Needs attention",atRiskGoalsHint:"below your line",todayExecution:"Today's execution",todayExecutionHint:"planned actions completed",
authExec1:"Direction before activity",authExec2:"Signals before distraction",authExec3:"Execution before complexity",privateWorkspace:"Private workspace",onTrackChart:"ON-TRACK",categoryLearning:"Learning",categoryBusiness:"Business",categoryHealth:"Health",categoryReading:"Reading",categoryFinance:"Finance",categoryPersonal:"Personal",

startNow:"Start now",heroPill:"YOUR PERSONAL EXECUTION SYSTEM",landingHeadline:"One life. A clear direction.",landingSub:"Bring your projects, goals and daily actions together. Protect your attention with focused work sessions, track every minute and build a rhythm that lasts.",buildMyLifeOS:"Start with THE NORTH",seeHow:"See how it works",startsEmpty:"Starts completely empty",bilingual:"Arabic + English",mobileReady:"Built for phone and desktop",goalMoving:"Goal moving",belowTrackShort:"Below on-track level",oneSystem:"ONE SYSTEM",fromGoalToToday:"From the big goal to what you do today.",fromGoalToTodaySub:"THE NORTH keeps the chain visible, so today's task always has a reason.",yearGoal:"Big goal",yearGoalSub:"Your destination",milestone:"Milestone",monthlyOutcome:"Outcome",weeklyOutcome:"Outcome",dailyAction:"Action",marketMindset:"MOMENTUM, NOT A TO-DO LIST",allGoalsOneChart:"All your goals. One market-style chart.",allGoalsOneChartSub:"Each goal gets its own color and line. Complete meaningful work and the line rises. Neglect it and momentum falls. The on-track line tells you what needs attention immediately.",featureLine1:"Every new goal starts at zero.",featureLine2:"One colored line for every goal.",featureLine3:"Risk becomes visible before you forget the goal.",clarityFirst:"CLARITY FIRST",openKnow:"Open THE NORTH and know what matters in seconds.",seeMomentum:"See momentum",seeMomentumSub:"Know which goal is strongest, improving, flat or at risk.",smartSignals:"Smart signals",smartSignalsSub:"Dismissible in-app alerts highlight what is going well and what needs action.",nextMove:"Know the next move",nextMoveSub:"Your daily actions stay connected to the goal they are supposed to move.",yourSystem:"Make it yours",yourSystemSub:"Profile, Arabic or English, custom on-track level and your own goals from a blank start.",startZero:"START FROM ZERO",readyBuild:"Ready to build a life you can see moving?",readyBuildSub:"Create your account, define the first goal and let your daily actions build the line.",startNowFree:"Start now",back:"Back",
authKicker:"YOUR PERSONAL EXECUTION SYSTEM",authHeadline:"Lead your life with the same clarity you expect from your business.",authSub:"Goals, signals, execution and recovery — one private operating system for people who refuse to run on noise.",
authPoint1:"One board for the direction of every goal",authPoint2:"Know where your attention has the highest return",authPoint3:"Turn execution into visible momentum",
signIn:"Sign in",createAccount:"Create account",welcomeBack:"Welcome back to your command center",loginHint:"Continue from the exact point where your execution stopped.",email:"Email",password:"Password",
localAccountNote:"Your account saves automatically. Confirm your email to begin.",buildYourSystem:"Create your private operating system",signupHint:"Start with your identity. Your workspace stays intentionally empty until you define what matters.",
yourName:"Your name",createMyAccount:"Create my account",dashboard:"Dashboard",goals:"Goals",today:"Today",planner:"Planner",notifications:"Notifications",account:"Account",accountSettings:"Account & settings",
addTask:"Add task",momentum:"Momentum",startHere:"START HERE",emptyHeadline:"What do you want to move forward first?",emptySub:"Create your first big goal. THE NORTH will build its line from zero and connect your daily actions to it.",
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
accountExists:"An account with this email already exists.",accountCreated:"Account created.",createGoalFirst:"Create a goal first.",completed:"Completed",movedUp:"moved up",below:"Below on-track",historyEmpty:"Your line will grow as you execute.",tasks:"Tasks",focus:"Focus",optionalPlanning:"Optional planning",priority:"Priority",high:"High",medium:"Medium",low:"Low",date:"Due date"
},
ar:{
faqDifference:"أستخدم قائمة مهام بالفعل. ماذا سيضيف لي THE NORTH؟",faqDifferenceAnswer:"قائمة المهام تخبرك بما ينبغي إنجازه. هنا تربط المهمة بهدف، وتخصص لها جلسة تركيز، ثم تراجع الوقت الذي استثمرته فيها. الفكرة أن ترى العلاقة بين ما تريده وما تفعله يوميًا، لا أن تجمع مهام أكثر.",faqSetup:"هل سأقضي وقتًا في تنظيم التطبيق أكثر من العمل؟",faqSetupAnswer:"لا تحتاج إلى إعداد كل الأقسام. ابدأ بهدف واحد، ومهمة واحدة، ثم شغّل جلسة تركيز. أضف المشاريع والعادات والتخطيط عندما تحتاجها؛ يمكنك استخدام مسار بسيط دون ملء كل شاشة.",faqFlexible:"ماذا لو لم يناسبني نظام بومودورو؟",faqFlexibleAnswer:"استخدم ساعة الإيقاف للعمل دون مدة محددة، أو العدّ التنازلي إذا أردت حدًا زمنيًا. وإن اخترت بومودورو، يمكنك تعديل مدد التركيز والراحة. الطريقة تتبع طبيعة عملك، وليس العكس.",faqTimer:"هل يضيع وقت الجلسة إذا أغلقت الصفحة؟",faqTimerAnswer:"تُحفظ الجلسة النشطة محليًا ويمكن استرجاعها في المتصفح نفسه، ما دمت لم تمسح بياناته. إذا تركتها تعمل، يُحسب الوقت المنقضي أثناء إغلاق الصفحة أيضًا؛ أوقفها مؤقتًا قبل الابتعاد. الجلسة النشطة لا تنتقل بين الأجهزة.",faqOffline:"ماذا يحدث لعملي إذا انقطع الإنترنت؟",faqOfflineAnswer:"إذا كانت مساحة عملك مفتوحة، تُحفظ تعديلاتك في المتصفح وتُحاول المزامنة مجددًا عند عودة الاتصال. راقب حالة الحفظ قبل تغيير الجهاز، ولا تمسح بيانات المتصفح قبل اكتمال المزامنة. تسجيل الدخول يحتاج إلى اتصال بالإنترنت.",faqMissed:"ماذا لو فاتني يوم أو لم أحقق خطتي؟",faqMissedAnswer:"استخدم المراجعة لتفهم ما حدث: هل كانت المهام أكبر من الوقت المتاح؟ هل تغيّرت أولوياتك؟ عدّل خطتك واختر خطوة واقعية لليوم التالي. الأرقام تساعدك على اتخاذ قرار، وليست حكمًا على قيمتك أو جودة يومك.",
nxClarity:"الإنتاجية تبدأ بما تختار.",nxClarityBody:"ليس المطلوب أن تملأ كل دقيقة. ابدأ بنتيجة تريد الوصول إليها، ثم اختر العمل الذي يقرّبك منها.",nxChoose:"هدف يستحق وقتك",nxChooseText:"عندما تكون الوجهة واضحة، يصبح ترتيب المهام أسهل. أبقِ أهدافك أمامك بدل أن تضيع بين القوائم.",nxProtect:"مساحة للعمل العميق",nxProtectText:"اختر مهمة واحدة لجلسة التركيز. وسجّل الأفكار الطارئة في الوارد لتعود إليها لاحقًا.",nxLearn:"مراجعة تعلّمك",nxLearnText:"قارن ما خططت له بما أنجزته. الوقت المسجل يساعدك على تقدير يومك التالي بواقعية أكبر.",nxSystem:"من هدف كبير، إلى خطوة اليوم.",nxSystemBody:"كل جزء له دور. استكشف كيف تتحوّل النية إلى عمل يمكن قياسه.",nxTabgoals:"الأهداف والمهام",nxTabfocus:"التركيز والوقت",nxTabhabits:"العادات",nxTabreview:"التحليلات",nxTitlegoals:"اعرف لماذا تعمل على هذه المهمة.",nxBodygoals:"اربط مهامك بأهدافك ومشاريعك، وحدّد الأولوية والموعد. سترى الخطوة التالية في سياق الوجهة التي اخترتها.",nxCapgoals:"هدف واضح ← مهمة محددة ← تنفيذ يومي",nxTry:"ابدأ مساحتك",nxExample:"مثال توضيحي · ليس بيانات حسابك",nxDemoGoal:"إطلاق خدمتك الجديدة",nxDemo1:"تحديد العميل المستهدف",nxDemo2:"صياغة العرض الأساسي",nxDemo3:"تحضير مقابلات العملاء",nxTitlefocus:"امنح المهمة انتباهك. ودع الوقت يُحسب.",nxBodyfocus:"ساعة إيقاف، عدّ تنازلي، أو بومودورو بمدد تناسبك. أوقف الجلسة واستأنفها، ثم احفظ الوقت والملاحظات مع العمل المرتبط بها.",nxCapfocus:"تركيز، ثم راحة، ثم بداية واعية",nxIntent:"مهمة واحدة. انتباه كامل.",nxMinute:"دقيقة تركيز",nxBreak:"دقائق راحة",nxTitlehabits:"ابنِ إيقاعًا تستطيع الاستمرار فيه.",nxBodyhabits:"حوّل القراءة والحركة والروتين إلى عادات واضحة. سجّل التزامك وراجع الاستمرارية دون أن تحوّل يومك إلى سباق.",nxCaphabits:"خطوات صغيرة. أثر يتراكم.",nxHabitWeek:"إيقاع هذا الأسبوع",nxRead:"قراءة",nxMove:"حركة",nxPlan:"تخطيط اليوم",nxTitlereview:"لا تخمّن أين ذهب يومك.",nxBodyreview:"راجع الوقت الذي استثمرته في المشاريع والأهداف والمهام. استخدم تقاريرك لتقرر ما يحتاج اهتمامك غدًا.",nxCapreview:"قِس لتتعلم، لا لتحاسب نفسك على كل دقيقة.",nxInvest:"وقت استثمرته في أولوياتك",nxReport:"هذا الأسبوع: 18 ساعة و40 دقيقة",nxDay:"يوم واضح، من البداية إلى المراجعة.",nxDayBody:"لا تحتاج إلى زيارة كل شاشة. اتبع مسارًا بسيطًا، وعد إلى التفاصيل عندما تحتاجها.",nxMorning:"قبل أن تبدأ",nxMorningBody:"راجع هدفك، واختر أهم مهمة اليوم.",nxDuring:"أثناء العمل",nxDuringBody:"ابدأ جلسة تركيز، والتقط المشتتات دون مغادرة مهمتك.",nxAfter:"بعد الجلسة",nxAfterBody:"احفظ الوقت وما أنجزته، وخذ استراحة تناسبك.",nxEvening:"في نهاية اليوم",nxEveningBody:"راجع التقدم وحدّد خطوة الغد.",nxBalance:"عملك جزء من حياتك. اجمع الصورة كاملة.",nxBalanceBody:"إلى جانب التركيز، لديك مساحة للعادات والمال والملاحظات والتخطيط. افتح ما تحتاجه، واترك الباقي بعيدًا عن انتباهك.",nxMoney:"وضوح مالي",nxMoneyText:"سجّل الدخل والمصروفات، ووزّع ميزانيتك بالنسب التي تختارها.",nxInbox:"مساحة للأفكار",nxInboxText:"التقط الفكرة وقت ظهورها في الوارد، ثم عد لتنظيمها عندما ينتهي تركيزك.",nxPlanning:"خطط قابلة للمراجعة",nxPlanningText:"اجمع أولوياتك وملاحظاتك، وراجع أسبوعك لتعدّل خطتك التالية.",
nrStart:"ابدأ مجانًا",nrSkip:"انتقل إلى المحتوى",nrHow:"كيف يعمل",nrInside:"داخل التطبيق",nrFAQ:"الأسئلة الشائعة",nrEyebrow:"وجهتك واضحة",nrHeadline:"أنت تعرف ما تريد بناءه.",nrHeadline2:"اجعل يومك يخدمه.",nrIntro:"اجمع أهدافك ومهامك وجلسات تركيزك في مكان واحد، واعرف أين ذهب وقتك وما خطوتك التالية.",nrWatch:"شاهد كيف يعمل",nrDevices:"بالعربية والإنجليزية. على الحاسوب والجوال.",nrSample:"مثال توضيحي · بيانات تجريبية",nrHome:"الرئيسية",nrGoals:"الأهداف",nrTasks:"المهام",nrFocus:"التركيز",nrReports:"التقارير",nrToday:"وجهتك اليوم",nrOne:"هدف واضح. خطوة تالية. وقت له قيمة.",nrMainGoal:"الهدف الرئيسي",nrLaunch:"إطلاق البرنامج التعليمي",nrRemaining:"58% من الطريق أمامك",nrTrend:"مسار التقدم",nrNext:"الخطوة التالية",nrInterview:"تحضير مقابلات العملاء",nrGive:"امنحها وقتًا للتركيز",nrSession:"جلسة التركيز",nrWorked:"وقت العمل اليوم: ساعتان و15 دقيقة",nrProgress:"ليكن انشغالك تقدّمًا.",nrLess:"انتقل من قائمة طويلة إلى خطوة تستحق وقتك.",nrDirection:"حدد وجهتك",nrDirectionBody:"حوّل ما في ذهنك إلى هدف واضح وقابل للتنفيذ.",nrWork:"اعمل بتركيز",nrWorkBody:"امنح كل مهمة وقتًا مخصصًا، وأنجز ما يهم فعلًا.",nrReview:"راجع تقدمك",nrReviewBody:"شاهد كيف يتحوّل وقتك إلى نتائج ملموسة.",nrBegin:"كيف أبدأ؟",nrBeginAnswer:"أنشئ حسابك، أكّد بريدك الإلكتروني، ثم أضف هدفك الأول ومهمة واحدة تقرّبك منه.",nrArabic:"هل يدعم التطبيق العربية؟",nrArabicAnswer:"نعم، واجهة عربية من اليمين إلى اليسار، وواجهة إنجليزية. يمكنك التبديل بينهما.",nrTime:"هل يمكنني تتبع وقت كل مهمة؟",nrTimeAnswer:"اربط جلسة التركيز بمهمة أو هدف. ستجد الوقت المسجل في تقاريرك بعد حفظ الجلسة.",nrEnd:"ابدأ بهدف واحد.",nrEndBody:"امنحه وقتًا. وشاهد ما يتغيّر.",

commandCenter:"مركز القيادة التنفيذي",dashboardSubtitle:"أهدافك، إشاراتك، والقرار التالي الذي يستحق وقتك — في شاشة واحدة.",
activeGoals:"الأهداف النشطة",activeGoalsHint:"داخل نظامك",onTrackGoals:"على المسار",onTrackGoalsHint:"فوق خطك المحدد",
atRiskGoals:"تحتاج انتباهك",atRiskGoalsHint:"تحت خط المسار",todayExecution:"تنفيذ اليوم",todayExecutionHint:"من أعمال اليوم المخططة",
authExec1:"الاتجاه قبل كثرة الحركة",authExec2:"الإشارات قبل التشتيت",authExec3:"التنفيذ قبل التعقيد",privateWorkspace:"مساحة عمل خاصة",onTrackChart:"المسار المطلوب",categoryLearning:"التعلّم",categoryBusiness:"الأعمال",categoryHealth:"الصحة",categoryReading:"القراءة",categoryFinance:"المال",categoryPersonal:"الحياة الشخصية",

startNow:"ابدأ الآن",heroPill:"نظامك الشخصي للتنفيذ",landingHeadline:"حياتك، بوضوح أكبر.",landingSub:"اجمع مشاريعك وأهدافك وأعمالك اليومية في مكان واحد. احمِ انتباهك بجلسات تركيز، وتتبع وقتك، وابنِ إيقاعًا تستطيع الاستمرار عليه.",buildMyLifeOS:"ابنِ نظام THE NORTH الخاص بي",seeHow:"كيف يعمل؟",startsEmpty:"يبدأ فارغًا تمامًا",bilingual:"العربية + الإنجليزية",mobileReady:"مصمم للهاتف والكمبيوتر",goalMoving:"الهدف يتحرك",belowTrackShort:"تحت مستوى المسار الجيد",oneSystem:"نظام واحد",fromGoalToToday:"من الهدف الكبير إلى ما ستفعله اليوم.",fromGoalToTodaySub:"يحافظ THE NORTH على السلسلة واضحة حتى يكون لكل مهمة يومية سبب.",yearGoal:"الهدف الكبير",yearGoalSub:"وجهتك",milestone:"مرحلة",monthlyOutcome:"نتيجة",weeklyOutcome:"نتيجة",dailyAction:"عمل",marketMindset:"الزخم، وليس مجرد قائمة مهام",allGoalsOneChart:"كل أهدافك في رسم واحد مثل البورصة.",allGoalsOneChartSub:"لكل هدف لون وخط خاص. عندما تنجز عملاً حقيقيًا يصعد الخط، وعندما تهمله ينخفض الزخم. وخط المسار الجيد يخبرك فورًا بما يحتاج انتباهك.",featureLine1:"كل هدف جديد يبدأ من الصفر.",featureLine2:"خط ملوّن مستقل لكل هدف.",featureLine3:"ترى الخطر قبل أن تنسى الهدف.",clarityFirst:"الوضوح أولًا",openKnow:"افتح THE NORTH واعرف خلال ثوانٍ ما الذي يهم.",seeMomentum:"شاهد الزخم",seeMomentumSub:"اعرف أقوى هدف، وما يتحسن، وما توقف، وما أصبح في خطر.",smartSignals:"إشارات ذكية",smartSignalsSub:"تنبيهات داخل التطبيق قابلة للإغلاق تبين لك ما يسير جيدًا وما يحتاج تدخلك.",nextMove:"اعرف الخطوة التالية",nextMoveSub:"تبقى أعمالك اليومية مرتبطة بالهدف الذي يفترض أن تحركه.",yourSystem:"اجعله نظامك",yourSystemSub:"ملف شخصي، عربية أو إنجليزية، مستوى مسار خاص بك، وأهدافك أنت من بداية فارغة.",startZero:"ابدأ من الصفر",readyBuild:"هل أنت مستعد لبناء حياة تستطيع أن ترى تقدمها؟",readyBuildSub:"أنشئ حسابك، حدد هدفك الأول، ودع أعمالك اليومية تبني الخط.",startNowFree:"ابدأ الآن",back:"رجوع",
authKicker:"نظامك الشخصي للتنفيذ",authHeadline:"قُد حياتك بالوضوح نفسه الذي تقود به أعمالك.",authSub:"أهداف، إشارات، تنفيذ، واستعادة للمسار — في نظام خاص لمن يرفض أن يدير حياته بالارتجال.",
authPoint1:"لوحة واحدة ترى فيها اتجاه كل هدف",authPoint2:"اعرف أين يحقق انتباهك أعلى عائد",authPoint3:"حوّل التنفيذ اليومي إلى زخم تراه بوضوح",
signIn:"تسجيل الدخول",createAccount:"إنشاء حساب",welcomeBack:"مرحبًا بعودتك إلى مركز قيادتك",loginHint:"أكمل التنفيذ من النقطة التي توقفت عندها، دون ضوضاء أو تشتيت.",email:"البريد الإلكتروني",password:"كلمة المرور",
localAccountNote:"حسابك يحفظ بياناتك تلقائيًا. أكّد بريدك للبدء.",buildYourSystem:"أنشئ نظامك التنفيذي الخاص",signupHint:"ابدأ بهويتك فقط. ستبقى مساحة العمل فارغة حتى تحدد أنت ما يستحق أن يدخلها.",
yourName:"اسمك",createMyAccount:"إنشاء حسابي",dashboard:"القيادة",goals:"الأهداف",today:"التنفيذ",planner:"الخطة",notifications:"الإشارات",account:"الحساب",accountSettings:"الملف الشخصي والتحكم",
addTask:"إضافة مهمة",momentum:"الزخم",startHere:"ابدأ من هنا",emptyHeadline:"حدّد أول نتيجة تستحق أن تتحرك الآن.",emptySub:"ابدأ بهدف واحد مهم. سيبدأ من الصفر، ثم تبني تقدمه بما تنفذه كل يوم.",
createFirstGoal:"تحديد أول هدف",todaySignals:"إشارات اليوم",whatMatters:"الإشارات التنفيذية الآن",goalMarket:"مؤشر الأهداف",momentumDashboard:"خريطة زخم الأهداف",
marketHint:"راقب الاتجاه، لا الضوضاء. كل هدف يبدأ من الصفر، ولا يتحرك إلا عندما يحدث تنفيذ حقيقي.",nextActions:"الأعمال الأعلى قيمة الآن",add:"إضافة",currentPosition:"مواقع أهدافك الآن",
yourGoals:"محفظة أهدافك",goalsHint:"كل نتيجة مهمة، اتجاهها الحالي، والمرحلة التالية التي تستحق التركيز.",newGoal:"هدف جديد",executeToday:"تنفيذ اليوم",todayHint:"نفّذ ما يحرك النتائج المهمة فعلًا، واترك ما سواه.",
planCascade:"من الرؤية إلى التنفيذ",plannerHint:"احتفظ بالصورة الكبرى، ثم حوّلها إلى مراحل وأعمال قابلة للتنفيذ.",goalSignals:"مركز الإشارات",notifHint:"التقدم، المخاطر، التعافي، والإنجازات التي تستحق انتباهك.",clearAll:"مسح الإشعارات",
profileSettings:"الملف الشخصي والتحكم",accountHint:"هويتك، لغتك، وتحكمك في مساحة عملك الخاصة.",saveProfile:"حفظ الملف",preferences:"التفضيلات",language:"لغة الواجهة",languageHint:"اختر اللغة التي تريد إدارة THE NORTH بها.",
onTrackLevel:"حدّ المسار المطلوب",onTrackHint:"الحدّ المرجعي الذي تريد أن يبقى زخم أهدافك فوقه.",backup:"النسخة الاحتياطية",backupHint:"احتفظ بنسخة من بياناتك قبل تغيير الجهاز أو حذف بيانات المتصفح.",export:"تصدير",import:"استيراد",
signOut:"تسجيل الخروج",signOutHint:"سيتم تسجيل خروجك، بينما تبقى بيانات هذه النسخة محفوظة على الجهاز.",defineGoal:"حدّد النتيجة التي تريد الوصول إليها",goalName:"اسم الهدف",deadline:"الموعد النهائي",category:"المجال",whyGoal:"لماذا يستحق هذا الهدف وقتك؟",
startsZero:"سيبدأ هذا الهدف بزخم 0 وتقدّم 0.",breakItDown:"حوّل الهدف إلى مراحل تنفيذ",sixMonths:"6 أشهر",threeMonths:"3 أشهر",thisMonth:"هذا الشهر",thisWeek:"هذا الأسبوع",cancel:"إلغاء",createGoal:"إنشاء الهدف",
todayAction:"تنفيذ اليوم",moveGoal:"أضف عملاً يحرك أحد أهدافك",task:"العمل المطلوب",linkedGoal:"الهدف الذي سيحرّكه هذا العمل",momentumImpact:"قوة تأثير العمل في الزخم",goalProgressImpact:"أثرها في نسبة تقدم الهدف",
goodMorning:"صباح الخير",goodAfternoon:"مساء الخير",goodEvening:"مساء الخير",peace:"السلام عليكم",strongest:"الأفضل الآن",needsAttention:"يحتاج انتباهك",allSafe:"كل الأهداف فوق الخط",
keepRhythm:"استمر على هذا الإيقاع. هذا هو هدفك الأقوى حاليًا.",belowLine:"تحت خط المسار الجيد. أنجز مهمة مرتبطة به اليوم لتبدأ العودة.",protectSystem:"حافظ على النظام بإتمام أهم أعمال اليوم.",
noTasks:"لا توجد مهام بعد. أضف عملًا واضحًا مرتبطًا بأحد أهدافك.",noGoals:"لا توجد أهداف بعد.",noNotifications:"لا توجد إشعارات بعد.",noPlan:"لم تحدده بعد",goalProgress:"تقدم الهدف",noDeadline:"دون موعد نهائي",
strong:"زخم قوي",onTrack:"على المسار المطلوب",attention:"يحتاج تدخلك",atRisk:"خارج المسار",delete:"حذف",viewGoal:"عرض الهدف",created:"تم إنشاء الهدف",taskAdded:"تمت إضافة المهمة",saved:"تم الحفظ",wrongLogin:"البريد الإلكتروني أو كلمة المرور غير صحيحة.",
accountExists:"يوجد حساب بهذا البريد بالفعل.",accountCreated:"تم إنشاء الحساب.",createGoalFirst:"أنشئ هدفًا أولًا.",completed:"تم الإنجاز",movedUp:"ارتفع",below:"تحت المسار",historyEmpty:"سيبدأ الخط بالنمو كلما نفذت.",tasks:"المهام",focus:"التركيز",optionalPlanning:"تخطيط اختياري",priority:"الأولوية",high:"عالية",medium:"متوسطة",low:"منخفضة",date:"تاريخ الاستحقاق"
}};
// Landing copy shares the existing language switch.
Object.assign(dict.en, {
  "nlSkip": "Skip to content",
  "nlProduct": "The system",
  "nlScienceNav": "The Science",
  "nlApproach": "The approach",
  "nlQuestions": "Questions",
  "nlStart": "Get started",
  "nlEyebrow": "EXECUTIVE COGNITIVE ARCHITECTURE FOR BUILDERS",
  "nlHero1": "Stop hoarding tasks.",
  "nlHero2": "Build unstoppable momentum.",
  "nlIntro": "Cognitive neuroscience confirms: conventional to-do lists trigger dopamine for trivia while starving strategic outcomes. THE NORTH is an executive execution architecture that eliminates cognitive friction and connects your daily hours directly to visible goal velocity.",
  "nlCreate": "Launch your workspace",
  "nlExplore": "The Science & System",
  "nlTrust": "Validated by neuroscience. Arabic & English. Desktop & mobile.",
  "nlSample": "LIVE EXECUTIVE RADAR · ACTIVE PROJECTION",
  "nlToday": "Today",
  "nlGoals": "Goals",
  "nlFocus": "Focus",
  "nlHabits": "Habits",
  "nlMoney": "Finances",
  "nlDirection": "EXECUTIVE RADAR, AT A GLANCE",
  "nlPreviewTitle": "Visible trajectory over task fatigue.",
  "nlThisWeek": "This week",
  "nlLaunch": "Strategic expansion",
  "nlProgress": "Goal trajectory",
  "nlRemain32": "On-track · 32% to finish",
  "nlOperations": "Autonomous operations",
  "nlRemain58": "Recovering · 58% to finish",
  "nlDeepWork": "PROTECTED DEEP WORK",
  "nlStrategy": "Cognitive architecture",
  "nlSession": "Focus session",
  "nlEveryMinute": "Zero cognitive residue. Every minute linked to a destination.",
  "nlPriorities": "EXECUTION PRIORITIES (4 FIELDS ONLY)",
  "nlProposal": "Close Series A term sheet",
  "nlInterviews": "Deploy customer retention engine",
  "nlTracked": "DEEP WORK TODAY",
  "nlPreviewCaption": "Momentum radar, focused execution and real trajectory — in one view.",
  "nlBuiltFor": "ENGINEERED FOR HUMAN COGNITION",
  "nlFoundation": "Direction → Protected Focus → Momentum Velocity → Review",
  "nlScienceLabel": "01 / THE COGNITIVE NEUROSCIENCE OF EXECUTION",
  "nlScienceTitle": "Why conventional productivity apps fail high performers.",
  "nlScienceSub": "Your brain is an executive decision engine, not a bucket for infinite to-do lists. Decades of cognitive science confirm three fatal traps:",
  "nlTrap1Title": "Attention Residue (Dr. Sophie Leroy)",
  "nlTrap1Body": "Context switching leaves fragments of attention stuck in prior tasks. Multitasking or managing bloated 15-field task lists degrades cognitive capacity by up to 40%.",
  "nlTrap1Sol": "THE NORTH ANTIDOTE: Single-task Deep Work Capsule with zero interruptions and a strict 4-field execution protocol.",
  "nlTrap2Title": "The Cheap Dopamine Trap (Dr. Cal Newport)",
  "nlTrap2Body": "Checking off 10 easy, trivial to-dos produces artificial dopamine, tricking you into feeling accomplished while your existential core goals stall.",
  "nlTrap2Sol": "THE NORTH ANTIDOTE: Radar Momentum Map; only focused hours on core strategic outcomes move your trajectory line above the 60% stability threshold.",
  "nlTrap3Title": "Hyperbolic Discounting (George Ainslie)",
  "nlTrap3Body": "The human brain heavily discounts future milestones in favor of immediate gratification, generating chronic executive procrastination.",
  "nlTrap3Sol": "THE NORTH ANTIDOTE: Immediate visual velocity feedback; decay mechanisms turn distant goals into an active, urgent daily trajectory.",
  "nlSystemLabel": "02 / THE 4-PILLAR OPERATING SYSTEM",
  "nlSystemTitle": "Zero clutter. Pure executive velocity.",
  "nlSystemSub": "Strip away unnecessary fields and busywork. Connect long-term destinations directly to daily focus.",
  "nlGoalsTitle": "Visual Momentum Radar",
  "nlGoalsBody": "All your goals on a single trajectory chart. Know instantly which outcomes are thriving, plateauing, or slipping below stability.",
  "nlGoalDetail": "Trajectory · Velocity · 60% Stability Line",
  "nlFocusTitle": "Protected Deep Work",
  "nlFocusBody": "Measure actual focused minutes with stopwatch, countdown or Pomodoro. Every second is credited directly to your strategic goals.",
  "nlFocusDetail": "Deep Work · Breaks · Attention Audit",
  "nlLifeTitle": "Cognitive Simplicity",
  "nlLifeBody": "Exactly 4 essential fields per task. No bloated descriptions, no decision paralysis, no endless forms.",
  "nlLifeDetail": "Action · Goal · Date · Priority",
  "nlPhotoCaption": "A private space for deliberate execution.",
  "nlApproachLabel": "03 / A MORE DELIBERATE WAY TO OPERATE",
  "nlApproachTitle": "Your business has a strategy. Your attention deserves one too.",
  "nlApproachBody": "A full calendar often conceals an unclear direction. THE NORTH brings your attention back to what you chose to build, and the next single action that will move it forward.",
  "nlPrinciple1": "Choose the strategic outcome before the action.",
  "nlPrinciple2": "Protect deep work from context switching.",
  "nlPrinciple3": "Monitor momentum trajectory, not task hoarding.",
  "nlFaqLabel": "04 / FREQUENTLY ANSWERED",
  "nlFaqTitle": "Clarity before you begin.",
  "nlQ1": "Who is THE NORTH engineered for?",
  "nlA1": "Founders, executives and high-performers who need to translate high-level vision into daily focused momentum without administrative bloat.",
  "nlQ2": "Where is my data stored?",
  "nlA2": "Securely in your cloud account powered by Supabase. Accessible across all your devices with offline sync support.",
  "nlQ3": "Does it support Arabic and mobile natively?",
  "nlA3": "Yes. Built ground-up with native RTL Arabic and LTR English, featuring an ultra-ergonomic floating mobile dock.",
  "nlQ4": "How does momentum tracking differ from a to-do list?",
  "nlA4": "To-do lists count quantity; THE NORTH measures trajectory. If you stop executing on a goal, its line decays below the 60% threshold, making drift immediately visible.",
  "nlClosingLabel": "FIND YOUR TRUE NORTH.",
  "nlClosingTitle": "Make your next move count.",
  "nlClosingBody": "Start with one vital goal. Protect its focused time. Build unbreakable momentum.",
  "nlFooter": "Cognitive clarity. Relentless execution. True North.",
  "nlPricingNav": "Pricing",
  "nlPricingLabel": "05 / INVESTMENT IN VELOCITY",
  "nlPricingTitle": "Transparent tiers for compounding momentum.",
  "nlPricingSub": "Begin completely free. Upgrade when you are ready for autonomous synchronization and cognitive coaching.",
  "tierCore": "Core",
  "tierCorePrice": "Free",
  "tierCorePeriod": "forever",
  "tierCoreStatus": "FREE FOREVER",
  "tierCoreDesc": "For individuals establishing their baseline execution rhythm.",
  "tierCoreF1": "Identity Cascade (up to 3 active goals)",
  "tierCoreF2": "Deep Work Capsule & Pomodoro Timer",
  "tierCoreF3": "Visual Radar Momentum Trajectory Map",
  "tierCoreF4": "100% Private, Offline Local Storage",
  "tierCoreCta": "Start Free",
  "tierPro": "Pro",
  "tierProBadge": "MOST POPULAR",
  "tierProPrice": "$2.99",
  "tierProPeriod": "/ month",
  "tierProDesc": "For founders and executives who execute across multiple machines.",
  "tierProF1": "Everything in Core, plus:",
  "tierProF2": "Real-time encrypted multi-device cloud sync (Supabase)",
  "tierProF3": "Advanced momentum audits & 30-day velocity analytics",
  "tierProF4": "Unlimited goal portfolios & executive capital budget tracker",
  "tierProF5": "Exportable executive audit reports (PDF/JSON)",
  "tierProGoals": "✓ Unlimited goal portfolios & projects",
  "tierProCta": "Upgrade to Pro",
  "tierProNote": "Bank card payment integration in progress — start free today and upgrade with 1 click.",
  "selectCoreCta": "Start with Core (Free)",
  "selectProCta": "Select Pro ($2.99)",
  "planScreenKicker": "STEP 2 OF 2 · CHOOSE YOUR VELOCITY",
  "planScreenTitle": "Select your execution tier",
  "planScreenSub": "Transparent, high-leverage plans built to compound your focus and momentum.",
  "alreadyHaveAccount": "Already have an account? Sign in",
  "financesPaywallBadge": "👑 EXCLUSIVE TO PRO TIER",
  "financesPaywallTitle": "Executive Capital & Finance Management",
  "financesPaywallSub": "Take full control of your income streams, budget percentage allocations, and capital expenditures to support your strategic goals.",
  "financesPaywallF1": "Dynamic percentage allocation for all incoming revenues",
  "financesPaywallF2": "Forward-looking payment checklist & runway forecasting",
  "financesPaywallF3": "Deep alignment between financial capital and active project goals",
  "financesUpgradeCta": "👑 Upgrade to Pro ($2.99 / mo)",
  "financesBackCta": "← Back to Dashboard",
  "goalLimitNotice": "You reached the limit for the Free Core plan (3 active goals). Upgrade to Pro for unlimited goals and projects.",
  "tierAi": "Executive AI",
  "tierAiBadge": "COMING SOON",
  "tierAiPrice": "$24.99",
  "tierAiPeriod": "/ month",
  "tierAiDesc": "An autonomous AI accountability coach that studies your performance data.",
  "tierAiF1": "Everything in Pro, plus:",
  "tierAiF2": "Autonomous AI Coach studying your focus patterns & velocity decay",
  "tierAiF3": "Automated detection of procrastination & strategic misalignment",
  "tierAiF4": "Weekly executive audio/text briefings to calibrate your week",
  "tierAiF5": "Dynamic habit calibration matched to your biological peak hours",
  "tierAiCta": "Join Priority Waitlist",
  "feedbackTitle": "Help Shape THE NORTH",
  "feedbackSub": "Your suggestions directly guide our engineering roadmap. Tell us what would make you 10x more effective.",
  "feedbackType": "Category",
  "feedbackFeature": "💡 New Feature",
  "feedbackUx": "⚡ UX / Speed Polish",
  "feedbackBug": "🐞 Bug Report",
  "feedbackPlaceholder": "What idea, friction point, or suggestion do you have?",
  "feedbackSubmit": "Send feedback",
  "feedbackThanks": "Thank you! Your feedback directly shapes the future of THE NORTH.",
  "viewPlans": "Membership & Plans",
  "giveFeedback": "Share feedback / suggest a feature"
});
Object.assign(dict.ar, {
  "nlSkip": "انتقل إلى المحتوى",
  "nlProduct": "النظام",
  "nlScienceNav": "الأساس العلمي",
  "nlApproach": "المنهج التنفيذي",
  "nlQuestions": "أسئلة شائعة",
  "nlStart": "ابدأ الآن",
  "nlEyebrow": "بنية عصبية وإدراكية لتنفيذ القادة والمبتكرين",
  "nlHero1": "توقّف عن تكديس المهام.",
  "nlHero2": "ابنِ زخمًا حقيقيًا لا يتوقف.",
  "nlIntro": "تؤكد أبحاث العلوم الإدراكية والعصبية: قوائم المهام التقليدية تمنح الدماغ دوبامين رخيصًا ومزيفًا عند إنجاز التوافه، بينما تُجوّع الأهداف الاستراتيجية الكبرى. THE NORTH هو معمارية تنفيذية مصممة لتدمير التشتت، وربط ساعات تركيزك اليومية مباشرة بسرعة زخم أهدافك.",
  "nlCreate": "أطلق مساحة عملك",
  "nlExplore": "الأساس العلمي والنظام",
  "nlTrust": "مبني على علم الأعصاب الإدراكي. عربي وإنجليزي. حاسوب وهاتف.",
  "nlSample": "رادار الزخم التنفيذي المباشر · مسار حي",
  "nlToday": "اليوم",
  "nlGoals": "الأهداف",
  "nlFocus": "التركيز",
  "nlHabits": "العادات",
  "nlMoney": "المال",
  "nlDirection": "رادار الزخم التنفيذي، بنظرة واحدة",
  "nlPreviewTitle": "رؤية المسار الحقيقي بدل إرهاق المهام اللانهائية.",
  "nlThisWeek": "هذا الأسبوع",
  "nlLaunch": "التوسع الاستراتيجي للشركة",
  "nlProgress": "مسار الزخم",
  "nlRemain32": "على المسار · متبقٍّ 32٪ للهدف",
  "nlOperations": "أتمتة العمليات الأساسية",
  "nlRemain58": "في طور الاستعادة · متبقٍّ 58٪",
  "nlDeepWork": "جلسة عمل عميق محميّة",
  "nlStrategy": "المعمارية الإدراكية",
  "nlSession": "جلسة تركيز",
  "nlEveryMinute": "صفر بقايا انتباه مشتت. كل دقيقة مصبوبة في وجهتك الكبرى.",
  "nlPriorities": "أولويات التنفيذ (4 خانات جوهرية فقط)",
  "nlProposal": "إغلاق جولة التمويل الاستثماري",
  "nlInterviews": "نشر محرك استبقاء العملاء",
  "nlTracked": "ساعات العمل العميق اليوم",
  "nlPreviewCaption": "رادار الزخم، والعمل العميق المحمي، والمسار الاستراتيجي الحقيقي — في شاشة واحدة.",
  "nlBuiltFor": "مصمّم وفق الهندسة الإدراكية للدماغ البشري",
  "nlFoundation": "وجهة استراتيجية ← تركيز محمي ← زخم تنفيذي ← مراجعة دورية",
  "nlScienceLabel": "01 / العلوم العصبية والإدراكية للتنفيذ",
  "nlScienceTitle": "لماذا تفشل تطبيقات الإنتاجية التقليدية مع أصحاب الإنجاز العالي؟",
  "nlScienceSub": "دماغك محرك لاتخاذ القرارات الاستراتيجية، وليس سلة مهملات لتكديس المهام. تكشف عقود من أبحاث علم الأعصاب 3 أفخاخ قاتلة للإنتاجية:",
  "nlTrap1Title": "بقايا الانتباه (Attention Residue - د. صوفي ليروي)",
  "nlTrap1Body": "الانتقال السريع بين المهام المتعددة يترك شظايا عصبية من انتباهك عالقة في المهمة السابقة. ملء استمارات المهام المكتظة بـ 15 خانة يدمر طاقتك الإدراكية بنسبة تصل إلى 40%.",
  "nlTrap1Sol": "ترياق THE NORTH: كبسولة عمل عميق بمهمة واحدة، صفر مشتتات، وبروتوكول تنفيذي لا يتجاوز 4 خانات جوهرية.",
  "nlTrap2Title": "فخ الدوبامين الرخيص (The Cheap Dopamine Trap - د. كال نيوبورت)",
  "nlTrap2Body": "شطب 10 مهام تافهة وسريعة يُفرز دوبامين زائفًا يوهمك بالإنجاز، بينما تظل أهدافك المصيرية متجمدة ومؤجلة لأسابيع.",
  "nlTrap2Sol": "ترياق THE NORTH: رادار الزخم الذكي؛ ساعات التركيز على النتائج الاستراتيجية فقط هي ما يرفع منحنى تقدمك فوق خط الأمان (60%).",
  "nlTrap3Title": "الخصم الزمني المفرط (Hyperbolic Discounting - جورج إينزلي)",
  "nlTrap3Body": "العقل البشري يقلل بيولوجياً من قيمة المكافآت المستقبلية البعيدة مفضلاً المتعة اللحظية، ما يولد التسويف المزمن لدى القادة والمطورين.",
  "nlTrap3Sol": "ترياق THE NORTH: تغذية بصرية راجعة فورية لسرعة الإنجاز؛ نظام الانحدار الديناميكي يحول الهدف البعيد إلى مسار حي يستنفر انتباهك يومياً.",
  "nlSystemLabel": "02 / ركائز النظام التنفيذي الأربعة",
  "nlSystemTitle": "صفر فوضى. كفاءة وسرعة تنفيذية مطلقة.",
  "nlSystemSub": "جردنا النظام من كل الخانات الإدارية المرهقة التي تستهلك طاقتك. اربط وجهتك الكبرى بتركيز يومك مباشرة.",
  "nlGoalsTitle": "رادار الزخم البصري",
  "nlGoalsBody": "جميع أهدافك على رسم بياني حي واحد. اعرف بنظرة خاطفة أي الأهداف يزدهر، وأيها يتباطأ، وأيها يواجه خطر الهبوط تحت الخط الحرج.",
  "nlGoalDetail": "مسار الزخم · سرعة الإنجاز · خط استقرار 60٪",
  "nlFocusTitle": "العمل العميق المحمي",
  "nlFocusBody": "سجّل دقائق التركيز الحقيقية بساعة إيقاف، أو عدّ تنازلي، أو بومودورو. كل ثانية تُقيد وتُحتسب مباشرة لصالح أهدافك الاستراتيجية.",
  "nlFocusDetail": "عمل عميق · فترات راحة محسوبة · تدقيق الانتباه",
  "nlLifeTitle": "البساطة الإدراكية القصوى",
  "nlLifeBody": "4 خانات أساسية فقط لكل مهمة. لا أوصاف طويلة، لا شلل في اتخاذ القرار، ولا استمارات تملؤها وتضيع وقتك.",
  "nlLifeDetail": "العمل المطلوب · الهدف المرتبط · الموعد · الأولوية",
  "nlPhotoCaption": "مساحة خاصة للتنفيذ الواعي الحاسم.",
  "nlApproachLabel": "03 / منهج تنفيذي حاسم للأعمال",
  "nlApproachTitle": "لمشروعك استراتيجية واضحة. وانتباهك يستحق استراتيجية تحميه.",
  "nlApproachBody": "الجدول المزدحم بالاجتماعات غالبًا ما يخفي غياب الوجهة الحقيقية. THE NORTH يعيد توجيه طاقتك العصبية نحو ما اخترت بناءه، والخطوة التالية الحاسمة لتحقيقه.",
  "nlPrinciple1": "حدّد النتيجة الاستراتيجية قبل اختيار المهمة.",
  "nlPrinciple2": "احمِ ساعات العمل العميق من شتات التبديل بين المهام.",
  "nlPrinciple3": "راقب منحنى الزخم الحقيقي، لا عدد المهام المتراكمة.",
  "nlFaqLabel": "04 / إجابات حاسمة",
  "nlFaqTitle": "وضوح تام قبل أن تبدأ.",
  "nlQ1": "لمن صُمّم نظام THE NORTH خصيصًا؟",
  "nlA1": "للمؤسسين، والمديرين التنفيذيين، والمطورين، وأصحاب الإنجازات العالية الذين يحتاجون لتحويل الرؤى الكبرى إلى تركيز يومي دون قيود إدارية مشتتة.",
  "nlQ2": "أين تُحفظ وتُشفر بياناتي؟",
  "nlA2": "تُحفظ بأمان مشفر عبر حسابك السحابي المدعوم بقواعد بيانات Supabase، وتتزامن فورياً عبر جميع أجهزتك مع دعم كامل للعمل دون إنترنت.",
  "nlQ3": "هل يدعم التطبيق اللغة العربية والهاتف بشكل أصيل؟",
  "nlA3": "نعم بالكامل. تم تصميمه من الصفر بدعم واجهة عربية RTL أصيلة وإنجليزية LTR، مع شريط عائم سفلي ذكي ومريح للغاية على شاشات الهواتف.",
  "nlQ4": "كيف يختلف تتبع الزخم عن قوائم المهام التقليدية؟",
  "nlA4": "قوائم المهام تعد الكميات السطحية؛ أما THE NORTH فيقيس الزخم الرياضي. إذا توقفت عن العمل على هدف، يبدأ خط الزخم في الانحدار تلقائياً تحت خط 60٪، مما يكشف الانحراف فوراً ويعيدك للتركيز.",
  "nlClosingLabel": "اكتشف وجهتك الحقيقية.",
  "nlClosingTitle": "اجعل كل دقيقة من يومك ذات وزن وتأثير.",
  "nlClosingBody": "اختر هدفك الاستراتيجي الأهم. احمِ ساعات تركيزك. وابنِ زخمًا لا يقبل التراجع.",
  "nlFooter": "وضوح إدراكي. تنفيذ بلا هوادة. وجهتك نحو القمة.",
  "nlPricingNav": "باقات الاشتراك",
  "nlPricingLabel": "05 / الاستثمار في سرعة الإنجاز",
  "nlPricingTitle": "باقات واضحة وشفافة لزخم تنفيذي لا يتوقف.",
  "nlPricingSub": "ابدأ مجاناً بالكامل. طوّر نظامك للمزامنة السحابية الفورية والتدريب الإدراكي المتقدم.",
  "tierCore": "النواة (Core)",
  "tierCorePrice": "مجاناً",
  "tierCorePeriod": "مدى الحياة",
  "tierCoreStatus": "مجاناً مدى الحياة",
  "tierCoreDesc": "للأفراد والمطورين الراغبين في بناء إيقاع انضباط وتنفيذ يومي حقيقي.",
  "tierCoreF1": "سلسلة الهوية المتسلسلة (حتى 3 أهداف نشطة)",
  "tierCoreF2": "كبسولة العمل العميق ومؤقت البومودورو بدون مشتتات",
  "tierCoreF3": "رادار الزخم البصري وخريطة مسار الأهداف الحية",
  "tierCoreF4": "خصوصية كاملة 100% مع تخزين محلي يعمل دون إنترنت",
  "tierCoreCta": "ابدأ مجاناً",
  "tierPro": "المحترف (Pro)",
  "tierProBadge": "الأكثر طلباً",
  "tierProPrice": "2.99$",
  "tierProPeriod": "/ شهرياً",
  "tierProDesc": "للمؤسسين والقادة الذين يديرون مشاريعهم عبر أجهزة وحواسيب متعددة.",
  "tierProF1": "كل ما في باقة Core، بالإضافة إلى:",
  "tierProF2": "مزامنة سحابية مشفرة وفورية عبر جميع أجهزتك (Supabase)",
  "tierProF3": "تحليلات الزخم المتقدمة وتدقيق المسار لآخر 30 يوماً",
  "tierProF4": "نظام إدارة التدفقات المالية وتوزيع رأس المال الذكي",
  "tierProF5": "تصدير تقارير تنفيذية ومشاركتها (PDF/JSON)",
  "tierProGoals": "✓ محفظة أهداف ومشاريع غير محدودة",
  "tierProCta": "الترقية إلى Pro (2.99$)",
  "tierProNote": "بوابة الدفع البنكي الإلكتروني قيد التفعيل — ابدأ بالباقة المجانية حالياً وستتمكن من الترقية بنقرة واحدة فور اكتمال الربط.",
  "selectCoreCta": "البدء بالباقة العادية (مجاناً)",
  "selectProCta": "اختيار باقة Pro (2.99$)",
  "planScreenKicker": "الخطوة 2 من 2 · اختر سرعة انطلاقك",
  "planScreenTitle": "اختر باقة إدارتك وتنفيذك",
  "planScreenSub": "باقات واضحة وعالية المردود مصممة لمضاعفة تركيزك وزخم أهدافك.",
  "alreadyHaveAccount": "لديك حساب بالفعل؟ تسجيل الدخول",
  "financesPaywallBadge": "👑 ميزة حصرية لمشتركي باقة PRO",
  "financesPaywallTitle": "إدارة التدفقات المالية وتوزيع رأس المال الذكي",
  "financesPaywallSub": "تحكم في دخلك الشهري، توزيع نسب الميزانية، وتتبع النفقات الرأسمالية لتحقيق أهدافك بوضوح تنفيذي.",
  "financesPaywallF1": "توزيع آلي للدخل بالنسب المئوية المخصصة",
  "financesPaywallF2": "قائمة متابعة الالتزامات المالية والتوقعات المستقبلية",
  "financesPaywallF3": "ربط وثيق بين رأس المال وأهداف المشاريع التنفيذية",
  "financesUpgradeCta": "👑 الترقية إلى باقة Pro (2.99$ / شهرياً)",
  "financesBackCta": "← العودة للرئيسية",
  "goalLimitNotice": "وصلت إلى الحد الأقصى للباقة العادية (3 أهداف نشطة). اشترك في باقة Pro لإضافة أهداف ومشاريع غير محدودة.",
  "tierAi": "المدرب الذكي (Executive AI)",
  "tierAiBadge": "قريباً · COMING SOON",
  "tierAiPrice": "24.99$",
  "tierAiPeriod": "/ شهرياً",
  "tierAiDesc": "مدرب ذكاء اصطناعي تنفيذي يقرأ بيانات حسابك ويوجهك أسبوعياً نحو القمة.",
  "tierAiF1": "كل ما في باقة Pro، بالإضافة إلى:",
  "tierAiF2": "مدرب ذكاء اصطناعي يحلل جلسات تركيزك وسرعة زخم أهدافك",
  "tierAiF3": "اكتشاف تلقائي للتسويف وهدر الانتباه وتنبيهك قبل فوات الأوان",
  "tierAiF4": "إحاطة استراتيجية أسبوعية مخصصة لإعادة توجيه جدول أعمالك",
  "tierAiF5": "معايرة ديناميكية لعاداتك وفق أوقات ذروة طاقتك اليومية",
  "tierAiCta": "انضم لقائمة الانتظار المبكرة",
  "feedbackTitle": "شاركنا رؤيتك لتطوير THE NORTH",
  "feedbackSub": "اقتراحاتك وملاحظاتك تساهم مباشرة في توجيه خارطة تطوير النظام.",
  "feedbackType": "نوع المقترح",
  "feedbackFeature": "💡 ميزة جديدة",
  "feedbackUx": "⚡ تحسين في التجربة والسرعة",
  "feedbackBug": "🐞 إبلاغ عن مشكلة",
  "feedbackPlaceholder": "ما هي الفكرة، الملاحظة، أو التحسين الذي تقترحه؟",
  "feedbackSubmit": "إرسال المقترح",
  "feedbackThanks": "شكراً لك! صوتك واقتراحك يبني معنا مستقبل THE NORTH.",
  "viewPlans": "باقات الاشتراك والعضوية",
  "giveFeedback": "شاركنا اقتراحك / طلب ميزة"
});
function t(k){return dict[currentLang()][k]||k}
function getAccounts(){try{return JSON.parse(localStorage.getItem(APP_KEY)||"{}")}catch{return {}}}
function setAccounts(v){try{localStorage.setItem(APP_KEY,JSON.stringify(v));window.dispatchEvent(new Event("north:local-change"))}catch(e){toast(currentLang()==="ar"?"تعذر الحفظ. تحقق من مساحة التخزين وصدّر نسخة احتياطية.":"Could not save. Check storage and export a backup.");throw e}}
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
  if($("#planLangBtn")) $("#planLangBtn").textContent=ar?"English":"العربية";
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
  $("#planScreen")?.classList.add("hidden");
  $("#authScreen").classList.add("hidden");
  $("#appScreen").classList.add("hidden");
  applyLang();
  window.scrollTo({top:0,behavior:"auto"});
}
function showPlans(){
  $("#landingScreen").classList.add("hidden");
  $("#planScreen")?.classList.remove("hidden");
  $("#authScreen").classList.add("hidden");
  $("#appScreen").classList.add("hidden");
  applyLang();
  window.scrollTo({top:0,behavior:"auto"});
}
function openAuth(tab="signup"){
  $("#landingScreen").classList.add("hidden");
  $("#planScreen")?.classList.add("hidden");
  $("#authScreen").classList.remove("hidden");
  $("#appScreen").classList.add("hidden");
  authTab(tab);
  applyLang();
  window.scrollTo({top:0,behavior:"auto"});
}
function showAuth(){
  $("#landingScreen").classList.add("hidden");$("#planScreen")?.classList.add("hidden");$("#authScreen").classList.remove("hidden");$("#appScreen").classList.add("hidden");
  applyLang();
}
function showApp(){
  $("#landingScreen").classList.add("hidden");$("#planScreen")?.classList.add("hidden");$("#authScreen").classList.add("hidden");$("#appScreen").classList.remove("hidden");
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
$("#planBackBtn")&&( $("#planBackBtn").onclick=showLanding );
$("#planLangBtn")&&( $("#planLangBtn").onclick=toggleLang );
$("#selectCoreBtn")&&( $("#selectCoreBtn").onclick=()=>{ localStorage.setItem("thenorth_tier","core"); openAuth("signup"); } );
$("#selectProBtn")&&( $("#selectProBtn").onclick=()=>{
  toast(currentLang()==="ar"?"بوابة الدفع البنكي الإلكتروني قيد الربط والتفعيل — تم تفعيل الباقة العادية لك حالياً، وستتمكن من الترقية بنقرة واحدة فور اكتمال الربط.":"Bank card payment integration in progress — Core tier activated for now. You will be able to upgrade with 1 click once live.");
  localStorage.setItem("thenorth_tier","core");
  openAuth("signup");
} );
$("#skipToLoginBtn")&&( $("#skipToLoginBtn").onclick=()=>openAuth("login") );
$("#landingLogo").onclick=(e)=>{e.preventDefault();showLanding()};
$$("[data-scroll-how]").forEach(b=>b.onclick=()=>($("#the-science")||$("#howItWorks")).scrollIntoView({behavior:"smooth"}));
$$("[data-waitlist-ai]").forEach(b=>b.onclick=()=>{
  const msg = currentLang() === "ar" ? "أدخل بريدك الإلكتروني للانضمام لقائمة الانتظار ذات الأولوية للمدرب الذكي:" : "Enter your email to join the Executive AI Coach priority waitlist:";
  const email = prompt(msg);
  if (email && email.includes("@")) {
    try {
      const waitlist = JSON.parse(localStorage.getItem("thenorth_ai_waitlist") || "[]");
      if (!waitlist.includes(email)) waitlist.push(email);
      localStorage.setItem("thenorth_ai_waitlist", JSON.stringify(waitlist));
    } catch {}
    toast(currentLang() === "ar" ? "✨ تم تسجيلك في قائمة الانتظار ذات الأولوية للمدرب الذكي!" : "✨ You are on the priority waitlist for Executive AI Coach!");
  }
});
$("#authLangBtn").onclick=toggleLang;$("#landingLangBtn").onclick=toggleLang;$("#langBtn").onclick=toggleLang;$("#mobileLangBtn").onclick=toggleLang;$("#accountLangBtn").onclick=toggleLang;

let authBusy=false;
async function enterCloud(user) {
  const email=user.email.toLowerCase(), all=getAccounts();
  if(all[email]?.cloudUserId && all[email].cloudUserId!==user.id){
    localStorage.setItem("north_identity_recovery_"+Date.now(),JSON.stringify(all[email]));
    delete all[email];
  }
  if(!all[email])all[email]={data:freshData(user.user_metadata?.name||email.split("@")[0],email,user.user_metadata?.lang||document.documentElement.lang)};
  all[email].cloudUserId=user.id;
  delete all[email].passwordHash;
  setAccounts(all);localStorage.setItem(SESSION_KEY,email);
  if(window.NorthAuth)window.NorthAuth.cachedUser=user;
  if(window.NorthBoot)await window.NorthBoot.prepare();
  showApp();
}
async function authSubmit(e,signup) {
  e.preventDefault();if(authBusy)return;authBusy=true;
  const form=e.target, buttons=[...form.querySelectorAll("button")];buttons.forEach(b=>b.disabled=true);
  const email=$(signup?"#signupEmail":"#loginEmail").value.trim().toLowerCase();
  const password=$(signup?"#signupPassword":"#loginPassword");
  const pw=password.value;
  try{
    const result=signup?await window.NorthAuth.signup(email,pw,$("#signupName").value.trim(),document.documentElement.lang):await window.NorthAuth.login(email,pw);
    if(result.session){await enterCloud(result.user);}
    else if(signup){
      // Supabase sometimes returns no session on first signup even with confirm=off.
      // Immediately attempt sign-in with the same credentials.
      try{
        const loginResult=await window.NorthAuth.login(email,pw);
        if(loginResult.session){await enterCloud(loginResult.user);}
        else{toast(currentLang()==="ar"?"تم إنشاء الحساب. سجّل الدخول الآن.":"Account created. Please sign in.");authTab("login");$("#loginEmail").value=email;}
      }catch(loginErr){
        // If login fails after signup, the account was created but email confirmation may still be pending.
        const msg=loginErr?.code==="email_not_confirmed"
          ?(currentLang()==="ar"?"تم إنشاء الحساب. افتح بريدك الإلكتروني للتأكيد ثم سجّل الدخول.":"Account created. Check your email to confirm, then sign in.")
          :window.NorthAuth.errorMessage(loginErr,currentLang(),false);
        toast(msg);authTab("login");$("#loginEmail").value=email;
      }
    }
    else{toast(currentLang()==="ar"?"أرسلنا رسالة لتأكيد بريدك. أكّد البريد ثم سجّل الدخول.":"Check your email to confirm your account, then sign in.");authTab("login");$("#loginEmail").value=email;}
  }catch(err){
    toast(window.NorthAuth.errorMessage(err,currentLang(),signup));
  }finally{password.value="";authBusy=false;buttons.forEach(b=>b.disabled=false);}
}

$("#signupForm").addEventListener("submit",e=>authSubmit(e,true));
$("#loginForm").addEventListener("submit",e=>authSubmit(e,false));

function rollover(){
  const d=data(); if(!d)return; const today=iso(), last=d.lastOpened||today;if(last===today){ensureToday();return}
  const start=new Date(last+"T12:00:00"), end=new Date(today+"T12:00:00");
  const diff=Math.max(1,Math.round((end-start)/86400000));
  d.goals.forEach(g=>{
    if(g.archived||g.progress>=100)return;
    for(let i=1;i<=diff;i++){
      const dt=new Date(start);dt.setDate(dt.getDate()+i);const day=window.LifeCore.day(+dt);
      const hadAction=d.tasks.some(x=>x.goalId===g.id&&x.done&&x.completedDate===day)||d.habits.some(h=>h.goalId===g.id&&h.checks?.includes(day))||(d.sessions||[]).some(s=>s.goalId===g.id&&window.LifeCore.day(s.startedAt)===day);
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
  const activeGoals=d.goals.filter(g=>!g.archived);
  const total=activeGoals.length;
  const onTrack=activeGoals.filter(g=>g.momentum>=th).length;
  const risk=activeGoals.filter(g=>g.momentum<th).length;
  const todays=d.tasks.filter(x=>x.date===iso());
  const done=todays.filter(x=>x.done).length;
  const execution=todays.length?Math.round(done/todays.length*100):0;
  if($("#statGoals"))$("#statGoals").textContent=total;
  if($("#statOnTrack"))$("#statOnTrack").textContent=onTrack;
  if($("#statRisk"))$("#statRisk").textContent=risk;
  if($("#statToday"))$("#statToday").textContent=execution+"%";
}

function renderChart(){
  const svg=$("#marketChart"), d=data();const activeGoals=d.goals.filter(g=>!g.archived);if(!svg||!activeGoals.length){if(svg)svg.innerHTML="";return}
  const W=1100,H=430,p={l:55,r:24,t:25,b:42},iw=W-p.l-p.r,ih=H-p.t-p.b,n=d.range||7;
  const dates=[...new Set(activeGoals.flatMap(g=>g.history.map(h=>h.date)))].sort().slice(-n);if(!dates.length)return;
  const x=i=>p.l+(dates.length===1?iw/2:i/(dates.length-1)*iw), y=v=>p.t+(1-v/100)*ih;
  let out="";
  for(let v=0;v<=100;v+=20){out+=`<line x1="${p.l}" y1="${y(v)}" x2="${W-p.r}" y2="${y(v)}" stroke="#252b36"/><text x="${p.l-11}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#7e8798">${v}</text>`}
  const th=d.profile.threshold||60;out+=`<line x1="${p.l}" y1="${y(th)}" x2="${W-p.r}" y2="${y(th)}" stroke="#d8dce5" stroke-width="2" stroke-dasharray="9 7" opacity=".72"/><rect x="${W-190}" y="${y(th)-16}" width="145" height="22" rx="8" fill="#e9e6df"/><text x="${W-118}" y="${y(th)-1}" text-anchor="middle" font-size="10" font-weight="800" fill="#17191e">${t("onTrackChart")} ${th}</text>`;
  dates.forEach((dt,i)=>{if(dates.length<=8||i%Math.ceil(dates.length/7)===0||i===dates.length-1){const label=new Intl.DateTimeFormat(currentLang()==="ar"?"ar-MA":"en-GB",{month:"short",day:"numeric"}).format(new Date(dt+"T12:00:00"));out+=`<text x="${x(i)}" y="${H-15}" text-anchor="middle" font-size="10" fill="#7e8798">${label}</text>`}});
  activeGoals.forEach(g=>{
    const map=new Map(g.history.map(h=>[h.date,h.value]));let last=0;const pts=dates.map((dt,i)=>{if(map.has(dt))last=map.get(dt);return[x(i),y(last)]});
    const path=pts.map((pt,i)=>`${i?"L":"M"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(" ");out+=`<path d="${path}" fill="none" stroke="#0d1016" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/><path d="${path}" fill="none" stroke="${g.color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const end=pts[pts.length-1];out+=`<circle cx="${end[0]}" cy="${end[1]}" r="8" fill="${g.color}" stroke="white" stroke-width="4"/>`;
  });svg.innerHTML=out;
}
function renderLegend(){const el=$("#marketLegend"),d=data();if(!el)return;el.innerHTML=d.goals.filter(g=>!g.archived).map(g=>`<div class="legend-pill"><i class="dot" style="background:${g.color}"></i>${esc(g.name)} <b>${Math.round(g.momentum)}</b></div>`).join("")}
function smallGoal(g){const [label,cls]=status(g);return `<div class="goal-row"><div class="goal-row-top"><div class="goal-title"><i class="dot" style="background:${g.color}"></i>${esc(g.name)}</div><div class="momentum-score">${Math.round(g.momentum)}</div></div><div class="goal-status ${cls}">${label}</div><div class="goal-foot"><span>${t("goalProgress")}</span><b>${Number(g.progress||0).toFixed(1)}%</b></div><div class="progress-line"><i style="width:${clamp(g.progress||0)}%;background:${g.color}"></i></div></div>`}
function renderGoalLists(){
  const d=data(),activeGoals=d.goals.filter(g=>!g.archived);$("#dashboardGoals").innerHTML=activeGoals.length?activeGoals.map(smallGoal).join(""):`<div class="empty-block">${t("noGoals")}</div>`;
  $("#goalsPage").innerHTML=activeGoals.length?activeGoals.map(g=>{const [label,cls]=status(g);return `<article class="goal-large"><div class="goal-large-head"><div><div class="goal-title"><i class="dot" style="background:${g.color}"></i><h3>${esc(g.name)}</h3></div><div class="goal-status ${cls}">${label}</div></div><div class="goal-actions"><button class="icon-btn" data-delete-goal="${g.id}" title="${t("delete")}">🗑</button></div></div><div class="goal-big-score">${Math.round(g.momentum)} <small>${t("momentum")}</small></div><div class="goal-foot"><span>${t("goalProgress")}</span><b>${Number(g.progress||0).toFixed(1)}%</b></div><div class="progress-line"><i style="width:${clamp(g.progress||0)}%;background:${g.color}"></i></div><div class="why-box">${esc(g.why||"—")}</div><div class="goal-foot"><span>${esc(g.category||"")}</span><span>${g.deadline?esc(g.deadline):t("noDeadline")}</span></div></article>`}).join(""):`<div class="empty-block">${t("noGoals")}</div>`;
  $$("[data-delete-goal]").forEach(b=>b.onclick=()=>deleteGoal(b.dataset.deleteGoal));
}
function taskHtml(tk){const g=data().goals.find(g=>g.id===tk.goalId);return `<div class="task-row ${tk.done?"done":""}"><button class="task-check" data-task="${tk.id}">${tk.done?"✓":""}</button><div><div class="task-name">${esc(tk.title)}</div><div class="task-meta"><i class="dot" style="display:inline-block;background:${g?.color||"#aaa"}"></i> ${esc(g?.name||"")} · +${tk.progressImpact}%</div></div><span class="impact-chip">+${tk.impact}</span></div>`}
function renderTasks(){
  const tasks=data().tasks.filter(x=>x.date===iso());const html=tasks.length?tasks.map(taskHtml).join(""):`<div class="empty-block">${t("noTasks")}</div>`;
  $("#dashboardTasks").innerHTML=html;$("#todayPageTasks").innerHTML=html;$$("[data-task]").forEach(b=>b.onclick=()=>toggleTask(b.dataset.task));
}
function renderPlanner(){
  const d=data(),activeGoals=d.goals.filter(g=>!g.archived);$("#plannerPage").innerHTML=activeGoals.length?activeGoals.map(g=>`<article class="plan-card"><div class="plan-title"><i class="dot" style="background:${g.color}"></i>${esc(g.name)}</div><div class="cascade">${step(t("sixMonths"),g.plan.m6)}${step(t("threeMonths"),g.plan.m3)}${step(t("thisMonth"),g.plan.month)}${step(t("thisWeek"),g.plan.week)}</div></article>`).join(""):`<div class="empty-block">${t("noGoals")}</div>`;
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
$$("[data-add-task]").forEach(b=>b.onclick=()=>{const ag=data().goals.filter(g=>!g.archived);if(!ag.length)return toast(t("createGoalFirst"));$("#taskGoal").innerHTML=ag.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("");taskDialog.showModal()});
$$(".close-dialog").forEach(b=>b.onclick=()=>b.closest("dialog").close());

$("#goalForm").addEventListener("submit",e=>{
  e.preventDefault();const d=data();const g={id:uid(),name:$("#goalName").value.trim(),deadline:$("#goalDeadline").value,category:$("#goalCategory").value,why:$("#goalWhy").value.trim(),color:palette[d.goals.length%palette.length],momentum:0,progress:0,history:[{date:iso(),value:0}],plan:{m6:$("#goal6m").value.trim(),m3:$("#goal3m").value.trim(),month:$("#goalMonth").value.trim(),week:$("#goalWeek").value.trim()}};
  saveData(x=>x.goals.push(g));goalDialog.close();e.target.reset();generateSignals();renderAll();toast(t("created"));
});
$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  const priority = $("#taskPriority")?.value || "medium";
  const priorityImpact = priority === "high" ? 20 : priority === "low" ? 5 : 10;
  const tk = {
    id: uid(),
    title: $("#taskTitle").value.trim(),
    goalId: $("#taskGoal").value,
    priority,
    impact: $("#taskImpact") ? Number($("#taskImpact").value) : priorityImpact,
    progressImpact: $("#taskProgress") ? Number($("#taskProgress").value || 0) : 10,
    date: $("#taskDate")?.value || iso(),
    done: false,
    completedDate: ""
  };
  saveData(d=>d.tasks.push(tk));
  taskDialog.close();
  e.target.reset();
  renderAll();
  toast(t("taskAdded"));
});
function toggleTask(id){
  saveData(d=>{
    if(window.LifeCore?.completeTask){
      window.LifeCore.completeTask(d,id);
      const tk=d.tasks.find(x=>x.id===id);
      const g=d.goals.find(x=>x.id===tk?.goalId);
      if(tk&&g&&tk.done){
        d.notifications.unshift({id:"done-"+id+"-"+Date.now(),type:"success",title:`${g.name} ${t("movedUp")}`,body:`${t("completed")}: ${tk.title}. ${t("momentum")}: ${Math.round(g.momentum)}.`,ts:Date.now()});
      }
      return;
    }
    const tk=d.tasks.find(x=>x.id===id);if(!tk)return;const g=d.goals.find(x=>x.id===tk.goalId);if(!g)return;if(!tk.done){tk.done=true;tk.completedDate=iso();g.momentum=clamp(g.momentum+tk.impact);g.progress=clamp(g.progress+tk.progressImpact);updateHistory(g);d.notifications.unshift({id:"done-"+id+"-"+Date.now(),type:"success",title:`${g.name} ${t("movedUp")}`,body:`${t("completed")}: ${tk.title}. ${t("momentum")}: ${Math.round(g.momentum)}.`,ts:Date.now()})}else{tk.done=false;tk.completedDate="";g.momentum=clamp(g.momentum-tk.impact);g.progress=clamp(g.progress-tk.progressImpact);updateHistory(g)}
  });generateSignals();renderAll();
}
function deleteGoal(id){
  if(!confirm(t("delete")+"?"))return;
  saveData(d=>{
    const g=d.goals.find(x=>x.id===id);
    if(g)g.archived=true;
    d.tasks.forEach(t=>{if(t.goalId===id)t.goalId="";});
    d.habits.forEach(h=>{if(h.goalId===id)h.goalId="";});
  });
  renderAll();
}
$$(".range-btn").forEach(b=>b.onclick=()=>{saveData(d=>d.range=Number(b.dataset.range));$$(".range-btn").forEach(x=>x.classList.toggle("active",x===b));renderChart()});
$("#clearNotifications").onclick=()=>{saveData(d=>{d.notifications=[];d.dismissed={}});renderAll()};
$("#saveProfileBtn").onclick=()=>{saveData(d=>{d.profile.name=$("#accountNameInput").value.trim()||d.profile.name;d.profile.threshold=clamp(Number($("#thresholdInput").value||60),10,90)});renderAll();toast(t("saved"))};
$("#thresholdInput").addEventListener("change",()=>{saveData(d=>d.profile.threshold=clamp(Number($("#thresholdInput").value||60),10,90));renderAll()});
$("#avatarInput").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{saveData(d=>d.profile.avatar=r.result);renderAll()};r.readAsDataURL(f)});
$("#logoutBtn").onclick=async()=>{try{await window.NorthBoot?.flush();await window.NorthAuth.logout();localStorage.removeItem(SESSION_KEY);showLanding();}catch{toast(currentLang()==="ar"?"تعذر تسجيل الخروج. تحقق من الاتصال وأعد المحاولة.":"Could not sign out. Check your connection and retry.");}};
$("#exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify({schemaVersion:4,exportedAt:Date.now(),data:data()},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`lifeos-backup-${iso()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),400)};
$("#importInput").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>10000000){toast(currentLang()==="ar"?"الملف كبير جدًا":"File is too large");return;}const r=new FileReader();r.onload=()=>{try{window.LifeWorkspace.importData(JSON.parse(r.result));}catch{toast(currentLang()==="ar"?"ملف غير صالح. لم تتغير بياناتك.":"Invalid file. Your data was not changed.");}e.target.value="";};r.onerror=()=>toast(currentLang()==="ar"?"تعذر قراءة الملف":"Could not read file");r.readAsText(f)});

window.LifeLegacy={renderAll,applyLang,toggleLang};

// --- Storage quota warning ---
function checkStorageQuota(){
  try{
    const used=new Blob([localStorage.getItem(APP_KEY)||""]).size;
    const LIMIT=4.5*1024*1024;
    if(used>LIMIT){
      const msg=currentLang()==="ar"
        ?"\u26a0\ufe0f \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u062a\u0642\u062a\u0631\u0628 \u0645\u0646 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649. \u0635\u062f\u0651\u0631 \u0646\u0633\u062e\u0629 \u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629 \u0645\u0646 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0622\u0646."
        :"\u26a0\ufe0f Storage is nearly full. Export a backup from Settings before data is lost.";
      toast(msg);
    }
  }catch{}
}

// --- App boot: offline-first ---
// 1. Show landing (neutral).
// 2. Try Supabase cloud session (needs internet).
// 3. Success  -> enterCloud().
// 4. Failure  -> check local session. If found -> enter offline mode.
// 5. No local session -> stay on landing.
showLanding();

window.addEventListener("load", async () => {
  try {
    const session = await window.NorthAuth.session();
    if (session) { await enterCloud(session.user); checkStorageQuota(); return; }
  } catch { /* Supabase unreachable - fall through */ }

  const cachedEmail = localStorage.getItem(SESSION_KEY);
  if (cachedEmail) {
    const all = getAccounts();
    if (all[cachedEmail]?.data) {
      showApp();
      const msg = currentLang() === "ar"
        ? "\ud83d\udce1 \u0644\u0627 \u064a\u0648\u062c\u062f \u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a. \u062a\u0639\u0645\u0644 \u0641\u064a \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u062d\u0644\u064a \u2014 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0622\u0645\u0646\u0629."
        : "\ud83d\udce1 No internet connection. Running offline \u2014 your data is safe.";
      setTimeout(() => toast(msg), 800);
      checkStorageQuota();
      return;
    }
  }
});

window.NorthAuth?.client?.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") { localStorage.removeItem(SESSION_KEY); showLanding(); }
});

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
