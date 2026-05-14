import { useState } from "react";
import { T } from "./theme";
import CampaignDashboard from "./CampaignDashboard";
import SalesDashboard from "./SalesDashboard";

const CHOICES=[
  {id:"campaign",icon:"📊",title:"Upload GYB Report",
    desc:"Standard report — leads, location funnels, and campaign performance."},
  {id:"sales",icon:"💰",title:"Upload GYB Report with Sales",
    desc:"Sales report — adds Package Amt and Revenue, with revenue by campaign."},
];

export default function App(){
  const[view,setView]=useState(null);

  if(view==="campaign")return <CampaignDashboard onHome={()=>setView(null)}/>;
  if(view==="sales")return <SalesDashboard onHome={()=>setView(null)}/>;

  return(
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",
      boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="home-screen">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,justifyContent:"center"}}>
          <div style={{width:5,height:32,background:T.rose,borderRadius:3,flexShrink:0}}/>
          <h1 style={{margin:0,fontSize:26,fontWeight:700,color:T.rose,letterSpacing:-.5,lineHeight:1.1}}>
            Campaign Analyzer
          </h1>
        </div>
        <p style={{margin:"0 0 30px",fontSize:14,color:T.muted,textAlign:"center"}}>
          Choose a report to upload and analyze
        </p>
        <div className="home-choices">
          {CHOICES.map(c=>(
            <button key={c.id} onClick={()=>setView(c.id)}
              style={{background:T.card,borderRadius:18,padding:"28px 26px",cursor:"pointer",
                border:`2px solid ${T.border}`,textAlign:"left",flex:1,minWidth:0,
                boxShadow:"0 2px 14px rgba(139,26,74,0.07),0 1px 3px rgba(0,0,0,0.04)",
                transition:"border-color .15s, transform .15s",display:"flex",
                flexDirection:"column",gap:8}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.rose;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="none";}}>
              <div style={{fontSize:34}}>{c.icon}</div>
              <div style={{fontSize:16,fontWeight:700,color:T.rose}}>{c.title}</div>
              <div style={{fontSize:12,color:T.muted,lineHeight:1.55}}>{c.desc}</div>
              <div style={{marginTop:6,fontSize:13,fontWeight:600,color:T.rose}}>Open →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
