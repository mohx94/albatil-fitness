window.AF = window.AF || {};

// Central app-state hook: holds the whole persisted state tree, exposes cur()
// (active profile's data) plus action functions that mutate + persist + (if signed
// in) push to Firestore. Pages consume this via props from <App>.
AF.useAppState = function(){
  const [state, setState] = React.useState(() => AF.loadState());
  const [cloudUser, setCloudUser] = React.useState(null);
  const [cloudReason, setCloudReason] = React.useState(null);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const persist = React.useCallback((next)=>{
    setState(next);
    AF.saveState(next);
    if(AF.cloud.user){ AF.cloudPush(next).catch(()=>{}); }
  },[]);

  const mutate = React.useCallback((fn)=>{
    // fn receives a draft-ish deep copy of current state and mutates it in place
    const next = JSON.parse(JSON.stringify(stateRef.current));
    fn(next, next.profiles[next.activeProfile]);
    persist(next);
  },[persist]);

  React.useEffect(()=>{
    AF.initCloudSync((user)=>{
      setCloudUser(user||null);
      if(user){
        AF.cloudPull().then(remote=>{
          if(remote) persist(remote);
        }).catch(()=>{});
        AF.cloudSubscribe((remote)=>{
          setState(remote);
          AF.saveState(remote);
        });
      }
    }).then(res=>{ if(!res.ok) setCloudReason(res.reason); });
  },[]);

  const cur = () => state.profiles[state.activeProfile];

  return {
    state, cur, mutate, persist,
    cloudUser, cloudReason,
    setState
  };
};
