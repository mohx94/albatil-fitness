window.AF = window.AF || {};

AF.cloud = {
  db: null,
  user: null,
  unsub: null,
  configured: false
};

function loadScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src=src; s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}

// Loads firebase-config.js if present (user copies from firebase-config.example.js),
// initializes Firebase Auth (Google) + Firestore, and calls onAuthChange(user) on changes.
AF.initCloudSync = async function(onAuthChange){
  try{
    await loadScript('./firebase-config.js');
  }catch{
    return {ok:false, reason:'no-config'};
  }
  if(!window.ALBATIL_FIREBASE_CONFIG){
    return {ok:false, reason:'no-config'};
  }
  try{
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
    firebase.initializeApp(window.ALBATIL_FIREBASE_CONFIG);
    AF.cloud.db = firebase.firestore();
    AF.cloud.configured = true;
    firebase.auth().onAuthStateChanged(user=>{
      AF.cloud.user = user;
      onAuthChange && onAuthChange(user);
    });
    return {ok:true};
  }catch(e){
    return {ok:false, reason:'load-failed'};
  }
};

AF.cloudSignIn = async function(){
  const provider = new firebase.auth.GoogleAuthProvider();
  return firebase.auth().signInWithPopup(provider);
};
AF.cloudSignOut = function(){ return firebase.auth().signOut(); };

AF.cloudPush = async function(state){
  if(!AF.cloud.db||!AF.cloud.user) throw new Error('not-signed-in');
  await AF.cloud.db.collection('albatil_users').doc(AF.cloud.user.uid).set({
    state: JSON.stringify(state), updatedAt: Date.now()
  });
};

AF.cloudPull = async function(){
  if(!AF.cloud.db||!AF.cloud.user) throw new Error('not-signed-in');
  const doc = await AF.cloud.db.collection('albatil_users').doc(AF.cloud.user.uid).get();
  if(!doc.exists) return null;
  return JSON.parse(doc.data().state);
};

// Realtime: listen for remote changes (e.g. from another device) and call cb(state)
AF.cloudSubscribe = function(cb){
  if(!AF.cloud.db||!AF.cloud.user) return ()=>{};
  if(AF.cloud.unsub) AF.cloud.unsub();
  AF.cloud.unsub = AF.cloud.db.collection('albatil_users').doc(AF.cloud.user.uid)
    .onSnapshot(doc=>{
      if(doc.exists && doc.data().state) cb(JSON.parse(doc.data().state));
    });
  return AF.cloud.unsub;
};
