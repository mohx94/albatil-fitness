window.AF = window.AF || {};

function buildCoachMessages(c, streak, todayWorkout, todayNutrition, t){
  const msgs = [];
  const name = c.name || '';
  if(streak>=7) msgs.push(`🔥 ${streak} يوم التزام متواصل يا ${name}! هذا مستوى احترافي، لا توقف الحين.`);
  else if(streak>=1) msgs.push(`🔥 عندك ${streak} ${streak===1?'يوم':'أيام'} التزام — كمّل نفس الوتيرة واستهدف أسبوع كامل.`);
  else msgs.push(`💪 يلا ${name}، ابدأ حصة اليوم وخلك أول يوم بسلسلة جديدة.`);

  const proteinPct = t.protein ? Math.round(todayNutrition.protein/t.protein*100) : 0;
  if(proteinPct<50) msgs.push(`🍗 بروتينك اليوم لسا ${Math.round(todayNutrition.protein)} من ${t.protein} جم — جرّب تضيف زبادي يوناني أو صدر دجاج.`);
  else if(proteinPct>=100) msgs.push(`✅ وصلت هدف البروتين اليوم (${Math.round(todayNutrition.protein)} جم) — ممتاز!`);
  else msgs.push(`🍽️ باقي عليك ${Math.max(0,t.protein-Math.round(todayNutrition.protein))} جم بروتين عشان توصل هدفك اليوم.`);

  const last = c.history[c.history.length-1];
  if(last){
    const daysSince = Math.round((Date.now()-new Date(last.date).getTime())/86400000);
    if(daysSince>=3) msgs.push(`⏰ آخر تمرين لك كان قبل ${daysSince} أيام (${last.name}) — وقت مناسب ترجع للجدول.`);
    else msgs.push(`👏 آخر حصة (${last.name}) كانت قبل ${daysSince===0?'اليوم':daysSince+' يوم'} — استمر بنفس الزخم.`);
  } else {
    msgs.push(`🆕 ما سجّلت أي تمرين بعد — ابدأ بـ ${todayWorkout.name} اليوم وخلنا نبني السجل من الصفر.`);
  }

  const newPRs = Object.values(c.prs).filter(v=>Date.now()-new Date(v.date).getTime() <= 7*86400000);
  if(newPRs.length) msgs.push(`🏆 سجّلت ${newPRs.length} رقم قياسي جديد هالأسبوع — أداء قوي!`);

  const ms = c.measurements.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(ms.length>=2){
    const delta = +(ms[ms.length-1].weight-ms[0].weight).toFixed(1);
    if(Math.abs(delta)>=0.3) msgs.push(delta<0 ? `📉 وزنك نازل ${Math.abs(delta)} كجم منذ أول قياس — استمر.` : `📈 وزنك زاد ${delta} كجم منذ أول قياس — راجع سعراتك لو الهدف تنشيف.`);
  }

  return msgs;
}

// Bullet-style daily analysis for the "تحليل اليوم" card (distinct from the rotating chat line).
function buildDailyAnalysis(c, streak, todayNutrition, t, recovery){
  const items = [];
  if(recovery.score>=80) items.push({icon:'✅', text:'جاهز لزيادة الأوزان اليوم'});
  else if(recovery.score<50) items.push({icon:'⚠️', text:'جاهزيتك منخفضة — خفّف الشدة اليوم'});
  const proteinGap = Math.max(0, Math.round(t.protein-todayNutrition.protein));
  if(proteinGap>10) items.push({icon:'⚠️', text:`البروتين ناقص ${proteinGap} جم اليوم`});
  const p = c.profile;
  const waterTarget = p.weight ? +(p.weight*0.033).toFixed(1) : 2.5;
  items.push({icon:'💧', text:`اشرب ${waterTarget} لتر ماء اليوم`});
  return items.slice(0,4);
}

AF.HomePage = function({state, cur, mutate, getWorkouts, openWorkout, showScreen}){
  const c = cur();
  const p = c.profile;
  const today = new Date();
  const todayIndex = AF.satDow(today)%3;
  const workouts = getWorkouts();
  const todayWorkout = workouts[todayIndex % workouts.length];
  const streak = AF.computeStreak(c.history);
  const last = c.history[c.history.length-1];
  const draft = c.draft;
  const draftWorkout = draft ? workouts.find(w=>w.id===draft.id) : null;
  const todayKey = AF.dateKey(today);
  const dayLog = c.dailyLog?.[todayKey] || {};
  const todayNutrition = c.nutrition.logs.filter(l=>l.date===todayKey)
    .reduce((a,l)=>({cal:a.cal+l.cal, protein:a.protein+l.protein}), {cal:0,protein:0});
  const t = c.nutrition.targets;

  const coachMsgs = React.useMemo(()=>buildCoachMessages(c, streak, todayWorkout, todayNutrition, t), [c.history.length, c.nutrition.logs.length, c.measurements.length]);
  const recovery = AF.computeRecoveryScore(c);
  const dailyAnalysis = React.useMemo(()=>buildDailyAnalysis(c, streak, todayNutrition, t, recovery), [c.history.length, c.nutrition.logs.length]);
  const [msgIdx, setMsgIdx] = React.useState(0);
  React.useEffect(()=>{
    const id = setInterval(()=>setMsgIdx(i=>(i+1)%coachMsgs.length), 7000);
    return ()=>clearInterval(id);
  },[coachMsgs.length]);

  const ms = c.measurements.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const firstWeight = ms[0]?.weight;
  const weightDelta = (firstWeight!=null) ? +(p.weight-firstWeight).toFixed(1) : null;

  return h(React.Fragment, null,
    draft ? h('div',{style:{
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,
      background:'linear-gradient(135deg, rgba(var(--accent-rgb),.1), rgba(var(--accent-rgb),.03))',
      border:'1px solid rgba(var(--accent-rgb),.2)',borderRadius:18,padding:'14px 16px',marginBottom:14
    }},
      h('div',null,
        h('b',{style:{display:'block'}},'عندك حصة غير مكتملة'),
        h('small',{style:{color:'var(--muted)'}}, draftWorkout ? `${draftWorkout.name} · ${new Date(draft.date).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}` : '')
      ),
      h(AF.PrimaryBtn,{onClick:()=>openWorkout(draft.id,true)}, 'استئناف')
    ) : null,

    h('div',{style:{margin:'4px 0 14px'}},
      h('p',{style:{color:'var(--muted)',margin:0}}, `هلا ${c.name||''} 👋 · ${today.toLocaleDateString('ar-SA',{weekday:'long',day:'numeric',month:'long'})}`),
      h('h2',{style:{margin:'4px 0 0'}}, '🔥 اليوم')
    ),

    h('button',{onClick:()=>showScreen('coach'), style:{
      width:'100%', textAlign:'right', border:'1px solid var(--line)', borderRadius:18, padding:'16px 18px', cursor:'pointer',
      background:'var(--surface)', color:'var(--text)', display:'flex', gap:12, alignItems:'flex-start', marginBottom:14
    }},
      h('span',{style:{fontSize:24,flex:'0 0 auto'}}, '🤖'),
      h('div',{style:{flex:1}},
        h('span',{style:{display:'block',color:'var(--muted)',fontSize:11,marginBottom:4}},'المدرب الذكي'),
        h('span',{key:msgIdx, style:{display:'block',fontSize:14,lineHeight:1.6,animation:'coachFade .4s ease'}}, coachMsgs[msgIdx])
      )
    ),

    h(AF.Panel,{style:{marginBottom:14}},
      h(AF.SectionTitle,{title:'📊 تحليل اليوم'}),
      h('div',{style:{display:'grid',gap:8,marginTop:6}},
        dailyAnalysis.map((it,i)=>h('div',{key:i, style:{display:'flex',gap:8,alignItems:'center',fontSize:13}}, h('span',null,it.icon), h('span',null,it.text)))
      )
    ),

    h(AF.Panel,null,
      h(AF.SectionTitle,{title:'🏋️ لوحة التمارين', right:'تمرين اليوم'}),
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
        h('div',null,
          h('b',{style:{fontSize:20,display:'block'}}, todayWorkout.name),
          h('span',{style:{color:'var(--muted)',fontSize:12}}, `الالتزام: ${streak} ${streak===1?'يوم':'أيام'}`)
        ),
        h(AF.PrimaryBtn,{onClick:()=>openWorkout(todayWorkout.id)}, 'ابدأ الآن')
      ),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginTop:12,paddingTop:12,borderTop:'1px solid var(--line)'}},
        h('span',{style:{fontSize:11,color:'var(--muted)',alignSelf:'center'}}, 'أو اختر يومك بنفسك:'),
        workouts.map(w=>h('button',{key:w.id, onClick:()=>openWorkout(w.id), style:{
          fontSize:12,border:'1px solid '+(w.id===todayWorkout.id?'var(--accent)':'var(--line)'),
          background:w.id===todayWorkout.id?'rgba(var(--accent-rgb),.12)':'var(--surface2)',
          color:'var(--text)',borderRadius:99,padding:'6px 14px',cursor:'pointer'
        }}, w.name))
      ),
      last ? h('div',{style:{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line)',display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center'}},
        h('div',null, h('b',{style:{fontSize:16,display:'block'}}, last.name), h('span',{style:{fontSize:11,color:'var(--muted)'}},'آخر تمرين')),
        h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:16,display:'block'}}, last.durationMin?last.durationMin+' د':'—'), h('span',{style:{fontSize:11,color:'var(--muted)'}},'المدة')),
        h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:16,display:'block'}}, Math.round(last.volume)), h('span',{style:{fontSize:11,color:'var(--muted)'}},'الحجم كجم'))
      ) : null
    ),

    h(AF.Panel,{style:{cursor:'pointer'}},
      h('div',{onClick:()=>showScreen('nutrition')},
        h(AF.SectionTitle,{title:'🍗 لوحة الأكل', right:'اليوم'}),
        h('div',{style:{display:'flex',alignItems:'center',gap:18}},
          h(AF.RingChart,{percent:t.calories?Math.min(100,Math.round(todayNutrition.cal/t.calories*100)):0, label:Math.round(todayNutrition.cal), sub:'سعرة', size:76}),
          h('div',{style:{flex:1,display:'grid',gap:8}},
            h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:13}}, h('span',{style:{color:'var(--muted)'}},'السعرات'), h('b',null, `${Math.round(todayNutrition.cal)} / ${t.calories}`)),
            h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:13}}, h('span',{style:{color:'var(--muted)'}},'البروتين'), h('b',null, `${Math.round(todayNutrition.protein)} / ${t.protein} جم`)),
            h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:13}}, h('span',{style:{color:'var(--muted)'}},'الخطوات'), h('b',null, (dayLog.steps||0).toLocaleString('en-US')))
          )
        )
      )
    ),

    h(AF.Panel,{style:{cursor:'pointer'}},
      h('div',{onClick:()=>showScreen('progress')},
        h(AF.SectionTitle,{title:'📈 لوحة تغيّر الجسم', right:'التقدم'}),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center'}},
          h('div',null, h('b',{style:{fontSize:18,display:'block'}}, p.weight), h('span',{style:{fontSize:11,color:'var(--muted)'}},'الوزن الحالي')),
          h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, p.goal), h('span',{style:{fontSize:11,color:'var(--muted)'}},'الهدف')),
          h('div',{style:{borderRight:'1px solid var(--line)'}},
            h('b',{style:{fontSize:18,display:'block',color:weightDelta==null?'var(--text)':(weightDelta<0?'var(--good)':(weightDelta>0?'var(--danger)':'var(--text)'))}},
              weightDelta==null?'—':`${weightDelta>0?'+':''}${weightDelta}`
            ),
            h('span',{style:{fontSize:11,color:'var(--muted)'}},'التغير الكلي كجم')
          )
        )
      )
    )
  );
};
