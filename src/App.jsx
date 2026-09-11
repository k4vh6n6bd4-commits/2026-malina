import React, { useEffect, useMemo, useRef, useState } from "react";
import { getUser, handleAuthCallback, login as identityLogin, logout as identityLogout, signup as identitySignup } from "@netlify/identity";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList,
  Droplets, Edit3, Home, ListChecks, Menu, Plus, RotateCcw, Settings, Target,
  Trash2, Utensils, WalletCards, X, Download, Upload, Sparkles, Bot, HeartPulse
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import Education from "./Education";
import Assistant from "./Assistant";
import SmartPlanner from "./SmartPlanner";
import Wellness from "./Wellness";
import MyLife from "./MyLife";
import {financeStats,goalStats} from "./smartFinance";
import {localDateKey} from "./dateUtils.js";

const KEY="malina-planner-v1";

const defaultData={
  tasks:[],
  habits:[
    {id:"h1",name:"Ус 2L",active:true,log:{}},
    {id:"h2",name:"20 мин унших",active:true,log:{}},
    {id:"h3",name:"Workout / алхалт",active:true,log:{}},
    {id:"h4",name:"Арьс арчилгаа",active:true,log:{}}
  ],
  finance:{income:0,savings:0,expenses:[]},
  water:{},
  meals:{},
  groceries:[],
  goals:[],
  events:[],
  aiActions:[],
  education:{targetGpa:3.8,futureCredits:15,semesters:[]}
};

function load(){
  try{return {...defaultData,...JSON.parse(localStorage.getItem(KEY)||"{}")};}
  catch{return defaultData}
}
function uid(){return crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}
function todayKey(d=new Date()){return localDateKey(d)}
function money(n){return new Intl.NumberFormat("mn-MN").format(Number(n)||0)+" ₮"}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function daysInMonth(d){return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
function monthDays(d){return Array.from({length:daysInMonth(d)},(_,i)=>new Date(d.getFullYear(),d.getMonth(),i+1))}
function iso(d){return todayKey(d)}
function usePersisted(){
  const [data,setData]=useState(load);
  useEffect(()=>localStorage.setItem(KEY,JSON.stringify(data)),[data]);
  return [data,setData];
}

const nav=[
  ["dashboard","My Life",Home],
  ["daily","Today's Plan",CalendarDays],
  ["wellness","Wellness",HeartPulse],
  ["tasks","Tasks",ListChecks],
  ["habits","Habits",Check],
  ["finance","Money",WalletCards],
  ["water","Water",Droplets],
  ["meals","Meals",Utensils],
  ["calendar","Calendar",CalendarDays],
  ["goals","Goals",Target],
  ["education","Education",Sparkles],
  ["assistant","AI Assistant",Bot],
  ["settings","Settings",Settings]
];

function Card({children,className=""}){return <section className={`card p-4 md:p-5 ${className}`}>{children}</section>}
function SectionTitle({icon:Icon,title,sub}){return <div className="mb-4 flex items-start gap-3"><div className="rounded-2xl bg-[#f5e8ed] p-2 text-[#7b3f55]"><Icon size={20}/></div><div><h2 className="text-lg font-extrabold text-[#4a313b]">{title}</h2>{sub&&<p className="text-sm text-[#94727e]">{sub}</p>}</div></div>}
function Empty({text}){return <div className="rounded-2xl bg-[#faf5f6] p-5 text-center text-sm text-[#9b7d87]">{text}</div>}

function App(){
  const [data,setData]=usePersisted();
  const [page,setPage]=useState("dashboard");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [date,setDate]=useState(new Date());
  const [toast,setToast]=useState("");
  const [assistantPrompt,setAssistantPrompt]=useState("");
  const [authUser,setAuthUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [syncReady,setSyncReady]=useState(false);
  const [syncStatus,setSyncStatus]=useState("Офлайн");
  const [syncConflict,setSyncConflict]=useState(null);
  const syncBaseRef=useRef(localStorage.getItem("malina-planner-cloud-updated-at")||"");
  const syncTimerRef=useRef(null);
  const syncingRef=useRef(false);

  const hasMeaningfulData=useMemo(()=>{
    const d=data||{};
    return (d.tasks||[]).length>0 || (d.habits||[]).some(h=>Object.keys(h.log||{}).length>0) ||
      (d.finance?.expenses||[]).length>0 || Object.keys(d.finance?.monthlyIncome||{}).length>0 ||
      Object.keys(d.finance?.monthlySavings||{}).length>0 || Object.keys(d.water||{}).length>0 ||
      Object.keys(d.meals||{}).length>0 || (d.groceries||[]).length>0 || (d.goals||[]).length>0 ||
      (d.events||[]).length>0 || (d.aiActions||[]).length>0 ||
      (d.education?.semesters||[]).some(s=>(s.courses||[]).length>0);
  },[data]);

  function dataCounts(d){
    const x=d||{};
    return {
      tasks:(x.tasks||[]).length,
      events:(x.events||[]).length,
      goals:(x.goals||[]).length,
      habits:(x.habits||[]).length,
      expenses:(x.finance?.expenses||[]).length,
      courses:(x.education?.semesters||[]).reduce((n,s)=>n+(s.courses||[]).length,0)
    };
  }
  function countsLabel(d){
    const c=dataCounts(d);
    return `${c.tasks} task · ${c.events} event · ${c.goals} goal · ${c.courses} course`;
  }

  async function fetchCloud(){
    const response=await fetch('/api/planner-sync',{credentials:'same-origin',cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Cloud sync амжилтгүй боллоо');
    return result;
  }

  async function syncToCloud(nextData=data,confirmMigration=false){
    if(!authUser||syncingRef.current)return false;
    syncingRef.current=true;
    setSyncStatus('Cloud-д хадгалж байна…');
    try{
      const response=await fetch('/api/planner-sync',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({data:nextData,baseUpdatedAt:syncBaseRef.current||null,confirmMigration})});
      const result=await response.json().catch(()=>({}));
      if(response.status===409){
        const latest=await fetchCloud().catch(()=>null);
        if(latest?.data){setSyncConflict(latest.data);syncBaseRef.current=latest.updatedAt||syncBaseRef.current;setSyncStatus('2 төхөөрөмжийн мэдээлэл зөрж байна');}
        else setSyncStatus('Синк зөрчилтэй');
        return false;
      }
      if(!response.ok)throw Error(result.error||'Cloud sync амжилтгүй боллоо');
      syncBaseRef.current=result.updatedAt||'';
      localStorage.setItem('malina-planner-cloud-updated-at',syncBaseRef.current);
      setSyncConflict(null);
      setSyncStatus(`Cloud-д хадгаллаа · ${countsLabel(nextData)}`);
      return true;
    }catch(error){
      setSyncStatus(error?.message||'Синк түр ажиллахгүй байна');
      return false;
    }finally{syncingRef.current=false}
  }

  async function pullFromCloud(force=false){
    if(!authUser||syncingRef.current)return false;
    syncingRef.current=true;
    setSyncStatus('Cloud-оос татаж байна…');
    try{
      const result=await fetchCloud();
      if(!result.data){
        setSyncStatus('Cloud одоогоор хоосон байна');
        setSyncConflict(null);
        return false;
      }
      if(hasMeaningfulData&&!force){
        setSyncConflict(result.data);
        syncBaseRef.current=result.updatedAt||'';
        setSyncStatus('2 төхөөрөмжийн мэдээлэл зөрж байна');
        return false;
      }
      setData({...defaultData,...result.data});
      syncBaseRef.current=result.updatedAt||'';
      localStorage.setItem('malina-planner-cloud-updated-at',syncBaseRef.current);
      setSyncConflict(null);
      setSyncReady(true);
      setSyncStatus(`Cloud-оос сэргээгдлээ · ${countsLabel(result.data)}`);
      return true;
    }catch(error){setSyncStatus(error?.message||'Cloud-оос татаж чадсангүй');return false}
    finally{syncingRef.current=false}
  }

 useEffect(()=>{
  (async()=>{
    try{
      await handleAuthCallback();
      const user=await getUser();
      setAuthUser(user?{id:user.id,email:user.email}:null);
    }catch{
      setAuthUser(null);
    }finally{
      setAuthLoading(false);
    }
  })();
},[]);

  useEffect(()=>{
    if(!authUser){setSyncReady(false);setSyncStatus('Офлайн');return;}
    let active=true;
    setSyncReady(false);setSyncStatus('Cloud шалгаж байна…');
    fetchCloud()
      .then(async result=>{
        if(!active)return;
        if(result.data){
          syncBaseRef.current=result.updatedAt||'';
          if(hasMeaningfulData){
            setSyncConflict(result.data);
            setSyncStatus(`Сонголт хэрэгтэй · Cloud: ${countsLabel(result.data)}`);
            return;
          }
          setData(current=>({...defaultData,...result.data}));
          if(result.updatedAt)localStorage.setItem('malina-planner-cloud-updated-at',result.updatedAt);
          setSyncReady(true);
          setSyncStatus(`Cloud-оос сэргээгдлээ · ${countsLabel(result.data)}`);
        }else{
          setSyncReady(true);
          setSyncStatus(hasMeaningfulData?'Cloud хоосон · Энэ төхөөрөмжийн мэдээллийг Cloud-д хадгална уу':'Cloud хоосон · мэдээлэл нэмэхэд автоматаар хадгална');
        }
      })
      .catch(error=>{
        if(active){setSyncReady(true);setSyncStatus(error?.message||'Cloud холболт амжилтгүй — төхөөрөмж дээр хадгална')}
      });
    return()=>{active=false};
  },[authUser]);

  useEffect(()=>{
    if(!authUser||!syncReady||syncConflict||!hasMeaningfulData)return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current=setTimeout(()=>syncToCloud(data),1200);
    return()=>clearTimeout(syncTimerRef.current);
  },[data,authUser,syncReady,syncConflict]);

  async function loginUser(email,password){
    const user=await identityLogin(email,password);
    setAuthUser(user?{id:user.id,email:user.email}:null);
    setSyncStatus('Нэвтэрлээ');
    return user;
  }
  async function signupUser(email,password){
    await identitySignup(email,password);
    const user=await identityLogin(email,password);
    setAuthUser(user?{id:user.id,email:user.email}:null);
    setSyncStatus('Account үүслээ, нэвтэрлээ');
    return user;
  }
  async function logoutUser(){
    try{await identityLogout()}finally{setAuthUser(null);setSyncReady(false);setSyncConflict(null);setSyncStatus('Офлайн')};
  }
  async function useLocalAndUpload(){
    const ok=await syncToCloud(data,true);
    if(ok)setSyncReady(true);
  }
  async function useCloudData(){
    await pullFromCloud(true);
  }

  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2200);return()=>clearTimeout(t)}},[toast]);
  const notify=m=>setToast(m);

  const today=todayKey();
  const todayTasks=data.tasks.filter(x=>(x.date||today)===today);
  const done=todayTasks.filter(x=>x.done).length;
  const progress=todayTasks.length?Math.round(done/todayTasks.length*100):0;
  const water=data.water[today]||0;

  function patch(p){setData(d=>({...d,...p}))}
  function addTask(text,date=today){
    if(!text.trim())return;
    patch({tasks:[...data.tasks,{id:uid(),text:text.trim(),date,done:false}]});
  }
  function toggleTask(id){patch({tasks:data.tasks.map(x=>x.id===id?{...x,done:!x.done}:x)})}
  function deleteTask(id){patch({tasks:data.tasks.filter(x=>x.id!==id)})}
  function toggleHabit(id){
    patch({habits:data.habits.map(h=>h.id===id?{...h,log:{...h.log,[today]:!h.log[today]}}:h)})
  }
  function addHabit(name){
    if(!name.trim())return;
    patch({habits:[...data.habits,{id:uid(),name:name.trim(),active:true,log:{}}]});
  }
  function setWater(n){patch({water:{...data.water,[today]:Math.max(0,Math.min(8,n))}})}
  function addExpense(e){
    if(!e.name||!e.amount)return;
    patch({finance:{...data.finance,expenses:[...data.finance.expenses,{id:uid(),name:e.name,amount:Number(e.amount),category:e.category||"Бусад",date:e.date||today}]}})
  }
  function editExpense(id){
    const x=data.finance.expenses.find(a=>a.id===id); if(!x)return;
    const name=prompt("Зардлын нэр",x.name); if(name===null)return;
    const amount=prompt("Дүн",x.amount); if(amount===null)return;
    const category=prompt("Ангилал",x.category)||x.category;
    patch({finance:{...data.finance,expenses:data.finance.expenses.map(a=>a.id===id?{...a,name,amount:Number(amount)||0,category}:a)}})
  }
  function deleteExpense(id){patch({finance:{...data.finance,expenses:data.finance.expenses.filter(x=>x.id!==id)}})}
  function updateFinance(values){patch({finance:{...data.finance,...values}})}
  function addGoal(goal){
    const value=typeof goal==="string"?{text:goal}:goal;if(!value.text?.trim())return;
    patch({goals:[...data.goals,{id:uid(),done:false,target:0,current:0,deadline:"",...value,text:value.text.trim()}]});
  }
  function updateGoal(id,values){patch({goals:data.goals.map(x=>x.id===id?{...x,...values}:x)})}
  function toggleGoal(id){patch({goals:data.goals.map(x=>x.id===id?{...x,done:!x.done}:x)})}
  function deleteGoal(id){patch({goals:data.goals.filter(x=>x.id!==id)})}
  function addGrocery(text){
    if(!text.trim())return;
    patch({groceries:[...data.groceries,{id:uid(),text:text.trim(),done:false}]});
  }
  function toggleGrocery(id){patch({groceries:data.groceries.map(x=>x.id===id?{...x,done:!x.done}:x)})}
  function deleteGrocery(id){patch({groceries:data.groceries.filter(x=>x.id!==id)})}
  function setMeal(day,type,value){patch({meals:{...data.meals,[day]:{...(data.meals[day]||{}),[type]:value}}})}
  function addEvent(ev){
    if(!ev.title)return;
    patch({events:[...data.events,{id:uid(),...ev}]});
  }
  function editEvent(id){
    const x=data.events.find(e=>e.id===id); if(!x)return;
    const title=prompt("Event нэр",x.title); if(title===null)return;
    const eventDate=prompt("Огноо YYYY-MM-DD",x.date)||x.date;
    patch({events:data.events.map(e=>e.id===id?{...e,title,date:eventDate}:e)})
  }
  function deleteEvent(id){patch({events:data.events.filter(e=>e.id!==id)})}
  function setEducation(education){patch({education})}

  function exportBackup(){
    const payload={app:"Malina 2026 Master Planner",version:1,exportedAt:new Date().toISOString(),data};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`malina-planner-backup-${today}.json`;a.click();URL.revokeObjectURL(a.href);
    notify("Backup файл хадгалагдлаа");
  }
  const fileRef=useRef();
  function importBackup(file){
    if(!file)return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const x=JSON.parse(r.result);
        const incoming=x.data||x;
        if(!incoming.tasks||!incoming.finance||!incoming.habits)throw Error();
        setData({...defaultData,...incoming});
        notify("Backup амжилттай сэргээгдлээ");
      }catch{notify("Backup файл буруу байна")}
    };
    r.readAsText(file);
  }
  function resetAll(){
    if(confirm("Бүх planner мэдээллийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.")){
      setData(defaultData);notify("Бүх мэдээлэл цэвэрлэгдлээ");
    }
  }

  const common={data, water, today, addTask,toggleTask,deleteTask,addHabit,toggleHabit,setWater,addExpense,editExpense,deleteExpense,updateFinance,addGoal,updateGoal,toggleGoal,deleteGoal,addGrocery,toggleGrocery,deleteGrocery,setMeal,addEvent,editEvent,deleteEvent,notify,date,setDate,exportBackup,importBackup,resetAll,fileRef,authUser,authLoading,syncStatus,syncConflict,loginUser,signupUser,logoutUser,useLocalAndUpload,useCloudData,syncToCloud,pullFromCloud};
  function navigate(destination,prompt=""){setAssistantPrompt(prompt);setPage(destination);setMobileOpen(false)}
  const Page=page==="dashboard"?<MyLife {...common} navigate={navigate} Card={Card} SectionTitle={SectionTitle}/>:page==="daily"?<SmartPlanner data={data} Card={Card} SectionTitle={SectionTitle} toggleTask={toggleTask}/>:page==="wellness"?<Wellness {...common} Card={Card} SectionTitle={SectionTitle}/>:page==="tasks"?<Tasks {...common}/>:page==="habits"?<Habits {...common}/>:page==="finance"?<Finance {...common}/>:page==="water"?<Water {...common}/>:page==="meals"?<Meals {...common}/>:page==="calendar"?<CalendarPage {...common}/>:page==="goals"?<Goals {...common}/>:page==="education"?<Education education={data.education} onChange={setEducation} Card={Card} SectionTitle={SectionTitle} Empty={Empty} notify={notify}/>:page==="assistant"?<Assistant key={assistantPrompt||"assistant"} initialPrompt={assistantPrompt} data={data} setData={setData} Card={Card} SectionTitle={SectionTitle}/>:<SettingsPage {...common}/>;

  return <div className="min-h-screen text-[#382b31]">
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-[#eadde1] bg-[#fffaf9] p-4 pb-28 transition-transform lg:translate-x-0 ${mobileOpen?"translate-x-0":"-translate-x-full"}`}>
      <div className="mb-7 flex items-center justify-between">
        <div><div className="serif text-2xl font-bold text-[#7b3f55]">Malina</div><div className="text-xs uppercase tracking-[.22em] text-[#a07d89]">2026 planner</div></div>
        <button className="lg:hidden" onClick={()=>setMobileOpen(false)}><X/></button>
      </div>
      <nav className="space-y-1">
        {nav.map(([id,label,Icon])=><button key={id} onClick={()=>navigate(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold ${page===id?"bg-[#7b3f55] text-white":"text-[#765663] hover:bg-[#f5e8ed]"}`}><Icon size={19}/>{label}</button>)}
      </nav>
      <div className="absolute bottom-5 left-4 right-4 rounded-2xl bg-[#f5e8ed] p-3 text-xs text-[#754052]"><b>💗 Your life, your system.</b><br/>Өдөр бүр бага багаар.</div>
    </aside>

    <main className="lg:pl-64">
      <header className="sticky top-0 z-30 border-b border-[#eadde1] bg-[#fffaf9]/90 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3"><button className="lg:hidden" onClick={()=>setMobileOpen(true)}><Menu/></button><div><div className="text-xs font-bold uppercase tracking-widest text-[#a07d89]">Today</div><h1 className="serif text-xl font-bold text-[#513540]">{new Intl.DateTimeFormat("mn-MN",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}</h1></div></div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold shadow-sm">✨ {progress}%</div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 pb-24 md:p-7">{Page}</div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-[#eadde1] bg-[#fffaf9]/95 p-2 backdrop-blur lg:hidden">
        {nav.slice(0,5).map(([id,label,Icon])=><button key={id} onClick={()=>navigate(id)} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-bold ${page===id?"text-[#7b3f55]":"text-[#9a7d87]"}`}><Icon size={19}/>{label}</button>)}
      </nav>
      {toast&&<div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#4b303c] px-4 py-2 text-sm font-bold text-white shadow-xl">{toast}</div>}
    </main>
  </div>
}

function Dashboard({data,today,todayTasks,toggleTask,deleteTask,progress,water,setWater,addGoal,toggleGoal,deleteGoal}){
  const balance=Number(data.finance.income||0)-data.finance.expenses.reduce((s,x)=>s+Number(x.amount||0),0)-Number(data.finance.savings||0);
  const pie=Object.entries(data.finance.expenses.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+Number(x.amount||0),a),{})).map(([name,value])=>({name,value}));
  const activeHabits=data.habits.filter(h=>h.active),habitPct=activeHabits.length?Math.round(activeHabits.filter(h=>h.log?.[today]).length/activeHabits.length*100):0;
  const courses=(data.education?.semesters||[]).flatMap(s=>s.courses||[]),credits=courses.reduce((s,c)=>s+Number(c.credits||0),0),points=courses.reduce((s,c)=>s+Number(c.credits||0)*({A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,"C+":2.3,C:2,"C-":1.7,D:1,F:0}[c.grade]||0),0),gpa=credits?points/credits:0;
  const goalPct=data.goals.length?Math.round(data.goals.reduce((s,g)=>s+goalStats(g,data.finance).progress,0)/data.goals.length):0,financePct=Math.min(100,Math.round(financeStats(data.finance).savingsRate));
  return <div className="space-y-5">
    <div className="rounded-[28px] bg-[#7b3f55] p-6 text-white shadow-xl">
      <div className="text-sm opacity-80">Good morning, Malina ✨</div><h1 className="serif mt-1 text-3xl font-bold">Make today count.</h1><p className="mt-2 max-w-xl text-sm opacity-85">Өнөөдрийн хамгийн чухал 1–3 зүйлээ эхлээд дуусга.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><div className="text-sm text-[#967683]">Day Progress</div><div className="mt-2 flex items-end justify-between"><div className="text-3xl font-black text-[#633848]">{progress}%</div><div className="text-xs">{todayTasks.filter(x=>x.done).length}/{todayTasks.length} tasks</div></div><div className="mt-3 h-3 rounded-full bg-[#f0e2e7]"><div className="h-3 rounded-full bg-[#7b3f55]" style={{width:`${progress}%`}}/></div></Card>
      <Card><div className="text-sm text-[#967683]">Water</div><div className="mt-2 text-3xl font-black text-[#633848]">{water}/8</div><div className="mt-3 h-3 rounded-full bg-[#e9eef2]"><div className="h-3 rounded-full bg-[#6c91a8]" style={{width:`${water/8*100}%`}}/></div></Card>
      <Card><div className="text-sm text-[#967683]">Balance</div><div className={`mt-2 text-3xl font-black ${balance<0?"text-red-600":"text-[#633848]"}`}>{money(balance)}</div><div className="mt-1 text-xs text-[#967683]">Income − Expense − Savings</div></Card>
    </div>
    <Card><SectionTitle icon={Sparkles} title="Life Progress" sub="Таны амьдралын гол хэмжүүрүүд нэг дор"/><div className="life-progress-grid">{[["Tasks",progress],["Habits",habitPct],["GPA",gpa?Math.round(gpa/4*100):0],["Finance",financePct],["Goals",goalPct],["Water",Math.min(100,Math.round(water/8*100))]].map(([label,pct])=><div key={label} className="life-progress-item"><div className="life-progress-ring" style={{"--progress":`${pct*3.6}deg`}}><b>{pct}%</b></div><span>{label}</span></div>)}</div></Card>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><SectionTitle icon={ListChecks} title="Today's Plan" sub="Өнөөдрийн хийх зүйлс"/>{todayTasks.length===0?<Empty text="Өнөөдөр хийх зүйл нэмээгүй байна."/>:<div className="space-y-2">{todayTasks.map(t=><div key={t.id} className="flex items-center gap-3 rounded-2xl bg-[#fbf7f7] p-3"><input className="check" type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)}/><span className={`flex-1 text-sm font-semibold ${t.done?"text-[#a88e97] line-through":""}`}>{t.text}</span><button onClick={()=>deleteTask(t.id)}><Trash2 size={16} className="text-[#b18b98]"/></button></div>)}</div>}</Card>
      <Card><SectionTitle icon={Droplets} title="Water Tracker" sub="8 аяга = ойролцоогоор 2L"/><div className="grid grid-cols-4 gap-3 sm:grid-cols-8">{Array.from({length:8},(_,i)=><button key={i} onClick={()=>setWater(i+1===water?i:i+1)} className={`rounded-2xl border p-3 text-center transition ${i<water?"border-[#8caec1] bg-[#e8f1f5]":"border-[#eadde1] bg-white"}`}><Droplets className="mx-auto" size={22}/><span className="mt-1 block text-xs font-bold">{i+1}</span></button>)}</div></Card>
    </div>
    <Card><SectionTitle icon={Target} title="Quick Goals" sub="Хамгийн ойрын зорилго"/><GoalMini data={data} addGoal={addGoal} toggleGoal={toggleGoal} deleteGoal={deleteGoal}/></Card>
  </div>
}

function GoalMini({data,addGoal,toggleGoal,deleteGoal}){
  const [v,setV]=useState("");
  return <><div className="flex gap-2"><input className="field" value={v} onChange={e=>setV(e.target.value)} placeholder="Жишээ: 7 хоногт 3 удаа workout"/><button className="btn btn-primary" onClick={()=>{addGoal(v);setV("")}}><Plus size={18}/></button></div><div className="mt-3 space-y-2">{data.goals.slice(0,5).map(g=><div key={g.id} className="flex items-center gap-3 rounded-2xl bg-[#fbf7f7] p-3"><input className="check" type="checkbox" checked={g.done} onChange={()=>toggleGoal(g.id)}/><span className={`flex-1 text-sm ${g.done?"line-through text-[#a88e97]":""}`}>{g.text}</span><button onClick={()=>deleteGoal(g.id)}><Trash2 size={16}/></button></div>)}</div></>
}

function Tasks({data,today,addTask,toggleTask,deleteTask}){
  const [v,setV]=useState(""); const [d,setD]=useState(today);
  const [filter,setFilter]=useState("all");
  const list=data.tasks.filter(x=>filter==="all"||filter==="done"&&x.done||filter==="open"&&!x.done).sort((a,b)=>a.date.localeCompare(b.date));
  return <div className="space-y-5"><Card><SectionTitle icon={ClipboardList} title="Tasks" sub="CRUD + өдөр сонгох"/><div className="grid gap-2 md:grid-cols-[1fr_170px_auto]"><input className="field" value={v} onChange={e=>setV(e.target.value)} placeholder="Шинэ task..."/><input className="field" type="date" value={d} onChange={e=>setD(e.target.value)}/><button className="btn btn-primary" onClick={()=>{addTask(v,d);setV("")}}><Plus size={18}/></button></div></Card>
    <Card><div className="mb-4 flex gap-2">{["all","open","done"].map(f=><button key={f} onClick={()=>setFilter(f)} className={`btn ${filter===f?"btn-primary":"btn-soft"}`}>{f==="all"?"Бүгд":f==="open"?"Хийх":"Дууссан"}</button>)}</div>{list.length?<div className="space-y-2">{list.map(t=><div key={t.id} className="flex items-center gap-3 rounded-2xl border border-[#eee3e6] p-3"><input className="check" type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)}/><div className="flex-1"><div className={`font-semibold ${t.done?"line-through text-[#a88e97]":""}`}>{t.text}</div><div className="text-xs text-[#a1858f]">{t.date}</div></div><button onClick={()=>deleteTask(t.id)}><Trash2 size={17}/></button></div>)}</div>:<Empty text="Task алга байна."/>}</Card></div>
}

function Habits({data,addHabit,toggleHabit,today,date,setDate}){
  const [month,setMonth]=useState(new Date());
  const [habitName,setHabitName]=useState("");
  const days=monthDays(month); const key=monthKey(month);
  return <div className="space-y-5"><Card><div className="flex items-center justify-between"><SectionTitle icon={Check} title="Habit Tracker" sub="Сарын completion %"/><div className="flex gap-1"><button className="btn btn-soft" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft/></button><button className="btn btn-soft" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight/></button></div></div>
    <div className="mb-4 flex gap-2"><input className="field" value={habitName} onChange={e=>setHabitName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addHabit(habitName);setHabitName("")}}} placeholder="Шинэ habit..."/><button className="btn btn-primary" onClick={()=>{addHabit(habitName);setHabitName("")}}><Plus size={18}/></button></div>
    <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr><th className="p-2 text-left">Habit</th>{days.map(d=><th key={iso(d)} className="p-1 text-center text-[10px] text-[#9b7d87]">{d.getDate()}</th>)}</tr></thead><tbody>{data.habits.filter(h=>h.active).map(h=>{const completed=days.filter(d=>h.log[iso(d)]).length;const pct=Math.round(completed/days.length*100);return <tr key={h.id} className="border-t border-[#eee3e6]"><td className="p-2 font-bold">{h.name}<div className="text-xs font-normal text-[#9b7d87]">{pct}%</div></td>{days.map(d=><td key={iso(d)} className="p-1 text-center"><button onClick={()=>{setDate(d); if(iso(d)===today) toggleHabit(h.id); else {}}} className={`h-7 w-7 rounded-lg ${h.log[iso(d)]?"bg-[#7b3f55] text-white":"bg-[#f5e8ed] text-[#b08a98]"}`}>{h.log[iso(d)]?"✓":""}</button></td>)}</tr>})}</tbody></table></div>
    <p className="text-xs text-[#9b7d87]">Сонгосон сар: {key}. Тухайн өдрийн habit тэмдэглэхэд өнөөдрийн огноо ашиглагдана.</p>
  </Card></div>
}

function Finance({data,addExpense,editExpense,deleteExpense,updateFinance}){
  const [name,setName]=useState("");const [amount,setAmount]=useState("");const [category,setCategory]=useState("Хоол");
  const stats=financeStats(data.finance),pie=Object.entries(stats.categories).map(([name,value])=>({name,value}));
  const setMonthly=(field,value)=>updateFinance({[field]:{...(data.finance[field]||{}),[stats.currentMonth]:Number(value)}});
  return <div className="space-y-5"><Card><SectionTitle icon={CircleDollarSign} title="Finance Tracker" sub="Income − Expense − Savings = Balance"/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><label className="text-sm font-bold">Monthly income<input className="field mt-1" type="number" value={stats.income} onChange={e=>setMonthly("monthlyIncome",e.target.value)}/></label><label className="text-sm font-bold">Monthly savings<input className="field mt-1" type="number" value={stats.savings} onChange={e=>setMonthly("monthlySavings",e.target.value)}/></label><FinanceMetric label="Monthly expenses" value={money(stats.expenseTotal)}/><FinanceMetric label="Current balance" value={money(stats.balance)} bad={stats.balance<0}/><FinanceMetric label="Savings rate" value={`${Math.round(stats.savingsRate)}%`}/></div>
  </Card><div className="grid gap-5 lg:grid-cols-2"><Card><h3 className="font-extrabold">Add Expense</h3><div className="mt-3 grid gap-2 md:grid-cols-3"><input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="Зардлын нэр"/><input className="field" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Дүн"/><select className="field" value={category} onChange={e=>setCategory(e.target.value)}>{["Хоол","Тээвэр","Shopping","Сургалт","Гоо сайхан","Бусад"].map(x=><option key={x}>{x}</option>)}</select></div><button className="btn btn-primary mt-3" onClick={()=>{addExpense({name,amount,category});setName("");setAmount("")}}><Plus size={18} className="inline"/> Add</button></Card>
  <Card><h3 className="font-extrabold">Expense by Category</h3>{pie.length?<div className="h-56"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>{pie.map((_,i)=><Cell key={i}/>)}</Pie><Tooltip formatter={(v)=>money(v)}/></PieChart></ResponsiveContainer></div>:<Empty text="Зардал бүртгэгдээгүй байна."/>}</Card></div>
  <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card><SectionTitle icon={CircleDollarSign} title="Monthly spending trend" sub="Сүүлийн 6 сарын бодит зарлага"/><div className="h-64"><ResponsiveContainer><LineChart data={stats.months}><CartesianGrid stroke="#f0e2e7" vertical={false}/><XAxis dataKey="label"/><YAxis width={70}/><Tooltip formatter={money}/><Line type="monotone" dataKey="amount" stroke="#7b3f55" strokeWidth={3} dot={{fill:"#7b3f55"}}/></LineChart></ResponsiveContainer></div></Card><Card><SectionTitle icon={Sparkles} title="Financial Health" sub="Энэ сарын автомат үнэлгээ"/><div className="space-y-2 text-sm"><HealthRow label="Spending level" value={stats.spendingLevel}/><HealthRow label="Savings rate" value={stats.income?`${Math.round(stats.savingsRate)}%`:"Мэдээлэл дутуу"}/><HealthRow label="Biggest category" value={stats.topCategory?.[0]||"Мэдээлэл дутуу"}/><HealthRow label="Spending trend" value={stats.trendPct===null?"Өмнөх сарын мэдээлэл дутуу":`${Math.abs(Math.round(stats.trendPct))}% ${stats.trendPct>=0?"өссөн":"буурсан"}`}/></div>{stats.insights.length>0&&<div className="mt-4 space-y-2">{stats.insights.map(x=><p key={x} className="rounded-2xl bg-[#f5e8ed] p-3 text-sm text-[#694454]">{x}</p>)}</div>}</Card></div>
  <Card><h3 className="mb-3 font-extrabold">Expenses</h3>{data.finance.expenses.length?<div className="space-y-2">{data.finance.expenses.map(x=><div key={x.id} className="flex items-center gap-3 rounded-2xl bg-[#fbf7f7] p-3"><div className="flex-1"><b>{x.name}</b><div className="text-xs text-[#9b7d87]">{x.category} · {x.date}</div></div><b>{money(x.amount)}</b><button onClick={()=>editExpense(x.id)}><Edit3 size={17}/></button><button onClick={()=>deleteExpense(x.id)}><Trash2 size={17}/></button></div>)}</div>:<Empty text="Зардал алга."/>}</Card></div>
}
function FinanceMetric({label,value,bad}){return <div className="rounded-2xl bg-[#f5e8ed] p-3"><div className="text-xs text-[#8b6875]">{label}</div><div className={`mt-1 text-xl font-black ${bad?"text-red-600":"text-[#633848]"}`}>{value}</div></div>}
function HealthRow({label,value}){return <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fbf7f7] px-3 py-2"><span className="text-[#896b76]">{label}</span><b className="text-right">{value}</b></div>}

function Water({data,setWater,today}){
  const water=Number(data?.water?.[today]||0);
  return <div className="space-y-5"><Card><SectionTitle icon={Droplets} title="Water Tracker" sub="Өдөрт 8 аяга / ойролцоогоор 2L"/><div className="text-center"><div className="text-6xl font-black text-[#6c91a8]">{water}<span className="text-2xl">/8</span></div><div className="mx-auto mt-3 h-4 max-w-lg rounded-full bg-[#e9eef2]"><div className="h-4 rounded-full bg-[#6c91a8] transition-all" style={{width:`${water/8*100}%`}}/></div></div><div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-8">{Array.from({length:8},(_,i)=><button key={i} onClick={()=>setWater(i+1===water?i:i+1)} className={`rounded-2xl p-5 transition ${i<water?"bg-[#dcecf3] text-[#557e98]":"bg-[#f7f3f3] text-[#b99aa5]"}`}><Droplets className="mx-auto"/><div className="mt-2 text-xs font-bold">{i+1} аяга</div></button>)}</div></Card></div>
}

function Meals({data,setMeal,addGrocery,toggleGrocery,deleteGrocery,today}){
  const [g,setG]=useState("");const meal=data.meals[today]||{};
  const types=[["breakfast","Өглөөний хоол"],["lunch","Өдрийн хоол"],["dinner","Оройн хоол"]];
  return <div className="space-y-5"><Card><SectionTitle icon={Utensils} title="Meal Planner" sub={today}/><div className="grid gap-4 md:grid-cols-3">{types.map(([k,label])=><label key={k} className="rounded-2xl bg-[#fbf7f7] p-4 text-sm font-bold">{label}<textarea className="field mt-2 min-h-28" value={meal[k]||""} onChange={e=>setMeal(today,k,e.target.value)} placeholder="Энд хоолоо бич..."/><button className="btn btn-soft mt-2 w-full" onClick={()=>addGrocery(`Орц: ${meal[k]||label}`)}>+ Grocery-д нэмэх</button></label>)}</div></Card>
  <Card><h3 className="font-extrabold">Quick Grocery</h3><div className="mt-2 flex gap-2"><input className="field" value={g} onChange={e=>setG(e.target.value)} placeholder="Сүү, өндөг, талх..."/><button className="btn btn-primary" onClick={()=>{addGrocery(g);setG("")}}><Plus/></button></div><Grocery data={data} toggleGrocery={toggleGrocery} deleteGrocery={deleteGrocery}/></Card></div>
}
function Grocery({data,toggleGrocery,deleteGrocery}){
  return <div className="mt-4 space-y-2">{data.groceries.map(x=><div key={x.id} className="flex items-center gap-2 rounded-xl bg-[#faf5f6] p-2"><input className="check" type="checkbox" checked={x.done} onChange={()=>toggleGrocery(x.id)}/><span className={`flex-1 text-sm ${x.done?"line-through text-[#a88e97]":""}`}>{x.text}</span><button onClick={()=>deleteGrocery(x.id)}><Trash2 size={16}/></button></div>)}</div>
}

function CalendarPage({data,date,setDate,addEvent,editEvent,deleteEvent}){
  const [title,setTitle]=useState("");const [d,setD]=useState(todayKey(date));
  const [mode,setMode]=useState("month");
  const start=new Date(date.getFullYear(),date.getMonth(),1);const first=start.getDay();const cells=Array.from({length:42},(_,i)=>new Date(date.getFullYear(),date.getMonth(),i-first+1));
  const selected=data.events.filter(e=>e.date===d);
  return <div className="space-y-5"><Card><div className="flex flex-wrap items-center justify-between gap-2"><SectionTitle icon={CalendarDays} title="Calendar" sub="Important dates + event CRUD"/><div className="flex gap-1"><button className="btn btn-soft" onClick={()=>setMode("month")}>Month</button><button className="btn btn-soft" onClick={()=>setMode("week")}>Week</button></div></div>
  {mode==="month"?<><div className="mb-3 flex items-center justify-between"><button className="btn btn-soft" onClick={()=>setDate(new Date(date.getFullYear(),date.getMonth()-1,1))}><ChevronLeft/></button><b>{new Intl.DateTimeFormat("mn-MN",{month:"long",year:"numeric"}).format(date)}</b><button className="btn btn-soft" onClick={()=>setDate(new Date(date.getFullYear(),date.getMonth()+1,1))}><ChevronRight/></button></div><div className="grid grid-cols-7 gap-1">{["Ня","Да","Мя","Лх","Пү","Ба","Бя"].map(x=><div key={x} className="p-2 text-center text-xs font-bold text-[#a1848e]">{x}</div>)}{cells.map(c=>{const k=iso(c),active=c.getMonth()===date.getMonth(),has=data.events.some(e=>e.date===k);return <button key={k} onClick={()=>{setDate(c);setD(k)}} className={`min-h-16 rounded-xl border p-2 text-left ${active?"border-[#eadde1] bg-white":"border-transparent bg-[#faf5f6] opacity-50"} ${k===d?"ring-2 ring-[#7b3f55]":""}`}><span className="text-xs font-bold">{c.getDate()}</span>{has&&<div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7b3f55]"/>}</button>})}</div></>:<div className="grid gap-2 sm:grid-cols-7">{Array.from({length:7},(_,i)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()-date.getDay()+i)).map(c=><div key={iso(c)} className="rounded-2xl bg-[#faf5f6] p-3"><b className="text-xs">{c.toLocaleDateString("mn-MN",{weekday:"short"})}</b><div className="text-lg font-black">{c.getDate()}</div></div>)}</div>}
  </Card>
  <Card><h3 className="font-extrabold">Event нэмэх — {d}</h3><div className="mt-2 grid gap-2 md:grid-cols-[1fr_180px_auto]"><input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Шалгалт, төрсөн өдөр..."/><input className="field" type="date" value={d} onChange={e=>setD(e.target.value)}/><button className="btn btn-primary" onClick={()=>{addEvent({title,date:d});setTitle("")}}><Plus/></button></div><div className="mt-4 space-y-2">{selected.map(e=><div key={e.id} className="flex items-center gap-3 rounded-2xl bg-[#fbf7f7] p-3"><span className="flex-1 font-semibold">{e.title}</span><button onClick={()=>editEvent(e.id)}><Edit3 size={17}/></button><button onClick={()=>deleteEvent(e.id)}><Trash2 size={17}/></button></div>)}</div></Card></div>
}

function Goals({data,addGoal,updateGoal,toggleGoal,deleteGoal}){
  const [form,setForm]=useState({text:"",target:"",current:"",deadline:""});
  const set=(key,value)=>setForm(x=>({...x,[key]:value}));
  return <div className="space-y-5"><Card><SectionTitle icon={Target} title="Smart Goals" sub="Deadline, progress, Finance-тэй холбогдсон зорилго"/><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"><input className="field" value={form.text} onChange={e=>set("text",e.target.value)} placeholder="Зорилгын нэр"/><input className="field" type="number" value={form.target} onChange={e=>set("target",e.target.value)} placeholder="Target amount / value"/><input className="field" type="number" value={form.current} onChange={e=>set("current",e.target.value)} placeholder="Current progress"/><input className="field" type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)}/><button className="btn btn-primary" onClick={()=>{addGoal({...form,target:Number(form.target),current:Number(form.current)});setForm({text:"",target:"",current:"",deadline:""})}}><Plus/></button></div></Card>
  {data.goals.length?<div className="grid gap-5 xl:grid-cols-2">{data.goals.map(g=><GoalCard key={g.id} goal={g} finance={data.finance} updateGoal={updateGoal} toggleGoal={toggleGoal} deleteGoal={deleteGoal}/>)}</div>:<Card><Empty text="Зорилго алга байна."/></Card>}</div>
}
function GoalCard({goal,finance,updateGoal,toggleGoal,deleteGoal}){const s=goalStats(goal,finance),tone=s.status==="Completed"?"bg-[#e5f0e7] text-[#52705a]":s.status==="At risk"?"bg-[#fae8e8] text-[#9a4d54]":"bg-[#f5e8ed] text-[#713a50]";return <Card><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{s.status}</span><h3 className="mt-3 text-xl font-black text-[#4a313b]">{goal.text}</h3></div><div className="flex gap-2"><button onClick={()=>toggleGoal(goal.id)} aria-label="Completed"><Check size={18}/></button><button onClick={()=>deleteGoal(goal.id)} aria-label="Delete"><Trash2 size={18}/></button></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-[#f0e2e7]"><div className="h-full rounded-full bg-[#7b3f55]" style={{width:`${s.progress}%`}}/></div><div className="mt-2 flex justify-between text-sm"><b>{s.progress}%</b><span className="text-[#94727e]">{s.daysRemaining===null?"Deadline оруулаагүй":`${s.daysRemaining} өдөр үлдсэн`}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-xs font-bold">Target<input className="field mt-1" type="number" value={goal.target||""} onChange={e=>updateGoal(goal.id,{target:Number(e.target.value)})}/></label><label className="text-xs font-bold">Current<input className="field mt-1" type="number" value={goal.current||""} onChange={e=>updateGoal(goal.id,{current:Number(e.target.value)})}/></label><label className="col-span-2 text-xs font-bold">Deadline<input className="field mt-1" type="date" value={goal.deadline||""} onChange={e=>updateGoal(goal.id,{deadline:e.target.value})}/></label></div>{s.target>0&&<div className="mt-4 rounded-2xl border border-[#eadde1] bg-[#fffaf9] p-4"><b className="text-sm text-[#713a50]">Goal Strategy</b><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><HealthRow label="Remaining" value={money(s.remaining)}/><HealthRow label="Monthly" value={money(s.requiredMonthly)}/><HealthRow label="Weekly" value={money(s.requiredWeekly)}/><HealthRow label="Realistic" value={s.realistic===null?"Deadline хэрэгтэй":s.realistic?"Тийм":"Одоогоор үгүй"}/></div></div>}</Card>}

function SettingsPage({exportBackup,importBackup,resetAll,fileRef,authUser,authLoading,syncStatus,syncConflict,loginUser,signupUser,logoutUser,useLocalAndUpload,useCloudData,syncToCloud,pullFromCloud,data}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function submit(){
    if(!email.trim()||password.length<6){setMessage("Имэйл болон дор хаяж 6 тэмдэгттэй нууц үг оруулна уу.");return}
    setBusy(true);setMessage("");
    try{
      if(mode==="signup"){
        await signupUser(email.trim(),password);
        setMode("login");setMessage("Бүртгэл үүслээ. Имэйлээ баталгаажуулсан бол одоо нэвтэрнэ үү.");
      }else{await loginUser(email.trim(),password);setPassword("");setMessage("Амжилттай нэвтэрлээ.")}
    }catch(error){setMessage(error?.message||"Нэвтрэлт амжилтгүй боллоо.")}
    finally{setBusy(false)}
  }
  return <div className="space-y-5">
    <Card><SectionTitle icon={Settings} title="Cloud Sync" sub="Нэг account-аар утас, laptop хоёрын planner-аа ижил байлгана."/>
      {authLoading?<div className="rounded-2xl bg-[#faf5f6] p-4 text-sm text-[#80616d]">Нэвтрэлтийн төлөв шалгаж байна…</div>:authUser?<div className="space-y-3">
        <div className="rounded-2xl bg-[#f5e8ed] p-4"><div className="text-xs font-bold uppercase tracking-widest text-[#9b7784]">Нэвтэрсэн account</div><div className="mt-1 font-bold text-[#633848]">{authUser.email||"Account"}</div><div className="mt-1 text-xs text-[#8b6975]">{syncStatus}</div></div>
        {syncConflict?<div className="rounded-2xl border border-[#e8c9d2] bg-[#fff7f8] p-4"><b className="text-[#713a50]">2 төхөөрөмжийн мэдээлэл зөрж байна</b><p className="mt-1 text-sm text-[#8b6975]">Cloud дээр {((syncConflict.tasks||[]).length)} task зэрэг мэдээлэл байна. Аль мэдээллийг үндсэн болгохоо өөрөө сонгоно.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-primary" onClick={useLocalAndUpload}>📱 Энэ төхөөрөмж → Cloud</button><button className="btn btn-soft" onClick={useCloudData}>☁️ Cloud → энэ төхөөрөмж</button></div></div>:null}
        <div className="rounded-2xl bg-[#faf5f6] p-4"><div className="text-sm font-bold text-[#633848]">Sync чиглэл</div><p className="mt-1 text-xs leading-5 text-[#8b6975]">Laptop дээр мэдээллээ хадгалсан бол <b>Энэ төхөөрөмж → Cloud</b>. Дараа нь утсан дээр <b>Cloud → энэ төхөөрөмж</b> гэж татна.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-primary" onClick={useLocalAndUpload}>↑ Энэ төхөөрөмж → Cloud</button><button className="btn btn-soft" onClick={()=>pullFromCloud(true)}>↓ Cloud → энэ төхөөрөмж</button></div></div>
        <div className="flex flex-wrap gap-2"><button className="btn btn-soft" onClick={()=>syncToCloud(data,true)}>Cloud-д одоо хадгалах</button><button className="btn btn-soft" onClick={()=>pullFromCloud(true)}>Cloud-оос одоо татах</button><button className="btn btn-soft" onClick={logoutUser}>Гарах</button></div>
      </div>:<div className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><button className={`btn ${mode==="login"?"btn-primary":"btn-soft"}`} onClick={()=>setMode("login")}>Нэвтрэх</button><button className={`btn ${mode==="signup"?"btn-primary":"btn-soft"}`} onClick={()=>setMode("signup")}>Бүртгүүлэх</button></div>
        <input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Имэйл" autoComplete="email"/>
        <input className="field" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Нууц үг" autoComplete={mode==="signup"?"new-password":"current-password"}/>
        <button className="btn btn-primary w-full" disabled={busy} onClick={submit}>{busy?"Түр хүлээнэ үү…":mode==="signup"?"Account үүсгэх":"Нэвтрэх"}</button>
        {message&&<p className="rounded-2xl bg-[#faf5f6] p-3 text-sm text-[#7b5260]">{message}</p>}
        <p className="text-xs text-[#967683]">Cloud sync ашиглахын тулд нэг ижил account-аар laptop болон утсан дээрээ нэвтэрнэ.</p>
      </div>}
    </Card>
    <Card><SectionTitle icon={Settings} title="Settings & Backup" sub="Өгөгдлөө алдахгүй хамгаалах хэсэг"/><div className="grid gap-3 md:grid-cols-2"><button className="btn btn-primary flex items-center justify-center gap-2" onClick={exportBackup}><Download size={18}/> Export Backup</button><button className="btn btn-soft flex items-center justify-center gap-2" onClick={()=>fileRef.current?.click()}><Upload size={18}/> Import Backup</button><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={e=>importBackup(e.target.files?.[0])}/></div></Card>
    <Card><h3 className="font-extrabold text-red-700">Danger Zone</h3><p className="mt-1 text-sm text-[#9b7d87]">Бүх Tasks, Habits, Finance, Water, Meals, Calendar, Goals, Grocery устна.</p><button className="btn mt-3 bg-red-50 text-red-700" onClick={resetAll}><RotateCcw size={17} className="inline"/> Reset All Data</button></Card>
    <Card><div className="flex items-center gap-3"><Sparkles className="text-[#7b3f55]"/><div><b>Malina 2026 Master Planner</b><div className="text-xs text-[#9b7d87]">React · Vite · Tailwind · LocalStorage + Cloud Sync · PWA</div></div></div></Card>
  </div>
}

export default App;

