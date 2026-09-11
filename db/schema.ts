import { jsonb, pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const educationPlanners = pgTable("education_planners", {
  plannerId: text("planner_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

const ownedFields = {
  id: text("id").notNull(),
  userId: text("user_id").notNull(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

const ownedTable = (name: string) => pgTable(name, ownedFields, table => [
  primaryKey({ columns: [table.userId, table.id], name: `${name}_user_id_id_pk` }),
]);

export const tasks = ownedTable("tasks");
export const habits = ownedTable("habits");
export const habitLogs = ownedTable("habit_logs");
export const financeTransactions = ownedTable("finance_transactions");
export const waterLogs = ownedTable("water_logs");
export const meals = ownedTable("meals");
export const groceries = ownedTable("groceries");
export const calendarEvents = ownedTable("calendar_events");
export const goals = ownedTable("goals");
export const semesters = ownedTable("semesters");
export const courses = ownedTable("courses");
export const aiActions = ownedTable("ai_actions");
