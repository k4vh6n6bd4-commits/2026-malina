import React from "react";
import {
  ArrowRight, Bot, CalendarDays, Check, CircleDollarSign, Clock3, Droplets,
  GraduationCap, ListChecks, Plus, Sparkles, Target, Utensils, WalletCards
} from "lucide-react";
import {dayPlan, nextAction} from "./smartPlanner";
import {financeStats, goalStats} from "./smartFinance";
import {localDateKey} from "./dateUtils.js";

const gradePoints={A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,"C+":2.3,C:2,"C-":1.7,D:1,F:0};
const money=n=>new Intl.NumberFormat("mn-MN").format(Number(n)||0)+" ₮";
const clamp=n=>Math.max(0,Math.min(100,Math.round(n||0)));

function gpaStats(education={}){
  const courses=(education.semesters||[]).flatMap(s=>s.courses||[]);
  const credits=courses.reduce((sum,c)=>sum+Number(c.credits||0),0);
  const points=courses.reduce((sum,c)=>sum+Number(c.credits||0)*(gradePoints[c.grade]??0),0);
  return {credits,gpa:credits?points/credits:0,target:Number(education.targetGpa||3.8)};
}

function Metric({icon:Icon,label,value,detail,pct,tone="rose",empty}){
  return <section className={`overview-card overview-${tone}`}>
    <div className="flex items-start justify-between gap-3"><div className="metric-icon"><Icon size={19}/></div>{pct!==null&&pct!==undefined&&<b className="text-xs text-[#765663]">{clamp(pct)}%</b>}</div>
    <div className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#9a7784]">{label}</div>
    <div className="serif mt-1 text-2xl font-bold text-[#513540]">{empty?"—":value}</div>
    <p className="mt-1 min-h-5 text-xs text-[#94727e]">{empty?detail:detail}</p>
    {pct!==null&&pct!==undefined&&<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70"><div className="metric-progress h-full rounded-full" style={{width:`${clamp(pct)}%`}}/></div>}
  </section>
}

export default function MyLife({data,today,navigate,toggleTask,Card,SectionTitle}){
  const now=new Date(), hour=now.getHours();
  const greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const message=hour<10?"Start gently. One meaningful step is enough.":hour<17?"Let's make today count.":"Finish with intention, then make space to rest.";
  const plan=dayPlan(data,now), action=nextAction(data,now);
  const todayTasks=(data.tasks||[]).filter(t=>(t.date||today)===today);
  const taskDone=todayTasks.filter(t=>t.done).length, taskPct=todayTasks.length?taskDone/todayTasks.length*100:0;
  const habits=(data.habits||[]).filter(h=>h.active), habitDone=habits.filter(h=>h.log?.[today]).length, habitPct=habits.length?habitDone/habits.length*100:0;
  const water=Number(data.water?.[today]||0), waterPct=water/8*100;
  const gpa=gpaStats(data.education), gpaPct=gpa.credits&&gpa.target?gpa.gpa/gpa.target*100:0;
  const finance=financeStats(data.finance||{}), financePct=finance.income?finance.savingsRate:0;
  const activeGoals=(data.goals||[]).filter(g=>!g.done), goals=(data.goals||[]).map(g=>goalStats(g,data.finance)), goalPct=goals.length?goals.reduce((s,g)=>s+g.progress,0)/goals.length:0;
  const categories=[
    ["Tasks",taskPct,ListChecks],["Habits",habitPct,Check],["GPA",gpaPct,GraduationCap],
    ["Goals",goalPct,Target],["Finance",financePct,WalletCards],["Water",waterPct,Droplets]
  ];
  const overall=Math.round(categories.reduce((s,[,v])=>s+clamp(v),0)/categories.length);
  const monthExpenses=finance.expenseTotal||0;
  const insights=[];
  if(todayTasks.length)insights.push(taskDone===todayTasks.length?"Өнөөдрийн бүх task дууссан байна.":`Өнөөдөр ${todayTasks.length-taskDone} task үлдсэн байна.`);
  if(gpa.credits)insights.push(gpa.gpa>=gpa.target?`Таны GPA ${gpa.target.toFixed(2)} target-д хүрсэн байна.`:`Таны GPA target ${gpa.target.toFixed(2)}-аас ${(gpa.target-gpa.gpa).toFixed(2)} оноогоор дутуу байна.`);
  if(water>0)insights.push(`Усны хэрэглээ ${clamp(waterPct)}% байна.`);
  const weekAgo=new Date(now);weekAgo.setDate(now.getDate()-6);
  const weekKeys=Array.from({length:7},(_,i)=>{const d=new Date(weekAgo);d.setDate(weekAgo.getDate()+i);return localDateKey(d)});
  const weekChecks=habits.flatMap(h=>weekKeys.map(k=>h.log?.[k]));
  if(habits.length&&weekChecks.some(Boolean))insights.push(`Энэ долоо хоногт Habit completion ${Math.round(weekChecks.filter(Boolean).length/weekChecks.length*100)}% байна.`);
  const quick=[["Add Task","tasks",ListChecks],["Add Habit","habits",Check],["Add Expense","finance",CircleDollarSign],["Add Goal","goals",Target],["Add Course","education",GraduationCap]];
  const prompts=["Өнөөдөр юу хийх вэ?","Одоо юу хийх вэ?","GPA 3.8 хүрэхийн тулд яах вэ?","Миний санхүү ямар байна?","Миний зорилго ямар явж байна?"];

  return <div className="my-life space-y-5">
    <section className="life-hero">
      <div className="relative z-10"><div className="text-sm font-bold text-[#efdce3]">{new Intl.DateTimeFormat("mn-MN",{weekday:"long",month:"long",day:"numeric"}).format(now)}</div><h1 className="serif mt-3 text-3xl font-bold md:text-5xl">{greeting}, Malina <Sparkles className="inline text-[#f2cbd8]" size={28}/></h1><p className="mt-3 text-sm text-[#f4e7eb] md:text-base">{message}</p></div>
      <div className="hero-progress"><span>Daily progress</span><strong>{overall}%</strong><div><i style={{width:`${overall}%`}}/></div><small>Across your six life categories</small></div>
    </section>

    <div><div className="mb-3 flex items-end justify-between"><div><h2 className="serif text-2xl font-bold text-[#513540]">Today at a glance</h2><p className="text-sm text-[#94727e]">Your current planner, in one view.</p></div></div>
      <div className="overview-grid">
        <Metric icon={ListChecks} label="Tasks" value={`${taskDone} / ${todayTasks.length}`} detail={todayTasks.length?"completed today":"No tasks planned today"} pct={taskPct}/>
        <Metric icon={GraduationCap} label="GPA" value={gpa.gpa.toFixed(2)} detail={gpa.credits?`Target ${gpa.target.toFixed(2)}`:"Add courses to calculate GPA"} pct={gpa.credits?gpaPct:null} empty={!gpa.credits} tone="blue"/>
        <Metric icon={Droplets} label="Water" value={`${water} / 8`} detail="cups today" pct={waterPct} tone="blue"/>
        <Metric icon={Check} label="Habits" value={`${habitDone} / ${habits.length}`} detail={habits.length?"completed today":"No active habits"} pct={habitPct}/>
        <Metric icon={WalletCards} label="Money" value={money(finance.balance)} detail={finance.income||monthExpenses?`${money(monthExpenses)} spent this month`:"Add income or expenses for a summary"} pct={null}/>
        <Metric icon={Target} label="Goals" value={String(activeGoals.length)} detail={data.goals?.length?`${clamp(goalPct)}% overall progress`:"No goals added yet"} pct={data.goals?.length?goalPct:null}/>
      </div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <Card className="priority-card"><SectionTitle icon={Sparkles} title="Today's priority" sub="Chosen from urgency, timing, priority and goal relevance"/><div className="priority-label">Focus first</div><h3 className="serif mt-3 text-3xl font-bold text-[#513540]">{action.title}</h3><p className="mt-3 text-sm leading-6 text-[#825f6c]">{action.reason}</p><button className="btn btn-primary mt-5 flex items-center gap-2" onClick={()=>navigate(plan.open.some(t=>t.text===action.title)?"tasks":"daily")}><span>Start this task</span><ArrowRight size={17}/></button></Card>
      <Card><SectionTitle icon={Clock3} title="Today's timeline" sub="Calendar, tasks, planner recommendations, habits and meals"/>{plan.timeline.length?<div className="timeline-list">{plan.timeline.map((item,i)=><div className="timeline-row" key={item.id}><div className="timeline-time">{item.time}</div><div className={`timeline-dot timeline-${item.kind}`}/><div className="timeline-content"><b className="block truncate text-sm text-[#523843]">{item.title}</b><span className="text-xs capitalize text-[#a07d89]">{item.kind}{item.duration?` · ${item.duration} min`:""}</span></div>{i<plan.timeline.length-1&&<i className="timeline-line"/>}</div>)}</div>:<div className="soft-empty">No timed items yet. Add a task, event, habit, or meal to shape today.</div>}</Card>
    </div>

    <Card><SectionTitle icon={Sparkles} title="Life progress" sub={`Overall ${overall}% · a practical planner summary, not a health or psychological score`}/><div className="life-bars">{categories.map(([label,pct,Icon])=><div key={label} className="life-bar"><div className="flex items-center gap-2"><Icon size={16}/><b>{label}</b><span>{clamp(pct)}%</span></div><div><i style={{width:`${clamp(pct)}%`}}/></div></div>)}</div></Card>

    <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
      <Card><SectionTitle icon={Plus} title="Quick actions" sub="Jump directly into the planner tools you already use"/><div className="quick-grid">{quick.map(([label,page,Icon])=><button key={page} onClick={()=>navigate(page)}><Icon size={18}/><span>{label}</span></button>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-3"><button className="btn btn-primary" onClick={()=>navigate("daily")}>Plan My Day</button><button className="btn btn-soft" onClick={()=>navigate("assistant","Одоо юу хийх вэ?")}>What Should I Do Now?</button><button className="btn btn-ghost" onClick={()=>navigate("assistant","Өнөөдрийн явцаа дүгнэ")}>Review My Day</button></div></Card>
      <Card><SectionTitle icon={Sparkles} title="Smart insights" sub="Only from information saved in your planner"/>{insights.length?<div className="space-y-2">{insights.slice(0,4).map(x=><div key={x} className="insight-row"><Sparkles size={15}/><span>{x}</span></div>)}</div>:<div className="soft-empty">Add today’s tasks, courses, water, or habit check-ins to see useful patterns here.</div>}</Card>
    </div>

    <section className="assistant-callout"><div><div className="assistant-mark"><Bot size={22}/></div><h2 className="serif mt-4 text-3xl font-bold">Ask me anything about your day.</h2><p className="mt-2 text-sm text-[#f1dfe5]">Your offline assistant reads the same planner data—nothing new to maintain.</p></div><div className="prompt-list">{prompts.map(p=><button key={p} onClick={()=>navigate("assistant",p)}>{p}<ArrowRight size={15}/></button>)}</div></section>
  </div>;
}
