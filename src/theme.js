export const T = {
  bg:"#FDF2F4", card:"#FFFFFF", rose:"#8B1A4A", roseDk:"#6D1238",
  roseLight:"#FCE7EB", rosePale:"#FDF2F4",
  teal:"#0D7979", indigo:"#3D53A8", slate:"#5E7585",
  border:"#F0D6DC", text:"#1A1A2E", muted:"#7A7A99",
  green:"#065F46", greenBg:"#D1FAE5", greenBd:"#6EE7B7",
  red:"#991B1B", redBg:"#FEE2E2", redBd:"#FCA5A5",
};
export const LOCS = {
  banjarahills:{color:T.rose,label:"Banjarahills"},
  kukatpally:{color:T.teal,label:"Kukatpally"},
  kondapur:{color:T.indigo,label:"Kondapur"},
  unrouted:{color:T.slate,label:"Unrouted"},
};
export const n=v=>Number(v)||0;
export const pct=(a,b,d=1)=>b>0?((a/b)*100).toFixed(d):"0.0";
export const K=v=>typeof v==="number"?v.toLocaleString():v;
export const cs=(x={})=>({background:T.card,borderRadius:18,boxShadow:"0 2px 14px rgba(139,26,74,0.07),0 1px 3px rgba(0,0,0,0.04)",...x});
export const BLM={bh:"banjarahills",kk:"kukatpally",kd:"kondapur"};
