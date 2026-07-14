window.AF = window.AF || {};

function playBeep(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type='sine'; o.frequency.value=880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.4);
    o.start(); o.stop(ctx.currentTime+0.42);
  }catch{}
}

AF.App = function(){
  const {state, cur, mutate, setState, cloudUser, cloudReason} = AF.useAppState();
  const [screen, setScreen] = React.useState('home');
  const [currentWorkoutId, setCurrentWorkoutId] = React.useState(null);
  const [toastMsg, setToastMsg] = React.useState(null);
  const [theme, setThemeState] = React.useState(()=>localStorage.getItem('albatil-theme')||'dark');
  const [notifEnabled, setNotifEnabled] = React.useState(()=>('Notification' in window && Notification.permission==='granted'));
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(()=>{
    const onUpdate = ()=>setUpdateAvailable(true);
    window.addEventListener('sw-update-available', onUpdate);
    return ()=>window.removeEventListener('sw-update-available', onUpdate);
  },[]);

  React.useEffect(()=>{ document.documentElement.dataset.theme = theme; localStorage.setItem('albatil-theme', theme); },[theme]);

  const toast = React.useCallback((msg)=>{
    setToastMsg(msg);
    setTimeout(()=>setToastMsg(null), 1900);
  },[]);

  const getWorkouts = React.useCallback(()=>{
    const c = cur();
    return c.customWorkouts || AF.WORKOUTS;
  },[state]);

  const [freeWorkout, setFreeWorkout] = React.useState(null);
  const openWorkout = (id)=>{ setCurrentWorkoutId(id); setScreen('session'); if(id!=='freeplay') setFreeWorkout(null); };
  const showScreen = (s)=>{ setScreen(s); window.scrollTo({top:0,behavior:'smooth'}); };

  const startFreeSession = (list)=>{
    const groups = {};
    list.forEach(it=>{ if(!groups[it.muscle]) groups[it.muscle]=[]; groups[it.muscle].push([it.name,it.sets,it.reps]); });
    const workout = {id:'freeplay', name:'تمرين حر', subtitle:'مبني بواسطتك', groups:Object.entries(groups)};
    setFreeWorkout(workout);
    setCurrentWorkoutId('freeplay');
    setScreen('session');
  };

  const advanceProgramWeek = ()=>{
    mutate((next,p)=>{
      if(!p.mesocycle) p.mesocycle={week:1,startedAt:new Date().toISOString()};
      p.mesocycle.week = p.mesocycle.week>=4 ? 1 : p.mesocycle.week+1;
    });
  };

  React.useEffect(()=>{
    const params = new URLSearchParams(location.search);
    if(params.get('start')==='workout'){
      const idx = AF.satDow(new Date())%3;
      const workouts = cur().customWorkouts || AF.WORKOUTS;
      openWorkout(workouts[idx % workouts.length].id);
    }
    // eslint-disable-next-line
  },[]);

  const c = cur();

  const SECTION_ACCENTS = {
    workouts:{'--accent':'#c9a227','--accent2':'#a9862a','--accent-rgb':'201,162,39'},
    library:{'--accent':'#c9a227','--accent2':'#a9862a','--accent-rgb':'201,162,39'},
    editSchedule:{'--accent':'#c9a227','--accent2':'#a9862a','--accent-rgb':'201,162,39'},
    freeSession:{'--accent':'#c9a227','--accent2':'#a9862a','--accent-rgb':'201,162,39'},
    session:{'--accent':'#c9a227','--accent2':'#a9862a','--accent-rgb':'201,162,39'},
    nutrition:{'--accent':'#2fa374','--accent2':'#22815b','--accent-rgb':'47,163,116'},
    progress:{'--accent':'#5b6ee8','--accent2':'#4453b8','--accent-rgb':'91,110,232'},
    coach:{'--accent':'#5b6ee8','--accent2':'#4453b8','--accent-rgb':'91,110,232'}
  };
  const sectionStyle = SECTION_ACCENTS[screen] || {};

  let pageEl = null;
  if(screen==='home') pageEl = h(AF.HomePage,{state,cur,mutate,getWorkouts,openWorkout,showScreen});
  else if(screen==='workouts') pageEl = h(AF.WorkoutsPage,{cur,getWorkouts,openWorkout,showScreen,advanceProgramWeek});
  else if(screen==='library') pageEl = h(AF.LibraryPage,{cur,mutate,getWorkouts,showScreen});
  else if(screen==='editSchedule') pageEl = h(AF.ScheduleEditorPage,{cur,mutate,getWorkouts,showScreen});
  else if(screen==='session') pageEl = h(AF.SessionPage,{cur,mutate,getWorkouts,currentWorkoutId,showScreen,playBeep,notifEnabled,toast,freeWorkout});
  else if(screen==='freeSession') pageEl = h(AF.FreeSessionBuilder,{showScreen,startFreeSession});
  else if(screen==='progress') pageEl = h(AF.ProgressPage,{cur,mutate,getWorkouts,toast});
  else if(screen==='coach') pageEl = h(AF.CoachPage,{cur,mutate,getWorkouts,showScreen});
  else if(screen==='nutrition') pageEl = h(AF.NutritionPage,{cur,mutate,toast});
  else if(screen==='settings') pageEl = h(AF.SettingsPage,{state,cur,mutate,setState,toast,cloudUser,cloudReason,theme,setTheme:setThemeState,notifEnabled,setNotifEnabled});

  const navScreen = ['session','library','editSchedule','freeSession'].includes(screen) ? null : screen;

  return h('div',{style:{maxWidth:720,margin:'auto',minHeight:'100vh',padding:'18px 16px 96px'}},
    updateAvailable ? h('div',{style:{
      position:'fixed',top:0,left:0,right:0,zIndex:50,background:'var(--accent)',color:'var(--bg)',
      padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,fontWeight:700
    }},
      h('span',null,'🔄 تحديث جديد للتطبيق متوفر'),
      h('button',{onClick:()=>window.__swReloadForUpdate(), style:{border:0,background:'var(--bg)',color:'var(--accent)',borderRadius:99,padding:'6px 14px',fontWeight:800,cursor:'pointer'}}, 'تحديث الآن')
    ) : null,
    h(AF.TopBar,{profileName:c.name||'الملف', onProfileClick:()=>showScreen('settings')}),
    h('main',{style:sectionStyle}, pageEl),
    navScreen ? h(AF.BottomNav,{active:navScreen, onNav:showScreen}) : null,
    h(AF.Toast,{msg:toastMsg})
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(h(AF.App));
