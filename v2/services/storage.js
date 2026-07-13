window.AF = window.AF || {};

AF.OLD_KEY_V1 = "albatil-fitness-v1";
AF.OLD_KEY_V2 = "albatil-fitness-v2"; // previous static v5 app, same origin
AF.KEY = "albatil-fitness-v2-app";

AF.blankProfileData = function(){
  return {
    name:"محمد",
    profile:{weight:80.5,goal:75,fat:27.2,height:175,age:25,gender:"male",activity:1.55},
    history:[], measurements:[], prs:{}, draft:null, exerciseLogs:{},
    nutrition:{logs:[],customFoods:[],targets:{calories:2200,protein:150,carb:220,fat:70}},
    mesocycle:{week:1,startedAt:new Date().toISOString()},
    customWorkouts:null, videoLinks:{}, dailyBurn:{},
    dailyLog:{}, // {date: {sleep, steps, burn}}
    injuries:[], // [{id, part, pain(1-5), note, date}]
    weeklyGoals:{workouts:3, proteinDays:7, weightLossKg:0.5, steps:60000}
  };
};

function migrateFrom(raw){
  if(!raw) return null;
  if(raw.profiles) return raw; // already v2-shaped
  // v1 flat shape -> wrap as single profile
  const p = AF.blankProfileData();
  p.name = raw.profile?.name || "محمد";
  p.profile = {...p.profile, ...(raw.profile||{})};
  p.history = raw.history||[]; p.measurements = raw.measurements||[]; p.prs = raw.prs||{};
  p.draft = raw.draft||null; p.exerciseLogs = raw.exerciseLogs||{};
  p.nutrition = {...p.nutrition, ...(raw.nutrition||{})};
  p.mesocycle = raw.mesocycle || p.mesocycle;
  p.customWorkouts = raw.customWorkouts || null;
  p.videoLinks = raw.videoLinks || {};
  p.dailyBurn = raw.dailyBurn || {};
  p.dailyLog = raw.dailyLog || Object.fromEntries(Object.entries(raw.dailyBurn||{}).map(([d,v])=>[d,{sleep:null,steps:v.steps||0,burn:v.burn||0}]));
  p.injuries = raw.injuries || [];
  p.weeklyGoals = raw.weeklyGoals || {workouts:3, proteinDays:7, weightLossKg:0.5, steps:60000};
  return {activeProfile:"p1", profiles:{p1:p}};
}

AF.loadState = function(){
  try{
    const own = JSON.parse(localStorage.getItem(AF.KEY)||"null");
    if(own && own.profiles){
      const check = AF.validateState ? AF.validateState(own) : {ok:true};
      if(check.ok) return own;
      // corrupted own state: try most recent auto-backup before falling further back
      try{
        const backupKeys = Object.keys(localStorage).filter(k=>k.startsWith(AF.KEY+'-backup-')).sort().reverse();
        for(const bk of backupKeys){
          const cand = JSON.parse(localStorage.getItem(bk)||"null");
          if(cand && AF.validateState(cand).ok) return cand;
        }
      }catch{}
    }
  }catch{}
  try{
    const prevV2 = JSON.parse(localStorage.getItem(AF.OLD_KEY_V2)||"null");
    const migrated = migrateFrom(prevV2);
    if(migrated) return migrated;
  }catch{}
  try{
    const prevV1 = JSON.parse(localStorage.getItem(AF.OLD_KEY_V1)||"null");
    const migrated = migrateFrom(prevV1);
    if(migrated) return migrated;
  }catch{}
  return {activeProfile:"p1", profiles:{p1:AF.blankProfileData()}};
};

AF.saveState = function(state){
  localStorage.setItem(AF.KEY, JSON.stringify(state));
};
