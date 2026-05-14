import { useState } from "react";
import * as XLSX from "xlsx";

const T = {
  bg:"#FDF2F4", card:"#FFFFFF", rose:"#8B1A4A", roseDk:"#6D1238",
  roseLight:"#FCE7EB", rosePale:"#FDF2F4",
  teal:"#0D7979", indigo:"#3D53A8", slate:"#5E7585",
  border:"#F0D6DC", text:"#1A1A2E", muted:"#7A7A99",
  green:"#065F46", greenBg:"#D1FAE5", greenBd:"#6EE7B7",
  red:"#991B1B", redBg:"#FEE2E2", redBd:"#FCA5A5",
};
const LOCS = {
  banjarahills:{color:T.rose,label:"Banjarahills"},
  kukatpally:{color:T.teal,label:"Kukatpally"},
  kondapur:{color:T.indigo,label:"Kondapur"},
  unrouted:{color:T.slate,label:"Unrouted"},
};
const n=v=>Number(v)||0;
const pct=(a,b,d=1)=>b>0?((a/b)*100).toFixed(d):"0.0";
const K=v=>typeof v==="number"?v.toLocaleString():v;
const cs=(x={})=>({background:T.card,borderRadius:18,boxShadow:"0 2px 14px rgba(139,26,74,0.07),0 1px 3px rgba(0,0,0,0.04)",...x});

function parseFile(buf){
  const wb=XLSX.read(buf,{type:"array"});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
  const title=[raw[0],raw[1]].flat().join(" ");
  const dm=title.match(/(\d{1,2}(?:st|nd|rd|th)?[\s]+\w+[\s]+\d{4})\s*(?:to|–|-)\s*(\d{1,2}(?:st|nd|rd|th)?[\s]+\w+[\s]+\d{4})/i);
  const dateRange=dm?`${dm[1].trim()} to ${dm[2].trim()}`:null;
  const campaigns=[];
  for(let i=4;i<raw.length;i++){
    const r=raw[i];
    const name=String(r[0]??"").trim();
    if(!name||/grand.?total/i.test(name)||/^total$/i.test(name))continue;
    if(n(r[1])===0&&n(r[2])===0)continue;
    campaigns.push({
      name,totalLeads:n(r[1]),
      bh:{leads:n(r[2]),fa:n(r[3]),vis:n(r[4]),join:n(r[5]),unjoin:n(r[6])},
      kk:{leads:n(r[7]),fa:n(r[8]),vis:n(r[9]),join:n(r[10]),unjoin:n(r[11])},
      kd:{leads:n(r[12]),fa:n(r[13]),vis:n(r[14]),join:n(r[15]),unjoin:n(r[16])},
      unrouted:n(r[17]),
    });
  }
  return{campaigns,dateRange};
}

function aggregate(campaigns){
  const loc={bh:{leads:0,fa:0,vis:0,join:0},kk:{leads:0,fa:0,vis:0,join:0},kd:{leads:0,fa:0,vis:0,join:0}};
  let totalLeads=0,totalVis=0,totalJoin=0,totalUnrouted=0;
  for(const c of campaigns){
    totalLeads+=c.totalLeads;totalUnrouted+=c.unrouted;
    for(const k of["bh","kk","kd"]){
      loc[k].leads+=c[k].leads;loc[k].fa+=c[k].fa;
      loc[k].vis+=c[k].vis;loc[k].join+=c[k].join;
      totalVis+=c[k].vis;totalJoin+=c[k].join;
    }
  }
  const bestLoc=["bh","kk","kd"].reduce((b,k)=>
    (loc[k].leads>0?loc[k].join/loc[k].leads:0)>(loc[b].leads>0?loc[b].join/loc[b].leads:0)?k:b,"bh");
  return{totalLeads,totalVis,totalJoin,totalUnrouted,loc,bestLoc};
}

function genInsights(campaigns,agg){
  const ins=[];
  const all=campaigns.map(c=>({...c,joined:c.bh.join+c.kk.join+c.kd.join,
    joinRate:c.totalLeads>0?(c.bh.join+c.kk.join+c.kd.join)/c.totalLeads*100:0}));
  const topVol=[...all].sort((a,b)=>b.totalLeads-a.totalLeads)[0];
  if(topVol)ins.push({icon:"📈",text:`Top by volume: "${topVol.name}" with ${K(topVol.totalLeads)} leads.`});
  const valid=all.filter(c=>c.totalLeads>=5);
  const topConv=[...valid].sort((a,b)=>b.joinRate-a.joinRate)[0];
  if(topConv)ins.push({icon:"🏆",text:`Best conversion: "${topConv.name}" at ${topConv.joinRate.toFixed(1)}% join rate (${topConv.joined} joined / ${topConv.totalLeads} leads).`});
  const lm={bh:"Banjarahills",kk:"Kukatpally",kd:"Kondapur"};
  if(agg.bestLoc&&agg.loc[agg.bestLoc].leads>0){
    const bl=agg.loc[agg.bestLoc];
    ins.push({icon:"📍",text:`Best location: ${lm[agg.bestLoc]} — ${pct(bl.join,bl.leads)}% join rate (${K(bl.join)} joined from ${K(bl.leads)} leads).`});
  }
  const hiUn=all.filter(c=>c.totalLeads>0&&c.unrouted/c.totalLeads>0.5);
  if(hiUn.length)ins.push({icon:"⚠️",text:`Data quality: ${hiUn.length} campaign(s) with >50% unrouted leads — "${hiUn[0].name}"${hiUn.length>1?` +${hiUn.length-1} more`:""}.`});
  const zeroJ=all.filter(c=>c.totalLeads>=10&&c.joined===0);
  if(zeroJ.length)ins.push({icon:"🔴",text:`${zeroJ.length} campaign(s) with ≥10 leads but zero joins — "${zeroJ[0].name}"${zeroJ.length>1?` +${zeroJ.length-1} more`:""}.`});
  return ins;
}

function Funnel({locKey,data,isBest}){
  const isUn=locKey==="unrouted";
  const{color,label}=LOCS[locKey];
  const stages=isUn?[{l:"Leads",v:data.leads}]:[
    {l:"Leads",v:data.leads},{l:"Future App",v:data.fa},
    {l:"Visited",v:data.vis},{l:"Joined",v:data.join},
  ];
  const maxV=stages[0]?.v||1;
  const jr=!isUn&&data.leads>0?pct(data.join,data.leads):null;
  return(
    <div style={{...cs({padding:"22px 14px 18px",flex:1,minWidth:0,position:"relative",
      border:isBest?`2px solid ${color}`:"2px solid transparent",
      boxShadow:isBest?`0 0 0 4px ${color}1A,0 6px 24px rgba(0,0,0,0.1)`:undefined})}}>
      {isBest&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",
        background:color,color:"white",fontSize:10,fontWeight:700,padding:"3px 14px",
        borderRadius:20,whiteSpace:"nowrap",letterSpacing:.5}}>★ TOP PERFORMER</div>}
      <div style={{textAlign:"center",fontSize:11,fontWeight:700,color,textTransform:"uppercase",
        letterSpacing:1.5,marginBottom:16}}>{label}</div>
      {isUn?(
        <div>
          <div style={{background:`${color}10`,border:`2px dashed ${color}50`,borderRadius:12,
            padding:"14px 8px",textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:700,color}}>{K(data.leads)}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>Leads</div>
          </div>
          <div style={{marginTop:12,background:T.redBg,borderRadius:8,padding:"8px 10px",
            fontSize:11,color:T.red,textAlign:"center",lineHeight:1.5}}>
            ⚠ Lead routing issue — no funnel data
          </div>
        </div>
      ):(
        <>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
            {stages.map((s,i)=>{
              const w=maxV>0?Math.max((s.v/maxV)*100,s.v>0?20:0):0;
              return(
                <div key={i} style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:`${w}%`,minWidth:s.v>0?32:0,background:color,
                    opacity:Math.max(1-i*.18,.35),height:30,borderRadius:6,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"white",fontSize:11,fontWeight:700}}>
                    {s.v>0?K(s.v):"–"}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:2}}>{s.l}</div>
                  {i<stages.length-1&&<div style={{color:`${color}40`,fontSize:9,lineHeight:1,margin:"1px 0"}}>▼</div>}
                </div>
              );
            })}
          </div>
          {jr!==null&&(
            <div style={{marginTop:14,background:`${color}0E`,border:`1px solid ${color}30`,
              borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:700,color,lineHeight:1}}>{jr}%</div>
              <div style={{fontSize:11,color:T.muted,fontWeight:500,marginTop:2}}>Join Rate</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CampaignBars({campaigns}){
  const[hov,setHov]=useState(null);
  const sorted=[...campaigns].sort((a,b)=>b.totalLeads-a.totalLeads).map(c=>({
    ...c,joined:c.bh.join+c.kk.join+c.kd.join,
    joinRate:c.totalLeads>0?(c.bh.join+c.kk.join+c.kd.join)/c.totalLeads*100:0,
  }));
  const maxL=Math.max(...sorted.map(d=>d.totalLeads),1);
  const segs=[
    {key:"bh",color:T.rose,label:"Banjarahills",get:c=>c.bh.leads},
    {key:"kk",color:T.teal,label:"Kukatpally",get:c=>c.kk.leads},
    {key:"kd",color:T.indigo,label:"Kondapur",get:c=>c.kd.leads},
    {key:"un",color:T.slate,label:"Unrouted",get:c=>c.unrouted},
  ];
  return(
    <div className="campaign-scroll">
      <div style={{display:"flex",gap:18,marginBottom:16,flexWrap:"wrap"}}>
        {segs.map(s=>(
          <div key={s.key} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
            <div style={{width:11,height:11,borderRadius:3,background:s.color}}/>
            <span style={{color:T.muted}}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,paddingBottom:8,
        borderBottom:`1px solid ${T.border}`}}>
        <div style={{width:175,flexShrink:0,fontSize:11,fontWeight:600,color:T.muted,textAlign:"right",paddingRight:8}}>Campaign</div>
        <div style={{flex:1,fontSize:11,fontWeight:600,color:T.muted}}>Lead distribution</div>
        <div style={{width:210,fontSize:11,fontWeight:600,color:T.muted,flexShrink:0}}>Volume · Joined</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {sorted.map((d,i)=>{
          const rate=d.joinRate;
          const isHi=rate>10,isLo=rate<3&&d.totalLeads>0;
          const bW=(d.totalLeads/maxL)*100;
          const isH=hov===i;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,borderRadius:8,
              background:isH?`${T.rose}06`:"transparent",padding:"2px 0",transition:"background .15s"}}
              onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
              <div style={{width:175,flexShrink:0,fontSize:11,color:T.text,textAlign:"right",
                paddingRight:8,lineHeight:1.3,fontWeight:isH?600:400}}>
                {d.name.length>27?d.name.slice(0,26)+"…":d.name}
              </div>
              <div style={{flex:1,height:26,position:"relative"}}>
                <div style={{display:"flex",height:"100%",width:`${bW}%`,borderRadius:6,overflow:"hidden",
                  boxShadow:isH?"0 3px 10px rgba(0,0,0,0.18)":"none",minWidth:d.totalLeads>0?4:0}}>
                  {segs.map(s=>{const v=s.get(d);return v>0?(
                    <div key={s.key} title={`${s.label}: ${v}`} style={{flex:v,background:s.color,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:10,color:"white",fontWeight:700,overflow:"hidden",whiteSpace:"nowrap",minWidth:0}}>
                      {v/d.totalLeads>0.12?K(v):""}
                    </div>):null;})}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,width:210}}>
                <span style={{fontSize:11,color:T.muted,whiteSpace:"nowrap"}}>
                  <b style={{color:T.text}}>{K(d.totalLeads)}</b>{" · "}
                  <b style={{color:T.text}}>{d.joined}</b>{" joined"}
                </span>
                {d.totalLeads>0&&(isLo||isHi)&&(
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:isLo?T.redBg:T.greenBg,color:isLo?T.red:T.green,
                    border:`1px solid ${isLo?T.redBd:T.greenBd}`,whiteSpace:"nowrap",flexShrink:0}}>
                    {rate.toFixed(1)}% {isLo?"⚠":"✓"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BLM={bh:"banjarahills",kk:"kukatpally",kd:"kondapur"};

export default function App(){
  const[campaigns,setCampaigns]=useState(null);
  const[dateRange,setDateRange]=useState(null);
  const[drag,setDrag]=useState(false);

  const loadFile=file=>{
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{const{campaigns,dateRange}=parseFile(e.target.result);setCampaigns(campaigns);setDateRange(dateRange);};
    r.readAsArrayBuffer(file);
  };

  const agg=campaigns?aggregate(campaigns):null;
  const insights=campaigns&&agg?genInsights(campaigns,agg):[];

  return(
    <div className="app-shell" style={{background:T.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",boxSizing:"border-box"}}>

      {/* Header */}
      <div className="dash-header" style={{marginBottom:30,gap:16}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
            <div style={{width:5,height:30,background:T.rose,borderRadius:3,flexShrink:0}}/>
            <h1 style={{margin:0,fontSize:24,fontWeight:700,color:T.rose,letterSpacing:-.5,lineHeight:1.1}}>
              Campaign Performance Dashboard
            </h1>
          </div>
          <p style={{margin:"0 0 0 15px",fontSize:13,color:T.muted}}>
            {dateRange??"Upload a report to begin"}
          </p>
        </div>
        <div className="header-actions">
          {campaigns&&(
            <button onClick={()=>{setCampaigns(null);setDateRange(null);}}
              style={{background:"white",color:T.rose,padding:"11px 18px",borderRadius:12,fontWeight:600,
                fontSize:13,cursor:"pointer",border:`1.5px solid ${T.rose}`,display:"flex",
                alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
              ↩ New Report
            </button>
          )}
          <label style={{cursor:"pointer"}}>
            <input type="file" accept=".xlsx,.xls" onChange={e=>e.target.files[0]&&loadFile(e.target.files[0])} style={{display:"none"}}/>
            <div style={{background:T.rose,color:"white",padding:"11px 22px",borderRadius:12,fontWeight:600,
              fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:9,
              boxShadow:"0 4px 16px rgba(139,26,74,0.38)",whiteSpace:"nowrap"}}>
              📤 Upload GYB Report
            </div>
          </label>
        </div>
      </div>

      {/* Empty state */}
      {!campaigns&&(
        <div style={{textAlign:"center",padding:"70px 40px",border:`2px dashed ${T.rose}44`,borderRadius:20,
          background:drag?`${T.rose}06`:"rgba(139,26,74,0.02)",transition:"background .2s"}}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);loadFile(e.dataTransfer.files[0]);}}>
          <div style={{fontSize:52,marginBottom:16}}>📊</div>
          <p style={{fontSize:16,fontWeight:600,color:T.rose,margin:"0 0 8px"}}>Upload your GYB Report to view the dashboard</p>
          <p style={{fontSize:13,color:T.muted,margin:0}}>Drag & drop here, or click the Upload button above · Accepts .xlsx or .xls</p>
        </div>
      )}

      {campaigns&&agg&&(
        <>
          {/* KPI Cards */}
          <div className="kpi-grid" style={{marginBottom:22}}>
            {[
              {icon:"👥",label:"Total Leads",value:K(agg.totalLeads),sub:"All campaigns combined",accent:T.rose},
              {icon:"🏢",label:"Total Visited",value:K(agg.totalVis),sub:`${pct(agg.totalVis,agg.totalLeads)}% visit rate`,accent:T.teal},
              {icon:"✅",label:"Total Joined",value:K(agg.totalJoin),sub:`${pct(agg.totalJoin,agg.totalLeads)}% conversion`,accent:T.indigo},
              {icon:"⚠️",label:"Unrouted Leads",value:K(agg.totalUnrouted),sub:`${pct(agg.totalUnrouted,agg.totalLeads)}% of total leads`,accent:"#C0392B"},
            ].map((k,i)=>(
              <div key={i} style={cs({padding:"20px 22px",borderTop:`4px solid ${k.accent}`})}>
                <div style={{fontSize:22,marginBottom:10}}>{k.icon}</div>
                <div style={{fontSize:30,fontWeight:700,color:k.accent,letterSpacing:-1,lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginTop:6}}>{k.label}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:3}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Location Funnels */}
          <div style={cs({padding:"22px 22px 20px",marginBottom:22})}>
            <h2 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:T.rose}}>Location Funnels</h2>
            <p style={{margin:"0 0 18px",fontSize:12,color:T.muted}}>Leads → Future Appointment → Visited → Joined · Best join rate highlighted</p>
            <div className="funnel-row">
              {[
                {locKey:"banjarahills",data:agg.loc.bh},
                {locKey:"kukatpally",data:agg.loc.kk},
                {locKey:"kondapur",data:agg.loc.kd},
                {locKey:"unrouted",data:{leads:agg.totalUnrouted}},
              ].map(({locKey,data})=>(
                <Funnel key={locKey} locKey={locKey} data={data}
                  isBest={locKey!=="unrouted"&&BLM[agg.bestLoc]===locKey&&agg.loc[agg.bestLoc].leads>0}/>
              ))}
            </div>
          </div>

          {/* Campaign Bars */}
          <div style={cs({padding:"22px 22px",marginBottom:22})}>
            <h2 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:T.rose}}>Campaign Performance</h2>
            <p style={{margin:"0 0 18px",fontSize:12,color:T.muted}}>
              Sorted by total leads ·{" "}
              <span style={{color:T.green,fontWeight:600}}>Green ✓</span> = join rate &gt;10% ·{" "}
              <span style={{color:T.red,fontWeight:600}}>Red ⚠</span> = join rate &lt;3%
            </p>
            <CampaignBars campaigns={campaigns}/>
          </div>

          {/* Insights */}
          <div style={{background:T.roseLight,borderRadius:18,padding:22,border:`1px solid #F0C8D4`}}>
            <h2 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:T.rose}}>🔍 Key Insights</h2>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {insights.map((ins,i)=>(
                <div key={i} style={{background:"white",borderRadius:12,padding:"12px 16px",
                  display:"flex",gap:12,alignItems:"flex-start",
                  boxShadow:"0 1px 6px rgba(139,26,74,0.06)",fontSize:13,color:T.text,lineHeight:1.6}}>
                  <span style={{fontSize:18,flexShrink:0,lineHeight:1.3}}>{ins.icon}</span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
