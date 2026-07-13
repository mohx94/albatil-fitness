// Nicer, Hevy/Strong-style charts: smooth bezier line, gradient fill, highlighted last point.
window.AF = window.AF || {};

function catmullRomToBezier(points){
  if(points.length<2) return '';
  let d = `M${points[0][0]},${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){
    const p0 = points[i-1]||points[i];
    const p1 = points[i];
    const p2 = points[i+1];
    const p3 = points[i+2]||p2;
    const cp1x = p1[0] + (p2[0]-p0[0])/6;
    const cp1y = p1[1] + (p2[1]-p0[1])/6;
    const cp2x = p2[0] - (p3[0]-p1[0])/6;
    const cp2y = p2[1] - (p3[1]-p1[1])/6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

AF.LineChart = function({points, unit, color, gradId}){
  if(!points || points.length<2){
    return React.createElement('div',{style:{color:'var(--muted)',fontSize:13,textAlign:'center',padding:'30px 0'}},'تحتاج قياسين على الأقل عشان يظهر الرسم البياني');
  }
  const w=320,h=150,padX=12,padY=20;
  const ys=points.map(p=>p.y);
  let min=Math.min(...ys), max=Math.max(...ys);
  if(min===max){ min-=1; max+=1; }
  const stepX=(w-padX*2)/(points.length-1);
  const coords = points.map((p,i)=>[padX+i*stepX, h-padY-((p.y-min)/(max-min))*(h-padY*2)]);
  const linePath = catmullRomToBezier(coords);
  const areaPath = linePath + ` L${coords[coords.length-1][0].toFixed(1)},${h-padY} L${coords[0][0].toFixed(1)},${h-padY} Z`;
  const last = coords[coords.length-1];
  const gid = gradId || ('grad'+Math.random().toString(36).slice(2));
  return React.createElement('svg',{viewBox:`0 0 ${w} ${h+22}`,style:{width:'100%',height:'auto',display:'block'}},
    React.createElement('defs',null,
      React.createElement('linearGradient',{id:gid,x1:'0',y1:'0',x2:'0',y2:'1'},
        React.createElement('stop',{offset:'0%',stopColor:color,stopOpacity:0.35}),
        React.createElement('stop',{offset:'100%',stopColor:color,stopOpacity:0})
      )
    ),
    React.createElement('path',{d:areaPath,fill:`url(#${gid})`,stroke:'none'}),
    React.createElement('path',{d:linePath,fill:'none',stroke:color,strokeWidth:3,strokeLinecap:'round',strokeLinejoin:'round'}),
    coords.slice(0,-1).map((c,i)=>React.createElement('circle',{key:i,cx:c[0],cy:c[1],r:2.5,fill:color,opacity:0.5})),
    React.createElement('circle',{cx:last[0],cy:last[1],r:5,fill:color}),
    React.createElement('circle',{cx:last[0],cy:last[1],r:9,fill:color,opacity:0.2}),
    React.createElement('text',{x:padX,y:h+16,fontSize:9,fill:'var(--muted)'},points[0].label),
    React.createElement('text',{x:w-padX,y:h+16,fontSize:9,fill:'var(--muted)',textAnchor:'end'},points[points.length-1].label),
    React.createElement('text',{x:last[0],y:last[1]-14,fontSize:12,fill:'var(--text)',textAnchor:'end',fontWeight:800},
      `${points[points.length-1].y}${unit||''}`)
  );
};

AF.BarChart = function({entries, color}){
  color = color || 'var(--accent2)';
  if(!entries || !entries.length){
    return React.createElement('div',{style:{color:'var(--muted)',fontSize:13,textAlign:'center',padding:'20px 0'}},'لا توجد بيانات كافية بعد');
  }
  const max = Math.max(1, ...entries.map(e=>e[1]));
  return React.createElement('div',{style:{display:'grid',gap:10,marginTop:6}},
    entries.map(([label,val],i)=>React.createElement('div',{key:i,style:{display:'grid',gridTemplateColumns:'78px 1fr auto',gap:10,alignItems:'center'}},
      React.createElement('span',{style:{fontSize:12,color:'var(--muted)'}},label),
      React.createElement('div',{style:{height:10,borderRadius:99,background:'var(--surface2)',overflow:'hidden'}},
        React.createElement('div',{style:{height:'100%',borderRadius:99,width:Math.round(val/max*100)+'%',background:`linear-gradient(90deg, ${color}, var(--violet))`,transition:'width .4s ease'}})
      ),
      React.createElement('b',{style:{fontSize:12,whiteSpace:'nowrap'}},Math.round(val))
    ))
  );
};

AF.RingChart = function({percent, size, label, sub, color}){
  size = size || 88; color = color || 'var(--accent)';
  return React.createElement('div',{style:{
    '--p':percent, width:size, height:size, borderRadius:'50%', display:'grid', placeItems:'center',
    background:`conic-gradient(${color} calc(var(--p)*1%), #1c2740 0)`, position:'relative', flex:'0 0 auto'
  }},
    React.createElement('div',{style:{position:'absolute',inset:size*0.09,borderRadius:'50%',background:'#0b111c'}}),
    React.createElement('div',{style:{position:'relative',zIndex:1,textAlign:'center'}},
      React.createElement('span',{style:{display:'block',fontWeight:900,fontSize:size>90?18:15}},label),
      sub?React.createElement('small',{style:{display:'block',color:'var(--muted)',fontSize:10}},sub):null
    )
  );
};
