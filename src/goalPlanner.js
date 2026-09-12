import {localDateKey} from "./dateUtils.js";

export function makeGoalPlan(goal,now=new Date()){
 const steps=(Array.isArray(goal?.steps)?goal.steps:[]).map(x=>typeof x==="string"?x:x?.text).filter(Boolean);
 if(!steps.length)return null;
 const today=localDateKey(now);
 return {
  generatedAt:new Date().toISOString(),
  milestones:steps.map((text,index)=>({id:`${goal.id}-step-${index}`,text,done:false})),
  monthly:steps.map((text,index)=>({text,order:index+1})),
  weekly:steps.slice(0,Math.min(4,steps.length)).map(text=>({text})),
  today:{text:steps[0],date:today,sourceId:`goal:${goal.id}:step:0`}
 };
}
