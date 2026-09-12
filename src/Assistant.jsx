import React, { useMemo, useRef, useState } from "react";
import { Bot, CalendarDays, CheckCircle2, GraduationCap, ListChecks, Plus, Repeat2, Send, Sparkles, Target, WalletCards } from "lucide-react";
import { nextAction, planText } from "./smartPlanner";
import {financeStats,goalStats} from "./smartFinance";
import {wellnessStats} from "./Wellness";
import {educationAnswer,executeAssistantCommand} from "./assistantActions";
import {localDateKey} from "./dateUtils.js";

const prompts=[
  "Өнөөдөр юу хийх вэ?",
  "Одоо юу хийх вэ?",
  "Маргаашийн хуваарь гарга",
  "Энэ долоо хоногт юу хийх вэ?",
  "Миний GPA ямар байна?",
  "GPA 3.8 хүрэхийн тулд яах вэ?",
  "Өнөөдөр ус хэр уусан бэ?",
  "Өнөөдөр өөртөө хэр сайн анхаарсан бэ?",
  "Ямар зуршлаа хийх үлдсэн бэ?",
  "Өнөөдөр юу идэх вэ?",
  "Маргаашийн wellness plan гарга",
  "Миний энэ сарын санхүү ямар байна?",
  "Би зорилгодоо хүрэх үү?",
  "Энэ сард хэд хадгалах хэрэгтэй вэ?",
  "Миний нийт амьдралын progress ямар байна?"
];

const quickActions=[
  ["Plan my day","Өнөөдөр юу хийх вэ?",CalendarDays],
  ["What should I do now?","Одоо юу хийх вэ?",Sparkles],
  ["Plan tomorrow","Маргааш юу хийх вэ?",CalendarDays],
  ["Check my GPA","Миний GPA ямар байна?",GraduationCap],
  ["Review my finances","Миний энэ сарын санхүү ямар байна?",WalletCards],
  ["Review my goals","Миний зорилгуудын явц ямар байна?",Target]
];

const gradePoints={A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,"C+":2.3,C:2,"C-":1.7,D:1,F:0};
const dateKey=localDateKey;
const money=n=>new Intl.NumberFormat("mn-MN").format(Number(n)||0)+" ₮";
const prettyDate=d=>new Intl.DateTimeFormat("mn-MN",{month:"long",day:"numeric",weekday:"long"}).format(d);
const list=(items,empty)=>items.length?items.map(item=>`• ${item}`).join("\n"):empty;

function gpaStats(education={}){
  const courses=(education.semesters||[]).flatMap(s=>s.courses||[]);
  const credits=courses.reduce((sum,c)=>sum+Number(c.credits||0),0);
  const points=courses.reduce((sum,c)=>sum+Number(c.credits||0)*(gradePoints[c.grade]??0),0);
  return {credits,points,gpa:credits?points/credits:0};
}

function buildResponse(raw,data){
  const q=raw.toLocaleLowerCase("mn-MN").trim();
  const now=new Date();
  const today=dateKey(now);
  const tomorrowDate=new Date(now); tomorrowDate.setDate(now.getDate()+1);
  const tomorrow=dateKey(tomorrowDate);
  const tasks=data.tasks||[];
  const events=data.events||[];
  const habits=(data.habits||[]).filter(h=>h.active);
  const finance=data.finance||{income:0,savings:0,expenses:[]};
  const education=data.education||{};
  const wellness=wellnessStats(data,today);

  if(q.includes("маргааш")&&q.includes("wellness")){
    const tomorrowMeal=data.meals?.[tomorrow]||{};
    const meals=[["08:00","Breakfast",tomorrowMeal.breakfast],["13:00","Lunch",tomorrowMeal.lunch],["19:00","Dinner",tomorrowMeal.dinner]].map(([time,label,value])=>`${time} — ${label}${value?`: ${value}`:" төлөвлөх"}`);
    return `Маргаашийн simple wellness plan\n\n08:00 — Өдрийг 1 аяга усаар эхлүүлэх\n${meals.join("\n")}\n11:00 — Усны progress шалгах\n17:00 — ${habits.length?`Habit check: ${habits.map(h=>h.name).join(", ")}`:"Нэг жижиг зуршил сонгох"}\n21:00 — 8 аяганы зорилго, habit-уудаа тоймлох\n\nЭнэ нь planner-ийн мэдээлэлд суурилсан ерөнхий төлөвлөгөө бөгөөд эмнэлгийн зөвлөгөө биш.`;
  }
  if(q.includes("өөртөө")&&q.includes("анхаарсан")){
    return `Today's Wellness Score: ${wellness.score}/100\n\n• Ус: ${wellness.water}/8 аяга (${wellness.waterPct}%)\n• Зуршил: ${wellness.habitDone}/${wellness.habits.length} (${wellness.habitPct}%)\n• Хоол: ${wellness.mealDone}/3 төлөвлөсөн (${wellness.mealPct}%)\n\n${wellness.score>=80?"Өнөөдрийн өөртөө анхаарах хэмнэл тогтвортой байна.":wellness.score>=50?"Сайн эхлэл байна — үлдсэн нэг жижиг хэсгээ дуусгаарай.":"Жижиг алхмаас эхлээрэй: нэг аяга ус эсвэл нэг habit."}\n\nЭнэ оноо нь зөвхөн planner completion бөгөөд эрүүл мэндийн онош биш.`;
  }
  if(q.includes("зурш")&&(q.includes("үлдсэн")||q.includes("хийх"))){
    const pending=habits.filter(h=>!h.log?.[today]);
    return `Өнөөдөр хийх үлдсэн зуршил (${pending.length}):\n${list(pending.map(h=>h.name),"• Бүх зуршлаа хийсэн байна")}`;
  }

  if(q.includes("амьдрал")&&(q.includes("progress")||q.includes("явц"))){
    const done=tasks.filter(x=>x.done).length,taskPct=tasks.length?Math.round(done/tasks.length*100):0;
    const habitLogs=habits.flatMap(h=>Object.values(h.log||{})),habitPct=habitLogs.length?Math.round(habitLogs.filter(Boolean).length/habitLogs.length*100):0;
    const gs=(data.goals||[]).map(g=>goalStats(g,finance)),goalPct=gs.length?Math.round(gs.reduce((s,g)=>s+g.progress,0)/gs.length):0;
    const fs=financeStats(finance),stats=gpaStats(education),water=Number(data.water?.[today]||0);
    return `Таны Life Progress:\n\n• Tasks: ${taskPct}% (${done}/${tasks.length})\n• Habits: ${habitPct}%\n• GPA: ${stats.credits?stats.gpa.toFixed(2):"мэдээлэл дутуу"}\n• Finance: хадгаламжийн хувь ${fs.income?Math.round(fs.savingsRate)+"%":"мэдээлэл дутуу"}\n• Goals: ${goalPct}%\n• Water: ${water}/8\n\n${taskPct<50?"Эхлээд нээлттэй task-аас нэгийг дуусгаарай.":goalPct<50?"Өнөөдөр нэг зорилгодоо жижиг ахиц нэмээрэй.":"Тогтвортой ахицтай байна — өнөөдрийн хэмнэлээ хадгалаарай."}`;
  }

  if(q.includes("одоо")&&q.includes("юу хийх")){
    const action=nextAction(data,now);
    return `Яг одоо хийх хамгийн хэрэгтэй зүйл:\n\n${action.title}\n\n${action.reason}`;
  }

  if(q.includes("маргааш")&&(q.includes("хуваарь")||q.includes("юу хийх"))){
    const open=tasks.filter(t=>(t.date||today)===tomorrow&&!t.done);
    const dayEvents=events.filter(e=>e.date===tomorrow);
    const blocks=[];
    if(open.length) open.forEach((t,i)=>blocks.push(`${9+i*2}:00 — ${t.text}`));
    if(dayEvents.length) dayEvents.forEach(e=>blocks.push(`Тогтсон цаг — ${e.title}`));
    return planText(data,tomorrowDate);
  }
  if(q.includes("энэ долоо хоног")){
    const end=new Date(now); end.setDate(now.getDate()+6);
    const endKey=dateKey(end);
    const weekTasks=tasks.filter(t=>t.date>=today&&t.date<=endKey&&!t.done);
    const weekEvents=events.filter(e=>e.date>=today&&e.date<=endKey);
    return `Ойрын 7 хоногийн зураглал:\n\nХийх ажлууд (${weekTasks.length})\n${list(weekTasks.map(t=>`${t.date} — ${t.text}`),"• Төлөвлөсөн ажил алга")}\n\nКалендарь (${weekEvents.length})\n${list(weekEvents.map(e=>`${e.date} — ${e.title}`),"• Event алга")}\n\nЭхлээд хугацаа нь хамгийн ойр ажлаа сонгоорой.`;
  }
  if(q.includes("өнөөдөр")&&(q.includes("юу хийх")||q.includes("сайн явж")||q.includes("явц"))){
    if(q.includes("юу хийх"))return planText(data,now);
    const open=tasks.filter(t=>(t.date||today)===today&&!t.done);
    const completed=tasks.filter(t=>(t.date||today)===today&&t.done).length;
    const dayEvents=events.filter(e=>e.date===today);
    const pendingHabits=habits.filter(h=>!h.log?.[today]);
    const water=data.water?.[today]||0;
    const total=completed+open.length;
    return `Өнөөдрийн тойм — ${prettyDate(now)}\n\nХийх ажил (${open.length})\n${list(open.map(t=>t.text),"• Бүх task дууссан байна")}\n\nКалендарь\n${list(dayEvents.map(e=>e.title),"• Event алга")}\n\nҮлдсэн habit (${pendingHabits.length})\n${list(pendingHabits.map(h=>h.name),"• Бүгдийг хийсэн байна")}\n\nОдоогийн явц: ${completed}/${total} task, ${water}/8 аяга ус. ${open.length?`Одоо “${open[0].text}” ажлаас эхлэхийг санал болгож байна.`:"Сайхан явж байна — дараагийн зорилгодоо багахан цаг гаргаарай."}`;
  }
  if(q.includes("gpa")&&(q.includes("хүрэх")||q.includes("яах"))){
    const stats=gpaStats(education);
    const requested=Number(q.match(/(?:gpa\s*)?(\d(?:[.,]\d+)?)/)?.[1]?.replace(",","."));
    const target=requested||Number(education.targetGpa||3.8);
    const future=Math.max(1,Number(education.futureCredits||15));
    if(!stats.credits)return `GPA тооцоход хичээл, credit-ийн мэдээлэл хэрэгтэй байна. Education хэсэгт semester болон course-уудаа нэмээд дахин асуугаарай. Таны зорилтот GPA ${target.toFixed(2)} байна.`;
    const needed=(target*(stats.credits+future)-stats.points)/future;
    if(needed>4)return `Одоогийн GPA ${stats.gpa.toFixed(2)} (${stats.credits} credit). Дараагийн ${future} credit-д ${target.toFixed(2)} хүрэхийн тулд ${needed.toFixed(2)} GPA хэрэгтэй бөгөөд энэ нь 4.00-оос өндөр байна. Future credits-ээ нэмэгдүүлж, зорилгод хүрэх хугацааг уртасгаарай.`;
    if(needed<=0)return `Одоогийн GPA ${stats.gpa.toFixed(2)} — ${target.toFixed(2)} зорилгодоо аль хэдийн хүрсэн байна. Дараагийн ${future} credit-д тогтвортой амжилтаа хадгалахад төвлөрөөрэй.`;
    return `Одоогийн GPA ${stats.gpa.toFixed(2)} (${stats.credits} credit). ${target.toFixed(2)} хүрэхийн тулд дараагийн ${future} credit-д дунджаар ${needed.toFixed(2)} GPA авах хэрэгтэй. Хамгийн өндөр credit-тэй хичээлүүдээ түрүүлж төлөвлөж, долоо хоног бүр давтлага хийхийг санал болгож байна.`;
  }
  if(q.includes("gpa")){
    const stats=gpaStats(education);
    return stats.credits?`Таны одоогийн нийт GPA ${stats.gpa.toFixed(2)} байна. Энэ нь ${stats.credits} credit-ийн жигнэсэн дүн. Зорилтот GPA: ${Number(education.targetGpa||3.8).toFixed(2)}.`:"Одоогоор GPA бодох course бүртгэгдээгүй байна. Education хэсэгт semester, course болон дүнгээ нэмээрэй.";
  }
  if(q.includes("санхүү")||q.includes("finance")){
    const s=financeStats(finance);
    return `Энэ сарын санхүүгийн тойм:\n\n• Орлого: ${money(s.income)}\n• Зардал: ${money(s.expenseTotal)}\n• Хадгаламж: ${money(s.savings)} (${Math.round(s.savingsRate)}%)\n• Үлдэгдэл: ${money(s.balance)}\n• Зарцуулалтын түвшин: ${s.spendingLevel}${s.insights.length?`\n\n${s.insights.join("\n")}`:"\n\nИлүү нарийвчилсан insight гаргахад энэ сарын орлого, хадгаламж, зардлаа нэмээрэй."}`;
  }
  if(q.includes("ус")){
    const cups=data.water?.[today]||0;
    return `Өнөөдөр ${cups}/8 аяга ус уусан байна — ойролцоогоор ${(cups*.25).toFixed(2)} литр. ${cups>=8?"Өдрийн зорилгоо биелүүллээ, сайн байна!":`Зорилгодоо хүрэхэд ${8-cups} аяга үлдлээ. Дараагийн аягаа одоо уугаад тэмдэглээрэй.`}`;
  }
  if((q.includes("хэд")&&q.includes("хадгалах"))||q.includes("зорилго")){
    const goals=data.goals||[], stats=goals.map(g=>({goal:g,...goalStats(g,finance)})), active=stats.filter(x=>x.status!=="Completed");
    if(!goals.length)return "Одоогоор зорилго бүртгэгдээгүй байна. Goals хэсэгт target болон deadline-тай зорилго нэмээрэй.";
    if(q.includes("хэд")&&q.includes("хадгалах")){const monthly=active.reduce((s,g)=>s+g.requiredMonthly,0);return monthly?`Санхүүгийн зорилгуудаа хугацаанд нь биелүүлэхийн тулд энэ сард нийт ${money(monthly)} хадгалах хэрэгтэй.\n\n${list(active.filter(g=>g.target).map(g=>`${g.goal.text}: ${money(g.requiredMonthly)}/сар`),"• Target, deadline-тай идэвхтэй зорилго алга")}`:"Тооцоход зорилгодоо target amount болон deadline оруулаарай."}
    return `Зорилгын дүн шинжилгээ:\n\n${stats.map(g=>`• ${g.goal.text}: ${g.progress}% · ${g.status}${g.daysRemaining!==null?` · ${g.daysRemaining} өдөр`:""}${g.target?` · ${money(g.remaining)} үлдсэн`:""}`).join("\n")}\n\n${active.some(g=>g.status==="At risk")?"At risk зорилгын deadline-ийг сунгах эсвэл сарын хадгаламжаа нэмэх хэрэгтэй.":"Одоогийн мэдээллээр зорилгууд тогтвортой явж байна."}`;
  }
  if(q.includes("хоол")||q.includes("идэх")||q.includes("grocery")||q.includes("хүнс")){
    const meal=data.meals?.[today]||{};
    const groceries=(data.groceries||[]).filter(g=>!g.done);
    const planned=[["Өглөө",meal.breakfast],["Өдөр",meal.lunch],["Орой",meal.dinner]].filter(([,v])=>v);
    const available=groceries.slice(0,4).map(g=>g.text.replace(/^Орц:\s*/i,""));
    const suggestion=planned.length?`Planner-т байгаа хоолноос дараагийн төлөвлөсөн сонголт: ${planned[0][1]}.`:available.length?`Жагсаалтад байгаа ${available.join(", ")}-аас энгийн хоол хослуулж болно.`:"Одоогийн мэдээллээр санал болгох орц алга — Meals эсвэл Grocery хэсэгт боломжтой зүйлсээ нэмээрэй.";
    return `Өнөөдрийн хоолны төлөвлөгөө:\n${list(planned.map(([k,v])=>`${k}: ${v}`),"• Хоол төлөвлөөгүй байна")}\n\n${suggestion}\n\nАвах хүнс (${groceries.length})\n${list(groceries.map(g=>g.text),"• Жагсаалт хоосон байна")}`;
  }
  return `Таны planner-ийн мэдээлэлд тулгуурлан тусалж чадна. Өдрийн төлөвлөгөө, task, habit, ус, хоол, санхүү, зорилго эсвэл GPA-гаа асуугаарай. Жишээ нь “Би өнөөдөр хэр сайн явж байна?” гэж асууж болно.`;
}

const actionChips=[
  ["+ Task","Маргааш assignment хийх task нэм",ListChecks],
  ["+ Event","Маргааш 10 цагт маркетингийн хичээл нэм",CalendarDays],
  ["+ Expense","Өнөөдөр 5000₮ кофе авсан",WalletCards],
  ["+ Habit","Reading habit нэм",Repeat2],
  ["+ Goal","Шинэ goal нэм: IELTS 7 авах",Target],
  ["+ Course","Marketing 3 credit A нэм",GraduationCap]
];

export default function Assistant({data,setData,Card,SectionTitle,initialPrompt=""}){
  const [messages,setMessages]=useState(()=>[{id:"welcome",role:"assistant",text:"Сайн уу! Би таны planner дээрх бодит мэдээлэлд тулгуурлан өдөр төлөвлөх, ахиц дүгнэх, санхүү болон GPA тооцоход тусална. Юунаас эхлэх вэ?"},...(initialPrompt?[{id:"initial-user",role:"user",text:initialPrompt},{id:"initial-answer",role:"assistant",text:buildResponse(initialPrompt,data)}]:[])]);
  const [value,setValue]=useState("");
  const [pending,setPending]=useState(null);
  const endRef=useRef(null);
  const suggestions=useMemo(()=>prompts,[]);
  function ask(text){
    const query=text.trim(); if(!query)return;
    if(pending&&/^(тийм|зөвшөөр|батал|yes)$/i.test(query)){confirmPending();setValue("");return}
    if(pending&&/^(үгүй|цуцал|болих|no)$/i.test(query)){setPending(null);setMessages(current=>[...current,{id:`u-${Date.now()}`,role:"user",text:query},{id:`a-${Date.now()}`,role:"assistant",text:"Үйлдлийг цуцаллаа. Мэдээлэл өөрчлөгдөөгүй."}]);setValue("");return}
    const result=executeAssistantCommand(data,query);
    const education=educationAnswer(data,query);
    let response;
    if(result.actions.length){setPending({query,actions:result.actions});response=`Дараах өөрчлөлтийг хийх үү?\n\n${result.actions.map(x=>`• ${x}`).join("\n")}\n\nБаталсны дараа л мэдээлэл өөрчлөгдөнө.`}
    else response=result.question||education||buildResponse(query,data);
    setMessages(current=>[...current,{id:`u-${Date.now()}`,role:"user",text:query},{id:`a-${Date.now()}`,role:"assistant",text:response}]);
    setValue("");
    requestAnimationFrame(()=>endRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}));
  }
  function confirmPending(){
    if(!pending)return;const result=executeAssistantCommand(data,pending.query);
    if(!result.actions.length){setMessages(current=>[...current,{id:`a-${Date.now()}`,role:"assistant",text:"Өөрчлөх мэдээлэл олдсонгүй. Planner өөрчлөгдөөгүй."}]);setPending(null);return}
    setData(current=>executeAssistantCommand(current,pending.query).data);
    setMessages(current=>[...current,{id:`a-${Date.now()}`,role:"assistant",text:`Өөрчлөлт хадгалагдлаа.\n${result.actions.map(x=>`• ${x}`).join("\n")}`}]);setPending(null);
  }
  return <div className="space-y-5">
    <div className="assistant-hero overflow-hidden rounded-[28px] bg-[#7b3f55] p-6 text-white shadow-xl md:p-8">
      <div className="relative z-10 max-w-2xl"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Sparkles size={22}/></div><h1 className="serif text-3xl font-bold md:text-4xl">Таны өдөр тутмын туслах</h1><p className="mt-2 text-sm leading-6 text-[#f4e7eb]">Planner доторх мэдээллийг нэгтгэн харж, яг одоо хэрэгтэй дараагийн алхмыг санал болгоно.</p></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex min-h-[620px] flex-col !p-0 overflow-hidden">
        <div className="border-b border-[#eadde1] p-4 md:p-5"><SectionTitle icon={Bot} title="AI Assistant" sub="Offline · Таны мэдээлэл зөвхөн энэ planner-т үлдэнэ"/></div>
        <div className="assistant-chat flex-1 space-y-4 overflow-y-auto p-4 md:p-6" aria-live="polite">
          {messages.map(message=><div key={message.id} className={`flex ${message.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[88%] whitespace-pre-line rounded-3xl px-4 py-3 text-sm leading-6 md:max-w-[76%] ${message.role==="user"?"rounded-br-lg bg-[#7b3f55] text-white":"rounded-bl-lg border border-[#eadde1] bg-[#fbf7f7] text-[#553b45]"}`}>{message.text}</div></div>)}
          <div ref={endRef}/>
        </div>
        {pending&&<div className="confirmation-bar" role="alert"><span>Энэ өөрчлөлтийг батлах уу?</span><button className="btn btn-primary" type="button" onClick={confirmPending}>Тийм, өөрчил</button><button className="btn btn-ghost" type="button" onClick={()=>setPending(null)}>Цуцлах</button></div>}
        <div className="border-t border-[#eadde1] bg-[#fffdfc] p-3 md:p-4"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{actionChips.map(([label,prompt,Icon])=><button key={label} type="button" onClick={()=>{setValue(prompt)}} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#e7d7dc] bg-white px-3 py-1.5 text-xs font-extrabold text-[#713a50] transition hover:bg-[#f5e8ed]"><Icon size={14}/>{label}</button>)}</div><form onSubmit={e=>{e.preventDefault();ask(value)}} className="flex items-end gap-2"><textarea rows="1" className="field min-h-11 resize-none" value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask(value)}}} placeholder="Команд эсвэл асуултаа бичээрэй..." aria-label="Assistant-д команд бичих"/><button className="btn btn-primary flex h-11 w-11 shrink-0 items-center justify-center !p-0" aria-label="Илгээх"><Send size={18}/></button></form></div>
      </Card>
      <div className="space-y-5">
        <Card><h3 className="flex items-center gap-2 font-extrabold text-[#4a313b]"><CheckCircle2 size={18} className="text-[#7b3f55]"/>Recent AI Actions</h3><div className="mt-3 space-y-2">{(data.aiActions||[]).slice(0,5).map(action=><div key={action.id} className="flex gap-2 rounded-xl bg-[#f8f1f3] p-2.5 text-xs font-semibold text-[#694454]"><span className="text-[#708a75]">✓</span><span>{action.text}</span></div>)}{!(data.aiActions||[]).length&&<p className="text-xs leading-5 text-[#9b7d87]">Таны хийлгэсэн үйлдлүүд энд харагдана.</p>}</div></Card>
        <Card><h3 className="font-extrabold text-[#4a313b]">Quick actions</h3><div className="mt-3 space-y-2">{quickActions.map(([label,prompt,Icon])=><button key={label} onClick={()=>ask(prompt)} className="flex w-full items-center gap-3 rounded-2xl border border-[#eadde1] bg-[#fffdfc] p-3 text-left text-sm font-bold text-[#694454] transition hover:-translate-y-0.5 hover:bg-[#f8edf1]"><span className="rounded-xl bg-[#f5e8ed] p-2"><Icon size={17}/></span>{label}</button>)}</div></Card>
        <Card><h3 className="font-extrabold text-[#4a313b]">Санал болгох асуултууд</h3><div className="mt-3 flex flex-wrap gap-2 xl:block xl:space-y-2">{suggestions.map(prompt=><button key={prompt} onClick={()=>ask(prompt)} className="rounded-full bg-[#f5e8ed] px-3 py-2 text-left text-xs font-bold text-[#713a50] transition hover:bg-[#ead5dd] xl:block xl:w-full xl:rounded-xl">{prompt}</button>)}</div></Card>
      </div>
    </div>
  </div>;
}
