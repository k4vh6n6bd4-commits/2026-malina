import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Brain, CalendarDays, Check, Clock, FileText, Grid3X3, Library,
  Lightbulb, Link2, NotebookPen, Pause, Play, Plus, RotateCcw, Timer, Trash2,
  Target, BookOpen, Search, X
} from "lucide-react";

const arr = value => Array.isArray(value) ? value : [];
const uid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random();
const todayKey = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const shiftDate = (value, delta) => {
  const d = new Date((value || todayKey()) + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const weekStart = value => {
  const d = new Date((value || todayKey()) + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const downloadLabel = value => value || "—";
const MODULES = [
  ["wall", "Суралцах зураглал", CalendarDays], ["semester", "Улирлын зураглал", CalendarDays],
  ["revision", "Давтлагын хуваарь", RotateCcw], ["breakdown", "Даалгаврын алхам", Check],
  ["heatmap", "Ачаалал", Grid3X3], ["confidence", "Ойлголт", Brain],
  ["research", "Судалгааны хүснэгт", Library], ["readiness", "Шалгалтын бэлтгэл", Target],
  ["reflection", "7 хоногийн дүгнэлт", Lightbulb], ["focus", "Төвлөрөх цаг", Timer],
  ["notes", "Холбоотой тэмдэглэл", NotebookPen], ["portfolio", "Бүтээлийн сан", FileText]
];

function Field({ label, children }) {
  return <label className="block min-w-0 text-xs font-bold text-[#694454]">{label}{children}</label>;
}
function Panel({ title, detail, icon: Icon, children }) {
  return <section className="card min-w-0 p-4 md:p-5"><div className="section-title mb-4 flex min-w-0 items-start gap-3"><div className="shrink-0 rounded-2xl bg-[#f5e8ed] p-2 text-[#7b3f55]"><Icon size={20}/></div><div className="min-w-0"><h2 className="text-lg font-extrabold text-[#4a313b]">{title}</h2>{detail && <p className="text-sm text-[#94727e]">{detail}</p>}</div></div>{children}</section>;
}
function Empty({ children }) {
  return <div className="rounded-2xl border border-dashed border-[#dbc8ce] bg-[#fbf7f7] p-5 text-center text-sm text-[#987985]">{children}</div>;
}
function Progress({ value }) {
  const safe = Math.min(100, Math.max(0, Number(value) || 0));
  return <div className="h-2 overflow-hidden rounded-full bg-[#eadde1]"><div className="h-full rounded-full bg-[#8d5366] transition-all" style={{ width: safe + "%" }}/></div>;
}

export default function StudyWallPlanner({ education = {}, onChange, notify = () => {}, today }) {
  const semesters = arr(education.semesters);
  const courses = semesters.flatMap(s => arr(s.courses).map(c => ({ ...c, semesterName: s.name, semesterId: s.id })));
  const extras = education.studyWall && typeof education.studyWall === "object" ? education.studyWall : {};
  const revisions = arr(extras.revisions);
  const sources = arr(extras.sources);
  const notes = arr(extras.notes);
  const reflections = arr(extras.reflections);
  const portfolio = arr(extras.portfolio);
  const focusSessions = arr(extras.focusSessions);
  const [module, setModule] = useState("wall");
  const [courseFilter, setCourseFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [revisionForm, setRevisionForm] = useState({ courseId: "", topic: "", date: today || todayKey() });
  const [confidenceForm, setConfidenceForm] = useState({ courseId: "", topic: "", level: 3 });
  const [sourceForm, setSourceForm] = useState({ courseId: "", title: "", author: "", url: "", method: "", finding: "", notes: "" });
  const [noteForm, setNoteForm] = useState({ courseId: "", topic: "", assignmentId: "", sourceId: "", title: "", body: "" });
  const [reflectionForm, setReflectionForm] = useState({ wins: "", obstacles: "", lesson: "", next: "" });
  const [portfolioForm, setPortfolioForm] = useState({ courseId: "", title: "", type: "Эсээ", date: today || todayKey(), url: "", description: "" });
  const [stepForm, setStepForm] = useState({ assignmentId: "", name: "", dueDate: "", minutes: 30 });
  const [rubricForm, setRubricForm] = useState({ assignmentId: "", name: "", weight: 20 });
  const [focusCourse, setFocusCourse] = useState("");
  const [focusTask, setFocusTask] = useState("");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timerMode, setTimerMode] = useState("focus");
  const [timerLeft, setTimerLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [semesterEdit, setSemesterEdit] = useState({ id: "", startDate: "", endDate: "" });
  const [error, setError] = useState("");
  const selectedSemester = semesters.find(s => s.id === semesterEdit.id) || semesters[0] || null;
  const semesterStartDate = semesterEdit.id === selectedSemester?.id ? semesterEdit.startDate : selectedSemester?.startDate || "";
  const semesterEndDate = semesterEdit.id === selectedSemester?.id ? semesterEdit.endDate : selectedSemester?.endDate || "";

  const assignments = courses.flatMap(c => arr(c.assignments).map(a => ({ ...a, course: c })));
  const exams = courses.flatMap(c => arr(c.exams).map(e => ({ ...e, course: c })));
  const selectedCourses = courses.filter(c => courseFilter === "all" || c.id === courseFilter);
  const courseName = id => courses.find(c => c.id === id)?.name || "Хичээл";
  const patch = value => onChange({ ...education, ...value });
  const patchExtras = value => patch({ studyWall: { ...extras, ...value } });
  const appendExtra = (key, value) => patchExtras({ [key]: [...arr(extras[key]), value] });
  const replaceExtra = (key, id, fn) => patchExtras({ [key]: arr(extras[key]).map(x => x.id === id ? fn(x) : x) });
  const removeExtra = (key, id) => patchExtras({ [key]: arr(extras[key]).filter(x => x.id !== id) });
  const updateCourse = (id, fn) => patch({ semesters: semesters.map(s => ({ ...s, courses: arr(s.courses).map(c => c.id === id ? fn(c) : c) })) });
  const updateAssignment = (id, fn) => {
    const item = assignments.find(a => a.id === id);
    if (!item) return;
    updateCourse(item.course.id, c => ({ ...c, assignments: arr(c.assignments).map(a => a.id === id ? fn(a) : a) }));
  };
  const updateExam = (id, fn) => {
    const item = exams.find(e => e.id === id);
    if (!item) return;
    updateCourse(item.course.id, c => ({ ...c, exams: arr(c.exams).map(e => e.id === id ? fn(e) : e) }));
  };
  const displayAssignments = assignments.filter(a => courseFilter === "all" || a.course.id === courseFilter);
  const displayExams = exams.filter(e => courseFilter === "all" || e.course.id === courseFilter);
  const stepAssignmentId = displayAssignments.some(a => a.id === stepForm.assignmentId)
    ? stepForm.assignmentId
    : displayAssignments[0]?.id || "";
  const rubricAssignmentId = displayAssignments.some(a => a.id === rubricForm.assignmentId)
    ? rubricForm.assignmentId
    : displayAssignments[0]?.id || "";

  function addRevision() {
    if (!revisionForm.courseId || !revisionForm.topic.trim()) return setError("Хичээл болон сэдвээ сонгож бичнэ үү.");
    const base = revisionForm.date || today || todayKey();
    appendExtra("revisions", { id: uid(), courseId: revisionForm.courseId, topic: revisionForm.topic.trim(), originDate: base, step: 0, dueDate: shiftDate(base, 1), intervals: [1, 3, 7, 14], completedDates: [], createdAt: new Date().toISOString() });
    setRevisionForm({ ...revisionForm, topic: "" }); setError(""); notify("Давтлагын цикл үүслээ.");
  }
  function completeRevision(item) {
    const step = Number(item.step || 0);
    if (step >= 3) {
      replaceExtra("revisions", item.id, x => ({ ...x, step: 4, dueDate: "", completed: true, completedDates: [...arr(x.completedDates), today || todayKey()] }));
      notify("Давтлагын цикл дууслаа.");
      return;
    }
    const next = step + 1;
    replaceExtra("revisions", item.id, x => ({ ...x, step: next, lastReviewed: today || todayKey(), dueDate: shiftDate(today || todayKey(), [1, 3, 7, 14][next]), completedDates: [...arr(x.completedDates), today || todayKey()] }));
    notify("Дараагийн давтлагын хугацаа шинэчлэгдлээ.");
  }
  function saveConfidence() {
    if (!confidenceForm.courseId || !confidenceForm.topic.trim()) return setError("Хичээл болон сэдэв шаардлагатай.");
    const value = { id: uid(), topic: confidenceForm.topic.trim(), level: Number(confidenceForm.level), date: today || todayKey() };
    updateCourse(confidenceForm.courseId, c => ({ ...c, confidence: [...arr(c.confidence), value] }));
    setConfidenceForm({ ...confidenceForm, topic: "" }); setError(""); notify("Ойлголтын үнэлгээ хадгалагдлаа.");
  }
  function addSource() {
    if (!sourceForm.title.trim()) return setError("Эх сурвалжийн нэр шаардлагатай.");
    appendExtra("sources", { id: uid(), ...sourceForm, title: sourceForm.title.trim(), createdAt: new Date().toISOString() });
    setSourceForm({ ...sourceForm, title: "", author: "", url: "", method: "", finding: "", notes: "" }); setError("");
  }
  function addNote() {
    if (!noteForm.title.trim() || !noteForm.body.trim()) return setError("Тэмдэглэлийн гарчиг, агуулгыг бөглөнө үү.");
    appendExtra("notes", { id: uid(), ...noteForm, title: noteForm.title.trim(), body: noteForm.body.trim(), createdAt: new Date().toISOString() });
    setNoteForm({ ...noteForm, title: "", body: "" }); setError("");
  }
  function saveReflection() {
    const key = weekStart(today || todayKey());
    if (!reflectionForm.wins.trim() && !reflectionForm.obstacles.trim() && !reflectionForm.lesson.trim() && !reflectionForm.next.trim()) return setError("Дор хаяж нэг талбарыг бөглөнө үү.");
    const old = reflections.find(x => x.week === key);
    const value = { id: old?.id || uid(), week: key, ...reflectionForm, updatedAt: new Date().toISOString() };
    patchExtras({ reflections: old ? reflections.map(x => x.id === old.id ? value : x) : [...reflections, value] });
    setReflectionForm({ wins: "", obstacles: "", lesson: "", next: "" }); setError(""); notify("Долоо хоногийн reflection хадгалагдлаа.");
  }
  function addPortfolio() {
    if (!portfolioForm.title.trim()) return setError("Бүтээлийн нэр шаардлагатай.");
    appendExtra("portfolio", { id: uid(), ...portfolioForm, title: portfolioForm.title.trim(), createdAt: new Date().toISOString() });
    setPortfolioForm({ ...portfolioForm, title: "", url: "", description: "" }); setError("");
  }
  function addSubtask() {
    if (!stepAssignmentId || !stepForm.name.trim()) return setError("Эхлээд даалгавар сонгоод, хийх алхмаа бичнэ үү.");
    updateAssignment(stepAssignmentId, a => ({ ...a, subtasks: [...arr(a.subtasks), { id: uid(), name: stepForm.name.trim(), done: false, dueDate: stepForm.dueDate || "", minutes: Math.max(1, Number(stepForm.minutes) || 30) }] }));
    setStepForm({ ...stepForm, name: "" }); setError(""); notify("Даалгаврын алхам нэмэгдлээ.");
  }
  function addRubric() {
    if (!rubricAssignmentId || !rubricForm.name.trim()) return setError("Даалгавар болон шалгуурын нэр шаардлагатай.");
    const weight = Number(rubricForm.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return setError("Шалгуурын жин 1–100% байна.");
    updateAssignment(rubricAssignmentId, a => ({ ...a, rubric: [...arr(a.rubric), { id: uid(), name: rubricForm.name.trim(), weight, done: false }] }));
    setRubricForm({ ...rubricForm, name: "" }); setError(""); notify("Rubric шалгуур нэмэгдлээ.");
  }
  function toggleSubtask(assignmentId, subtaskId) {
    updateAssignment(assignmentId, a => ({ ...a, subtasks: arr(a.subtasks).map(t => t.id === subtaskId ? { ...t, done: !t.done } : t) }));
  }
  function toggleRubric(assignmentId, rubricId) {
    updateAssignment(assignmentId, a => ({ ...a, rubric: arr(a.rubric).map(t => t.id === rubricId ? { ...t, done: !t.done } : t) }));
  }
  function saveSemesterDates() {
    if (!selectedSemester) return;
    patch({ semesters: semesters.map(s => s.id === selectedSemester.id ? { ...s, startDate: semesterStartDate, endDate: semesterEndDate } : s) });
    notify("Улирлын хугацаа хадгалагдлаа.");
  }
  function saveFocusSession() {
    appendExtra("focusSessions", { id: uid(), date: today || todayKey(), minutes: Number(focusMinutes), courseId: focusCourse, task: focusTask, completed: false, mode: timerMode });
    notify("Төвлөрсөн хугацаа бүртгэгдлээ.");
  }

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => {
      setTimerLeft(current => {
        if (current <= 1) { setTimerRunning(false); setTimerFinished(true); return 0; }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);
  useEffect(() => {
    if (!timerFinished) return;
    setTimerFinished(false);
    if (timerMode === "focus") {
      appendExtra("focusSessions", { id: uid(), date: today || todayKey(), minutes: Number(focusMinutes), courseId: focusCourse, task: focusTask, completed: true, mode: "focus" });
      notify("Pomodoro дууслаа — сесс хадгалагдлаа.");
    } else notify("Завсарлага дууслаа.");
  }, [timerFinished]);
  const timerText = String(Math.floor(timerLeft / 60)).padStart(2, "0") + ":" + String(timerLeft % 60).padStart(2, "0");

  const timeline = useMemo(() => [
    ...assignments.map(a => ({ id: a.id, courseId: a.course.id, title: a.name, date: a.date, kind: "Даалгавар", courseName: a.course.name, status: a.status, minutes: a.estimatedMinutes || 60 })),
    ...exams.map(e => ({ id: e.id, courseId: e.course.id, title: e.name, date: e.date, kind: "Шалгалт", courseName: e.course.name, status: e.status, minutes: e.minutes || 60 }))
  ].filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date)), [education]);
  const semesterCourseIds = new Set(arr(selectedSemester?.courses).map(c => c.id));
  const semesterTimeline = timeline.filter(item => semesterCourseIds.has(item.courseId));
  const weekDates = Array.from({ length: 7 }, (_, index) => shiftDate(weekStart(today || todayKey()), index));
  const workload = weekDates.map(date => {
    const dueMinutes = [...assignments.filter(a => a.date === date && a.status !== "Completed"), ...exams.filter(e => e.date === date && e.status !== "Completed")].reduce((sum, x) => sum + Number(x.estimatedMinutes || x.minutes || 60), 0);
    const focusMinutesForDay = focusSessions.filter(x => x.date === date).reduce((sum, x) => sum + Number(x.minutes || 0), 0);
    return { date, label: new Intl.DateTimeFormat("mn-MN", { weekday: "short" }).format(new Date(date + "T12:00:00")), minutes: dueMinutes + focusMinutesForDay };
  });
  const readiness = exam => {
    const prep = arr(exam.prepTasks);
    const prepScore = prep.length ? prep.filter(t => t.done).length / prep.length * 100 : 0;
    const confidence = arr(exam.course.confidence);
    const average = confidence.length ? confidence.reduce((sum, x) => sum + Number(x.level || 0), 0) / confidence.length / 5 * 100 : 0;
    const courseRevisions = revisions.filter(r => r.courseId === exam.course.id);
    const revisionScore = courseRevisions.length ? courseRevisions.reduce((sum, r) => sum + (r.completed ? 100 : Math.min(100, Number(r.step || 0) / 4 * 100)), 0) / courseRevisions.length : 0;
    const days = exam.date ? Math.max(0, Math.ceil((new Date(exam.date + "T23:59:00") - new Date()) / 86400000)) : 0;
    const timeScore = Math.min(100, days * 10);
    return { score: Math.round(prepScore * 0.4 + average * 0.3 + revisionScore * 0.2 + timeScore * 0.1), prepScore: Math.round(prepScore), confidence: Math.round(average), revision: Math.round(revisionScore), time: timeScore };
  };
  const filteredCourses = selectedCourses.filter(c => (c.name + " " + c.semesterName).toLowerCase().includes(query.toLowerCase()));
  const filteredAssignments = displayAssignments.filter(a => (a.name + " " + a.course.name).toLowerCase().includes(query.toLowerCase()));

  return <div className="study-wall space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">БОЛОВСРОЛ · СУРАЛЦАХ ТӨЛӨВЛӨГӨӨ</div><h2 className="serif mt-1 text-2xl font-bold text-[#633848] md:text-3xl">Суралцах зураглал</h2><p className="mt-1 text-sm text-[#94727e]">Бүртгэсэн хичээл, даалгавар, шалгалтаа давтлага болон ахицтайгаа холбоно.</p></div><div className="w-full sm:w-56"><Field label="Хичээлээр шүүх"><select className="field mt-1" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}><option value="all">Бүх хичээл</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div></div>
    <div className="education-tabs study-wall-tabs">{MODULES.map(([id, label, Icon]) => <button key={id} className={module === id ? "active" : ""} onClick={() => { setModule(id); setError(""); }}><Icon size={16}/>{label}</button>)}</div>
    {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {!courses.length && module !== "reflection" && module !== "focus" ? <Empty>Эхлээд Education хэсэгт улирал, хичээл үүсгэнэ үү. Энэ модуль жишээ хичээл автоматаар үүсгэхгүй.</Empty> : null}
    {module === "wall" && <Panel title="Нэг дэлгэцийн хичээлийн зураглал" detail="Course-ийн давхардсан жагсаалт үүсгэхгүй; одоогийн semester/course/assignment/exam мэдээллийг ашиглана." icon={CalendarDays}>
      <div className="relative mb-3"><Search className="absolute left-3 top-3 text-[#a07d89]" size={17}/><input className="field pl-10" value={query} onChange={e => setQuery(e.target.value)} placeholder="Хичээл хайх..."/></div>
      {filteredCourses.length ? <div className="grid gap-3 xl:grid-cols-2">{filteredCourses.map(c => {
        const work = [...arr(c.assignments), ...arr(c.exams)];
        const completed = work.filter(x => x.status === "Completed" || (arr(x.subtasks).length && arr(x.subtasks).every(t => t.done))).length;
        const pct = work.length ? Math.round(completed / work.length * 100) : 0;
        return <article key={c.id} className="academic-card"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><small>{c.semesterName} · {c.credits} кредит · {c.grade}</small><h3 className="serif break-words text-xl">{c.name}</h3></div><b className="rounded-xl bg-[#f5e8ed] px-3 py-2 text-sm text-[#7b3f55]">{pct}%</b></div><Progress value={pct}/><div className="mt-3 flex flex-wrap items-center gap-2">{["Судлах", "Төлөвлөх", "Гүйцэтгэх", "Шалгах"].map((label, i) => <span key={label} className={"rounded-full border px-3 py-1 text-[11px] font-bold " + (pct >= [0, 25, 60, 90][i] ? "border-[#d7b4c0] bg-[#f7e9ee] text-[#713a50]" : "border-[#eadde1] bg-white text-[#a07d89]")}>{label}</span>)}</div>{work.length ? <div className="mt-3 space-y-2">{work.slice().sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999")).map(x => <div key={x.id} className="deadline-row"><i className={x.type === "Final" || x.kind === "exam" ? "urgent" : "soon"}/><div className="min-w-0 flex-1"><b className="block break-words">{x.name}</b><small>{x.kind === "exam" ? "Шалгалт" : x.date ? "Хугацаа" : "Огноо тохируулаагүй"}</small></div><span>{downloadLabel(x.date)}</span></div>)}</div> : <Empty>Одоогоор энэ хичээлд даалгавар/шалгалт алга.</Empty>}</article>;
      })}</div> : <Empty>Хайлтад тохирох хичээл олдсонгүй.</Empty>}
    </Panel>}
    {module === "semester" && <Panel title="Semester Map" detail="Улирлын огноо болон хичээл, даалгавар, шалгалтын нэгдсэн timeline." icon={CalendarDays}>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]"><select className="field" aria-label="Улирал сонгох" value={selectedSemester?.id || ""} disabled={!semesters.length} onChange={e => { const s = semesters.find(x => x.id === e.target.value); setSemesterEdit({ id: s?.id || "", startDate: s?.startDate || "", endDate: s?.endDate || "" }); }}><option value="">Улирал сонгох</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input className="field" aria-label="Улирал эхлэх огноо" type="date" value={semesterStartDate} disabled={!selectedSemester} onChange={e => setSemesterEdit({ id: selectedSemester?.id || "", startDate: e.target.value, endDate: semesterEndDate })}/><input className="field" aria-label="Улирал дуусах огноо" type="date" value={semesterEndDate} disabled={!selectedSemester} onChange={e => setSemesterEdit({ id: selectedSemester?.id || "", startDate: semesterStartDate, endDate: e.target.value })}/><button className="btn btn-primary" disabled={!selectedSemester} onClick={saveSemesterDates}>Хадгалах</button></div>
      {selectedSemester && <div className="mt-4 rounded-2xl bg-[#faf5f6] p-4"><b>{selectedSemester.name}</b><p className="mt-1 text-xs text-[#967683]">{arr(selectedSemester.courses).length} хичээл · {semesterStartDate || "Эхлэх огноо сонгоогүй"} – {semesterEndDate || "Дуусах огноо сонгоогүй"}</p>{arr(selectedSemester.courses).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{arr(selectedSemester.courses).map(c => <span key={c.id} className="rounded-full border border-[#eadde1] bg-white px-3 py-1 text-xs font-bold text-[#713a50]">{c.name}</span>)}</div>}</div>}
      <div className="mt-4 space-y-2">{semesterTimeline.length ? semesterTimeline.map(x => <div key={x.kind + x.id} className="deadline-row"><i className={x.kind === "Шалгалт" ? "urgent" : "soon"}/><div className="min-w-0 flex-1"><b className="block break-words">{x.title}</b><small>{x.courseName} · {x.kind}</small></div><span>{x.date}</span></div>) : <Empty>{selectedSemester ? "Энэ улиралд огноотой assignment/exam нэмэхэд timeline энд харагдана." : "Эхлээд Education хэсэгт улирал үүсгэнэ үү."}</Empty>}</div>
    </Panel>}
    {module === "revision" && <Panel title="Smart Revision" detail="1, 3, 7, 14 хоногийн spaced repetition. Давтсан огнооноос дараагийн үе шат тооцогдоно." icon={RotateCcw}>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_160px_auto]"><select className="field" value={revisionForm.courseId} onChange={e => setRevisionForm({ ...revisionForm, courseId: e.target.value })}><option value="">Хичээл</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="field" value={revisionForm.topic} onChange={e => setRevisionForm({ ...revisionForm, topic: e.target.value })} placeholder="Давтах сэдэв"/><input className="field" type="date" value={revisionForm.date} onChange={e => setRevisionForm({ ...revisionForm, date: e.target.value })}/><button className="btn btn-primary" onClick={addRevision}><Plus size={17}/></button></div>
      <div className="mt-4 space-y-2">{revisions.length ? revisions.slice().sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).map(r => <div key={r.id} className="deadline-row"><Brain size={18}/><div className="min-w-0 flex-1"><b>{courseName(r.courseId)} · {r.topic}</b><small>Давталт {Math.min(4, (r.step || 0) + 1)}/4 · 1 / 3 / 7 / 14 өдөр</small></div><span>{r.completed ? "Дууссан" : r.dueDate}</span>{!r.completed && <button className="btn btn-soft text-xs" onClick={() => completeRevision(r)}>Давтлаа</button>}<button className="icon-btn" aria-label="Давтлагыг устгах" onClick={() => removeExtra("revisions", r.id)}><Trash2 size={14}/></button></div>) : <Empty>Хичээл, сэдэв сонгоод давтлагын цикл эхлүүлнэ.</Empty>}</div>
    </Panel>}
    {module === "breakdown" && <Panel title="Даалгаврын алхам ба үнэлгээний шалгуур" detail="Даалгавраа жижиг ажил болгон хувааж, хэрхэн үнэлэхийг шалгуураар тэмдэглэнэ." icon={Check}>
      {displayAssignments.length > 0 ? <>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_160px_100px_100px_auto]"><label className="block text-xs font-bold text-[#694454]">Даалгавар<select className="field mt-1" aria-label="Алхам холбох даалгавар" value={stepAssignmentId} onChange={e => setStepForm({ ...stepForm, assignmentId: e.target.value })}>{displayAssignments.map(a => <option key={a.id} value={a.id}>{a.course.name} · {a.name}</option>)}</select></label><label className="block text-xs font-bold text-[#694454]">Хийх алхам<input className="field mt-1" aria-label="Хийх алхам" value={stepForm.name} onChange={e => setStepForm({ ...stepForm, name: e.target.value })} placeholder="Жишээ: эх сурвалж 3 унших"/></label><label className="block text-xs font-bold text-[#694454]">Дуусгах хугацаа<input className="field mt-1" aria-label="Алхамын дуусах хугацаа" type="date" value={stepForm.dueDate} onChange={e => setStepForm({ ...stepForm, dueDate: e.target.value })}/></label><label className="block text-xs font-bold text-[#694454]">Зарцуулах минут<input className="field mt-1" aria-label="Алхамын минут" type="number" min="1" value={stepForm.minutes} onChange={e => setStepForm({ ...stepForm, minutes: e.target.value })}/></label><span className="self-end pb-3 text-xs text-[#967683]">минут</span><button className="btn btn-primary self-end" aria-label="Дэд даалгавар нэмэх" disabled={!stepAssignmentId || !stepForm.name.trim()} onClick={addSubtask}><Plus size={17}/> Нэмэх</button></div>
      <p className="mt-2 text-xs text-[#967683]">Нэмсэн алхмаа доорх даалгаврын картнаас чагталж явцаа шинэчилнэ.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_110px_auto]"><label className="block text-xs font-bold text-[#694454]">Rubric холбох даалгавар<select className="field mt-1" aria-label="Rubric холбох даалгавар" value={rubricAssignmentId} onChange={e => setRubricForm({ ...rubricForm, assignmentId: e.target.value })}>{displayAssignments.map(a => <option key={a.id} value={a.id}>{a.course.name} · {a.name}</option>)}</select></label><label className="block text-xs font-bold text-[#694454]">Шалгуурын нэр<input className="field mt-1" aria-label="Шалгуурын нэр" value={rubricForm.name} onChange={e => setRubricForm({ ...rubricForm, name: e.target.value })} placeholder="Жишээ: найдвартай эх сурвалж"/></label><label className="block text-xs font-bold text-[#694454]">Жин, хувь<input className="field mt-1" type="number" min="1" max="100" value={rubricForm.weight} onChange={e => setRubricForm({ ...rubricForm, weight: e.target.value })} aria-label="Шалгуурын жин хувь"/></label><button className="btn btn-soft self-end" disabled={!rubricAssignmentId || !rubricForm.name.trim()} onClick={addRubric}>Rubric нэмэх</button></div>
      </> : <Empty>Энд жижиг алхам харагдахын тулд эхлээд Education → Assignments хэсэгт хичээлдээ даалгавар нэмээрэй. Дараа нь эндээс уг даалгаврыг сонгож алхмууд үүсгэнэ.</Empty>}
      <div className="mt-4 grid gap-3 xl:grid-cols-2">{displayAssignments.map(a => { const subtasks = arr(a.subtasks), rubric = arr(a.rubric), p = subtasks.length ? Math.round(subtasks.filter(t => t.done).length / subtasks.length * 100) : Number(a.progress || 0), rubricWeight = rubric.reduce((sum, r) => sum + Number(r.weight || 0), 0), rubricPct = rubricWeight ? Math.round(rubric.reduce((sum, r) => sum + (r.done ? Number(r.weight || 0) : 0), 0) / rubricWeight * 100) : 0; return <article key={a.id} className="academic-card"><small>{a.course.name} · {a.date || "Огноогүй"}</small><h3>{a.name}</h3><div className="mt-2 flex justify-between text-xs"><span>{subtasks.filter(t => t.done).length}/{subtasks.length} алхам</span><b>{p}%</b></div><Progress value={p}/>{subtasks.map(t => <div key={t.id} className="mt-2 flex items-start gap-2 text-sm"><input className="check mt-0.5" type="checkbox" checked={!!t.done} onChange={() => toggleSubtask(a.id, t.id)}/><div className="min-w-0 flex-1"><span className={t.done ? "line-through opacity-60" : ""}>{t.name}</span><small className="block text-[#967683]">{t.dueDate || "Хугацаагүй"} · {t.minutes || 30} мин</small></div></div>)}{rubric.map(r => <label key={r.id} className="mt-2 flex items-center gap-2 text-sm"><input className="check" type="checkbox" checked={!!r.done} onChange={() => toggleRubric(a.id, r.id)}/><span className="flex-1">{r.name} · {r.weight}%</span><b>{r.done ? "✓" : "—"}</b></label>)}{rubric.length > 0 && <div className="mt-3 rounded-xl bg-[#faf5f6] p-3"><div className="mb-2 flex justify-between text-xs"><span>Жингээр тооцсон rubric явц</span><b>{rubricPct}%</b></div><Progress value={rubricPct}/></div>}{!subtasks.length && !rubric.length && <p className="mt-2 text-xs text-[#967683]">Одоогоор нэмэлт алхам, rubric байхгүй.</p>}</article>; })}</div>
    </Panel>}
    {module === "heatmap" && <Panel title="Workload Heatmap" detail="Тухайн өдөрт хугацаатай assignment/exam болон дууссан focus session-ийн минут." icon={Grid3X3}>
      <div className="grid grid-cols-7 gap-2">{workload.map(x => { const max = Math.max(60, ...workload.map(y => y.minutes)); const level = x.minutes ? Math.max(1, Math.min(4, Math.ceil(x.minutes / max * 4))) : 0; const bg = ["bg-[#f2e9ec]", "bg-[#ead1da]", "bg-[#d7aebc]", "bg-[#b77d92]", "bg-[#7b3f55]"][level]; return <div key={x.date} className="min-w-0 text-center"><div className="flex h-24 items-end overflow-hidden rounded-xl border border-[#eadde1] bg-[#fbf7f7] p-1"><div className={"w-full rounded-lg " + bg} style={{ height: Math.max(8, level * 22) + "%" }}/></div><small className="mt-2 block">{x.label}</small><small className="block text-[10px]">{x.date.slice(5)}</small><b className="text-[10px]">{x.minutes ? Math.round(x.minutes / 60 * 10) / 10 + "h" : "0h"}</b></div>; })}</div><p className="mt-3 text-xs text-[#967683]">Энэ нь хугацаанд суурилсан төлөвлөсөн/бүртгэсэн ачаалал болохоос бодит хугацааны баталгаа биш.</p>
    </Panel>}
    {module === "confidence" && <div className="grid gap-5 xl:grid-cols-2"><Panel title="Knowledge Confidence" detail="Сэдэв бүрийн ойлголтыг 1–5 үнэлж, course дээр түүх болгон хадгална." icon={Brain}><div className="space-y-3"><select className="field" value={confidenceForm.courseId} onChange={e => setConfidenceForm({ ...confidenceForm, courseId: e.target.value })}><option value="">Хичээл</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="field" value={confidenceForm.topic} onChange={e => setConfidenceForm({ ...confidenceForm, topic: e.target.value })} placeholder="Сэдэв"/><select className="field" value={confidenceForm.level} onChange={e => setConfidenceForm({ ...confidenceForm, level: Number(e.target.value) })}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}/5 — {["маш сул","сул","дунд","сайн","маш сайн"][n-1]}</option>)}</select><button className="btn btn-primary w-full" onClick={saveConfidence}>Үнэлгээ хадгалах</button></div></Panel><Panel title="Өмнөх үнэлгээнүүд" detail="Өгөгдөл course-ийн confidence талбарт хадгалагдана." icon={BarChart3}>{courses.flatMap(c => arr(c.confidence).map(x => ({ ...x, courseName: c.name, courseId: c.id }))).length ? <div className="space-y-2">{courses.flatMap(c => arr(c.confidence).map(x => ({ ...x, courseName: c.name, courseId: c.id }))).slice().reverse().slice(0,30).map(x => <div key={x.id} className="deadline-row"><div className="min-w-0 flex-1"><b>{x.courseName} · {x.topic}</b><small>{x.date}</small></div><span>{x.level}/5</span></div>)}</div> : <Empty>Сэдвийн эхний үнэлгээг нэмээрэй.</Empty>}</Panel></div>}
    {module === "research" && <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Research Matrix" detail="Эх сурвалж, арга зүй, үр дүн болон тэмдэглэл." icon={Library}><div className="space-y-2"><select className="field" value={sourceForm.courseId} onChange={e => setSourceForm({ ...sourceForm, courseId: e.target.value })}><option value="">Хичээл (сонголтоор)</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="field" value={sourceForm.title} onChange={e => setSourceForm({ ...sourceForm, title: e.target.value })} placeholder="Эх сурвалж / өгүүллийн нэр"/><input className="field" value={sourceForm.author} onChange={e => setSourceForm({ ...sourceForm, author: e.target.value })} placeholder="Зохиогч / он"/><input className="field" value={sourceForm.url} onChange={e => setSourceForm({ ...sourceForm, url: e.target.value })} placeholder="URL / DOI"/><input className="field" value={sourceForm.method} onChange={e => setSourceForm({ ...sourceForm, method: e.target.value })} placeholder="Арга зүй"/><textarea className="field" value={sourceForm.finding} onChange={e => setSourceForm({ ...sourceForm, finding: e.target.value })} placeholder="Гол үр дүн"/><textarea className="field" value={sourceForm.notes} onChange={e => setSourceForm({ ...sourceForm, notes: e.target.value })} placeholder="Тэмдэглэл"/><button className="btn btn-primary w-full" onClick={addSource}><Plus size={16} className="inline"/> Эх сурвалж нэмэх</button></div></Panel><Panel title="Source Matrix" detail={sources.length + " эх сурвалж"} icon={Grid3X3}>{sources.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead><tr className="bg-[#f5e8ed] text-[#713a50]">{["Эх сурвалж","Хичээл","Арга зүй","Үр дүн","Тэмдэглэл",""].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{sources.map(s => <tr key={s.id} className="border-b border-[#eadde1] align-top"><td className="p-3 font-bold">{s.title}<small className="block">{s.author}</small>{s.url && <a className="text-[#7b3f55] underline" href={s.url} target="_blank" rel="noreferrer">Нээх</a>}</td><td className="p-3">{courseName(s.courseId)}</td><td className="p-3">{s.method}</td><td className="p-3">{s.finding}</td><td className="p-3">{s.notes}</td><td className="p-3"><button aria-label="Эх сурвалж устгах" onClick={() => removeExtra("sources", s.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div> : <Empty>Эх сурвалж нэмэхэд судалгааны матриц үүснэ.</Empty>}</Panel></div>}
    {module === "readiness" && <Panel title="Exam Readiness Score" detail="Тооцоолол: бэлтгэлийн алхам 40% + ойлголт 30% + давтлагын явц 20% + хугацааны factor 10%." icon={Target}>{displayExams.length ? <div className="grid gap-3 md:grid-cols-2">{displayExams.map(e => { const score = readiness(e); return <article key={e.id} className="academic-card"><small>{e.course.name}</small><h3>{e.name}</h3><div className="mt-3 flex justify-between text-sm"><span>{e.date || "Огноогүй"}</span><b>{score.score}%</b></div><Progress value={score.score}/><p className="mt-2 text-xs text-[#967683]">Бэлтгэл {score.prepScore}% · Ойлголт {score.confidence}% · Давтлага {score.revision}% · Хугацаа {score.time}%</p>{!arr(e.prepTasks).length && <p className="mt-2 text-xs">Exam-ийн topics/prepTasks-ыг Education → Exams дээр нэмнэ үү.</p>}</article>; })}</div> : <Empty>Education → Exams хэсэгт шалгалт нэмэхэд score тооцогдоно.</Empty>}</Panel>}
    {module === "reflection" && <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Weekly Reflection" detail="Долоо хоногийн ахиц, саад, сургамж, дараагийн зорилго." icon={Lightbulb}>{[["wins","Юу амжилттай болсон"],["obstacles","Ямар саад тулгарсан"],["lesson","Юу сурсан"],["next","Ирэх долоо хоногийн зорилго"]].map(([key,label]) => <Field key={key} label={label}><textarea className="field mb-3 mt-1" rows={2} value={reflectionForm[key]} onChange={e => setReflectionForm({ ...reflectionForm, [key]: e.target.value })}/></Field>)}<button className="btn btn-primary w-full" onClick={saveReflection}>Reflection хадгалах</button></Panel><Panel title="Өмнөх reflection" detail={reflections.length + " тэмдэглэл"} icon={Clock}>{reflections.length ? <div className="space-y-3">{reflections.slice().sort((a,b) => b.week.localeCompare(a.week)).map(r => <article key={r.id} className="rounded-2xl bg-[#faf5f6] p-4"><b>{r.week}</b>{[[r.wins,"Ахиц"],[r.obstacles,"Саад"],[r.lesson,"Сургамж"],[r.next,"Дараагийн зорилго"]].filter(x => x[0]).map(([v,l]) => <p key={l} className="mt-1 text-sm"><strong>{l}:</strong> {v}</p>)}</article>)}</div> : <Empty>Эхний reflection-ээ хадгална уу.</Empty>}</Panel></div>}
    {module === "focus" && <Panel title="Focus Mode" detail="Pomodoro timer · сессийг сонгосон хичээл/ажилтай холбож бүртгэнэ." icon={Timer}><div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl bg-[#f8edf1] p-6 text-center"><div className="text-xs font-black uppercase tracking-[.2em] text-[#a07d89]">{timerMode === "focus" ? "Төвлөрөх" : "Завсарлага"}</div><div className="serif my-4 text-6xl font-bold text-[#633848]">{timerText}</div><div className="flex flex-wrap justify-center gap-2"><button className="btn btn-primary" onClick={() => setTimerRunning(x => !x)}>{timerRunning ? <Pause size={16}/> : <Play size={16}/>} {timerRunning ? "Pause" : "Start"}</button><button className="btn btn-soft" onClick={() => { setTimerRunning(false); setTimerLeft((timerMode === "focus" ? focusMinutes : breakMinutes) * 60); }}>Reset</button><button className="btn btn-soft" onClick={() => { setTimerRunning(false); const next = timerMode === "focus" ? "break" : "focus"; setTimerMode(next); setTimerLeft((next === "focus" ? focusMinutes : breakMinutes) * 60); }}>{timerMode === "focus" ? "Break" : "Focus"}</button></div><p className="mt-3 text-xs text-[#8b6975]">Энэ хэсэг нээлттэй үед цаг тоологдоно. Дууссан focus сесс автоматаар түүхэнд хадгалагдана.</p></div><div className="space-y-3"><Field label="Хичээл"><select className="field mt-1" value={focusCourse} onChange={e => setFocusCourse(e.target.value)}><option value="">Сонгох</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Төвлөрөх ажил"><input className="field mt-1" value={focusTask} onChange={e => setFocusTask(e.target.value)} placeholder="Жишээ: судалгааны өгүүлэл унших"/></Field><div className="grid grid-cols-2 gap-2"><Field label="Focus минут"><input className="field mt-1" type="number" min="1" max="120" value={focusMinutes} onChange={e => { const n = Math.min(120, Math.max(1, Number(e.target.value) || 25)); setFocusMinutes(n); if (!timerRunning && timerMode === "focus") setTimerLeft(n * 60); }}/></Field><Field label="Break минут"><input className="field mt-1" type="number" min="1" max="60" value={breakMinutes} onChange={e => { const n = Math.min(60, Math.max(1, Number(e.target.value) || 5)); setBreakMinutes(n); if (!timerRunning && timerMode === "break") setTimerLeft(n * 60); }}/></Field></div><div className="rounded-2xl bg-[#faf5f6] p-3"><b>{focusSessions.length} хадгалсан сесс</b><small className="mt-1 block">Нийт {focusSessions.reduce((s,x) => s + Number(x.minutes || 0), 0)} минут</small><button className="btn btn-soft mt-2" onClick={saveFocusSession}>Одоогийн сессийг бүртгэх</button></div></div></div></Panel>}
    {module === "notes" && <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Connected Notes" detail="Тэмдэглэлийг хичээл, сэдэв, даалгавар болон research source-той холбоно." icon={NotebookPen}><div className="space-y-2"><select className="field" value={noteForm.courseId} onChange={e => setNoteForm({ ...noteForm, courseId: e.target.value })}><option value="">Хичээл (сонголтоор)</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="field" value={noteForm.topic} onChange={e => setNoteForm({ ...noteForm, topic: e.target.value })} placeholder="Сэдэв"/><select className="field" value={noteForm.assignmentId} onChange={e => setNoteForm({ ...noteForm, assignmentId: e.target.value })}><option value="">Assignment-тай холбох</option>{assignments.map(a => <option key={a.id} value={a.id}>{a.course.name} · {a.name}</option>)}</select><select className="field" value={noteForm.sourceId} onChange={e => setNoteForm({ ...noteForm, sourceId: e.target.value })}><option value="">Research source-той холбох</option>{sources.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select><input className="field" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Тэмдэглэлийн гарчиг"/><textarea className="field" rows={5} value={noteForm.body} onChange={e => setNoteForm({ ...noteForm, body: e.target.value })} placeholder="Тэмдэглэл..."/><button className="btn btn-primary w-full" onClick={addNote}>Тэмдэглэл хадгалах</button></div></Panel><Panel title="Linked notes" detail={notes.length + " тэмдэглэл"} icon={Link2}>{notes.length ? <div className="grid gap-3 md:grid-cols-2">{notes.slice().reverse().map(n => <article key={n.id} className="academic-card"><div className="flex items-start justify-between gap-2"><h3>{n.title}</h3><button aria-label="Тэмдэглэл устгах" onClick={() => removeExtra("notes",n.id)}><Trash2 size={14}/></button></div><small>{courseName(n.courseId)}{n.topic ? " · " + n.topic : ""}</small><p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>{n.sourceId && <small className="mt-2 block">Эх сурвалж: {sources.find(s=>s.id===n.sourceId)?.title || "Холбогдсон source"}</small>}{n.assignmentId && <small className="mt-1 block">Даалгавар: {assignments.find(a=>a.id===n.assignmentId)?.name || "Холбогдсон assignment"}</small>}</article>)}</div> : <Empty>Тэмдэглэл нэмээд холбогдох хичээл/даалгавраа сонгоно уу.</Empty>}</Panel></div>}
    {module === "portfolio" && <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Academic Portfolio" detail="Эсээ, судалгаа, илтгэл, сертификатын бүтээлийн сан." icon={FileText}><div className="space-y-2"><select className="field" value={portfolioForm.courseId} onChange={e => setPortfolioForm({ ...portfolioForm, courseId: e.target.value })}><option value="">Хичээл (сонголтоор)</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="field" value={portfolioForm.title} onChange={e => setPortfolioForm({ ...portfolioForm, title: e.target.value })} placeholder="Бүтээлийн нэр"/><select className="field" value={portfolioForm.type} onChange={e => setPortfolioForm({ ...portfolioForm, type: e.target.value })}>{["Эсээ","Судалгаа","Илтгэл","Сертификат","Бусад"].map(x => <option key={x}>{x}</option>)}</select><input className="field" type="date" value={portfolioForm.date} onChange={e => setPortfolioForm({ ...portfolioForm, date: e.target.value })}/><input className="field" value={portfolioForm.url} onChange={e => setPortfolioForm({ ...portfolioForm, url: e.target.value })} placeholder="Файлын холбоос / URL"/><textarea className="field" value={portfolioForm.description} onChange={e => setPortfolioForm({ ...portfolioForm, description: e.target.value })} placeholder="Тайлбар"/><button className="btn btn-primary w-full" onClick={addPortfolio}>Бүтээл нэмэх</button></div></Panel><Panel title="My Portfolio" detail={portfolio.length + " бүтээл"} icon={BookOpen}>{portfolio.length ? <div className="grid gap-3 md:grid-cols-2">{portfolio.slice().reverse().map(p => <article key={p.id} className="academic-card"><div className="flex items-start justify-between gap-2"><span className="rounded-full bg-[#f5e8ed] px-3 py-1 text-[10px] font-black">{p.type}</span><button aria-label="Бүтээл устгах" onClick={() => removeExtra("portfolio",p.id)}><Trash2 size={14}/></button></div><h3 className="mt-2">{p.title}</h3><small>{courseName(p.courseId)} · {p.date}</small><p className="mt-2 text-sm">{p.description}</p>{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-[#7b3f55] underline">Бүтээл нээх ↗</a>}</article>)}</div> : <Empty>Эхний бүтээлээ нэмэхэд portfolio бүрдэж эхэлнэ.</Empty>}</Panel></div>}
  </div>;
}
