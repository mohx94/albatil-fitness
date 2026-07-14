window.AF = window.AF || {};

AF.ARCHETYPES = [
  {id:'titan', icon:'🦍', name:'Titan', desc:'يعتمد على القوة والحجم الكلي'},
  {id:'spartan', icon:'⚡', name:'Spartan', desc:'يعتمد على الالتزام والانضباط'},
  {id:'alpha', icon:'🐺', name:'Alpha', desc:'يعتمد على تطور بناء الجسم'},
  {id:'beast', icon:'🐉', name:'Beast', desc:'يعتمد على الأرقام القياسية'}
];

AF.EXTRA_ACHIEVEMENTS = [
  {id:'back_king', icon:'🥇', name:'ملك الظهر', desc:'تمرّنت ظهر 100 مرة', check:(c,streak,workouts)=>AF.countSessionsByMuscle(c,workouts,'الظهر')>=100},
  {id:'iron_merciless', icon:'⚡', name:'الحديد ما يرحم', desc:'10 أرقام قياسية خلال شهر', check:c=>AF.countPRsInDays(c,30)>=10},
  {id:'gorilla', icon:'🦍', name:'Gorilla', desc:'حجم تمرين الظهر تجاوز 12000 كجم تراكمي', check:(c,streak,workouts)=>AF.totalVolumeByMuscle(c,workouts,'الظهر')>=12000},
  {id:'leg_day_hero', icon:'🦵', name:'بطل ليج داي', desc:'تمرّنت أرجل 30 مرة', check:(c,streak,workouts)=>AF.countSessionsByMuscle(c,workouts,'الأرجل')>=30}
];

AF.countSessionsByMuscle = function(c, workouts, muscle){
  return c.history.filter(hh=>{
    const w = workouts.find(x=>x.id===hh.id);
    return w && w.groups.some(([g])=>g===muscle);
  }).length;
};
AF.totalVolumeByMuscle = function(c, workouts, muscle){
  const map = AF.keyMuscleMap(workouts);
  return Object.entries(c.exerciseLogs).reduce((sum,[k,logs])=>{
    if(map[k]!==muscle) return sum;
    return sum + logs.reduce((a,l)=>a+l.volume,0);
  },0);
};
AF.countPRsInDays = function(c, days){
  const cutoff = Date.now()-days*86400000;
  return Object.values(c.prs).filter(v=>new Date(v.date).getTime()>=cutoff).length;
};

// Composite 0-100 weekly "Body Score" from adherence, nutrition, strength trend, sleep, activity.
AF.computeBodyScore = function(c){
  const now = Date.now(), weekAgo = now-7*86400000, twoWeeksAgo = now-14*86400000;
  const goals = c.weeklyGoals || {workouts:3, proteinDays:7, weightLossKg:0.5, steps:60000};
  const weekSessions = c.history.filter(x=>new Date(x.date).getTime()>=weekAgo);
  const adherence = Math.min(100, Math.round(weekSessions.length/Math.max(1,goals.workouts)*100));

  const last7Dates = Array.from({length:7}).map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return AF.dateKey(d); });
  const proteinDaysHit = last7Dates.filter(dk=>{
    const total = c.nutrition.logs.filter(l=>l.date===dk).reduce((a,l)=>a+l.protein,0);
    return total >= (c.nutrition.targets.protein*0.85);
  }).length;
  const nutrition = Math.round(proteinDaysHit/7*100);

  const thisWeekVol = c.history.filter(x=>new Date(x.date).getTime()>=weekAgo).reduce((a,x)=>a+x.volume,0);
  const lastWeekVol = c.history.filter(x=>new Date(x.date).getTime()>=twoWeeksAgo && new Date(x.date).getTime()<weekAgo).reduce((a,x)=>a+x.volume,0);
  let strength = 70;
  if(lastWeekVol>0) strength = Math.max(20, Math.min(100, Math.round(50 + (thisWeekVol-lastWeekVol)/lastWeekVol*100)));
  else if(thisWeekVol>0) strength = 80;

  const sleeps = last7Dates.map(dk=>c.dailyLog?.[dk]?.sleep).filter(v=>v!=null);
  let sleep = 60;
  if(sleeps.length){
    const avg = sleeps.reduce((a,b)=>a+b,0)/sleeps.length;
    sleep = avg>=7 && avg<=9 ? 100 : Math.max(30, 100-Math.abs(avg-8)*15);
  }

  const steps = last7Dates.map(dk=>c.dailyLog?.[dk]?.steps).filter(v=>v);
  let activity = 50;
  if(steps.length){ const avg = steps.reduce((a,b)=>a+b,0)/steps.length; activity = Math.min(100, Math.round(avg/8000*100)); }

  const total = Math.round((adherence+nutrition+strength+sleep+activity)/5);
  return {total, adherence, nutrition, strength:Math.round(strength), sleep:Math.round(sleep), activity};
};

// Pre-workout readiness heuristic (0-100).
AF.computeRecoveryScore = function(c){
  const last = c.history[c.history.length-1];
  const todayKey = AF.dateKey(new Date());
  const sleepLast = c.dailyLog?.[todayKey]?.sleep ?? c.dailyLog?.[AF.dateKey(new Date(Date.now()-86400000))]?.sleep;
  let penalty = 0;
  let daysSince = null;
  if(last){
    daysSince = Math.floor((Date.now()-new Date(last.date).getTime())/86400000);
    if(daysSince<1) penalty += 30;
    else if(daysSince===1) penalty += 10;
  }
  const lastKeys = last ? Object.keys(last.notes||{}) : [];
  const recentAvgRir = Object.values(c.exerciseLogs).flat()
    .filter(l=>l.avgRir!=null && Date.now()-new Date(l.date).getTime()<=2*86400000)
    .map(l=>l.avgRir);
  if(recentAvgRir.length){
    const avg = recentAvgRir.reduce((a,b)=>a+b,0)/recentAvgRir.length;
    if(avg<=1) penalty += 20;
  }
  if(sleepLast!=null && sleepLast<6) penalty += 20;
  const score = Math.max(0, Math.min(100, 100-penalty));
  let note;
  if(score>=80) note = 'اليوم مناسب لمحاولة رقم قياسي جديد 💪';
  else if(score>=50) note = 'وضعك عادي — درّب بشكل طبيعي واستمع لجسمك';
  else note = 'لا أنصح بمحاولة PR اليوم — ركّز على التقنية وخفّف الشدة شوي';
  return {score, note};
};

// Dominant archetype from 4 rough normalized stats.
AF.computeArchetype = function(c, streak){
  const totalVolume = c.history.reduce((a,x)=>a+x.volume,0);
  const prCount = Object.keys(c.prs).length;
  const ms = c.measurements.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const growth = ms.length>=2 ? Math.abs((ms[ms.length-1].arm||0)-(ms[0].arm||0)) + Math.abs((ms[ms.length-1].chest||0)-(ms[0].chest||0)) : 0;
  const scores = {
    titan: totalVolume/2000,
    spartan: streak*3,
    alpha: growth*10,
    beast: prCount*8
  };
  const winner = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  return AF.ARCHETYPES.find(a=>a.id===winner);
};

// Weekly challenge: pick one deterministic challenge per ISO week from a pool, track progress.
AF.WEEKLY_CHALLENGE_POOL = [
  {id:'pullups100', label:'100 عقلة/سحب هذا الأسبوع', target:100, metric:(c,weekAgo)=>{
    return Object.entries(c.exerciseLogs).reduce((sum,[k,logs])=>{
      if(!/عقلة|سحب/.test(k)) return sum;
      return sum + logs.filter(l=>new Date(l.date).getTime()>=weekAgo).reduce((a,l)=>a+(l.reps||0),0);
    },0);
  }},
  {id:'chestvolume20000', label:'20000 كجم حجم صدر هذا الأسبوع', target:20000, metric:(c,weekAgo,workouts)=>{
    const map = AF.keyMuscleMap(workouts);
    return Object.entries(c.exerciseLogs).reduce((sum,[k,logs])=>{
      if(map[k]!=='الصدر') return sum;
      return sum + logs.filter(l=>new Date(l.date).getTime()>=weekAgo).reduce((a,l)=>a+l.volume,0);
    },0);
  }},
  {id:'no_missed_days', label:'لا تفوّت أي يوم تمرين مجدول هذا الأسبوع', target:3, metric:(c,weekAgo)=>{
    return c.history.filter(x=>new Date(x.date).getTime()>=weekAgo).length;
  }}
];
AF.getWeeklyChallenge = function(c, workouts){
  const now = new Date();
  const weekNum = Math.floor(now.getTime()/(7*86400000));
  const challenge = AF.WEEKLY_CHALLENGE_POOL[weekNum % AF.WEEKLY_CHALLENGE_POOL.length];
  const weekAgo = Date.now()-7*86400000;
  const progress = challenge.metric(c, weekAgo, workouts);
  return {...challenge, progress: Math.round(progress)};
};

// XP / Level system: total volume + PRs + streak days feed a simple level curve.
AF.computeXP = function(c){
  const streak = AF.computeStreak(c.history);
  const totalVolume = c.history.reduce((a,x)=>a+x.volume,0);
  const prCount = Object.keys(c.prs).length;
  const xp = Math.round(totalVolume/20 + prCount*150 + streak*20 + c.history.length*40);
  const level = Math.floor(xp/1000)+1;
  const xpIntoLevel = xp - (level-1)*1000;
  return {xp, level, xpIntoLevel, xpForNext:1000, pct:Math.min(100,Math.round(xpIntoLevel/10))};
};

// Best/worst trained muscle by 30-day volume + this-month's best training month by volume.
AF.computeHighlights = function(c, workouts){
  const map = AF.keyMuscleMap(workouts);
  const monthAgo = Date.now()-30*86400000;
  const perMuscle = {};
  Object.entries(c.exerciseLogs).forEach(([key,logs])=>{
    const muscle = map[key]||'أخرى';
    logs.forEach(l=>{ if(new Date(l.date).getTime()>=monthAgo) perMuscle[muscle]=(perMuscle[muscle]||0)+l.volume; });
  });
  const entries = Object.entries(perMuscle).sort((a,b)=>b[1]-a[1]);
  const best = entries[0]?.[0]||null, worst = entries[entries.length-1]?.[0]||null;

  const byMonth = {};
  c.history.forEach(hh=>{ const d=new Date(hh.date); const k=d.getFullYear()+'-'+d.getMonth(); byMonth[k]=(byMonth[k]||0)+hh.volume; });
  const bestMonthKey = Object.entries(byMonth).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const bestMonth = bestMonthKey ? monthNames[+bestMonthKey.split('-')[1]] : null;

  const byDow = {};
  c.history.forEach(hh=>{ const dow = AF.satDow(hh.date); byDow[dow]=(byDow[dow]||0)+1; });
  const dowNames = ['سبت','أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة'];
  const bestDowKey = Object.entries(byDow).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const bestDow = bestDowKey!=null ? dowNames[+bestDowKey] : null;

  const avgDuration = c.history.length ? Math.round(c.history.reduce((a,x)=>a+(x.durationMin||0),0)/c.history.filter(x=>x.durationMin).length) : null;

  return {bestMuscle:best, worstMuscle:worst, bestMonth, bestDow, avgDuration:avgDuration||null};
};
