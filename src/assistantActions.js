const gradePoints={A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,"C+":2.3,C:2,"C-":1.7,D:1,F:0};
import {containsDate,dateFromText,localDateKey} from "./dateUtils.js";

const id=()=>crypto?.randomUUID?.()||`ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const key=localDateKey;
const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const lower=s=>s.toLocaleLowerCase("mn-MN").trim();
const clean=s=>s.replace(/[“”".]/g,"").replace(/\s+/g," ").trim();
const money=n=>new Intl.NumberFormat("mn-MN").format(n)+"₮";

export function parseDate(text,now=new Date()){
  return dateFromText(text,now);
}

export function parseTime(text){
  const q=lower(text);
  let match=q.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|т)/);
  let hour,minute;
  if(match){hour=Number(match[1]);minute=Number(match[2])}
  else {match=q.match(/(?:^|\s)(\d{1,2})(?:\s*цагт|\s*цаг)/);if(!match)return "";hour=Number(match[1]);minute=0}
  if(hour<12&&(q.includes("орой")||q.includes("үдээс хойш")||(!q.includes("өглөө")&&hour<=7)))hour+=12;
  if(hour>23)return "";
  return `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
}

export function parseAmount(text){
  const q=lower(text).replace(/,/g,"");
  const m=q.match(/(\d+(?:\.\d+)?)\s*(сая|к|k|₮|төгрөг)?/);if(!m)return 0;
  const multiplier=m[2]==="сая"?1e6:["к","k"].includes(m[2])?1e3:1;
  return Math.round(Number(m[1])*multiplier);
}

function stripCommand(text){return clean(text
  .replace(/өнөөдөр|маргааш|нөгөөдөр|today|tomorrow|day after tomorrow/gi,"").replace(/(?:ням|даваа|мягмар|лхагва|пүрэв|баасан|бямба)\s*гарагт|sunday|monday|tuesday|wednesday|thursday|friday|saturday/gi,"")
  .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{4}\b|\b\d{4}\s*оны\s*\d{1,2}\s*сарын\s*\d{1,2}(?:\s*өдөр)?/gi,"")
  .replace(/(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}\s*цагт/gi,"").replace(/өглөө|өдөр|орой/gi,"")
  .replace(/\s+хийх(?=\s*(?:task|таск)\b)/gi,"")
  .replace(/(?:task|таск|event|эвент|хичээл)\s*(?:нэмээд|нэм|үүсгэ)|(?:task|таск)\s*үүсгэ|нэмээд|нэм|үүсгэ/gi,"")
  .replace(/хийх(?=\s*$)/gi,"").replace(/\s+(?:гэж\s+)?бүртгэ$/gi,"")).replace(/ийн$/i,"");}

function bestMatch(items,text,field){
  const stem=s=>lower(s).replace(/[^\p{L}\p{N}\s]/gu," ").replace(/(?:ийн|ын|ийн|ийг|ыг|аа|ээ|оо|өө)\b/g,"");
  const q=stem(text),ranked=items.map(item=>({item,score:stem(item[field]||"").split(/\s+/).filter(w=>w.length>2&&q.includes(w.replace(/(?:ийн|ын)$/,""))).length})).sort((a,b)=>b.score-a.score);
  return ranked[0]?.score?ranked[0].item:null;
}
function categoryFor(text){const q=lower(text);if(/кофе|coffee/.test(q))return "Кофе";if(/хоол|food|ресторан|lunch/.test(q))return "Хоол";if(/такси|автобус|шатахуун|transport/.test(q))return "Тээвэр";if(/ном|course|сургалт/.test(q))return "Боловсрол";if(/дэлгүүр|хүнс/.test(q))return "Хүнс";return "Бусад"}
function titleBeforeAmount(text){return clean(text.replace(/[\d,.]+\s*(?:₮|төгрөг|к|k|сая)?/gi,"").replace(/өнөөдөр|маргааш|нөгөөдөр|авсан|зарцуулсан|төлсөн|орсон|орлого|цалин|гэж бүртгэ|^бас\s+/gi,""))||"Зардал"}
function splitCommands(raw){return raw.split(/\s*(?:;|\n|\sбас\s|\sтэгээд\s|\sболон\s)\s*/i).map(x=>x.trim()).filter(Boolean)}
function history(action){return {id:id(),at:new Date().toISOString(),text:action}}

export function executeAssistantCommand(source,raw,now=new Date()){
  let data=structuredClone(source),actions=[],questions=[];
  const parts=splitCommands(raw);let carriedDate=key(now);
  for(const part of parts){
    const q=lower(part),hasDate=containsDate(part),date=hasDate?parseDate(part,now):carriedDate,time=parseTime(part);if(hasDate)carriedDate=date;
    if(/бүгд|бүх/.test(q)&&/устга|delete/.test(q)){questions.push("Олон мэдээлэл устгах гэж байна. Яг аль хэсгийн мэдээллийг устгахыг хүсэж байна вэ?");continue}
    if(/өнөөдрийн/.test(q)&&/хуваарь/.test(q)&&/хөнгөн/.test(q)){
      const today=key(now),open=(data.tasks||[]).filter(item=>(item.date||today)===today&&!item.done);
      if(open.length<=3){questions.push("Өнөөдрийн нээлттэй ажил 3-аас ихгүй тул шилжүүлэх шаардлагагүй байна.");continue}
      const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);const nextDate=key(tomorrow),moving=new Set(open.slice(3).map(item=>item.id));
      data.tasks=data.tasks.map(item=>moving.has(item.id)?{...item,date:nextDate}:item);actions.push(`${moving.size} ажлыг ${nextDate} руу шилжүүлж өнөөдрийн хуваарийг хөнгөллөө`);continue
    }
    const mentionedTimes=[...part.matchAll(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|т)/g)].map(match=>`${String(Number(match[1])).padStart(2,"0")}:${match[2]}`);
    if(mentionedTimes.length>=2&&/ажил|task|таск/.test(q)&&/болго|өөрчил|шилжүүл/.test(q)){
      const [from,to]=mentionedTimes,task=(data.tasks||[]).find(item=>item.time===from)||bestMatch(data.tasks||[],part,"text");
      if(!task){questions.push(`${from} цагтай ажил олдсонгүй.`);continue}
      data.tasks=data.tasks.map(item=>item.id===task.id?{...item,time:to}:item);actions.push(`“${task.text}” ажлын цаг ${from}-оос ${to} боллоо`);continue
    }
    if(mentionedTimes.length>=2&&/event|эвент|үйл явдал|уулзалт/.test(q)&&/болго|өөрчил|шилжүүл/.test(q)){
      const [from,to]=mentionedTimes,event=(data.events||[]).find(item=>item.time===from)||bestMatch(data.events||[],part,"title");
      if(!event){questions.push(`${from} цагтай үйл явдал олдсонгүй.`);continue}
      data.events=data.events.map(item=>item.id===event.id?{...item,time:to}:item);actions.push(`“${event.title}” үйл явдлын цаг ${from}-оос ${to} боллоо`);continue
    }
    if(/маргааш/.test(q)&&/ажил|task|таск/.test(q)&&/болго|шилжүүл/.test(q)){
      const task=bestMatch(data.tasks||[],part,"text");if(!task){questions.push("Маргааш руу шилжүүлэх ажлыг олсонгүй.");continue}
      const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);const nextDate=key(tomorrow);
      data.tasks=data.tasks.map(item=>item.id===task.id?{...item,date:nextDate}:item);actions.push(`“${task.text}” ажил ${nextDate} руу шилжлээ`);continue
    }
    if(/хоол/.test(q)&&/нэм|бүртгэ/.test(q)){
      const type=/өглөө/.test(q)?"breakfast":/зууш/.test(q)?"snack":/орой/.test(q)?"dinner":"lunch";
      const name=clean(part.replace(/өнөөдөр|маргааш|өглөөний|өдрийн|оройн|зууш|хоол(?:онд)?|нэм|бүртгэ/gi,""));if(!name){questions.push("Нэмэх хоолны нэрийг бичнэ үү.");continue}
      data.meals={...(data.meals||{}),[date]:{...(data.meals?.[date]||{}),[type]:name}};actions.push(`${name} хоолны төлөвлөгөөнд нэмэгдлээ`);continue
    }
    if(/grocery|хүнс/.test(q)&&/нэм/.test(q)){
      const name=clean(part.replace(/grocery|хүнс(?:ний)?|жагсаалт(?:ад)?|нэм/gi,""));if(!name){questions.push("Нэмэх хүнсээ бичнэ үү.");continue}
      data.groceries=[...(data.groceries||[]),{id:id(),text:name,done:false}];actions.push(`${name} хүнсний жагсаалтад нэмэгдлээ`);continue
    }
    const courseMatch=part.match(/(?:(намар|хавар|зуны|summer|spring|fall)\s*)?(20\d{2})\s*(?:оны\s*)?семестр(?:т|д)?[,:]?\s*(.+?)\s+хичээл\s+(\d+(?:[.,]\d+)?)\s*credit\s*[, ]*([A-F](?:[+-])?)\s*(?:үнэлгээтэй)?(?:\s*нэм)?$/i);
    if(courseMatch){
      const seasonRaw=courseMatch[1],year=courseMatch[2],courseName=clean(courseMatch[3]),credits=Number(courseMatch[4].replace(",",".")),grade=courseMatch[5].toUpperCase();
      const seasonMap={намар:"Намар",хавар:"Хавар",зуны:"Зун",summer:"Summer",spring:"Spring",fall:"Намар"};
      const requestedSemester=seasonRaw?`${seasonMap[lower(seasonRaw)]||seasonRaw} ${year}`:`${year}`;
      let semesters=data.education?.semesters||[];
      let active=semesters.find(s=>lower(s.name)===lower(requestedSemester));
      if(!active){active={id:id(),name:requestedSemester,courses:[]};semesters=[...semesters,active]}
      const item={id:id(),name:courseName,credits,grade};
      data.education={...(data.education||{}),semesters:semesters.map(s=>s.id===active.id?{...s,courses:[...(s.courses||[]),item]}:s)};
      actions.push(`${active.name} · ${item.name} · ${item.credits} credit · ${item.grade} нэмэгдлээ`);continue
    }
    if(/progress/.test(q)&&/%/.test(q)&&/goal|зорилго/.test(q)){const goal=bestMatch(data.goals||[],part,"text"),pct=Math.min(100,Math.max(0,Number(q.match(/(\d+)\s*%/)?.[1])));if(!goal){questions.push("Аль goal-ийн progress-ийг өөрчлөх вэ?");continue}const target=Number(goal.target)||100;data.goals=data.goals.map(g=>g.id===goal.id?{...g,target,current:target*pct/100,done:pct===100}:g);actions.push(`${goal.text} progress ${pct}% боллоо`);continue}
    if(/goal|зорилго/.test(q)&&/нэм|шинэ/.test(q)){
      const deadlineMatch=part.match(/(20\d{2})\s*оны\s*(\d{1,2})\s*сар(?:ын)?(?:\s*(?:сүүл|төгсгөл))?(?:\s*гэхэд|\s*хүртэл)?/i);
      let deadline="";
      if(deadlineMatch){const y=Number(deadlineMatch[1]),m=Number(deadlineMatch[2]);deadline=`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`}
      const amountMatch=part.match(/(\d[\d,._ ]*(?:\.\d+)?)\s*(?:₮|төгрөг|сая|[кk])/i) || part.match(/(\d[\d,._ ]{2,})/i);
      const target=amountMatch?parseAmount(amountMatch[0]):0;
      let name=clean(part.replace(/20\d{2}\s*оны\s*\d{1,2}\s*сар(?:ын)?(?:\s*(?:сүүл|төгсгөл))?(?:\s*гэхэд|\s*хүртэл)?/gi,"").replace(/goal|зорилго|нэм\s*:?/gi,""));
      if(target>0&&!/[₮төгрөг]/i.test(name))name=clean(name);
      if(!name){questions.push("Goal-ийн нэрийг бичнэ үү.");continue}
      const goal={id:id(),text:name,done:false,target,current:0,deadline};
      data.goals=[...(data.goals||[]),goal];actions.push(`${name} goal нэмэгдлээ`);continue
    }
    if(/completed|хийсэн/.test(q)){const habit=bestMatch(data.habits||[],part,"name"),habitDate=hasDate?date:key(now);if(habit){data.habits=data.habits.map(h=>h.id===habit.id?{...h,log:{...(h.log||{}),[habitDate]:true}}:h);actions.push(`${habit.name} · ${habitDate} completed боллоо`);continue}}
    if(/habit|зуршил/.test(q)&&/дууссан|тэмдэглэ|болго/.test(q)){const habit=bestMatch(data.habits||[],part,"name"),habitDate=hasDate?date:key(now);if(!habit){questions.push("Аль habit-ийг completed болгох вэ?");continue}data.habits=data.habits.map(h=>h.id===habit.id?{...h,log:{...(h.log||{}),[habitDate]:true}}:h);actions.push(`${habit.name} · ${habitDate} completed боллоо`);continue}
    if(/habit|зуршил/.test(q)&&/нэм/.test(q)){const name=clean(part.replace(/habit|зуршил|нэм/gi,""));if(!name){questions.push("Habit-ийн нэрийг бичнэ үү.");continue}data.habits=[...(data.habits||[]),{id:id(),name,active:true,log:{}}];actions.push(`${name} habit нэмэгдлээ`);continue}
    if(/дууссан|completed|complete|гүйцэтгэсэн|өндөр priority|high priority|дундаж priority|бага priority|incomplete/.test(q)){const task=bestMatch(data.tasks||[],part,"text");if(task){const values=/өндөр priority|high priority/.test(q)?{priority:"high"}:/дундаж priority/.test(q)?{priority:"medium"}:/бага priority/.test(q)?{priority:"low"}:/incomplete/.test(q)?{done:false}:{done:true};data.tasks=data.tasks.map(t=>t.id===task.id?{...t,...values}:t);actions.push(`${task.text} ${values.priority?`${values.priority} priority`:values.done?"дууссан":"дуусаагүй"} боллоо`);continue}}
    const amount=parseAmount(part),isIncome=/цалин|орлого|орсон|income/.test(q),isFinance=amount>0&&(/₮|төгрөг|\d\s*[кk]\b|сая|авсан|зарцуулсан|төлсөн|цалин|орлого/.test(q));
    if(isFinance){const financeDate=hasDate?date:key(now);if(isIncome){const month=monthKey(new Date(`${financeDate}T12:00:00`)),current=Number(data.finance?.monthlyIncome?.[month]??data.finance?.income??0);data.finance={...(data.finance||{}),monthlyIncome:{...(data.finance?.monthlyIncome||{}),[month]:current+amount}};actions.push(`${money(amount)} орлого бүртгэгдлээ`)}else{const name=titleBeforeAmount(part),category=categoryFor(part);data.finance={...(data.finance||{}),expenses:[...(data.finance?.expenses||[]),{id:id(),name,amount,category,date:financeDate}]};actions.push(`${money(amount)} ${name} expense бүртгэгдлээ`)}continue}
    const isTask=/task|таск/.test(q)||(/assignment|даалгавар/.test(q)&&/нэм|үүсгэ|хийх/.test(q));
    const isEvent=!isTask&&(/meeting|уулзалт|хичээл|event|эвент/.test(q)&&(/нэм|үүсгэ/.test(q)||time));
    if(isTask){const title=stripCommand(part);if(!title){questions.push("Task-ийн нэрийг бичнэ үү.");continue}const priority=/өндөр|high/.test(q)?"high":/бага|low/.test(q)?"low":"medium";data.tasks=[...(data.tasks||[]),{id:id(),text:title,date,time,priority,done:false}];actions.push(`${time?`${time} `:""}${title} task үүслээ`);continue}
    if(isEvent){const title=stripCommand(part);if(!title){questions.push("Event-ийн нэрийг бичнэ үү.");continue}data.events=[...(data.events||[]),{id:id(),title,date,time}];actions.push(`${time?`${time} `:""}${title} event нэмэгдлээ`);continue}
  }
  if(actions.length)data.aiActions=[...actions.map(history),...(data.aiActions||[])].slice(0,20);
  return {data,actions,question:questions[0]||""};
}

export function educationAnswer(data,raw){
  const q=lower(raw),courses=(data.education?.semesters||[]).flatMap(s=>s.courses||[]),credits=courses.reduce((s,c)=>s+Number(c.credits||0),0),points=courses.reduce((s,c)=>s+Number(c.credits||0)*(gradePoints[c.grade]??0),0),gpa=credits?points/credits:0;
  if(!/gpa/.test(q))return "";
  if(!credits)return "GPA тооцоход course болон credit-ийн мэдээлэл хэрэгтэй байна.";
  const target=Number(q.match(/(\d(?:[.,]\d+)?)/)?.[1]?.replace(",","."))||Number(data.education?.targetGpa||3.8);
  if(/хэдэн\s*credit/.test(q)){if(gpa>=target)return `Таны GPA ${gpa.toFixed(2)} — ${target.toFixed(2)} зорилгодоо хүрсэн байна.`;const needed=Math.ceil((target*credits-points)/(4-target));return `${target.toFixed(2)} GPA-д хүрэхийн тулд 4.0 үнэлгээтэй хамгийн багадаа ${Math.max(0,needed)} credit хэрэгтэй.`}
  return `Энэ улирлын GPA ${gpa.toFixed(2)} байна (${credits} credit).`;
}
