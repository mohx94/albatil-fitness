window.AF = window.AF || {};
window.h = React.createElement;

AF.SCHEMA_VERSION = 2;

AF.estimate1RM = function(weight, reps){
  if(!weight||!reps) return 0;
  return Math.round(weight*(1+reps/30)*10)/10;
};

// Basic structural + sanity validation before trusting an imported/remote state blob.
AF.validateState = function(state){
  const errors = [];
  if(!state || typeof state!=='object') return {ok:false, errors:['الملف فارغ أو غير صالح']};
  if(!state.profiles || typeof state.profiles!=='object') errors.push('لا يوجد profiles');
  else{
    Object.entries(state.profiles).forEach(([id,p])=>{
      if(!p.profile) { errors.push(`الملف ${id} بدون بيانات profile`); return; }
      const w = p.profile.weight;
      if(w!=null && (w<20||w>400)) errors.push(`وزن غير منطقي بالملف ${id}: ${w}`);
      if(!Array.isArray(p.history)) errors.push(`history غير صالح بالملف ${id}`);
      if(!Array.isArray(p.measurements)) errors.push(`measurements غير صالح بالملف ${id}`);
      (p.history||[]).forEach(hh=>{
        if(hh.sets!=null && (hh.sets<0||hh.sets>200)) errors.push('عدد جولات غير منطقي بسجل تمرين');
      });
    });
  }
  if(!state.activeProfile) errors.push('لا يوجد activeProfile');
  return {ok:errors.length===0, errors};
};

AF.dateKey = function(d){ return new Date(d).toISOString().slice(0,10); };
// Day-of-week index with the week starting Saturday (0=Saturday ... 6=Friday).
AF.satDow = function(d){ return (new Date(d).getDay()+1)%7; };

// Total calories burned today from logged cardio/iron sessions (in-gym) + outside-gym activity.
// Outside-gym: uses the manual "burn" entry if the user typed one, otherwise auto-estimates from
// logged steps (~0.045 kcal/step, scaled by body weight vs a 70kg reference).
AF.dailyBurnBreakdown = function(c, dateKey){
  const logs = (c.gymBurnLogs||[]).filter(l=>l.date===dateKey);
  const cardio = logs.filter(l=>l.type==='cardio').reduce((a,l)=>a+l.calories,0);
  const iron = logs.filter(l=>l.type==='iron').reduce((a,l)=>a+l.calories,0);
  const manualBurn = c.dailyLog?.[dateKey]?.burn || 0;
  const steps = c.dailyLog?.[dateKey]?.steps || 0;
  const weight = c.profile?.weight || 70;
  const stepsEstimate = Math.round(steps*0.045*(weight/70));
  const external = manualBurn>0 ? manualBurn : stepsEstimate;
  return {cardio, iron, external, externalIsEstimate: manualBurn<=0 && stepsEstimate>0, total: cardio+iron+external};
};

AF.computeStreak = function(history){
  if(!history.length) return 0;
  const days = new Set(history.map(h=>AF.dateKey(h.date)));
  let cursor = new Date();
  if(!days.has(AF.dateKey(cursor))){
    cursor.setDate(cursor.getDate()-1);
    if(!days.has(AF.dateKey(cursor))) return 0;
  }
  let count=0;
  while(days.has(AF.dateKey(cursor))){ count++; cursor.setDate(cursor.getDate()-1); }
  return count;
};

// US Navy body fat % formula (cm, height in cm)
AF.navyBodyFat = function({gender,height,waist,neck,hip}){
  if(!height||!waist||!neck) return null;
  if(gender==='female'){
    if(!hip) return null;
    const bf = 495/(1.29579-0.35004*Math.log10(waist+hip-neck)+0.22100*Math.log10(height))-450;
    return Math.max(2,Math.min(60,bf));
  }
  const bf = 495/(1.0324-0.19077*Math.log10(waist-neck)+0.15456*Math.log10(height))-450;
  return Math.max(2,Math.min(60,bf));
};

// Mifflin-St Jeor TDEE + goal-adjusted macro targets
AF.calcTargets = function(profile){
  const {weight,height,age,gender,activity,goal,bodyFatPercent} = profile;
  if(!height||!age) return null;
  let bmr;
  if(bodyFatPercent){
    // Katch-McArdle — more accurate when body fat % is known (uses lean body mass).
    const lbm = weight*(1-(bodyFatPercent/100));
    bmr = 370 + 21.6*lbm;
  } else {
    bmr = gender==='female' ? (10*weight+6.25*height-5*age-161) : (10*weight+6.25*height-5*age+5);
  }
  let tdee = bmr*(+activity||1.55);
  let calories, protein, fat, carb;
  if(bodyFatPercent){
    if(goal<weight) tdee -= 500; else if(goal>weight) tdee += 300;
    calories = Math.max(1200, Math.round(tdee));
    protein = Math.round(weight*2.2);
    fat = Math.round(weight*0.8);
    carb = Math.round(Math.max(0,(calories-protein*4-fat*9))/4);
  } else {
    if(goal<weight) tdee*=0.85; else if(goal>weight) tdee*=1.1;
    calories = Math.round(tdee);
    protein = Math.round(weight*2);
    fat = Math.round(tdee*0.25/9);
    carb = Math.round(Math.max(0,(calories-protein*4-fat*9))/4);
  }
  return {calories,protein,carb,fat};
};

AF.suggestedWeight = function(logs,repsRange,deload){
  if(!logs||!logs.length) return null;
  const last = logs[logs.length-1];
  if(!last.weight) return null;
  const maxRep = parseInt(String(repsRange).split('-').pop())||last.reps;
  const minRep = parseInt(String(repsRange).split('-')[0])||last.reps;
  const rir = last.avgRir;
  let base = last.weight;
  if(last.reps>=maxRep){
    // Hit or beat top of rep range: how much to add depends on how much gas was left (RIR)
    if(rir!=null && rir<=1) base = last.weight + (last.weight>=40?5:2); // near failure, big room to grow
    else if(rir!=null && rir>=3) base = last.weight + (last.weight>=40?1.25:0.5); // lots left, grow gently (was probably too light)
    else base = last.weight + (last.weight>=40?2.5:1); // default progression
  } else if(last.reps<minRep){
    base = last.weight; // missed the range, hold steady rather than push further
  } else {
    base = last.weight; // within range but not at top, hold until they hit max reps
  }
  base = +base.toFixed(1);
  if(deload) base = +(base*0.85).toFixed(1);
  return base;
};

AF.smartCoachNote = function(key, logs, repsRange){
  if(!logs || logs.length<1) return null;
  const last = logs[logs.length-1];
  const maxRep = parseInt(String(repsRange).split('-').pop())||last.reps;
  const rir = last.avgRir;
  if(last.reps>=maxRep && rir!=null && rir<=1){
    return `أكملت أعلى نطاق العدات (${last.reps}) بأقل جهد متبقي (RIR ${rir}) — جاهز لقفزة وزن أكبر المرة الجاية.`;
  }
  if(last.reps<parseInt(String(repsRange).split('-')[0])){
    return `آخر مرة ما وصلت أقل نطاق العدات — حافظ على نفس الوزن وركّز على الأداء قبل ما تزيد.`;
  }
  return null;
};

AF.linearForecast = function(points){
  // points: [{x:days,y:value}]
  if(points.length<3) return null;
  const n=points.length;
  const sumX=points.reduce((a,p)=>a+p.x,0), sumY=points.reduce((a,p)=>a+p.y,0);
  const sumXY=points.reduce((a,p)=>a+p.x*p.y,0), sumXX=points.reduce((a,p)=>a+p.x*p.x,0);
  const denom=(n*sumXX-sumX*sumX)||1;
  const slope=(n*sumXY-sumX*sumY)/denom;
  const intercept=(sumY-slope*sumX)/n;
  return {slope,intercept};
};

AF.allExerciseKeys = function(workouts){
  const keys=[];
  workouts.forEach(w=>w.groups.forEach(([,exs])=>exs.forEach(([name])=>keys.push(w.id+'__'+name))));
  return keys;
};
AF.keyMuscleMap = function(workouts){
  const map={};
  workouts.forEach(w=>w.groups.forEach(([g,exs])=>exs.forEach(([name])=>{map[w.id+'__'+name]=g;})));
  return map;
};
AF.exerciseLabel = function(key){ return key.split('__')[1]; };
