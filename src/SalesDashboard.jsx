import { useState } from "react";
import * as XLSX from "xlsx";
import { T, n, pct, K, cs } from "./theme";

const money=v=>"₹"+K(v);

function parseSalesFile(buf){
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
      bh:{leads:n(r[2]),fa:n(r[3]),vis:n(r[4]),join:n(r[5]),unjoin:n(r[6]),pkgAmt:n(r[7]),revenue:n(r[8])},
      kk:{leads:n(r[9]),fa:n(r[10]),vis:n(r[11]),join:n(r[12]),unjoin:n(r[13]),pkgAmt:n(r[14]),revenue:n(r[15])},
      kd:{leads:n(r[16]),fa:n(r[17]),vis:n(r[18]),join:n(r[19]),unjoin:n(r[20]),pkgAmt:n(r[21]),revenue:n(r[22])},
      unrouted:n(r[23]),
    });
  }
  return{campaigns,dateRange};
}

function deriveRow(c){
  const joined=c.bh.join+c.kk.join+c.kd.join;
  const revenue=c.bh.revenue+c.kk.revenue+c.kd.revenue;
  const pkgAmt=c.bh.pkgAmt+c.kk.pkgAmt+c.kd.pkgAmt;
  return{...c,joined,revenue,pkgAmt,
    joinRate:c.totalLeads>0?joined/c.totalLeads*100:0,
    collectionRate:pkgAmt>0?revenue/pkgAmt*100:0};
}

function aggregateSales(campaigns){
  let totalLeads=0,totalJoin=0,totalPkgAmt=0,totalRevenue=0;
  for(const c of campaigns){
    totalLeads+=c.totalLeads;
    for(const k of["bh","kk","kd"]){
      totalJoin+=c[k].join;totalPkgAmt+=c[k].pkgAmt;totalRevenue+=c[k].revenue;
    }
  }
  return{totalLeads,totalJoin,totalPkgAmt,totalRevenue};
}

function genSalesInsights(rows){
  const ins=[];
  const byRev=[...rows].sort((a,b)=>b.revenue-a.revenue)[0];
  if(byRev&&byRev.revenue>0)ins.push({icon:"💰",text:`Top earner: "${byRev.name}" — ${money(byRev.revenue)} revenue collected from ${money(byRev.pkgAmt)} in packages.`});
  const withPkg=rows.filter(r=>r.pkgAmt>0);
  const bestColl=[...withPkg].sort((a,b)=>b.collectionRate-a.collectionRate)[0];
  if(bestColl)ins.push({icon:"🏆",text:`Best collection rate: "${bestColl.name}" at ${bestColl.collectionRate.toFixed(1)}% (${money(bestColl.revenue)} of ${money(bestColl.pkgAmt)}).`});
  const joinNoRev=rows.filter(r=>r.joined>0&&r.revenue===0);
  if(joinNoRev.length)ins.push({icon:"⚠️",text:`${joinNoRev.length} campaign(s) have joins but zero revenue — "${joinNoRev[0].name}"${joinNoRev.length>1?` +${joinNoRev.length-1} more`:""}.`});
  const totalRev=rows.reduce((s,r)=>s+r.revenue,0);
  const totalPkg=rows.reduce((s,r)=>s+r.pkgAmt,0);
  if(totalPkg>0)ins.push({icon:"📊",text:`Overall collection rate: ${(totalRev/totalPkg*100).toFixed(1)}% — ${money(totalRev)} collected of ${money(totalPkg)} booked.`});
  return ins;
}

const RANKBY=[
  {key:"revenue",label:"Revenue",get:r=>r.revenue,fmt:money},
  {key:"pkgAmt",label:"Package Amt",get:r=>r.pkgAmt,fmt:money},
  {key:"totalLeads",label:"Total Leads",get:r=>r.totalLeads,fmt:K},
  {key:"joined",label:"Joined",get:r=>r.joined,fmt:K},
  {key:"collectionRate",label:"Collection Rate",get:r=>r.collectionRate,fmt:v=>v.toFixed(1)+"%"},
  {key:"joinRate",label:"Join Rate",get:r=>r.joinRate,fmt:v=>v.toFixed(1)+"%"},
];
const FILTERS=[
  {key:"all",label:"All campaigns"},
  {key:"revenue",label:"With revenue only"},
  {key:"joins",label:"With joins only"},
];

function selStyle(){
  return{fontSize:13,fontWeight:600,color:T.text,padding:"8px 12px",borderRadius:10,
    border:`1.5px solid ${T.border}`,background:"white",cursor:"pointer",fontFamily:"inherit"};
}

export default function SalesDashboard({onHome}){
  const[campaigns,setCampaigns]=useState(null);
  const[dateRange,setDateRange]=useState(null);
  const[drag,setDrag]=useState(false);
  const[rankBy,setRankBy]=useState("revenue");
  const[filter,setFilter]=useState("all");
  const[hov,setHov]=useState(null);

  const loadFile=file=>{
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{const{campaigns,dateRange}=parseSalesFile(e.target.result);setCampaigns(campaigns);setDateRange(dateRange);};
    r.readAsArrayBuffer(file);
  };

  const agg=campaigns?aggregateSales(campaigns):null;
  const rows=campaigns?campaigns.map(deriveRow):[];
  const insights=campaigns?genSalesInsights(rows):[];

  let shown=rows;
  if(filter==="revenue")shown=rows.filter(r=>r.revenue>0);
  else if(filter==="joins")shown=rows.filter(r=>r.joined>0);
  const rb=RANKBY.find(x=>x.key===rankBy);
  shown=[...shown].sort((a,b)=>rb.get(b)-rb.get(a));
  const maxV=Math.max(...shown.map(r=>rb.get(r)),1);

  return(
    <div className="app-shell" style={{background:T.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",boxSizing:"border-box"}}>

      {/* Header */}
      <div className="dash-header" style={{marginBottom:30,gap:16}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
            <div style={{width:5,height:30,background:T.rose,borderRadius:3,flexShrink:0}}/>
            <h1 style={{margin:0,fontSize:24,fontWeight:700,color:T.rose,letterSpacing:-.5,lineHeight:1.1}}>
              Sales Performance Dashboard
            </h1>
          </div>
          <p style={{margin:"0 0 0 15px",fontSize:13,color:T.muted}}>
            {dateRange??"Upload a sales report to begin"}
          </p>
        </div>
        <div className="header-actions">
          <button onClick={onHome}
            style={{background:"white",color:T.muted,padding:"11px 16px",borderRadius:12,fontWeight:600,
              fontSize:13,cursor:"pointer",border:`1.5px solid ${T.border}`,display:"flex",
              alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            ← Home
          </button>
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
              📤 Upload Sales Report
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
          <div style={{fontSize:52,marginBottom:16}}>💰</div>
          <p style={{fontSize:16,fontWeight:600,color:T.rose,margin:"0 0 8px"}}>Upload your GYB Report with Sales to view the dashboard</p>
          <p style={{fontSize:13,color:T.muted,margin:0}}>Drag & drop here, or click the Upload button above · Accepts .xlsx or .xls</p>
        </div>
      )}

      {campaigns&&agg&&(
        <>
          {/* KPI Cards */}
          <div className="kpi-grid" style={{marginBottom:22}}>
            {[
              {icon:"👥",label:"Total Leads",value:K(agg.totalLeads),sub:"All campaigns combined",accent:T.rose},
              {icon:"✅",label:"Total Joined",value:K(agg.totalJoin),sub:`${pct(agg.totalJoin,agg.totalLeads)}% conversion`,accent:T.indigo},
              {icon:"📦",label:"Total Package Amt",value:money(agg.totalPkgAmt),sub:"Total treatment value booked",accent:T.teal},
              {icon:"💰",label:"Total Revenue",value:money(agg.totalRevenue),sub:`${pct(agg.totalRevenue,agg.totalPkgAmt)}% collected (first payments)`,accent:T.green},
            ].map((k,i)=>(
              <div key={i} style={cs({padding:"20px 22px",borderTop:`4px solid ${k.accent}`})}>
                <div style={{fontSize:22,marginBottom:10}}>{k.icon}</div>
                <div style={{fontSize:30,fontWeight:700,color:k.accent,letterSpacing:-1,lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginTop:6}}>{k.label}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:3}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Revenue by Campaign */}
          <div style={cs({padding:"22px 22px",marginBottom:22})}>
            <h2 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:T.rose}}>Revenue by Campaign</h2>
            <p style={{margin:"0 0 16px",fontSize:12,color:T.muted}}>
              Choose how to rank and filter campaigns · Package Amt = total treatment cost · Revenue = first payment collected
            </p>

            {/* Control bar */}
            <div className="control-bar" style={{marginBottom:18}}>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,color:T.muted}}>
                Rank by
                <select value={rankBy} onChange={e=>setRankBy(e.target.value)} style={selStyle()}>
                  {RANKBY.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,color:T.muted}}>
                Show
                <select value={filter} onChange={e=>setFilter(e.target.value)} style={selStyle()}>
                  {FILTERS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </label>
              <span style={{fontSize:12,color:T.muted,alignSelf:"center"}}>
                {shown.length} campaign{shown.length===1?"":"s"}
              </span>
            </div>

            <div className="campaign-scroll">
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,paddingBottom:8,
                borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:175,flexShrink:0,fontSize:11,fontWeight:600,color:T.muted,textAlign:"right",paddingRight:8}}>Campaign</div>
                <div style={{flex:1,fontSize:11,fontWeight:600,color:T.muted}}>{rb.label}</div>
                <div style={{width:250,fontSize:11,fontWeight:600,color:T.muted,flexShrink:0}}>Package Amt · Revenue</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {shown.map((d,i)=>{
                  const v=rb.get(d);
                  const bW=Math.max((v/maxV)*100,v>0?3:0);
                  const isH=hov===i;
                  const cr=d.collectionRate;
                  const crGood=cr>=50,crBad=d.pkgAmt>0&&cr<25;
                  const tip=`${d.name}\nBanjarahills: ${money(d.bh.revenue)} / ${money(d.bh.pkgAmt)}\nKukatpally: ${money(d.kk.revenue)} / ${money(d.kk.pkgAmt)}\nKondapur: ${money(d.kd.revenue)} / ${money(d.kd.pkgAmt)}`;
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,borderRadius:8,
                      background:isH?`${T.rose}06`:"transparent",padding:"2px 0",transition:"background .15s"}}
                      onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
                      <div style={{width:175,flexShrink:0,fontSize:11,color:T.text,textAlign:"right",
                        paddingRight:8,lineHeight:1.3,fontWeight:isH?600:400}}>
                        {d.name.length>27?d.name.slice(0,26)+"…":d.name}
                      </div>
                      <div style={{flex:1,height:26,position:"relative"}} title={tip}>
                        <div style={{display:"flex",alignItems:"center",height:"100%",width:`${bW}%`,
                          background:T.rose,borderRadius:6,minWidth:v>0?4:0,paddingLeft:8,
                          boxShadow:isH?"0 3px 10px rgba(0,0,0,0.18)":"none",
                          color:"white",fontSize:10,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden"}}>
                          {v>0?rb.fmt(v):""}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,width:250}}>
                        <span style={{fontSize:11,color:T.muted,whiteSpace:"nowrap"}}>
                          <b style={{color:T.text}}>{money(d.pkgAmt)}</b>{" · "}
                          <b style={{color:T.text}}>{money(d.revenue)}</b>
                        </span>
                        {d.pkgAmt>0&&(
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                            background:crGood?T.greenBg:crBad?T.redBg:T.roseLight,
                            color:crGood?T.green:crBad?T.red:T.rose,
                            border:`1px solid ${crGood?T.greenBd:crBad?T.redBd:"#F0C8D4"}`,
                            whiteSpace:"nowrap",flexShrink:0}}>
                            {cr.toFixed(0)}% collected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {shown.length===0&&(
                  <div style={{fontSize:13,color:T.muted,padding:"20px 0",textAlign:"center"}}>
                    No campaigns match this filter.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div style={{background:T.roseLight,borderRadius:18,padding:22,border:`1px solid #F0C8D4`}}>
            <h2 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:T.rose}}>🔍 Revenue Insights</h2>
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
