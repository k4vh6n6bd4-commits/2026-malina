import React,{useState} from "react";
import {localDateKey} from "./dateUtils.js";
import {Check,ChevronRight,Droplets,Plus,ShoppingBasket,Utensils} from "lucide-react";

const key=localDateKey;
const daysAgo=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-n);return d};
const week=()=>Array.from({length:7},(_,i)=>daysAgo(6-i));
const dayLabel=d=>new Intl.DateTimeFormat("mn-MN",{weekday:"short"}).format(d).replace(".","");
const mealTypes=[["breakfast","Breakfast","08:00"],["lunch","Lunch","13:00"],["dinner","Dinner","19:00"]];

function streak(habit){
  let current=0,best=0,run=0;
  const entries=Object.entries(habit.log||{}).filter(([,done])=>done).map(([date])=>date).sort();
  for(let i=0;i<entries.length;i++){run=i&&Math.round((new Date(entries[i])-new Date(entries[i-1]))/86400000)===1?run+1:1;best=Math.max(best,run)}
  for(let i=0;i<366;i++){if(habit.log?.[key(daysAgo(i))])current++;else break}
  return {current,best};
}

export function wellnessStats(data,day=key(new Date())){
  const habits=(data.habits||[]).filter(h=>h.active);
  const habitDone=habits.filter(h=>h.log?.[day]).length;
  const meal=data.meals?.[day]||{};
  const mealDone=mealTypes.filter(([type])=>String(meal[type]||"").trim()).length;
  const water=Math.min(8,Number(data.water?.[day]||0));
  const waterPct=Math.round(water/8*100),habitPct=habits.length?Math.round(habitDone/habits.length*100):0,mealPct=Math.round(mealDone/3*100);
  return {habits,habitDone,meal,mealDone,water,waterPct,habitPct,mealPct,score:Math.round((waterPct+habitPct+mealPct)/3)};
}

function MiniBar({pct,tone="bg-[#7b3f55]"}){return <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee3e6]"><div className={`h-full rounded-full transition-all ${tone}`} style={{width:`${Math.min(100,pct)}%`}}/></div>}
function Stat({label,value,pct}){return <div className="rounded-2xl bg-white/75 p-3"><span className="text-xs font-bold text-[#9b7583]">{label}</span><div className="mt-1 text-xl font-black text-[#593642]">{value}</div>{pct!==undefined&&<MiniBar pct={pct}/>}</div>}

export default function Wellness({data,today,setWater,toggleHabit,setMeal,addGrocery,toggleGrocery,deleteGrocery,Card,SectionTitle}){
  const [item,setItem]=useState("");
  const stats=wellnessStats(data,today),dates=week(),remaining=(data.groceries||[]).filter(g=>!g.done).length;
  const habitRuns=stats.habits.map(h=>({habit:h,...streak(h)}));
  const current=Math.max(0,...habitRuns.map(x=>x.current)),best=Math.max(0,...habitRuns.map(x=>x.best));
  const missed=stats.habits.filter(h=>dates.filter(d=>!h.log?.[key(d)]).length>=4);
  return <div className="wellness space-y-5">
    <div className="wellness-hero rounded-[28px] p-6 text-white shadow-xl md:p-8">
      <div className="relative z-10 max-w-xl"><div className="text-xs font-black uppercase tracking-[.2em] text-[#f0d8df]">Daily care, all together</div><h1 className="serif mt-2 text-3xl font-bold md:text-4xl">Wellness Hub</h1><p className="mt-2 text-sm leading-6 text-[#f7e9ed]">Ус, зуршил, хоол болон хүнсний жагсаалтаа нэг зөөлөн хэмнэлээр удирдаарай.</p></div>
      <div className="relative z-10 mt-6 flex items-center gap-5"><div className="wellness-score" style={{"--score":`${stats.score*3.6}deg`}}><div><b>{stats.score}</b><span>/100</span></div></div><div><div className="text-sm font-bold">Today's Wellness Score</div><p className="mt-1 max-w-xs text-xs text-[#f0dce2]">Water, habits, meals-ийн өнөөдрийн completion. Эрүүл мэндийн онош, зөвлөгөө биш.</p></div></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Water completion" value={`${stats.waterPct}%`} pct={stats.waterPct}/><Stat label="Habit completion" value={`${stats.habitPct}%`} pct={stats.habitPct}/><Stat label="Meal completion" value={`${stats.mealPct}%`} pct={stats.mealPct}/></div>

    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <Card><SectionTitle icon={Droplets} title="Today's water" sub={`${stats.water} of 8 cups · ${stats.waterPct}%`}/><div className="flex items-end justify-between"><div><div className="text-5xl font-black text-[#627f91]">{stats.water}<span className="text-lg text-[#9aadb7]"> / 8</span></div><div className="mt-1 text-xs text-[#8e717b]">Daily target · approximately 2L</div></div><button className="btn btn-primary flex items-center gap-2" disabled={stats.water>=8} onClick={()=>setWater(stats.water+1)}><Plus size={17}/> 1 cup</button></div><MiniBar pct={stats.waterPct} tone="bg-[#7899aa]"/><div className="mt-5 grid grid-cols-7 gap-1">{dates.map(d=>{const cups=Math.min(8,Number(data.water?.[key(d)]||0));return <div key={key(d)} className="text-center"><div className="flex h-20 items-end justify-center rounded-xl bg-[#f3f0ef] p-1"><div className="w-full rounded-lg bg-[#a9c3cf]" style={{height:`${Math.max(5,cups/8*100)}%`}} title={`${cups}/8`}/></div><b className="mt-1 block text-[10px] text-[#90727d]">{dayLabel(d)}</b></div>})}</div></Card>

      <Card><SectionTitle icon={Check} title="Today's habits" sub={`${stats.habitDone}/${stats.habits.length} complete · ${stats.habitPct}%`}/><div className="grid grid-cols-2 gap-2"><Stat label="Current streak" value={`${current} days`}/><Stat label="Best streak" value={`${best} days`}/></div><div className="mt-4 space-y-2">{stats.habits.map(h=>{const done=h.log?.[today];return <label key={h.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${done?"border-[#d7e3d9] bg-[#f0f5f1]":"border-[#eadde1] bg-[#fffafa]"}`}><input className="check" type="checkbox" checked={!!done} onChange={()=>toggleHabit(h.id)}/><span className="flex-1 text-sm font-bold">{h.name}</span><span className="text-xs text-[#9a7884]">{streak(h).current} day</span></label>})}</div>{missed.length>0&&<div className="mt-4 rounded-2xl bg-[#f8e9e7] p-3 text-sm text-[#844d53]"><b>Needs a gentler plan</b><p className="mt-1 text-xs">{missed.map(h=>h.name).join(" · ")} — сүүлийн 7 хоногт тогтмол алгасагдсан.</p></div>}<div className="mt-4 grid grid-cols-7 gap-1">{dates.map(d=>{const done=stats.habits.filter(h=>h.log?.[key(d)]).length,pct=stats.habits.length?done/stats.habits.length*100:0;return <div key={key(d)} className="text-center"><div className="rounded-xl bg-[#f6eff1] px-1 py-2 text-xs font-black text-[#7b3f55]">{Math.round(pct)}%</div><b className="mt-1 block text-[10px] text-[#90727d]">{dayLabel(d)}</b></div>})}</div></Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card><SectionTitle icon={Utensils} title="Today's meals" sub={`${stats.mealDone}/3 planned · ${stats.mealPct}%`}/><div className="space-y-3">{mealTypes.map(([type,label,time])=><label key={type} className="block rounded-2xl bg-[#fbf7f7] p-3"><div className="flex items-center justify-between text-sm"><b>{label}</b><span className="text-xs font-bold text-[#a17c89]">{time}</span></div><input className="field mt-2" value={stats.meal[type]||""} onChange={e=>setMeal(today,type,e.target.value)} placeholder={`${label} төлөвлөх...`}/></label>)}</div><MiniBar pct={stats.mealPct}/></Card>
      <Card><SectionTitle icon={ShoppingBasket} title="Grocery list" sub={`${remaining} remaining · ${(data.groceries||[]).length-remaining} checked`}/><form className="flex gap-2" onSubmit={e=>{e.preventDefault();addGrocery(item);setItem("")}}><input className="field" value={item} onChange={e=>setItem(e.target.value)} placeholder="Quick add item..."/><button className="btn btn-primary" aria-label="Add grocery"><Plus/></button></form><div className="mt-4 space-y-2">{(data.groceries||[]).map(g=><div key={g.id} className="flex items-center gap-3 rounded-2xl bg-[#fbf7f7] p-3"><input className="check" type="checkbox" checked={g.done} onChange={()=>toggleGrocery(g.id)}/><span className={`min-w-0 flex-1 text-sm font-semibold ${g.done?"text-[#a88e97] line-through":""}`}>{g.text}</span><button onClick={()=>deleteGrocery(g.id)} aria-label={`Delete ${g.text}`}><ChevronRight size={17} className="rotate-90 text-[#b18b98]"/></button></div>)}{!(data.groceries||[]).length&&<div className="rounded-2xl bg-[#faf5f6] p-5 text-center text-sm text-[#9b7d87]">Grocery list хоосон байна.</div>}</div></Card>
    </div>
  </div>
}
