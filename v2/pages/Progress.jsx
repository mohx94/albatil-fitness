window.AF = window.AF || {};

AF.ProgressPage = function({cur, mutate, getWorkouts, toast}){
  const c = cur();
  const [tab, setTab] = React.useState('weightTab');
  const [aiText, setAiText] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [calMonth, setCalMonth] = React.useState(new Date().getMonth());
  const [calYear, setCalYear] = React.useState(new Date().getFullYear());
  const [calInfo, setCalInfo] = React.useState('');
  const [exerciseKey, setExerciseKey] = React.useState(null);

  // ---- Weight tab ----
  const [form, setForm] = React.useState({weight:'',fat:'',waist:'',neck:'',chest:'',arm:'',thigh:'',hip:''});
  const submitMeasurement = (e)=>{
    e.preventDefault();
    if(!form.weight){ toast('أدخل الوزن'); return; }
    const item = {date:new Date().toISOString(), weight:+form.weight, fat:+form.fat||null, waist:+form.waist||null,
      neck:+form.neck||null, chest:+form.chest||null, arm:+form.arm||null, thigh:+form.thigh||null, hip:+form.hip||null};
    mutate((next,p)=>{
      p.measurements.push(item); p.profile.weight=item.weight; if(item.fat) p.profile.fat=item.fat;
    });
    setForm({weight:'',fat:'',waist:'',neck:'',chest:'',arm:'',thigh:'',hip:''});
    toast('تم حفظ القياس');
  };
  const calcNavyFat = ()=>{
    const bf = AF.navyBodyFat({gender:c.profile.gender, height:c.profile.height, waist:+form.waist, neck:+form.neck, hip:+form.hip});
    if(bf==null){ toast('أدخل الطول (بالإعدادات) + الخصر + الرقبة (+الأرداف للنساء)'); return; }
    setForm(f=>({...f, fat:bf.toFixed(1)}));
    toast(`🧮 نسبة الدهون التقريبية: ${bf.toFixed(1)}%`);
  };

  const weightPoints = c.measurements.slice().sort((a,b)=>new Date(a.date)-new Date(b.date))
    .map((m,i)=>({y:m.weight, label:new Date(m.date).toLocaleDateString('ar-SA',{day:'numeric',month:'numeric'})}));
  const forecast = React.useMemo(()=>{
    const ms = c.measurements.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(ms.length<3) return null;
    const t0 = new Date(ms[0].date).getTime();
    const pts = ms.map(m=>({x:(new Date(m.date).getTime()-t0)/86400000, y:m.weight}));
    const lr = AF.linearForecast(pts);
    if(!lr) return null;
    const lastX = pts[pts.length-1].x+14;
    const val = (lr.slope*lastX+lr.intercept).toFixed(1);
    const dir = lr.slope<0?'↓':(lr.slope>0?'↑':'→');
    return `📈 توقع وزنك بعد أسبوعين إذا استمريت بنفس الوتيرة: ${val} كجم ${dir}`;
  },[c.measurements]);

  // ---- Strength tab ----
  const workouts = getWorkouts();
  const keysWithLogs = AF.allExerciseKeys(workouts).filter(k=>(c.exerciseLogs[k]||[]).length>0);
  const activeKey = exerciseKey && keysWithLogs.includes(exerciseKey) ? exerciseKey : keysWithLogs[0];
  const strengthPoints = activeKey ? (c.exerciseLogs[activeKey]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date))
    .map(l=>({y:l.weight, label:new Date(l.date).toLocaleDateString('ar-SA',{day:'numeric',month:'numeric'})})) : [];

  // ---- Calendar tab ----
  const trainedDays = {};
  c.history.forEach(hh=>{ const k=AF.dateKey(hh.date); (trainedDays[k]=trainedDays[k]||[]).push(hh.name); });
  const first = new Date(calYear, calMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const todayKey = AF.dateKey(new Date());
  const dowNames = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

  // ---- Analytics tab ----
  const now = Date.now(), weekAgo = now-7*86400000, monthAgo = now-30*86400000;
  const weekSessions = c.history.filter(x=>new Date(x.date).getTime()>=weekAgo);
  const monthSessions = c.history.filter(x=>new Date(x.date).getTime()>=monthAgo);
  const weekVol = weekSessions.reduce((a,x)=>a+x.volume,0);
  const monthVol = monthSessions.reduce((a,x)=>a+x.volume,0);
  const muscleMap = AF.keyMuscleMap(workouts);
  const perMuscle = {};
  Object.entries(c.exerciseLogs).forEach(([key,logs])=>{
    const muscle = muscleMap[key]||'أخرى';
    logs.forEach(l=>{ if(new Date(l.date).getTime()>=weekAgo) perMuscle[muscle]=(perMuscle[muscle]||0)+l.volume; });
  });
  const muscleEntries = Object.entries(perMuscle).sort((a,b)=>b[1]-a[1]);
  const allMuscleGroups = Array.from(new Set(workouts.flatMap(w=>w.groups.map(([g])=>g))));
  const perMuscle30 = {};
  Object.entries(c.exerciseLogs).forEach(([key,logs])=>{
    const muscle = muscleMap[key]||'أخرى';
    logs.forEach(l=>{ if(new Date(l.date).getTime()>=monthAgo) perMuscle30[muscle]=(perMuscle30[muscle]||0)+l.volume; });
  });
  const muscle30Entries = allMuscleGroups.map(g=>[g, perMuscle30[g]||0]).sort((a,b)=>b[1]-a[1]);
  const leastTrained = muscle30Entries[muscle30Entries.length-1];

  const goals = c.weeklyGoals || {workouts:3, proteinDays:7, weightLossKg:0.5, steps:60000};
  const last7Dates = Array.from({length:7}).map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return AF.dateKey(d); });
  const proteinDaysHit = last7Dates.filter(dk=>{
    const total = c.nutrition.logs.filter(l=>l.date===dk).reduce((a,l)=>a+l.protein,0);
    return total >= (c.nutrition.targets.protein*0.9);
  }).length;
  const weekSteps = last7Dates.reduce((a,dk)=>a+((c.dailyLog?.[dk]?.steps)||0),0);
  const measurementsSorted = c.measurements.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const recentMeasurements = measurementsSorted.filter(m=>new Date(m.date).getTime()>=weekAgo-7*86400000);
  const weightChangeAbs = recentMeasurements.length>=2 ? Math.abs(recentMeasurements[0].weight-recentMeasurements[recentMeasurements.length-1].weight) : 0;
  const nowD = new Date();
  const thisMonthKey = nowD.getFullYear()+'-'+nowD.getMonth();
  const prevD = new Date(nowD.getFullYear(), nowD.getMonth()-1, 1);
  const prevMonthKey = prevD.getFullYear()+'-'+prevD.getMonth();
  let thisVol=0, prevVol=0;
  c.history.forEach(x=>{ const d=new Date(x.date), k=d.getFullYear()+'-'+d.getMonth(); if(k===thisMonthKey) thisVol+=x.volume; else if(k===prevMonthKey) prevVol+=x.volume; });
  const streak = AF.computeStreak(c.history);

  const askAI = async ()=>{
    setAiLoading(true);
    const stats = {
      weekSessions: weekSessions.length, weekVolume: Math.round(weekVol),
      monthSessions: monthSessions.length, monthVolume: Math.round(monthVol),
      volumeByMuscleThisWeek: Object.fromEntries(muscleEntries.map(([m,v])=>[m,Math.round(v)])),
      streak, prs: Object.fromEntries(Object.entries(c.prs).slice(0,8).map(([k,v])=>[k.split('__')[1], `أقوى وزن: ${(v.maxWeight||v).weight}x${(v.maxWeight||v).reps}${v.best1RM?`, تقدير 1RM: ${v.best1RM.value}`:''}`])),
      recentSetRir: Object.fromEntries(Object.entries(c.exerciseLogs).slice(0,8).map(([k,logs])=>[k.split('__')[1], logs.slice(-1)[0]?.avgRir ?? null])),
      currentProgramWeek: c.mesocycle?.week||1, isDeloadWeek: (c.mesocycle?.week||1)===4,
      recentWeights: c.measurements.slice(-6).map(m=>({date:AF.dateKey(m.date), weight:m.weight})),
      lastWorkouts: c.history.slice(-6).map(hh=>({date:AF.dateKey(hh.date), name:hh.name, volume:Math.round(hh.volume)})),
      nutritionTargets: c.nutrition.targets,
      recentMealsCalories: c.nutrition.logs.slice(-14).reduce((a,l)=>a+l.cal,0)
    };
    const res = await AF.getAIInsights(stats);
    setAiText(res.text);
    setAiLoading(false);
  };

  const tabs = [
    {id:'weightTab', label:'الوزن'}, {id:'strengthTab', label:'القوة'},
    {id:'calendarTab', label:'التقويم'}, {id:'analyticsTab', label:'التحليلات'},
    {id:'achievementsTab', label:'الإنجازات'}
  ];

  return h(React.Fragment, null,
    h('div',{style:{margin:'14px 0 18px'}}, h('p',{style:{color:'var(--muted)',margin:0}},'تابع نزولك وقوتك والتزامك'), h('h2',{style:{margin:0}},'التقدم')),
    h(AF.TabBar,{tabs, active:tab, onChange:setTab}),

    tab==='weightTab' ? h(React.Fragment,null,
      h(AF.Panel,null, h(AF.LineChart,{points:weightPoints, unit:' كجم', color:'var(--accent2)'}),
        forecast ? h('div',{style:{fontSize:12,color:'var(--muted)',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:12,padding:12,marginTop:12}}, forecast) : null
      ),
      h('form',{onSubmit:submitMeasurement, style:{background:'linear-gradient(145deg, var(--surface), var(--panel-end))',border:'1px solid var(--line)',borderRadius:22,boxShadow:'var(--shadow)',padding:18,marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        ['weight','fat','waist','neck','chest','arm','thigh','hip'].map(f=>{
          const labels = {weight:'الوزن',fat:'نسبة الدهون',waist:'محيط الخصر',neck:'محيط الرقبة',chest:'محيط الصدر',arm:'محيط الذراع (باي)',thigh:'محيط الفخذ',hip:'محيط الأرداف'};
          return h('label',{key:f, style:{fontSize:12,color:'var(--muted)'}}, labels[f],
            h('input',{type:'number', step:'0.1', required:f==='weight', value:form[f], onChange:e=>setForm(prev=>({...prev,[f]:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})
          );
        }),
        h(AF.SecondaryBtn,{type:'button', onClick:calcNavyFat, style:{gridColumn:'1/-1'}}, '🧮 احسب نسبة الدهون (البحرية الأمريكية)'),
        h(AF.PrimaryBtn,{type:'submit', style:{gridColumn:'1/-1'}}, 'حفظ القياس')
      ),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'آخر القياسات', right:c.measurements.length+' إدخال'}),
        h('div',{style:{display:'grid',gap:8,marginTop:12}},
          c.measurements.slice().reverse().slice(0,10).map((x,i)=>{
            const extras=[x.fat?x.fat+'% دهون':'', x.waist?'خصر '+x.waist:'', x.neck?'رقبة '+x.neck:'', x.chest?'صدر '+x.chest:'', x.arm?'ذراع '+x.arm:'', x.thigh?'فخذ '+x.thigh:'', x.hip?'أرداف '+x.hip:''].filter(Boolean).join(' · ');
            return h('div',{key:i, style:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:12}},
              h('div',null, h('b',null, x.weight+' كجم'), h('br'), h('small',{style:{color:'var(--muted)'}}, extras)),
              h('small',{style:{color:'var(--muted)'}}, new Date(x.date).toLocaleDateString('ar-SA'))
            );
          })
        )
      )
    ) : null,

    tab==='strengthTab' ? h(React.Fragment,null,
      h(AF.Panel,null,
        h(AF.SectionTitle,{title:'تطور القوة'}),
        h('select',{value:activeKey||'', onChange:e=>setExerciseKey(e.target.value), style:{width:'100%',background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:12,padding:12,marginBottom:14}},
          keysWithLogs.length? keysWithLogs.map(k=>h('option',{key:k,value:k}, AF.exerciseLabel(k))) : h('option',null,'لا توجد بيانات بعد')
        ),
        h(AF.LineChart,{points:strengthPoints, unit:' كجم', color:'var(--gold)'}),
        activeKey ? h('div',{style:{display:'grid',gap:6,marginTop:14}},
          (c.exerciseLogs[activeKey]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).map((l,i,arr)=>{
            const prevL = arr[i-1];
            const delta = prevL ? (l.weight-prevL.weight) : 0;
            const arrow = i===0 ? '' : (delta>0?' ↑':(delta<0?' ↓':' →'));
            return h('div',{key:i, style:{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',padding:'4px 0',borderBottom:'1px solid var(--line)'}},
              h('span',null, new Date(l.date).toLocaleDateString('ar-SA',{day:'numeric',month:'short'})),
              h('span',{style:{color:'var(--text)',fontWeight:700}}, `${l.weight}×${l.reps}`, h('span',{style:{color:delta>0?'var(--good)':(delta<0?'var(--danger)':'var(--muted)')}}, arrow))
            );
          })
        ) : null
      ),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'أفضل الأرقام', right:'PR'}),
        h('div',{style:{display:'grid',gap:8,marginTop:12}},
          Object.entries(c.prs).sort((a,b)=>new Date(b[1].date)-new Date(a[1].date)).slice(0,12).map(([k,v])=>{
            const mw = v.maxWeight || {weight:v.weight, reps:v.reps};
            return h('div',{key:k, style:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:12}},
              h('div',null, h('b',null, AF.exerciseLabel(k)), h('br'), h('small',{style:{color:'var(--muted)'}}, new Date(v.date).toLocaleDateString('ar-SA'), v.best1RM? ` · 1RM‏‏ تقديري: ${v.best1RM.value} كجم`:'')),
              h('b',null, `${mw.weight} × ${mw.reps}`)
            );
          })
        )
      )
    ) : null,

    tab==='calendarTab' ? h(AF.Panel,null,
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
        h(AF.GhostBtn,{onClick:()=>{ if(calMonth<=0){setCalMonth(11);setCalYear(y=>y-1);} else setCalMonth(m=>m-1); }}, '‹'),
        h('h3',{style:{margin:0}}, first.toLocaleDateString('ar-SA',{month:'long',year:'numeric'})),
        h(AF.GhostBtn,{onClick:()=>{ if(calMonth>=11){setCalMonth(0);setCalYear(y=>y+1);} else setCalMonth(m=>m+1); }}, '›')
      ),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,textAlign:'center'}},
        dowNames.map(d=>h('div',{key:d,style:{color:'var(--muted)',fontSize:11,paddingBottom:6}},d)),
        Array.from({length:startDow}).map((_,i)=>h('div',{key:'e'+i})),
        Array.from({length:daysInMonth}).map((_,i)=>{
          const d=i+1; const dt=new Date(calYear,calMonth,d); const k=AF.dateKey(dt); const trained=trainedDays[k];
          return h('div',{key:d, onClick:()=>setCalInfo(trained?`تمرين: ${trained.join('، ')}`:'لا يوجد تمرين هذا اليوم'), style:{
            position:'relative',aspectRatio:'1',display:'grid',placeItems:'center',borderRadius:10,
            background:trained?'rgba(var(--accent-rgb),.15)':'var(--surface2)', color:trained?'var(--accent2)':'var(--text)',
            fontWeight:trained?800:400, fontSize:13, border:k===todayKey?'1px solid var(--gold)':'1px solid transparent', cursor:'pointer'
          }}, d);
        })
      ),
      h('div',{style:{marginTop:12,color:'var(--muted)',fontSize:13,minHeight:18}}, calInfo)
    ) : null,

    tab==='analyticsTab' ? h(React.Fragment,null,
      h(AF.Panel,null, h(AF.SectionTitle,{title:'أهداف هذا الأسبوع'}),
        h('div',{style:{display:'grid',gap:10,marginTop:6}},
          [
            {label:`تمارين (${weekSessions.length}/${goals.workouts})`, done:weekSessions.length>=goals.workouts},
            {label:`بروتين محقق ${proteinDaysHit}/${goals.proteinDays} أيام`, done:proteinDaysHit>=goals.proteinDays},
            {label:`نزول الوزن ${weightChangeAbs.toFixed(1)}/${goals.weightLossKg} كجم`, done:weightChangeAbs>=goals.weightLossKg},
            {label:`خطوات ${weekSteps.toLocaleString('en-US')}/${goals.steps.toLocaleString('en-US')}`, done:weekSteps>=goals.steps}
          ].map((g,i)=>h('div',{key:i, style:{display:'flex',alignItems:'center',gap:8,fontSize:13}},
            h('span',null, g.done?'✅':'⬜️'), h('span',{style:{color:g.done?'var(--text)':'var(--muted)'}}, g.label)
          ))
        )
      ),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'ملخص آخر 7 أيام'}),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center',marginTop:18}},
          h('div',null, h('b',{style:{fontSize:18,display:'block'}}, weekSessions.length), h('span',{style:{fontSize:11,color:'var(--muted)'}},'حصص')),
          h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, Math.round(weekVol)), h('span',{style:{fontSize:11,color:'var(--muted)'}},'حجم كجم')),
          h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, weekSessions.length?Math.round(weekVol/weekSessions.length):0), h('span',{style:{fontSize:11,color:'var(--muted)'}},'متوسط الحصة'))
        )
      ),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'حجم التمرين حسب العضلة (7 أيام)'}), h(AF.BarChart,{entries:muscleEntries})),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'توازن العضلات (30 يوم)'}),
        h(AF.BarChart,{entries:muscle30Entries}),
        leastTrained ? h('div',{style:{fontSize:12,color:'var(--muted)',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:12,padding:12,marginTop:12}},
          leastTrained[1]===0 ? `⚠️ ${leastTrained[0]} ما تدرّبت عليها آخر 30 يوم أبدًا.` : `${leastTrained[0]} أقل عضلة تمرّنتها خلال آخر شهر (${Math.round(leastTrained[1])} كجم حجم).`
        ) : null
      ),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'ملخص آخر 30 يوم'}),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center',marginTop:18}},
          h('div',null, h('b',{style:{fontSize:18,display:'block'}}, monthSessions.length), h('span',{style:{fontSize:11,color:'var(--muted)'}},'حصص')),
          h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, Math.round(monthVol)), h('span',{style:{fontSize:11,color:'var(--muted)'}},'حجم كجم')),
          h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, streak+' يوم'), h('span',{style:{fontSize:11,color:'var(--muted)'}},'أفضل التزام'))
        )
      ),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'مقارنة الأشهر'}), h(AF.BarChart,{entries:[['الشهر السابق',prevVol],['الشهر الحالي',thisVol]]})),
      h(AF.Panel,null, h(AF.SectionTitle,{title:'🤖 تحليل ذكي (Claude)'}),
        h(AF.SecondaryBtn,{onClick:askAI, style:{width:'100%'}}, aiLoading?'جارٍ التحليل...':'احصل على ملاحظات ذكية'),
        aiText ? h('div',{style:{whiteSpace:'pre-wrap',fontSize:13,color:'var(--text)',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:12,marginTop:12,lineHeight:1.8}}, aiText) : null
      )
    ) : null,

    tab==='achievementsTab' ? h(AF.Panel,null,
      h(AF.SectionTitle,{title:'إنجازاتك', right: AF.ACHIEVEMENTS.filter(a=>a.check(c,streak)).length+' / '+AF.ACHIEVEMENTS.length}),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:6}},
        AF.ACHIEVEMENTS.map(a=>{
          const on = a.check(c,streak);
          return h('div',{key:a.id, style:{background:'var(--surface2)',border:'1px solid '+(on?'var(--gold)':'var(--line)'),borderRadius:16,padding:14,textAlign:'center',opacity:on?1:0.35}},
            h('span',{style:{fontSize:26,display:'block',marginBottom:6}}, a.icon),
            h('b',{style:{display:'block',fontSize:12}}, a.name),
            h('small',{style:{color:'var(--muted)',fontSize:10}}, a.desc)
          );
        })
      )
    ) : null
  );
};
