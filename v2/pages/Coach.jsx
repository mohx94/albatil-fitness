window.AF = window.AF || {};

AF.CoachPage = function({cur, mutate, getWorkouts, showScreen}){
  const c = cur();
  const [aiText, setAiText] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [chatMsgs, setChatMsgs] = React.useState([]);
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);
  const chatEndRef = React.useRef(null);

  const now = Date.now();
  const weekAgo = now-7*86400000, twoWeeksAgo = now-14*86400000;
  const workouts = getWorkouts();
  const muscleMap = AF.keyMuscleMap(workouts);

  const volumeInRange = (from,to)=>{
    const perMuscle = {};
    Object.entries(c.exerciseLogs).forEach(([key,logs])=>{
      const muscle = muscleMap[key]||'أخرى';
      logs.forEach(l=>{
        const t = new Date(l.date).getTime();
        if(t>=from && t<to) perMuscle[muscle]=(perMuscle[muscle]||0)+l.volume;
      });
    });
    return perMuscle;
  };
  const thisWeek = volumeInRange(weekAgo, now);
  const lastWeek = volumeInRange(twoWeeksAgo, weekAgo);
  const allMuscles = Array.from(new Set(workouts.flatMap(w=>w.groups.map(([g])=>g))));
  const muscleChanges = allMuscles.map(g=>{
    const cur_ = thisWeek[g]||0, prev = lastWeek[g]||0;
    const pct = prev>0 ? Math.round(((cur_-prev)/prev)*100) : (cur_>0 ? 100 : null);
    return {muscle:g, cur:cur_, prev, pct};
  });

  const daysSinceTrained = (muscle)=>{
    const dates = c.history.filter(hh=>{
      const w = workouts.find(x=>x.id===hh.id);
      return w && w.groups.some(([g])=>g===muscle);
    }).map(hh=>new Date(hh.date).getTime());
    if(!dates.length) return null;
    return Math.round((now-Math.max(...dates))/86400000);
  };

  const streak = AF.computeStreak(c.history);
  const weekSessions = c.history.filter(x=>new Date(x.date).getTime()>=weekAgo);

  const proteinLast7 = Array.from({length:7}).map((_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i);
    const dk = AF.dateKey(d);
    return c.nutrition.logs.filter(l=>l.date===dk).reduce((a,l)=>a+l.protein,0);
  });
  const avgProtein = proteinLast7.reduce((a,b)=>a+b,0)/7;
  const proteinGap = Math.round(c.nutrition.targets.protein - avgProtein);

  const weightsLast14 = c.measurements.filter(m=>new Date(m.date).getTime()>=twoWeeksAgo).map(m=>m.weight);
  const weightPlateau = weightsLast14.length>=3 && (Math.max(...weightsLast14)-Math.min(...weightsLast14) <= 0.3);

  // best PR delta this week (any exercise whose PR date is within last 7 days)
  const newPRsThisWeek = Object.entries(c.prs).filter(([,v])=>new Date(v.date).getTime()>=weekAgo);

  const recommendations = [];
  muscleChanges.forEach(mc=>{
    if(mc.pct!=null && mc.pct<=-15) recommendations.push(`زد حجم تمرين ${mc.muscle} — انخفض ${Math.abs(mc.pct)}% هذا الأسبوع`);
    if(mc.pct!=null && mc.pct>=25) recommendations.push(`راقب التعافي بـ${mc.muscle} — الحجم ارتفع ${mc.pct}% بسرعة`);
  });
  allMuscles.forEach(g=>{
    const days = daysSinceTrained(g);
    if(days!=null && days>=9) recommendations.push(`لم يتم تمرين ${g} منذ ${days} أيام — جدولها قريبًا`);
  });
  if(proteinGap>15) recommendations.push(`ارفع البروتين ${proteinGap} جم يوميًا للوصول للهدف`);
  if(weightPlateau) recommendations.push(`وزنك ثابت منذ أسبوعين — راجع السعرات أو زد النشاط`);
  if(weekSessions.length===0) recommendations.push(`ما سجّلت أي حصة هذا الأسبوع — ابدأ اليوم لو تقدر`);

  const orderSuggestion = React.useMemo(()=>{
    for(const w of workouts){
      const flat = w.groups.flatMap(([g,exs])=>exs);
      if(flat.length<2) continue;
      const last = flat[flat.length-1];
      const key = w.id+'__'+last[0];
      const logs = (c.exerciseLogs[key]||[]).slice(-3);
      if(logs.length<2) continue;
      const minRep = parseInt(String(last[2]).split('-')[0])||0;
      const avgReps = logs.reduce((a,l)=>a+l.reps,0)/logs.length;
      if(avgReps < minRep) return `لاحظت أن ${last[0]} (آخر تمرين بـ${w.name}) أداؤه أضعف من نطاقه المستهدف مؤخرًا — جرّب تقدّمه بترتيب مبكر بالحصة الجاية.`;
    }
    return null;
  },[c.exerciseLogs]);

  const recovery = AF.computeRecoveryScore(c);
  const hour = new Date().getHours();
  const greetingWord = hour<12?'صباح الخير':(hour<18?'مساءك سعيد':'مساء الخير');
  const todayWorkout = workouts[AF.satDow(new Date())%3 % workouts.length];
  const topRec = recommendations[0];
  const greeting = `${greetingWord} ${c.name||''} 👋 اليوم عندك ${todayWorkout.name}. ${recovery.score>=80?'جاهزيتك ممتازة — وقت مناسب لمحاولة PR 🔥':(recovery.score<50?'جاهزيتك منخفضة شوي، خفّف الشدة اليوم.':'جاهزيتك عادية، درّب بشكل طبيعي.')}${topRec?' كمان: '+topRec:''}`;

  const challenge = AF.getWeeklyChallenge(c, workouts);
  const challengePct = Math.min(100, Math.round(challenge.progress/challenge.target*100));

  const askAI = async ()=>{
    setAiLoading(true);
    const stats = {
      streak, weekSessionsCount: weekSessions.length,
      muscleVolumeChangePercent: Object.fromEntries(muscleChanges.map(m=>[m.muscle, m.pct])),
      daysSinceTrainedPerMuscle: Object.fromEntries(allMuscles.map(g=>[g, daysSinceTrained(g)])),
      avgProteinLast7Days: Math.round(avgProtein), proteinTarget: c.nutrition.targets.protein,
      weightPlateauDetected: weightPlateau,
      newPRsThisWeek: newPRsThisWeek.map(([k])=>AF.exerciseLabel(k)),
      currentProgramWeek: c.mesocycle?.week||1, isDeloadWeek:(c.mesocycle?.week||1)===4
    };
    const res = await AF.getAIInsights(stats);
    setAiText(res.text);
    setAiLoading(false);
  };

  // Build a compact context blob the chat sends with every message so the assistant "knows" the user.
  const buildUserContext = ()=>({
    name: c.name, profile: c.profile, streak, todayWorkout: todayWorkout.name,
    weeklyGoals: c.weeklyGoals, nutritionTargets: c.nutrition.targets,
    todayNutrition: (()=>{ const dk=AF.dateKey(new Date()); return c.nutrition.logs.filter(l=>l.date===dk).reduce((a,l)=>({cal:a.cal+l.cal,protein:a.protein+l.protein}),{cal:0,protein:0}); })(),
    injuries: c.injuries||[], prCount: Object.keys(c.prs).length,
    recentHistory: c.history.slice(-6).map(hh=>({name:hh.name, date:hh.date, volume:Math.round(hh.volume)})),
    muscleVolumeChangePercent: Object.fromEntries(muscleChanges.map(m=>[m.muscle, m.pct])),
    currentProgramWeek: c.mesocycle?.week||1
  });

  const sendChat = async ()=>{
    const text = chatInput.trim();
    if(!text) return;
    const nextMsgs = [...chatMsgs, {role:'user', content:text}];
    setChatMsgs(nextMsgs);
    setChatInput('');
    if(!window.claude || !window.claude.complete){
      setChatMsgs(m=>[...m, {role:'assistant', content:'ميزة المحادثة الحرة تحتاج اتصال بذكاء Claude غير متوفر بهذه البيئة حاليًا.'}]);
      return;
    }
    setChatLoading(true);
    const system = `أنت "المدرب الذكي" الشخصي داخل تطبيق Albatil Fitness. تتكلم باللهجة السعودية بشكل طبيعي وودود مثل مدرب حقيقي يعرف المستخدم. عندك بيانات المستخدم التالية (JSON) استخدمها لتخصيص ردودك:
${JSON.stringify(buildUserContext())}
قواعد:
- جاوب أسئلة التدريب والتغذية والمعلومات الشائعة بالسوشل ميديا بوضوح وأكد أو انفي أو وضّح التفاصيل بناء على العلم.
- لو سألك عن استراتيجية تدريب (مثل: البدء بوزن ثقيل أول جولة)، اشرح الإيجابيات والسلبيات بشكل متوازن بناءً على مبادئ علم التدريب المعروفة.
- لو تقدر تقترح تعديل أهداف التغذية (سعرات/بروتين/كارب/دهون)، اسأل المستخدم أولاً ووضح السبب، وفقط لو وافق صراحة بآخر رسالة ضمّن ردك سطر بهذا الشكل بالضبط: UPDATE_TARGETS: {"calories":رقم,"protein":رقم,"carb":رقم,"fat":رقم}
- لا تكتب ذلك السطر إلا لما يكون في نيتك فعلاً تعديل الأرقام بعد موافقة المستخدم.
- خلك مختصر ومباشر، بدون مقدمات طويلة.`;
    try{
      const reply = await window.claude.complete({ system, messages: nextMsgs });
      setChatMsgs(m=>[...m, {role:'assistant', content:reply}]);
    }catch(e){
      setChatMsgs(m=>[...m, {role:'assistant', content:'تعذر الرد الآن، جرّب مرة ثانية.'}]);
    }
    setChatLoading(false);
  };

  const applyTargetsUpdate = (vals)=>{
    mutate((next,p)=>{ p.nutrition.targets = {calories:+vals.calories||p.nutrition.targets.calories, protein:+vals.protein||p.nutrition.targets.protein, carb:+vals.carb||p.nutrition.targets.carb, fat:+vals.fat||p.nutrition.targets.fat}; });
    setChatMsgs(m=>[...m, {role:'assistant', content:'✅ تم تحديث أهداف التغذية.'}]);
  };

  React.useEffect(()=>{ chatEndRef.current?.scrollIntoView({block:'nearest'}); },[chatMsgs, chatLoading]);

  const h = React.createElement;
  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>showScreen('home')},'رجوع'),
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}},'تحليل أسبوعي كامل'), h('h2',{style:{margin:0}},'🤖 المدرب الذكي')),
      h('div',null)
    ),

    h(AF.Panel,{style:{background:'linear-gradient(135deg, rgba(var(--gold-rgb),.12), rgba(var(--gold-rgb),.03))', border:'1px solid rgba(var(--gold-rgb),.3)'}},
      h('div',{style:{display:'flex',gap:10,alignItems:'flex-start'}},
        h('span',{style:{fontSize:22}},'🤖'),
        h('p',{style:{margin:0,fontSize:14,lineHeight:1.8}}, greeting)
      )
    ),

    h('div',{style:{
      background:'linear-gradient(160deg, rgba(139,123,255,.1), rgba(139,123,255,.02))',
      border:'1px solid rgba(139,123,255,.35)', borderRadius:22, padding:16, marginTop:14, marginBottom:14
    }},
      h('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:12}},
        h('div',{style:{width:38,height:38,borderRadius:12,background:'linear-gradient(135deg,#8b7bff,#5b6ee8)',display:'grid',placeItems:'center',fontSize:18}}, '🤖'),
        h('div',null,
          h('b',{style:{display:'block',fontSize:14}}, 'سولف مع المدرب الذكي'),
          h('small',{style:{color:'#8b7bff',fontWeight:700}}, '✨ محادثة حرة — يعرف بياناتك')
        )
      ),
      h('div',{style:{maxHeight:340,overflowY:'auto',display:'grid',gap:10,marginBottom:12}},
        !chatMsgs.length ? h('div',{style:{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'10px 0'}}, 'اسأله عن أي شي: خطة، تغذية، أو معلومة سمعتها بالسوشيال ميديا 👇') : null,
        chatMsgs.map((m,i)=>{
          if(m.role==='user') return h('div',{key:i, style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:'14px 14px 4px 14px',padding:'10px 14px',fontSize:13,maxWidth:'85%',marginRight:'auto'}}, m.content);
          const parts = m.content.split(/UPDATE_TARGETS:\s*(\{[^}]+\})/);
          return h('div',{key:i, style:{background:'rgba(139,123,255,.1)',border:'1px solid rgba(139,123,255,.3)',borderRadius:'14px 14px 14px 4px',padding:'10px 14px',maxWidth:'92%'}},
            h('div',{style:{fontSize:10,fontWeight:800,color:'#8b7bff',marginBottom:4}}, '🤖 AI'),
            parts.map((part,pi)=>{
              if(pi%2===1){
                let vals=null; try{ vals = JSON.parse(part); }catch{}
                if(!vals) return null;
                return h('div',{key:pi, style:{marginTop:8,background:'var(--surface2)',border:'1px solid var(--gold)',borderRadius:12,padding:10}},
                  h('small',{style:{color:'var(--muted)',display:'block',marginBottom:6}}, `اقتراح تعديل: ${vals.calories} سعرة · ${vals.protein} بروتين · ${vals.carb} كارب · ${vals.fat} دهون`),
                  h('div',{style:{display:'flex',gap:8}},
                    h(AF.PrimaryBtn,{onClick:()=>applyTargetsUpdate(vals), style:{flex:1,padding:'8px 12px',fontSize:12}}, '✅ قبول'),
                    h(AF.GhostBtn,{onClick:()=>{}, style:{flex:1,padding:'8px 12px',fontSize:12}}, '✕ تجاهل')
                  )
                );
              }
              return part ? h('span',{key:pi, style:{fontSize:13,whiteSpace:'pre-wrap',lineHeight:1.8}}, part) : null;
            })
          );
        }),
        chatLoading ? h('div',{style:{fontSize:12,color:'var(--muted)'}}, '🤖 يكتب...') : null,
        h('div',{ref:chatEndRef})
      ),
      h('div',{style:{display:'flex',gap:8}},
        h('input',{value:chatInput, onChange:e=>setChatInput(e.target.value), onKeyDown:e=>{if(e.key==='Enter') sendChat();},
          placeholder:'اكتب سؤالك هنا...', style:{flex:1,padding:'12px 14px',borderRadius:12,border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',fontSize:14}}),
        h(AF.PrimaryBtn,{onClick:sendChat, disabled:chatLoading}, 'إرسال')
      )
    ),

    h(AF.Panel,null,
      h(AF.SectionTitle,{title:'🎯 تحدي الأسبوع', right:`${challenge.progress} / ${challenge.target}`}),
      h('div',{style:{fontSize:13,marginBottom:8}}, challenge.label),
      h('div',{style:{height:10,borderRadius:99,background:'var(--surface2)',overflow:'hidden'}},
        h('div',{style:{height:'100%',borderRadius:99,width:challengePct+'%',background:'var(--gold)',transition:'width .4s ease'}})
      )
    ),

    h(AF.Panel,null,
      h(AF.SectionTitle,{title:'هذا الأسبوع'}),
      h('div',{style:{display:'grid',gap:8}},
        h('div',{style:{display:'flex',gap:8,alignItems:'center',fontSize:14}}, streak>=3?'✅':'⚠️', ` الالتزام: ${streak} ${streak===1?'يوم':'أيام'} متتالية`),
        weekSessions.length ? h('div',{style:{display:'flex',gap:8,alignItems:'center',fontSize:14}}, '✅', ` أكملت ${weekSessions.length} حصة هذا الأسبوع`) : h('div',{style:{display:'flex',gap:8,alignItems:'center',fontSize:14}},'⚠️',' ما سجّلت حصص هذا الأسبوع'),
        muscleChanges.filter(m=>m.pct!=null).map(m=>h('div',{key:m.muscle, style:{display:'flex',gap:8,alignItems:'center',fontSize:14}},
          m.pct>0?'⬆️':(m.pct<0?'⬇️':'➡️'), ` حجم ${m.muscle} ${m.pct>0?'ارتفع':(m.pct<0?'انخفض':'ثابت')} ${Math.abs(m.pct)}%`
        )),
        h('div',{style:{display:'flex',gap:8,alignItems:'center',fontSize:14}}, proteinGap>15?'⚠️':'✅', ` متوسط البروتين: ${Math.round(avgProtein)} جم (الهدف ${c.nutrition.targets.protein})`),
        weightPlateau ? h('div',{style:{display:'flex',gap:8,alignItems:'center',fontSize:14}}, '⚠️',' وزنك ثابت منذ أسبوعين') : null,
        newPRsThisWeek.length ? h('div',{style:{display:'flex',gap:8,alignItems:'center',fontSize:14}}, '🏆', ` ${newPRsThisWeek.length} رقم قياسي جديد هذا الأسبوع`) : null
      )
    ),

    h(AF.Panel,null,
      h(AF.SectionTitle,{title:'أنصح الأسبوع القادم'}),
      recommendations.length || orderSuggestion ? h('div',{style:{display:'grid',gap:10,marginTop:6}},
        recommendations.map((r,i)=>h('div',{key:i, style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:'10px 14px',fontSize:13}}, `• ${r}`)),
        orderSuggestion ? h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:'10px 14px',fontSize:13}}, `• 🔄 ${orderSuggestion}`) : null
      ) : h('div',{style:{color:'var(--muted)',fontSize:13}}, 'وضعك متوازن هذا الأسبوع — استمر بنفس الالتزام 👏')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'📋 خطة أسبوعية من Claude (ذكاء اصطناعي حقيقي)'}),
      h(AF.SecondaryBtn,{onClick:askAI, style:{width:'100%'}}, aiLoading?'جارٍ إعداد الخطة...':'احصل على خطتك الأسبوعية'),
      aiText ? h('div',{style:{whiteSpace:'pre-wrap',fontSize:13,color:'var(--text)',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:12,marginTop:12,lineHeight:1.8}}, aiText) : null
    )
  );
};
