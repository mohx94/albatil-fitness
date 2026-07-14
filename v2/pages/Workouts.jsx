window.AF = window.AF || {};

AF.WorkoutsPage = function({cur, mutate, toast, getWorkouts, openWorkout, showScreen, advanceProgramWeek}){
  const c = cur();
  const workouts = getWorkouts();
  const week = c.mesocycle?.week||1;
  const deload = week===4;
  const recovery = AF.computeRecoveryScore(c);
  const recColor = recovery.score>=80?'var(--good)':(recovery.score>=50?'var(--gold)':'var(--danger)');
  const todayKey = AF.dateKey(new Date());
  const burn = AF.dailyBurnBreakdown(c, todayKey);
  const todayGymLogs = (c.gymBurnLogs||[]).filter(l=>l.date===todayKey);
  const [stepsInput, setStepsInput] = React.useState(()=>c.dailyLog?.[todayKey]?.steps||'');
  const saveSteps = ()=>{
    mutate((next,p)=>{
      if(!p.dailyLog) p.dailyLog={};
      p.dailyLog[todayKey] = {...(p.dailyLog[todayKey]||{}), steps:+stepsInput||0};
    });
    toast('👣 تم حفظ الخطوات');
  };

  const [cardioForm, setCardioForm] = React.useState({minutes:'', calories:''});
  const [ironForm, setIronForm] = React.useState({minutes:'', calories:''});
  const addBurnLog = (type, form, resetForm)=>{
    if(!form.calories){ toast('أدخل السعرات المحروقة على الأقل'); return; }
    mutate((next,p)=>{
      if(!p.gymBurnLogs) p.gymBurnLogs=[];
      p.gymBurnLogs.push({date:todayKey, type, minutes:+form.minutes||0, calories:+form.calories||0});
    });
    resetForm({minutes:'', calories:''});
    toast(type==='cardio' ? '🏃 تم تسجيل الكارديو' : '🏋️ تم تسجيل تمرين الحديد');
  };
  const removeBurnLog = (idx)=>{
    mutate((next,p)=>{
      let count=-1;
      p.gymBurnLogs = p.gymBurnLogs.filter(l=>{ if(l.date!==todayKey) return true; count++; return count!==idx; });
    });
  };

  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'flex-end',justifyContent:'space-between',margin:'14px 0 18px'}},
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}},'3 أيام رسمية + يوم اختياري'), h('h2',{style:{margin:0}},'جدول التمارين')),
    ),
    h(AF.Panel,{style:{display:'flex',alignItems:'center',gap:14}},
      h(AF.RingChart,{percent:recovery.score, label:recovery.score, sub:'%', size:64, color:recColor}),
      h('div',{style:{flex:1}},
        h('span',{style:{display:'block',color:'var(--muted)',fontSize:12,marginBottom:2}},'Recovery — جاهزيتك اليوم'),
        h('b',{style:{fontSize:13}}, recovery.note)
      )
    ),
    h('div',{style:{display:'flex',gap:8,marginBottom:14,marginTop:14}},
      h(AF.SecondaryBtn,{onClick:()=>showScreen('library'), style:{flex:1}}, '📚 مكتبة التمارين'),
      h(AF.SecondaryBtn,{onClick:()=>showScreen('freeSession'), style:{flex:1}}, '🆕 ابدأ من الصفر'),
      h(AF.SecondaryBtn,{onClick:()=>showScreen('editSchedule'), style:{flex:1}}, '✏️ تخصيص الجدول')
    ),
    h(AF.Panel,{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
      h('div',null,
        h('h3',{style:{fontSize:14,margin:0}}, '🗓️ دورة التدريج التلقائي'),
        h('span',{style:{color:'var(--muted)',fontSize:13}}, `أسبوع ${week} من 4${deload?' · تخفيف (Deload)':' · تدريج تلقائي'}`)
      ),
      h(AF.SecondaryBtn,{onClick:advanceProgramWeek}, 'الأسبوع الجاي ›')
    ),
    h('div',{style:{display:'grid',gap:12,marginTop:14}},
      workouts.map((w,i)=>{
        const exCount = w.groups.reduce((a,[,exs])=>a+exs.length,0);
        return h('button',{key:w.id, onClick:()=>openWorkout(w.id), style:{
          background:'var(--surface)',border:'1px solid var(--line)',borderRadius:20,padding:18,
          display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,color:'var(--text)',
          textAlign:'right',cursor:'pointer',width:'100%'
        }},
          h('div',null, h('h3',{style:{margin:'0 0 4px'}}, w.name), h('p',{style:{margin:0,color:'var(--muted)',fontSize:13}}, `${w.subtitle} · ${exCount} تمارين`)),
          h('div',{style:{width:52,height:52,borderRadius:16,background:'rgba(var(--accent-rgb),.1)',color:'var(--accent)',display:'grid',placeItems:'center',fontWeight:900}}, i+1)
        );
      })
    ),

    h(AF.Panel,{style:{marginTop:14, display:'flex', alignItems:'center', gap:12}},
      h('span',{style:{fontSize:24}},'👣'),
      h('div',{style:{flex:1}},
        h('span',{style:{display:'block',color:'var(--muted)',fontSize:11,marginBottom:4}},'خطوات اليوم'),
        h('input',{type:'number', value:stepsInput, onChange:e=>setStepsInput(e.target.value), placeholder:'مثال: 8000', style:{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)'}})
      ),
      h(AF.PrimaryBtn,{onClick:saveSteps, style:{padding:'10px 16px'}}, 'حفظ')
    ),

    h(AF.Panel,{style:{marginTop:14}},
      h(AF.SectionTitle,{title:'🔥 السعرات المحروقة اليوم', right:`${burn.total} سعرة`}),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:6,marginBottom:14,textAlign:'center'}},
        h('div',null, h('b',{style:{display:'block',fontSize:16}},burn.cardio), h('small',{style:{color:'var(--muted)'}},'🏃 كارديو')),
        h('div',null, h('b',{style:{display:'block',fontSize:16}},burn.iron), h('small',{style:{color:'var(--muted)'}},'🏋️ حديد')),
        h('div',null, h('b',{style:{display:'block',fontSize:16}},burn.external), h('small',{style:{color:'var(--muted)'}},'🚶 خارج النادي'+(burn.externalIsEstimate?' (تقديري)':'')))
      ),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}},
        h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:12}},
          h('b',{style:{fontSize:12,display:'block',marginBottom:8}}, '🏃 كارديو'),
          h('input',{type:'number',placeholder:'الدقائق',value:cardioForm.minutes,onChange:e=>setCardioForm(f=>({...f,minutes:e.target.value})),style:{width:'100%',marginBottom:6,padding:8,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}}),
          h('input',{type:'number',placeholder:'السعرات المحروقة',value:cardioForm.calories,onChange:e=>setCardioForm(f=>({...f,calories:e.target.value})),style:{width:'100%',marginBottom:8,padding:8,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}}),
          h(AF.PrimaryBtn,{onClick:()=>addBurnLog('cardio',cardioForm,setCardioForm), style:{width:'100%',fontSize:12,padding:'8px 10px'}}, '+ تسجيل')
        ),
        h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:12}},
          h('b',{style:{fontSize:12,display:'block',marginBottom:8}}, '🏋️ حديد (وزن)'),
          h('input',{type:'number',placeholder:'الدقائق',value:ironForm.minutes,onChange:e=>setIronForm(f=>({...f,minutes:e.target.value})),style:{width:'100%',marginBottom:6,padding:8,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}}),
          h('input',{type:'number',placeholder:'السعرات المحروقة',value:ironForm.calories,onChange:e=>setIronForm(f=>({...f,calories:e.target.value})),style:{width:'100%',marginBottom:8,padding:8,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}}),
          h(AF.PrimaryBtn,{onClick:()=>addBurnLog('iron',ironForm,setIronForm), style:{width:'100%',fontSize:12,padding:'8px 10px'}}, '+ تسجيل')
        )
      ),
      todayGymLogs.length ? h('div',{style:{display:'grid',gap:6,marginTop:12}},
        todayGymLogs.map((l,i)=>h('div',{key:i, style:{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,background:'var(--surface2)',borderRadius:10,padding:'6px 10px'}},
          h('span',null, `${l.type==='cardio'?'🏃':'🏋️'} ${l.minutes} د · ${l.calories} سعرة`),
          h('button',{onClick:()=>removeBurnLog(i), style:{border:0,background:'transparent',color:'var(--danger)',cursor:'pointer'}}, '✕')
        ))
      ) : null
    )
  );
};
