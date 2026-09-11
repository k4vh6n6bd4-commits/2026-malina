import React, { useMemo, useState } from "react";
import {
  BookOpen, ChevronRight, GraduationCap, Plus, Target, Trash2, TrendingUp
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const gradePoints={A:4,"A-":3.7,"B+":3.3,B:3,"B-":2.7,"C+":2.3,C:2,"C-":1.7,D:1,F:0};
const grades=Object.keys(gradePoints);
const freshCourse=()=>({name:"",credits:"3",grade:"A"});
const id=()=>crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

function calculate(courses=[]){
  const credits=courses.reduce((sum,course)=>sum+Number(course.credits||0),0);
  const points=courses.reduce((sum,course)=>sum+Number(course.credits||0)*gradePoints[course.grade],0);
  return {credits,points,gpa:credits?points/credits:0};
}

function Stat({label,value,detail}){
  return <div className="rounded-2xl border border-[#eadde1] bg-[#fffdfc] p-4">
    <div className="text-xs font-bold uppercase tracking-widest text-[#a07d89]">{label}</div>
    <div className="serif mt-2 text-3xl font-bold text-[#633848]">{value}</div>
    {detail&&<div className="mt-1 text-xs text-[#967683]">{detail}</div>}
  </div>
}

export default function Education({education,onChange,Card,SectionTitle,Empty,notify}){
  const [semesterName,setSemesterName]=useState("");
  const [selected,setSelected]=useState(education.semesters.at(-1)?.id||"");
  const [course,setCourse]=useState(freshCourse);
  const allCourses=education.semesters.flatMap(semester=>semester.courses||[]);
  const overall=calculate(allCourses);
  const active=education.semesters.find(semester=>semester.id===selected) || education.semesters.at(-1);
  const target=Number(education.targetGpa||3.8);
  const futureCredits=Math.max(1,Number(education.futureCredits||15));
  const needed=(target*(overall.credits+futureCredits)-overall.points)/futureCredits;
  const progress=overall.credits?Math.min(100,Math.max(0,overall.gpa/target*100)):0;

  const history=useMemo(()=>{
    let credits=0,points=0;
    return education.semesters.map(semester=>{
      const result=calculate(semester.courses);
      credits+=result.credits;points+=result.points;
      return {name:semester.name,semester:Number(result.gpa.toFixed(2)),cumulative:Number((credits?points/credits:0).toFixed(2))};
    });
  },[education.semesters]);

  function update(next){onChange({...education,...next})}
  function addSemester(){
    const name=semesterName.trim(); if(!name)return;
    const semester={id:id(),name,courses:[]};
    update({semesters:[...education.semesters,semester]});setSelected(semester.id);setSemesterName("");notify("Semester нэмэгдлээ");
  }
  function deleteSemester(semesterId){
    if(!confirm("Энэ semester болон бүх хичээлийг устгах уу?"))return;
    const semesters=education.semesters.filter(x=>x.id!==semesterId);update({semesters});setSelected(semesters.at(-1)?.id||"");
  }
  function addCourse(){
    if(!active||!course.name.trim()||Number(course.credits)<=0)return;
    const semesters=education.semesters.map(s=>s.id===active.id?{...s,courses:[...(s.courses||[]),{...course,id:id(),name:course.name.trim(),credits:Number(course.credits)}]}:s);
    update({semesters});setCourse(freshCourse());notify("Course нэмэгдлээ");
  }
  function deleteCourse(courseId){
    update({semesters:education.semesters.map(s=>s.id===active.id?{...s,courses:s.courses.filter(c=>c.id!==courseId)}:s)});
  }

  return <div className="space-y-5">
    <div className="overflow-hidden rounded-[28px] bg-[#7b3f55] text-white shadow-xl">
      <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_.8fr] md:p-8">
        <div><div className="flex items-center gap-2 text-sm font-bold text-[#f1dce4]"><GraduationCap size={18}/> Education Dashboard</div><h1 className="serif mt-3 text-3xl font-bold md:text-4xl">Build the GPA you want.</h1><p className="mt-2 max-w-xl text-sm text-[#f4e7eb]">Semester бүрийн ахицыг нэг дор хянаж, дараагийн зорилгоо бодитоор төлөвлө.</p></div>
        <div className="rounded-3xl bg-white/10 p-4 backdrop-blur"><div className="flex items-end justify-between"><span className="text-sm text-[#f1dce4]">Target progress</span><b>{progress.toFixed(0)}%</b></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#f5dce5] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-3 flex items-center justify-between text-xs"><span>{overall.gpa.toFixed(2)} current</span><ChevronRight size={16}/><span>{target.toFixed(2)} target</span></div></div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Current GPA" value={overall.gpa.toFixed(2)} detail="Cumulative weighted GPA"/>
      <Stat label="Target GPA" value={target.toFixed(2)} detail="Your GPA goal"/>
      <Stat label="Total credits" value={overall.credits} detail="GPA credits completed"/>
      <Stat label="Current courses" value={active?.courses?.length||0} detail={active?.name||"No semester yet"}/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Card><SectionTitle icon={BookOpen} title="GPA Tracker" sub="Semester болон хичээлүүд"/>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {education.semesters.map(semester=><button key={semester.id} onClick={()=>setSelected(semester.id)} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-bold ${active?.id===semester.id?"bg-[#7b3f55] text-white":"bg-[#f5e8ed] text-[#713a50]"}`}>{semester.name}</button>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input className="field" value={semesterName} onChange={e=>setSemesterName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSemester()} placeholder="Жишээ: 2026 Spring"/><button className="btn btn-soft" onClick={addSemester}><Plus size={18} className="inline"/> Semester</button></div>
        {active?<div className="mt-5">
          <div className="mb-3 flex items-center justify-between"><div><h3 className="font-extrabold">{active.name}</h3><div className="text-xs text-[#967683]">Semester GPA: {calculate(active.courses).gpa.toFixed(2)}</div></div><button onClick={()=>deleteSemester(active.id)} className="rounded-xl p-2 text-[#a35d6c] hover:bg-red-50" aria-label="Delete semester"><Trash2 size={17}/></button></div>
          <div className="grid gap-2 md:grid-cols-[1fr_110px_110px_auto]"><input className="field" value={course.name} onChange={e=>setCourse({...course,name:e.target.value})} placeholder="Course name"/><input className="field" type="number" min="0.5" step="0.5" value={course.credits} onChange={e=>setCourse({...course,credits:e.target.value})} aria-label="Credits"/><select className="field" value={course.grade} onChange={e=>setCourse({...course,grade:e.target.value})} aria-label="Letter grade">{grades.map(g=><option key={g}>{g}</option>)}</select><button className="btn btn-primary" onClick={addCourse}><Plus size={18}/></button></div>
          <div className="mt-4 space-y-2">{active.courses.length?active.courses.map(c=><div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-2xl bg-[#fbf7f7] p-3"><div className="min-w-0 truncate font-semibold">{c.name}</div><span className="text-xs text-[#967683]">{c.credits} cr</span><b className="rounded-xl bg-[#f0e0e6] px-3 py-1 text-[#713a50]">{c.grade}</b><button onClick={()=>deleteCourse(c.id)} aria-label={`Delete ${c.name}`}><Trash2 size={16}/></button></div>):<Empty text="Энэ semester-т course нэмээгүй байна."/>}</div>
        </div>:<div className="mt-5"><Empty text="Эхний semester-ээ нэмээд GPA tracking эхлүүлээрэй."/></div>}
      </Card>

      <Card><SectionTitle icon={Target} title="GPA Goal" sub="Дараагийн credit-ийн шаардлага"/>
        <label className="text-sm font-bold">Target GPA<input className="field mt-1" type="number" min="0" max="4" step="0.01" value={education.targetGpa} onChange={e=>update({targetGpa:Number(e.target.value)})}/></label>
        <label className="mt-3 block text-sm font-bold">Future credits<input className="field mt-1" type="number" min="1" step="1" value={education.futureCredits} onChange={e=>update({futureCredits:Number(e.target.value)})}/></label>
        <div className="mt-4 rounded-2xl bg-[#f5e8ed] p-4"><div className="text-xs font-bold uppercase tracking-wider text-[#967683]">GPA needed next</div><div className="serif mt-1 text-4xl font-bold text-[#633848]">{overall.credits?Math.max(0,needed).toFixed(2):target.toFixed(2)}</div><p className="mt-2 text-xs text-[#825c6b]">{needed>4?"This target needs more credits or a longer timeline.":needed<=0?"You have already reached this target.":`Average needed across the next ${futureCredits} credits.`}</p></div>
      </Card>
    </div>

    <Card><SectionTitle icon={TrendingUp} title="Semester History" sub="Semester GPA ба cumulative progression"/>
      {history.length?<div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={history} margin={{top:10,right:12,left:-18,bottom:8}}><CartesianGrid stroke="#eadde1" strokeDasharray="4 4"/><XAxis dataKey="name" tick={{fontSize:11,fill:"#8b6b77"}}/><YAxis domain={[0,4]} ticks={[0,1,2,3,4]} tick={{fontSize:11,fill:"#8b6b77"}}/><Tooltip/><Line type="monotone" dataKey="semester" stroke="#b98599" strokeWidth={2} dot={{r:4}}/><Line type="monotone" dataKey="cumulative" stroke="#7b3f55" strokeWidth={3} dot={{r:5}}/></LineChart></ResponsiveContainer></div>:<Empty text="Semester history chart course нэмсний дараа харагдана."/>}
      {history.length>0&&<div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[#825c6b]"><span><i className="mr-2 inline-block h-2 w-5 rounded bg-[#b98599]"/>Semester GPA</span><span><i className="mr-2 inline-block h-2 w-5 rounded bg-[#7b3f55]"/>Cumulative GPA</span></div>}
    </Card>
  </div>
}
