const weekdays={
  "ням":0,"sunday":0,
  "даваа":1,"monday":1,
  "мягмар":2,"tuesday":2,
  "лхагва":3,"wednesday":3,
  "пүрэв":4,"thursday":4,
  "баасан":5,"friday":5,
  "бямба":6,"saturday":6
};

export function localDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function validDate(year,month,day){
  const date=new Date(year,month-1,day,12);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?localDateKey(date):"";
}

export function dateFromText(text,now=new Date()){
  const q=String(text||"").toLocaleLowerCase("mn-MN");
  let match=q.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
    ||q.match(/\b(\d{4})\s*оны\s*(\d{1,2})\s*сарын\s*(\d{1,2})/);
  if(match)return validDate(Number(match[1]),Number(match[2]),Number(match[3]));
  match=q.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
  if(match)return validDate(Number(match[3]),Number(match[2]),Number(match[1]));

  const date=new Date(now);date.setHours(12,0,0,0);
  if(/нөгөөдөр|day after tomorrow/.test(q))date.setDate(date.getDate()+2);
  else if(/маргааш|tomorrow/.test(q))date.setDate(date.getDate()+1);
  else if(!/өнөөдөр|today/.test(q)){
    for(const [name,day] of Object.entries(weekdays))if(q.includes(name)){
      let add=(day-date.getDay()+7)%7;if(!add)add=7;
      date.setDate(date.getDate()+add);break;
    }
  }
  return localDateKey(date);
}

export function containsDate(text){
  return /өнөөдөр|маргааш|нөгөөдөр|today|tomorrow|day after tomorrow|(?:ням|даваа|мягмар|лхагва|пүрэв|баасан|бямба)(?:\s*гарагт)?|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{4}\b|\b\d{4}\s*оны\s*\d{1,2}\s*сарын\s*\d{1,2}/i.test(text);
}
