window.AF = window.AF || {};

AF.CoachPage = function({cur, getWorkouts, showScreen}){
  const c = cur();
  const [aiText, setAiText] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);

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
