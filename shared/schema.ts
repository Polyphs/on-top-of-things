
import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  isCompleted: boolean("is_completed").default(false),
  // Order for the queue
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reflections = pgTable("reflections", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const tasksRelations = relations(tasks, ({ many }) => ({
  reflections: many(reflections),
}));

export const reflectionsRelations = relations(reflections, ({ one }) => ({
  task: one(tasks, {
    fields: [reflections.taskId],
    references: [tasks.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true, 
  order: true 
});

export const insertReflectionSchema = createInsertSchema(reflections).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Reflection = typeof reflections.$inferSelect;
export type InsertReflection = z.infer<typeof insertReflectionSchema>;

// Request types
export type CreateTaskRequest = InsertTask;
export type UpdateTaskRequest = Partial<InsertTask>;
export type CreateReflectionRequest = InsertReflection;

// Response types
export type TaskWithReflections = Task & { reflections: Reflection[] };
export type TasksListResponse = TaskWithReflections[];

