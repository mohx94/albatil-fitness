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

AF.SessionPage = function({cur, mutate, getWorkouts, currentWorkoutId, showScreen, playBeep, notifEnabled, toast, freeWorkout}){
  const c = cur();
  const workout = (freeWorkout && freeWorkout.id===currentWorkoutId) ? freeWorkout : getWorkouts().find(w=>w.id===currentWorkoutId);
  const draft = (c.draft && c.draft.id===currentWorkoutId) ? c.draft : null;
  const deload = (c.mesocycle?.week||1)===4;
  const [exercises, setExercises] = React.useState(()=>buildInitialExercises(workout, draft));
  const [openDetail, setOpenDetail] = React.useState({});
  const [timer, setTimer] = React.useState(90);
  const [timerRunning, setTimerRunning] = React.useState(false);
  const timerRef = React.useRef(null);
  const REST = 90;
  const sessionStartRef = React.useRef(Date.now());
  const restStatsRef = React.useRef({total:0, max:0, count:0});
  const [ratingPrompt, setRatingPrompt] = React.useState(null); // {sets,volume,notes,now}
  const [rating, setRating] = React.useState({stars:0, energy:3, sleep:3, effort:3, stress:3});

  const activeInjuries = (c.injuries||[]).filter(inj=>inj.pain>=3);
  const injuredParts = new Set(activeInjuries.map(inj=>inj.part));
  const [gymMode, setGymMode] = React.useState(false);
  const [focusCountdown, setFocusCountdown] = React.useState(null);
  const wakeLockRef = React.useRef(null);
  const [extraGroups, setExtraGroups] = React.useState([]); // exercises added mid-session: {muscle,name,sets,reps}
  const [showAddBox, setShowAddBox] = React.useState(false);
  const [addQuery, setAddQuery] = React.useState('');
  const addResult = React.useMemo(()=>addQuery.trim() ? AF.matchExercise(addQuery) : {match:null,candidates:[],confidence:0}, [addQuery]);

  const addExerciseNow = (entry)=>{
    const key = workout.id+'__'+entry.name;
    if(exercises[key]){ toast('هذا التمرين موجود بالفعل بالحصة'); setShowAddBox(false); setAddQuery(''); return; }
    setExercises(prev=>({...prev, [key]:{sets:[{weight:'',reps:'',rir:'',done:false},{weight:'',reps:'',rir:'',done:false},{weight:'',reps:'',rir:'',done:false}], notes:''}}));
    setExtraGroups(prev=>[...prev, {muscle:entry.muscle, name:entry.name, sets:3, reps:'8-12'}]);
    setShowAddBox(false); setAddQuery('');
    toast('✅ تمت إضافة '+entry.name);
  };

  const toggleGymMode = async ()=>{
    if(!gymMode){
      try{ if('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); }catch{}
      setGymMode(true);
    } else {
      try{ wakeLockRef.current?.release(); }catch{}
      wakeLockRef.current = null;
      setGymMode(false);
    }
  };
  React.useEffect(()=>()=>{ try{ wakeLockRef.current?.release(); }catch{} },[]);

  const startFocusMode = ()=>{
    let n = 3;
    setFocusCountdown(n);
    const id = setInterval(()=>{
      n--;
      if(n<=0){ clearInterval(id); setFocusCountdown(null); }
      else setFocusCountdown(n);
    },1000);
  };

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
        restStatsRef.current.total += REST; restStatsRef.current.count++;
        restStatsRef.current.max = Math.max(restStatsRef.current.max, REST);
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
    const durationMin = Math.max(1, Math.round((Date.now()-sessionStartRef.current)/60000));
    const restTotalMin = Math.round(restStatsRef.current.total/60);
    const restMaxSec = restStatsRef.current.max;
    mutate((next,p)=>{
      p.history.push({date:now, id:workout.id, name:workout.name, sets, volume, notes, durationMin, restTotalMin, restMaxSec, restCount:restStatsRef.current.count});
      Object.entries(prUpdates).forEach(([k,v])=>{ p.prs[k]=v; });
      Object.entries(exerciseLogUpdates).forEach(([k,v])=>{
        if(!p.exerciseLogs[k]) p.exerciseLogs[k]=[];
        p.exerciseLogs[k].push(v);
      });
      p.draft = null;
    });
    toast('تم حفظ التمرين 💪');
    setRatingPrompt({date:now});
  };

  const submitRating = ()=>{
    mutate((next,p)=>{
      const idx = p.history.findIndex(hh=>hh.date===ratingPrompt.date);
      if(idx>-1) p.history[idx].rating = rating;
    });
    setRatingPrompt(null);
    showScreen('home');
  };
  const skipRating = ()=>{ setRatingPrompt(null); showScreen('home'); };

  const ratio = Math.max(0,timer)/REST;
  const offset = RING_C*(1-ratio);
  const mm = String(Math.floor(Math.max(0,timer)/60)).padStart(2,'0');
  const ss = String(Math.max(0,timer)%60).padStart(2,'0');
  const Wrapper = gymMode ? 'div' : React.Fragment;
  const wrapperProps = gymMode ? {style:{position:'fixed',inset:0,zIndex:40,background:'var(--bg)',overflowY:'auto',padding:'20px 16px 40px'}} : null;

  return h(Wrapper, wrapperProps,
    focusCountdown!=null ? h('div',{style:{position:'fixed',inset:0,zIndex:80,background:'var(--bg)',display:'grid',placeItems:'center'}},
      h('div',{style:{fontSize:120,fontWeight:900,color:'var(--gold)'}}, focusCountdown>0?focusCountdown:'🔥')
    ) : null,
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>showScreen('workouts')},'رجوع'),
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}}, workout.subtitle+(deload?' · 🔄 أسبوع تخفيف':'')), h('h2',{style:{margin:0, fontSize:gymMode?28:undefined}}, workout.name)),
      h('button',{onClick:()=>{ if(confirm('مسح بيانات الحصة الحالية؟')){ mutate((next,p)=>{p.draft=null;}); setExercises(buildInitialExercises(workout,null)); } }, style:{background:'rgba(255,97,120,.1)',color:'var(--danger)',border:'1px solid rgba(255,97,120,.2)',borderRadius:14,padding:'13px 16px',cursor:'pointer'}}, 'مسح')
    ),

    h('div',{style:{display:'flex',gap:8,marginBottom:14}},
      h(AF.SecondaryBtn,{onClick:toggleGymMode, style:{flex:1}}, gymMode?'🏟️ إيقاف وضع النادي':'🏟️ وضع النادي'),
      h(AF.SecondaryBtn,{onClick:startFocusMode, style:{flex:1}}, '🎯 وضع التركيز')
    ),

    h(AF.SecondaryBtn,{onClick:()=>setShowAddBox(v=>!v), style:{width:'100%',marginBottom:showAddBox?10:14}}, showAddBox?'✕ إغلاق':'➕ أضف تمرين لهذه الحصة'),
    showAddBox ? h(AF.Panel,{style:{marginBottom:14}},
      h('input',{
        value:addQuery, onChange:e=>setAddQuery(e.target.value), autoFocus:true,
        placeholder:'مثال: تمرين إضافي، بار دنج، سكوات...',
        style:{width:'100%',padding:'12px 14px',borderRadius:12,border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',fontSize:14}
      }),
      addQuery.trim() ? h('div',{style:{marginTop:10}},
        addResult.match ? h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:'var(--surface2)',border:'1px solid var(--accent)',borderRadius:12,padding:'10px 12px'}},
          h('div',null, h('b',null, addResult.match.name), h('br'), h('small',{style:{color:'var(--muted)'}}, addResult.match.muscle+' · '+addResult.match.equipment)),
          h(AF.PrimaryBtn,{onClick:()=>addExerciseNow(addResult.match)}, 'إضافة')
        ) : h('div',null,
          addResult.candidates.length ? h('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}},
            addResult.candidates.map(cd=>h('button',{key:cd.name, onClick:()=>addExerciseNow(cd), style:{fontSize:12,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)',borderRadius:99,padding:'6px 12px',cursor:'pointer'}}, `${cd.name} (${cd.muscle})`))
          ) : null,
          h(AF.SecondaryBtn,{onClick:()=>addExerciseNow({name:addQuery.trim(), muscle:'➕ إضافات الحصة'})}, `➕ أضفه كما هو باسم "${addQuery.trim()}"`)
        )
      ) : null
    ) : null,

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
        h('div',{style:{position:'absolute',inset:0,display:'grid',placeItems:'center',fontWeight:900,fontSize:gymMode?26:18}}, `${mm}:${ss}`)
      ),
      h('div',{style:{flex:1}},
        h('span',{style:{display:'block',color:'var(--muted)',fontSize:12,marginBottom:6}},'مؤقت الراحة التلقائي'),
        h('div',{style:{display:'flex',gap:8}},
          h('button',{onClick:startTimer, style:{border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',borderRadius:12,padding:'10px 13px',cursor:'pointer'}},'ابدأ'),
          h('button',{onClick:resetTimer, style:{border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',borderRadius:12,padding:'10px 13px',cursor:'pointer'}},'إعادة')
        )
      )
    ),

    [...workout.groups, ...(extraGroups.length ? [['➕ إضافات الحصة', extraGroups.map(e=>[e.name,e.sets,e.reps])]] : [])].map(([g,list])=>h(React.Fragment,{key:g},
      h('div',{style:{display:'flex',alignItems:'center',gap:8,margin:'18px 2px 8px'}},
        h('h3',{style:{margin:0}}, g),
        injuredParts.has(g) ? h('span',{style:{fontSize:11,color:'var(--danger)',background:'rgba(255,97,120,.1)',border:'1px solid rgba(255,97,120,.25)',borderRadius:99,padding:'3px 9px'}}, '⚠️ إصابة مسجلة بهذه العضلة') : null
      ),
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
            coachNote ? h('span',{style:{fontSize:11,color:'var(--accent2)',background:'rgba(var(--accent-rgb),.08)',border:'1px solid rgba(var(--accent-rgb),.25)',borderRadius:99,padding:'4px 10px'}}, `🧠 ${coachNote}`) : null,
            info ? h('button',{onClick:()=>setOpenDetail(prev=>({...prev,[key]:!prev[key]})), style:{fontSize:11,color:'var(--accent2)',background:'transparent',border:'1px solid var(--line)',borderRadius:99,padding:'4px 10px',cursor:'pointer'}}, 'ℹ️ التفاصيل والبدائل') : null
          ),
          (info && openDetail[key]) ? h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:'10px 12px',marginBottom:10,fontSize:12,color:'var(--muted)'}},
            h('b',{style:{color:'var(--text)'}},'💡 نصيحة: '), info.tip, info.alt&&info.alt.length? h('span',null,h('br'),h('b',{style:{color:'var(--text)'}},'🔁 بدائل: '),info.alt.join('، ')):null
          ) : null,
          ex.sets.map((row,i)=>{
            const nearFailure = row.done && row.rir!=='' && +row.rir<=1;
            return h('div',{key:i, style:{display:'grid',gridTemplateColumns:'26px 1fr 1fr 1fr 40px 30px',gap:6,alignItems:'end',marginTop:9,
              borderRadius:12, border:nearFailure?'1px solid var(--gold)':'1px solid transparent', boxShadow:nearFailure?'0 0 12px rgba(var(--gold-rgb),.35)':'none', padding:nearFailure?4:0, transition:'box-shadow .3s ease'}},
            h('span',{style:{alignSelf:'center',textAlign:'center',color:'var(--muted)',fontSize:12}}, i+1),
            h('label',{style:{fontSize:10,color:'var(--muted)'}},'كجم', h('input',{type:'number', step:'0.5', value:row.weight, placeholder:i===0&&suggestion?String(suggestion):'', onChange:e=>updateSetField(key,i,'weight',e.target.value), style:{width:'100%',marginTop:4,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 6px',textAlign:'center'}})),
            h('label',{style:{fontSize:10,color:'var(--muted)'}},'عدات', h('input',{type:'number', value:row.reps, onChange:e=>updateSetField(key,i,'reps',e.target.value), style:{width:'100%',marginTop:4,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 6px',textAlign:'center'}})),
            h('label',{style:{fontSize:10,color:'var(--muted)'}},'RIR', h('input',{type:'number', min:0, max:5, value:row.rir, onChange:e=>updateSetField(key,i,'rir',e.target.value), style:{width:'100%',marginTop:4,background:'var(--surface2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 6px',textAlign:'center'}})),
            h('button',{onClick:()=>toggleDone(key,i), style:{height:40,borderRadius:11,border:'1px solid var(--line)',background:row.done?(nearFailure?'var(--gold)':'var(--good)'):'var(--surface2)',color:row.done?'var(--bg)':'var(--text)',cursor:'pointer'}}, nearFailure?'🔥':'✓'),
            h('button',{onClick:()=>removeSet(key,i), style:{height:40,borderRadius:11,border:'1px solid var(--line)',background:'transparent',color:'var(--danger)',cursor:'pointer'}}, '×')
          );}),
          h('button',{onClick:()=>addSet(key), style:{marginTop:10,width:'100%',background:'transparent',border:'1px dashed var(--line)',color:'var(--muted)',borderRadius:12,padding:9,cursor:'pointer'}}, '+ إضافة جولة'),
          h('textarea',{value:ex.notes, onChange:e=>updateNotes(key,e.target.value), placeholder:'ملاحظات على هذا التمرين...', style:{width:'100%',marginTop:12,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:10,resize:'vertical',minHeight:38,fontSize:13}})
        );
      })
    )),

    h(AF.PrimaryBtn,{onClick:finishWorkout, style:{width:'100%',padding:18,margin:'4px 0 14px'}}, 'إنهاء وحفظ التمرين'),

    ratingPrompt ? h('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:60,display:'grid',placeItems:'center',padding:16}},
      h('div',{style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:22,padding:22,maxWidth:380,width:'100%'}},
        h('h3',{style:{marginTop:0}}, 'كيف كانت الحصة؟'),
        h('div',{style:{display:'flex',gap:6,justifyContent:'center',fontSize:28,marginBottom:16}},
          [1,2,3,4,5].map(n=>h('span',{key:n, onClick:()=>setRating(r=>({...r,stars:n})), style:{cursor:'pointer',opacity:rating.stars>=n?1:0.25}}, '⭐'))
        ),
        [['energy','الطاقة'],['sleep','النوم'],['effort','الإجهاد'],['stress','التوتر']].map(([f,label])=>h('div',{key:f, style:{marginBottom:12}},
          h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:4}}, h('span',null,label), h('span',null,rating[f])),
          h('input',{type:'range', min:1, max:5, value:rating[f], onChange:e=>setRating(r=>({...r,[f]:+e.target.value})), style:{width:'100%'}})
        )),
        h('div',{style:{display:'flex',gap:10,marginTop:10}},
          h(AF.GhostBtn,{onClick:skipRating, style:{flex:1}}, 'تخطي'),
          h(AF.PrimaryBtn,{onClick:submitRating, style:{flex:1}}, 'حفظ')
        )
      )
    ) : null
  );
};
