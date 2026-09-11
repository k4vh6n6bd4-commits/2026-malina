import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { educationPlanners } from "../../db/schema.js";

export default async (request: Request) => {
  const user = await getUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const plannerId = user.id;

  try {
    if (request.method === "GET") {
      const [planner] = await db
        .select({ data: educationPlanners.data, updatedAt: educationPlanners.updatedAt })
        .from(educationPlanners)
        .where(eq(educationPlanners.plannerId, plannerId))
        .limit(1);
      return Response.json(planner ?? { data: null });
    }

    if (request.method === "PUT") {
      const body = await request.json().catch(() => null);
      if (!body?.data || !Array.isArray(body.data.semesters)) {
        return Response.json({ error: "Invalid education data" }, { status: 400 });
      }
      const [planner] = await db
        .insert(educationPlanners)
        .values({ plannerId, data: body.data })
        .onConflictDoUpdate({
          target: educationPlanners.plannerId,
          set: { data: body.data, updatedAt: new Date() },
        })
        .returning({ updatedAt: educationPlanners.updatedAt });
      return Response.json(planner);
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, PUT" } });
  } catch {
    return Response.json({ error: "Education data is temporarily unavailable" }, { status: 503 });
  }
};

export const config: Config = { path: "/api/education" };
