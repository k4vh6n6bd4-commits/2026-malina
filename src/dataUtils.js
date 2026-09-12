const starterHabits = [
  {id:"h1",name:"Ус 2L",active:true,log:{}},
  {id:"h2",name:"20 мин унших",active:true,log:{}},
  {id:"h3",name:"Дасгал / алхалт",active:true,log:{}},
  {id:"h4",name:"Арьс арчилгаа",active:true,log:{}}
];

export const defaultPlannerData = {
  tasks:[], habits:starterHabits, finance:{income:0,savings:0,expenses:[]},
  water:{}, meals:{}, groceries:[], goals:[], events:[], aiActions:[],
  education:{targetGpa:3.8,futureCredits:15,semesters:[]}, dailyReviews:{}
};

const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const list = value => Array.isArray(value) ? value : [];

// Additive-only compatibility migration. Unknown keys are retained for future versions.
export function normalizePlannerData(value, {withStarterHabits=false}={}) {
  const source=object(value), finance=object(source.finance), education=object(source.education);
  const habits=Array.isArray(source.habits) ? source.habits : (withStarterHabits ? starterHabits : []);
  return {
    ...source,
    tasks:list(source.tasks).filter(Boolean),
    habits:habits.filter(Boolean).map(h=>({...object(h),log:object(h?.log)})),
    finance:{...finance,income:Number(finance.income)||0,savings:Number(finance.savings)||0,expenses:list(finance.expenses).filter(Boolean),monthlyIncome:object(finance.monthlyIncome),monthlySavings:object(finance.monthlySavings),monthlyBudget:object(finance.monthlyBudget)},
    water:object(source.water), meals:object(source.meals), groceries:list(source.groceries).filter(Boolean),
    goals:list(source.goals).filter(Boolean), events:list(source.events).filter(Boolean), aiActions:list(source.aiActions).filter(Boolean),
    education:{...education,targetGpa:Number(education.targetGpa)||3.8,futureCredits:Number(education.futureCredits)||15,semesters:list(education.semesters).filter(Boolean).map(s=>({...object(s),courses:list(s?.courses).filter(Boolean)}))},
    dailyReviews:object(source.dailyReviews)
  };
}
