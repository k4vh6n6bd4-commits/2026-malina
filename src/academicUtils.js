export const gradePoints={A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,"C+":2.3,C:2,"C-":1.7,D:1,F:0};

const number=value=>Number.isFinite(Number(value))?Number(value):0;
export const dateTimeValue=(date,time="23:59")=>date?new Date(`${date}T${time||"23:59"}:00`):null;

export function semesterStats(courses=[]){
  const credits=courses.reduce((sum,course)=>sum+number(course.credits),0);
  const points=courses.reduce((sum,course)=>sum+number(course.credits)*(gradePoints[course.grade]??0),0);
  return {credits,points,gpa:credits?points/credits:0};
}

export function courseItems(course={}){
  return [...(course.assessments||[]),...(course.assignments||[]),...(course.exams||[])];
}

export function scoreStats(course={}){
  const items=courseItems(course).filter(item=>number(item.maxPoints)>0);
  const graded=items.filter(item=>item.earnedPoints!==""&&item.earnedPoints!==null&&item.earnedPoints!==undefined);
  const totalPossible=items.reduce((sum,item)=>sum+number(item.maxPoints),0);
  const earned=graded.reduce((sum,item)=>sum+number(item.earnedPoints),0);
  const gradedPossible=graded.reduce((sum,item)=>sum+number(item.maxPoints),0);
  const remainingPossible=items.filter(item=>!graded.includes(item)).reduce((sum,item)=>sum+number(item.maxPoints),0);
  const rawTarget=course.targetScore===""||course.targetScore===null||course.targetScore===undefined?90:number(course.targetScore);
  const targetPercent=Math.min(100,Math.max(0,rawTarget));
  const targetPoints=totalPossible*targetPercent/100;
  const required=Math.max(0,targetPoints-earned);
  const maximum=earned+remainingPossible;
  return {items,totalPossible,earned,gradedPossible,remainingPossible,targetPercent,targetPoints,required,maximum,
    currentPercent:gradedPossible?earned/gradedPossible*100:0,
    targetReached:totalPossible>0&&earned>=targetPoints,
    impossible:totalPossible>0&&maximum+1e-9<targetPoints};
}

export function countdown(date,time,complete=false,now=new Date()){
  if(complete)return "Completed";
  const due=dateTimeValue(date,time);if(!due)return "No date";
  const diff=due-now;if(diff<0)return "Overdue";
  const hours=Math.ceil(diff/3600000),days=Math.ceil(diff/86400000);
  if(hours<=12)return `Due in ${hours} hour${hours===1?"":"s"}`;
  if(days===1)return "Tomorrow";
  if(days<1)return "Due today";
  return `${days} days left`;
}

export function daysUntil(date,time,now=new Date()){
  const due=dateTimeValue(date,time);return due?Math.max(0,Math.ceil((due-now)/86400000)):0;
}

export function preparationTasks(exam,now=new Date()){
  const topics=(exam.topics||[]).map(topic=>typeof topic==="string"?topic:topic.name).filter(Boolean);
  const days=daysUntil(exam.date,exam.time,now);
  const minutes=days>7?45:days>=3?60:days>=1?75:30;
  const focus=days>7?"Spaced review":days>=3?"Focused recall + practice":days>=1?"Weak areas + practice questions":"Light review";
  const tasks=topics.map((name,index)=>({id:crypto?.randomUUID?.()||`${Date.now()}-${index}`,name:`Review ${name}`,done:false,minutes:Math.max(20,Math.round(minutes/Math.min(2,topics.length||1)))}));
  if(topics.length)tasks.push({id:crypto?.randomUUID?.()||`${Date.now()}-practice`,name:days<=2?"Active recall and key practice questions":"Practice questions",done:false,minutes:Math.max(20,Math.round(minutes/2))});
  return {focus,minutes,tasks};
}

export function progressFor(item={}){
  const subtasks=item.subtasks||[];
  return subtasks.length?Math.round(subtasks.filter(task=>task.done).length/subtasks.length*100):Math.min(100,Math.max(0,number(item.progress)));
}

export function validatePoints(maxPoints,earnedPoints){
  const max=number(maxPoints);if(max<=0)return "Maximum points must be greater than 0.";
  if(earnedPoints!==""&&earnedPoints!==null&&earnedPoints!==undefined){const earned=Number(earnedPoints);if(!Number.isFinite(earned)||earned<0)return "Earned points cannot be negative.";if(earned>max)return "Earned points cannot exceed maximum points."}
  return "";
}
