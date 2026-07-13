window.AF = window.AF || {};
const RING_R=42, RING_C=2*Math.PI*RING_R;

function buildInitialExercises(workout, draft){
  const exs = {};
  workout.groups.forEach(([g,list])=>list.forEach(([name,sets])=>{
    const key = workout.id+'__'+name;
    const draftEx = draft?.exercises?.[key];
    const count = draftEx?.sets?.length || sets;
    const rows = [];
    for(let i=0;i<count;i++){
      const dv = draftEx?.sets?.[i] || {};
      rows.push({weight:dv.weight??'', reps:dv.reps??'', rir:dv.rir??'', done:!!dv.done});
    }
    exs[key] = {sets:rows, notes:draftEx?.notes||''};
  }));
  return exs;
}

AF.SessionPage = function({cur, mutate, getWorkouts, currentWorkoutId, showScreen, playBeep, notifEnabled, toast}){
  const c = cur();
  const workout = getWorkouts().find(w=>w.id===currentWorkoutId);
  const draft = (c.draft && c.draft.id===currentWorkoutId) ? c.draft : null;
  const deload = (c.mesocycle?.week||1)===4;
  const [exercises, setExercises] = React.useState(()=>buildInitialExercises(workout, draft));
  const [openDetail, setOpenDetail] = React.useState({});
  const [timer, setTimer] = React.useState(90);
  const [timerRunning, setTimerRunning] = React.useState(false);
  const timerRef = React.useRef(null);
  const REST = 90;

  React.useEffect(()=>{
    const t = setTimeout(()=>{
      mutate((next,p)=>{ p.draft = {id:workout.id, date:new Date().toISOString(), exercises}; });
    }, 400);
    return ()=>clearTimeout(t);
  },[exercises]);

  React.useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const startTimer = ()=>{
    clearInterval(timerRef.current);
    setTimer(REST); setTimerRunning(true);
    let t = REST;
    timerRef.current = setInterval(()=>{
      t--; setTimer(t);
      if(t<=0){
        clearInterval(timerRef.current); setTimerRunning(false);
        navigator.vibrate?.([150,80,150]); toast('انتهت الراحة 🔥'); playBeep();
        if(notifEnabled && document.hidden && 'Notification' in window && Notification.permission==='granted'){
          new Notification('انتهت الراحة 🔥',{body:'وقت الجولة الجاية يا بطل', icon:'../icon.svg'});
        }
      }
    },1000);
  };
  const resetTimer = ()=>{ clearInterval(timerRef.current); setTimer(REST); setTimerRunning(false); };

  const updateSetField = (key, i, field, val)=>{
    setExercises(prev=>{
      const next = {...prev};
      const sets = next[key].sets.slice();
      sets[i] = {...sets[i], [field]:val};
      next[key] = {...next[key], sets};
      return next;
    });
  };
  const toggleDone = (key, i)=>{
    const wasDone = exercises[key].sets[i].done;
    updateSetField(key,i,'done',!wasDone);
    if(!wasDone){
      startTimer(); navigator.vibrate?.(40);
      const row = exercises[key].sets[i];
      const weight=+row.weight||0, reps=+row.reps||0;
      const old = c.prs[key];
      if(weight && reps && (!old || weight>old.weight || (weight===old.weight && reps>old.reps))){
        toast('🏆 PR جديد! استمر','pr');
      }
    }
  };
  const addSet = (key)=>{
    setExercises(prev=>{
      const next = {...prev};
      next[key] = {...next[key], sets:[...next[key].sets, {weight:'',reps:'',rir:'',done:false}]};
      return next;
    });
  };
  const removeSet = (key, i)=>{
    if(exercises[key].sets.length<=1){ toast('لازم تبقى جولة واحدة على الأقل'); return; }
    setExercises(prev=>{
      const next = {...prev};
      const sets = next[key].sets.filter((_,idx)=>idx!==i);
      next[key] = {...next[key], sets};
      return next;
    });
  };
  const updateNotes = (key, val)=>{
    setExercises(prev=>({...prev, [key]:{...prev[key], notes:val}}));
  };

  let liveVolume=0, liveDone=0, liveTotal=0;
  Object.values(exercises).forEach(ex=>ex.sets.forEach(s=>{
    liveTotal++;
    if(s.done){ liveDone++; liveVolume += (+s.weight||0)*(+s.reps||0); }
  }));

  const finishWorkout = ()=>{
    let sets=0, volume=0; const notes={}; const now=new Date().toISOString();
    const exerciseLogUpdates = {};
    const prUpdates = {};
    Object.entries(exercises).forEach(([key, ex])=>{
      const noteVal = ex.notes.trim();
      if(noteVal) notes[key]=noteVal;
      let exBestWeight=0, exBestReps=0, exVolume=0, exSets=0, rirSum=0, rirCount=0, bestSetVolume=0, best1RM=0, best1RMSet=null;
      ex.sets.forEach(row=>{
        if(!row.done) return;
        const weight=+row.weight||0, reps=+row.reps||0, rir=row.rir!==''?+row.rir:null;
        sets++; exSets++; volume+=weight*reps; exVolume+=weight*reps;
        if(rir!=null){ rirSum+=rir; rirCount++; }
        if(weight>exBestWeight || (weight===exBestWeight && reps>exBestReps)){ exBestWeight=weight; exBestReps=reps; }
        const setVolume = weight*reps;
        if(setVolume>bestSetVolume) bestSetVolume=setVolume;
        const oneRM = AF.estimate1RM(weight,reps);
        if(oneRM>best1RM){ best1RM=oneRM; best1RMSet={weight,reps}; }
      });
      if(exSets){
        exerciseLogUpdates[key] = {date:now, weight:exBestWeight, reps:exBestReps, volume:exVolume, avgRir: rirCount? +(rirSum/rirCount).toFixed(1) : null};
        const oldPr = c.prs[key] || {};
        const newPr = {...oldPr};
        if(!oldPr.maxWeight || exBestWeight>oldPr.maxWeight.weight || (exBestWeight===oldPr.maxWeight.weight && exBestReps>oldPr.maxWeight.reps)){
          newPr.maxWeight = {weight:exBestWeight, reps:exBestReps, date:now};
        }
        if(!oldPr.best1RM || best1RM>oldPr.best1RM.value){
          newPr.best1RM = {value:best1RM, weight:best1RMSet?.weight||0, reps:best1RMSet?.reps||0, date:now};
        }
        if(!oldPr.bestVolumeSet || bestSetVolume>oldPr.bestVolumeSet){
          newPr.bestVolumeSet = bestSetVolume;
        }
        // legacy shape kept for back-compat with older PR displays
        newPr.weight = newPr.maxWeight.weight; newPr.reps = newPr.maxWeight.reps; newPr.date = now;
        prUpdates[key] = newPr;
      }
    });
    if(!sets){ toast('سجّل جولة واحدة على الأقل'); return; }
    mutate((next,p)=>{
      p.history.push({date:now, id:workout.id, name:workout.name, sets, volume, notes});
      Object.entries(prUpdates).forEach(([k,v])=>{ p.prs[k]=v; });
      Object.entries(exerciseLogUpdates).forEach(([k,v])=>{
        if(!p.exerciseLogs[k]) p.exerciseLogs[k]=[];
        p.exerciseLogs[k].push(v);
      });
      p.draft = null;
    });
    toast('تم حفظ التمرين 💪');
    showScreen('home');
  };

  const ratio = Math.max(0,timer)/REST;
  const offset = RING_C*(1-ratio);
  const mm = String(Math.floor(Math.max(0,timer)/60)).padStart(2,'0');
  const ss = String(Math.max(0,timer)%60).padStart(2,'0');

  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>showScreen('workouts')},'رجوع'),
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}}, workout.subtitle+(deload?' · 🔄 أسبوع تخفيف':'')), h('h2',{style:{margin:0}}, workout.name)),
      h('button',{onClick:()=>{ if(confirm('مسح بيانات الحصة الحالية؟')){ mutate((next,p)=>{p.draft=null;}); setExercises(buildInitialExercises(workout,null)); } }, style:{background:'rgba(255,97,120,.1)',color:'var(--danger)',border:'1px solid rgba(255,97,120,.2)',borderRadius:14,padding:'13px 16px',cursor:'pointer'}}, 'مسح')
    ),

    h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}},
      h('div',{style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,padding:'12px 14px'}}, h('span',{style:{display:'block',color:'var(--muted)',fontSize:11}},'الحجم الحالي'), h('b',{style:{fontSize:20}}, Math.round(liveVolume))),
      h('div',{style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,padding:'12px 14px'}}, h('span',{style:{display:'block',color:'var(--muted)',fontSize:11}},'الجولات المنجزة'), h('b',{style:{fontSize:20}}, `${liveDone} / ${liveTotal}`))
    ),
    h('div',{style:{height:10,borderRadius:99,background:'var(--surface2)',overflow:'hidden',marginBottom:16}},
      h('div',{style:{height:'100%',borderRadius:99,background:'linear-gradient(90deg, var(--accent), var(--accent2))',width:(liveTotal?Math.round(liveDone/liveTotal*100):0)+'%',transition:'width .4s ease'}})
    ),

    h(AF.Panel,{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,marginBottom:14}},
      h('div',{style:{position:'relative',width:96,height:96,flex:'0 0 auto'}},
        h('svg',{viewBox:'0 0 96 96', style:{width:96,height:96,transform:'rotate(-90deg)'}},
          h('circle',{cx:48,cy:48,r:42,fill:'none',stroke:'var(--surface2)',strokeWidth:8}),
          h('circle',{cx:48,cy:48,r:42,fill:'none',stroke:timer<=10&&timer>0?'var(--danger)':'var(--accent)',strokeWidth:8,strokeLinecap:'round',strokeDasharray:RING_C,strokeDashoffset:offset,style:{transition:'stroke-dashoffset 1s linear, stroke .3s'}})
        ),
        h('div',{style:{position:'absolute',inset:0,display:'grid',placeItems:'center',fontWeight:900,fontSize:18}}, `${mm}:${ss}`)
      ),
      h('div',{style:{flex:1}},
        h('span',{style:{display:'block',color:'var(--muted)',fontSize:12,marginBottom:6}},'مؤقت الراحة التلقائي'),
        h('div',{style:{display:'flex',gap:8}},
          h('button',{onClick:startTimer, style:{border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',borderRadius:12,padding:'10px 13px',cursor:'pointer'}},'ابدأ'),
          h('button',{onClick:resetTimer, style:{border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',borderRadius:12,padding:'10px 13px',cursor:'pointer'}},'إعادة')
        )
      )
    ),

    workout.groups.map(([g,list])=>h(React.Fragment,{key:g},
      h('div',{style:{margin:'18px 2px 8px'}}, h('h3',{style:{margin:0}}, g)),
      list.map(([name,setsCount,reps])=>{
        const key = workout.id+'__'+name;
        const ex = exercises[key];
        if(!ex) return null;
        const pr = c.prs[key];
        const prLabel = pr ? `PR ${pr.maxWeight?pr.maxWeight.weight:pr.weight}×${pr.maxWeight?pr.maxWeight.reps:pr.reps}` : 'لا يوجد PR';
        const info = AF.EX_INFO[name];
        const suggestion = !draft?.exercises?.[key] ? AF.suggestedWeight(c.exerciseLogs[key], reps, deload) : null;
        const coachNote = !draft?.exercises?.[key] ? AF.smartCoachNote(key, c.exerciseLogs[key], reps) : null;
        return h('article',{key, style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:20,padding:16,marginBottom:12}},
          h('div',{style:{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start',marginBottom:6}},
            h('div',null, h('h3',{style:{margin:0}}, name), h('small',{style:{color:'var(--muted)'}}, `${setsCount} جولات × ${reps}`)),
            h('small',{style:{color:'var(--accent)'}}, prLabel)
          ),
          h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:10}},
            suggestion ? h('span',{style:{fontSize:11,color:'var(--gold)',background:'rgba(244,196,105,.1)',border:'1px solid rgba(244,196,105,.25)',borderRadius:99,padding:'4px 10px'}}, `🎯 مقترح: ${suggestion} كجم`) : null,
            coachNote ? h('span',{style:{fontSize:11,color:'var(--accent2)',background:'rgba(91,140,255,.1)',border:'1px solid rgba(91,140,255,.25)',borderRadius:99,padding:'4px 10px'}}, `🧠 ${coachNote}`) : null,
            info ? h('button',{onClick:()=>setOpenDetail(prev=>({...prev,[key]:!prev[key]})), style:{fontSize:11,color:'var(--accent2)',background:'transparent',border:'1px solid var(--line)',borderRadius:99,padding:'4px 10px',cursor:'pointer'}}, 'ℹ️ التفاصيل والبدائل') : null
          ),
          (info && openDetail[key]) ? h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:'10px 12px',marginBottom:10,fontSize:12,color:'var(--muted)'}},
            h('b',{style:{color:'var(--text)'}},'💡 نصيحة: '), info.tip, info.alt&&info.alt.length? h('span',null,h('br'),h('b',{style:{color:'var(--text)'}},'🔁 بدائل: '),info.alt.join('، ')):null
          ) : null,
          ex.sets.map((row,i)=>h('div',{key:i, style:{display:'grid',gridTemplateColumns:'26px 1fr 1fr 1fr 40px 30px',gap:6,alignItems:'end',marginTop:9}},
            h('span',{style:{alignSelf:'center',textAlign:'center',color:'var(--muted)',fontSize:12}}, i+1),
            h('label',{style:{fontSize:10,color:'var(--muted)'}},'كجم', h('input',{type:'number', step:'0.5', value:row.weight, placeholder:i===0&&suggestion?String(suggestion):'', onChange:e=>updateSetField(key,i,'weight',e.target.value), style:{width:'100%',marginTop:4,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 6px',textAlign:'center'}})),
            h('label',{style:{fontSize:10,color:'var(--muted)'}},'عدات', h('input',{type:'number', value:row.reps, onChange:e=>updateSetField(key,i,'reps',e.target.value), style:{width:'100%',marginTop:4,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 6px',textAlign:'center'}})),
            h('label',{style:{fontSize:10,color:'var(--muted)'}},'RIR', h('input',{type:'number', min:0, max:5, value:row.rir, onChange:e=>updateSetField(key,i,'rir',e.target.value), style:{width:'100%',marginTop:4,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 6px',textAlign:'center'}})),
            h('button',{onClick:()=>toggleDone(key,i), style:{height:40,borderRadius:11,border:'1px solid var(--line)',background:row.done?'var(--good)':'#1a2131',color:row.done?'#052018':'#fff',cursor:'pointer'}}, '✓'),
            h('button',{onClick:()=>removeSet(key,i), style:{height:40,borderRadius:11,border:'1px solid var(--line)',background:'transparent',color:'var(--danger)',cursor:'pointer'}}, '×')
          )),
          h('button',{onClick:()=>addSet(key), style:{marginTop:10,width:'100%',background:'transparent',border:'1px dashed var(--line)',color:'var(--muted)',borderRadius:12,padding:9,cursor:'pointer'}}, '+ إضافة جولة'),
          h('textarea',{value:ex.notes, onChange:e=>updateNotes(key,e.target.value), placeholder:'ملاحظات على هذا التمرين...', style:{width:'100%',marginTop:12,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:10,resize:'vertical',minHeight:38,fontSize:13}})
        );
      })
    )),

    h(AF.PrimaryBtn,{onClick:finishWorkout, style:{width:'100%',padding:18,margin:'4px 0 14px'}}, 'إنهاء وحفظ التمرين')
  );
};
