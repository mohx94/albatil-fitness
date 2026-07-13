window.AF = window.AF || {};
window.h = React.createElement;

AF.dateKey = function(d){ return new Date(d).toISOString().slice(0,10); };

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
  const {weight,height,age,gender,activity,goal} = profile;
  if(!height||!age) return null;
  const bmr = gender==='female' ? (10*weight+6.25*height-5*age-161) : (10*weight+6.25*height-5*age+5);
  let tdee = bmr*(+activity||1.55);
  if(goal<weight) tdee*=0.85; else if(goal>weight) tdee*=1.1;
  const calories = Math.round(tdee);
  const protein = Math.round(weight*2);
  const fat = Math.round(tdee*0.25/9);
  const carb = Math.round(Math.max(0,(calories-protein*4-fat*9))/4);
  return {calories,protein,carb,fat};
};

AF.suggestedWeight = function(logs,repsRange,deload){
  if(!logs||!logs.length) return null;
  const last = logs[logs.length-1];
  if(!last.weight) return null;
  const maxRep = parseInt(String(repsRange).split('-').pop())||last.reps;
  let base = last.reps>=maxRep ? +(last.weight+(last.weight>=40?2.5:1)).toFixed(1) : last.weight;
  if(deload) base = +(base*0.85).toFixed(1);
  return base;
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
