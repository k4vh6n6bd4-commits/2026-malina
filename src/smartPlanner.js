import {localDateKey} from "./dateUtils.js";
const key=localDateKey;
const minutes=t=>{const m=String(t||"").match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);return m?Number(m[1])*60+Number(m[2]):null};
const clock=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
const duration=x=>Number(x.duration||x.estimatedDuration||String(x.text||x.title||"").match(/(\d+)\s*(?:min|мин)/i)?.[1])||60;
const words=s=>String(s||"").toLocaleLowerCase("mn-MN").split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>3);

export function priorityFor(task,data,day=key(new Date())){
  let score=0;
  if(task.date<day)score+=7;
  if(task.date===day)score+=4;
  if(task.important||task.priority==="high")score+=5;
  if(task.priority==="medium")score+=2;
  if(/urgent|чухал|шалгалт|deadline|эцсийн|яаралтай/i.test(task.text||""))score+=4;
  const taskWords=words(task.text);
  if((data.goals||[]).some(g=>!g.done&&words(g.text).some(w=>taskWords.includes(w))))score+=3;
  if((data.events||[]).some(e=>e.date===day&&words(e.title).some(w=>taskWords.includes(w))))score+=2;
  return score>=7?{level:"high",label:"High priority",score}:score>=3?{level:"medium",label:"Medium priority",score}:{level:"low",label:"Low priority",score};
}

export function dayPlan(data,date=new Date()){
  const day=key(date), tomorrow=new Date(date); tomorrow.setDate(date.getDate()+1);
  const tasks=(data.tasks||[]).filter(t=>(t.date||day)===day||(!t.done&&t.date&&t.date<day)).map(t=>({...t,smartPriority:priorityFor(t,data,day)})).sort((a,b)=>b.smartPriority.score-a.smartPriority.score);
  const events=(data.events||[]).filter(e=>e.date===day);
  const habits=(data.habits||[]).filter(h=>h.active);
  const open=tasks.filter(t=>!t.done), done=tasks.filter(t=>t.done);
  const habitDone=habits.filter(h=>h.log?.[day]).length, water=Number(data.water?.[day]||0);
  const total=tasks.length+habits.length+1;
  const completed=done.length+habitDone+Math.min(1,water/8);
  const completion=total?Math.round(completed/total*100):0;
  const fixed=events.map(e=>({id:`e-${e.id}`,kind:"event",title:e.title,start:minutes(e.time||e.title),duration:duration(e)}));
  const meal=data.meals?.[day]||{};
  const wellness=[
    {id:"w-breakfast",kind:"wellness",wellnessType:"meal",title:meal.breakfast?`Breakfast — ${meal.breakfast}`:"Breakfast",start:8*60,duration:30},
    {id:"w-water",kind:"wellness",wellnessType:"water",title:"Drink water",start:11*60,duration:5},
    {id:"w-lunch",kind:"wellness",wellnessType:"meal",title:meal.lunch?`Lunch — ${meal.lunch}`:"Lunch",start:13*60,duration:30},
    {id:"w-habits",kind:"wellness",wellnessType:"habit",title:"Habit check",start:17*60,duration:10},
    {id:"w-dinner",kind:"wellness",wellnessType:"meal",title:meal.dinner?`Dinner — ${meal.dinner}`:"Dinner",start:19*60,duration:30}
  ];
  let cursor=9*60;
  const timeline=[...fixed.filter(x=>x.start!==null),...wellness,...open.map(t=>{
    const explicit=minutes(t.time||t.text), len=duration(t);
    if(explicit!==null)return{id:`t-${t.id}`,kind:"task",title:t.text,start:explicit,duration:len,priority:t.smartPriority.level};
    while(fixed.some(e=>e.start!==null&&cursor<e.start+e.duration&&cursor+len>e.start))cursor+=30;
    const block={id:`t-${t.id}`,kind:"task",title:t.text,start:cursor,duration:len,priority:t.smartPriority.level};cursor+=len+15;return block;
  }),...fixed.filter(x=>x.start===null).map((e,i)=>({...e,start:12*60+i*90}))].sort((a,b)=>a.start-b.start);
  return {day,date,tomorrow,tasks,open,done,events,habits,habitDone,water,completion,timeline:timeline.map(x=>({...x,time:clock(x.start)})),goals:(data.goals||[]).filter(g=>!g.done)};
}

export function nextAction(data,now=new Date()){
  const plan=dayPlan(data,now), current=now.getHours()*60+now.getMinutes();
  const upcoming=plan.timeline.find(x=>x.kind==="event"&&x.start>=current&&x.start-current<=60);
  if(upcoming)return {title:upcoming.title,reason:`${upcoming.time}-д эхлэх event-д бэлдэх цаг боллоо.`};
  const task=plan.open.find(t=>!minutes(t.time||t.text)||minutes(t.time||t.text)<=current+30);
  if(task)return {title:task.text,reason:`${task.smartPriority.label} · ${duration(task)} минут төвлөрөөрэй.`};
  const habit=plan.habits.find(h=>!h.log?.[plan.day]);
  if(habit)return {title:habit.name,reason:"Өнөөдрийн дуусаагүй habit-аас эхлээрэй."};
  if(plan.water<8)return {title:"Нэг аяга ус уух",reason:`Усны зорилго ${plan.water}/8 байна.`};
  return {title:"Маргаашийн 3 чухал ажлаа бичих",reason:"Өнөөдрийн төлөвлөгөө дууссан байна."};
}

export function planText(data,date=new Date()){
  const p=dayPlan(data,date), fmt=new Intl.DateTimeFormat("mn-MN",{weekday:"long",month:"long",day:"numeric"});
  const lines=p.timeline.map(x=>`${x.time} — ${x.title}${x.kind==="task"?` — ${x.duration} мин`:""}`);
  return `${fmt.format(date)}-ийн Smart Daily Plan\n\n${lines.length?lines.join("\n"):"Төлөвлөсөн task, event алга."}\n\nHabit: ${p.habitDone}/${p.habits.length} · Ус: ${p.water}/8 · Нийт явц: ${p.completion}%`;
}
