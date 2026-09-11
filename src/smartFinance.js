export const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const monthKey=(d=new Date())=>dateKey(d).slice(0,7);
const num=value=>Number(value)||0;
export function financeStats(finance={},now=new Date()){
  const currentMonth=monthKey(now), previousMonth=monthKey(new Date(now.getFullYear(),now.getMonth()-1,1)), expenses=finance.expenses||[];
  const current=expenses.filter(x=>(x.date||dateKey(now)).startsWith(currentMonth)), previous=expenses.filter(x=>(x.date||"").startsWith(previousMonth));
  const expenseTotal=current.reduce((s,x)=>s+num(x.amount),0), previousTotal=previous.reduce((s,x)=>s+num(x.amount),0);
  const income=num(finance.monthlyIncome?.[currentMonth]??finance.income), savings=num(finance.monthlySavings?.[currentMonth]??finance.savings);
  const categories=current.reduce((a,x)=>(a[x.category||"Бусад"]=(a[x.category||"Бусад"]||0)+num(x.amount),a),{}), topCategory=Object.entries(categories).sort((a,b)=>b[1]-a[1])[0]||null;
  const savingsRate=income?savings/income*100:0, trendPct=previousTotal?(expenseTotal-previousTotal)/previousTotal*100:null;
  const months=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1),key=monthKey(d);return {key,label:new Intl.DateTimeFormat("mn-MN",{month:"short"}).format(d),amount:expenses.filter(x=>(x.date||"").startsWith(key)).reduce((s,x)=>s+num(x.amount),0)}});
  const insights=[];if(topCategory)insights.push(`Энэ сард хамгийн их зарцуулсан ангилал: ${topCategory[0]}`);if(income&&savings)insights.push(`Та орлогынхоо ${Math.round(savingsRate)}%-ийг хадгалж байна.`);if(trendPct!==null)insights.push(`Өмнөх сараас зарлага ${Math.abs(Math.round(trendPct))}% ${trendPct>=0?"өссөн":"буурсан"}.`);
  return {income,savings,expenseTotal,balance:income-expenseTotal-savings,savingsRate,categories,topCategory,trendPct,months,insights,spendingLevel:!income?"Мэдээлэл дутуу":expenseTotal>income*.8?"Өндөр":expenseTotal>income*.5?"Дунд":"Хэвийн",currentMonth};
}
export function goalStats(goal,finance={},now=new Date()){
  const target=num(goal.target),current=num(goal.current),remaining=Math.max(0,target-current),deadline=goal.deadline?new Date(`${goal.deadline}T23:59:59`):null;
  const daysRemaining=deadline?Math.max(0,Math.ceil((deadline-now)/86400000)):null,progress=target?Math.min(100,Math.round(current/target*100)):(goal.done?100:0),monthsRemaining=daysRemaining===null?null:Math.max(1,daysRemaining/30.44);
  const requiredMonthly=monthsRemaining?remaining/monthsRemaining:0,requiredWeekly=daysRemaining!==null?remaining/Math.max(1,daysRemaining/7):0,availableSavings=financeStats(finance,now).savings,completed=goal.done||progress>=100,realistic=!target||completed||!deadline?null:availableSavings>=requiredMonthly;
  return {target,current,remaining,daysRemaining,progress,requiredMonthly,requiredWeekly,realistic,status:completed?"Completed":deadline&&(!daysRemaining||realistic===false)?"At risk":"On track"};
}
