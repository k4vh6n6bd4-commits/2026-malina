import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { getDatabase } from "@netlify/database";

const tableNames = ["tasks", "habits", "habit_logs", "finance_transactions", "water_logs", "meals", "groceries", "calendar_events", "goals", "semesters", "courses", "ai_actions"] as const;
type TableName = typeof tableNames[number];

const emptyPlanner = () => ({
  tasks: [], habits: [], finance: { income: 0, savings: 0, expenses: [] }, water: {}, meals: {},
  groceries: [], goals: [], events: [], aiActions: [], education: { targetGpa: 3.8, futureCredits: 15, semesters: [] },
});

function rowsFromPlanner(data: any): Record<TableName, { id: string; data: any }[]> {
  const habits = (data.habits || []).map(({ log: _log, ...habit }: any) => habit);
  const habitLogs = (data.habits || []).flatMap((habit: any) =>
    Object.entries(habit.log || {}).map(([date, done]) => ({ id: `${habit.id}:${date}`, habitId: habit.id, date, done }))
  );
  const semesters = (data.education?.semesters || []).map(({ courses: _courses, ...semester }: any) => semester);
  const courses = (data.education?.semesters || []).flatMap((semester: any) =>
    (semester.courses || []).map((course: any) => ({ ...course, semesterId: semester.id }))
  );
  const list = (items: any[], prefix: string) => items.map((item, index) => ({ id: String(item.id || `${prefix}-${index}`), data: item }));
  return {
    tasks: list(data.tasks || [], "task"), habits: list(habits, "habit"), habit_logs: list(habitLogs, "habit-log"),
    finance_transactions: list(data.finance?.expenses || [], "expense"),
    water_logs: Object.entries(data.water || {}).map(([date, cups]) => ({ id: date, data: { date, cups } })),
    meals: Object.entries(data.meals || {}).map(([date, meal]) => ({ id: date, data: { date, ...(meal as object) } })),
    groceries: list(data.groceries || [], "grocery"), calendar_events: list(data.events || [], "event"),
    goals: list(data.goals || [], "goal"), semesters: list(semesters, "semester"), courses: list(courses, "course"),
    ai_actions: list(data.aiActions || [], "ai-action"),
  };
}

function plannerFromRows(profile: any, rows: Record<string, any[]>) {
  const data: any = emptyPlanner();
  const values = (name: string) => (rows[name] || []).map(row => row.data);
  data.tasks = values("tasks");
  data.habits = values("habits").map((habit: any) => ({ ...habit, log: {} }));
  for (const log of values("habit_logs")) {
    const habit = data.habits.find((item: any) => item.id === log.habitId);
    if (habit) habit.log[log.date] = Boolean(log.done);
  }
  data.finance = { ...(profile?.settings?.finance || { income: 0, savings: 0 }), expenses: values("finance_transactions") };
  for (const item of values("water_logs")) data.water[item.date] = item.cups;
  for (const { date, ...meal } of values("meals")) data.meals[date] = meal;
  data.groceries = values("groceries"); data.events = values("calendar_events"); data.goals = values("goals");
  data.aiActions = values("ai_actions");
  const courses = values("courses");
  data.education = { ...(profile?.settings?.education || {}), semesters: values("semesters").map((semester: any) => ({
    ...semester, courses: courses.filter((course: any) => course.semesterId === semester.id).map(({ semesterId: _id, ...course }: any) => course),
  })) };
  return data;
}

export default async (request: Request) => {
  const user = await getUser();
  if (!user) return Response.json({ error: "Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү." }, { status: 401 });
  const database = getDatabase();
  const client = await database.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [user.id]);
    const profileResult = await client.query("SELECT user_id, email, settings, updated_at FROM profiles WHERE user_id = $1", [user.id]);
    const profile = profileResult.rows[0] || null;

    if (request.method === "GET") {
      const rows: Record<string, any[]> = {};
      for (const table of tableNames) rows[table] = (await client.query(`SELECT data FROM ${table} WHERE user_id = $1 ORDER BY updated_at, id`, [user.id])).rows;
      await client.query("COMMIT");
      return Response.json({ data: profile ? plannerFromRows(profile, rows) : null, updatedAt: profile?.updated_at || null, cloudEmpty: !profile });
    }

    if (request.method === "PUT") {
      const body = await request.json().catch(() => null);
      if (!body?.data || !Array.isArray(body.data.tasks) || !Array.isArray(body.data.habits)) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Planner мэдээллийн бүтэц буруу байна." }, { status: 400 });
      }
      const base = body.baseUpdatedAt ? new Date(body.baseUpdatedAt).getTime() : 0;
      const cloud = profile?.updated_at ? new Date(profile.updated_at).getTime() : 0;
      if (profile && cloud > base && !body.confirmMigration) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Өөр төхөөрөмж дээр шинэ мэдээлэл байна.", conflict: true, updatedAt: profile.updated_at }, { status: 409 });
      }
      const now = new Date();
      const settings = { finance: { ...(body.data.finance || {}), expenses: undefined }, education: { ...(body.data.education || {}), semesters: undefined } };
      await client.query(`INSERT INTO profiles (user_id,email,settings,updated_at) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id) DO UPDATE SET email=EXCLUDED.email, settings=EXCLUDED.settings, updated_at=EXCLUDED.updated_at`,
        [user.id, user.email || "", JSON.stringify(settings), now]);
      const mapped = rowsFromPlanner(body.data);
      for (const table of tableNames) {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [user.id]);
        for (const row of mapped[table]) await client.query(`INSERT INTO ${table} (id,user_id,data,updated_at) VALUES ($1,$2,$3,$4)`, [row.id, user.id, JSON.stringify(row.data), now]);
      }
      await client.query("COMMIT");
      return Response.json({ updatedAt: now.toISOString() });
    }
    await client.query("ROLLBACK");
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, PUT" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Planner sync failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Cloud sync түр ажиллахгүй байна. Таны мэдээлэл төхөөрөмж дээр хадгалагдсан." }, { status: 503 });
  } finally { client.release(); }
};

export const config: Config = { path: "/api/planner-sync" };
