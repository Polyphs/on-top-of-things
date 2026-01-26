
import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  profileName: text("profile_name").notNull(),
  password: text("password").notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'signup' | 'forgot_password'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isCompleted: boolean("is_completed").default(false),
  order: integer("order").default(0),
  // Timing for velocity tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  focusTimeSeconds: integer("focus_time_seconds").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reflections = pgTable("reflections", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskReviews = pgTable("task_reviews", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  satisfactionRating: integer("satisfaction_rating").notNull(), // 1-5
  improvements: text("improvements"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  reflections: many(reflections),
  reviews: many(taskReviews),
}));

export const reflectionsRelations = relations(reflections, ({ one }) => ({
  task: one(tasks, {
    fields: [reflections.taskId],
    references: [tasks.id],
  }),
}));

export const taskReviewsRelations = relations(taskReviews, ({ one }) => ({
  task: one(tasks, {
    fields: [taskReviews.taskId],
    references: [tasks.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  isVerified: true
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true, 
  order: true,
  startedAt: true,
  completedAt: true,
  focusTimeSeconds: true
});

export const insertReflectionSchema = createInsertSchema(reflections).omit({ 
  id: true, 
  createdAt: true 
});

export const insertTaskReviewSchema = createInsertSchema(taskReviews).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Reflection = typeof reflections.$inferSelect;
export type InsertReflection = z.infer<typeof insertReflectionSchema>;
export type TaskReview = typeof taskReviews.$inferSelect;
export type InsertTaskReview = z.infer<typeof insertTaskReviewSchema>;

// Request types
export type CreateTaskRequest = Omit<InsertTask, 'userId'>;
export type UpdateTaskRequest = Partial<InsertTask>;
export type CreateReflectionRequest = InsertReflection;
export type CreateTaskReviewRequest = InsertTaskReview;

// Auth request types
export type SignupRequest = {
  email: string;
  profileName: string;
  password: string;
};

export type LoginRequest = {
  emailOrProfile: string;
  password: string;
};

export type VerifyOtpRequest = {
  email: string;
  code: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

// Response types
export type TaskWithReflections = Task & { 
  reflections: Reflection[];
  reviews: TaskReview[];
};
export type TasksListResponse = TaskWithReflections[];

export type UserResponse = Omit<User, 'password'>;

// Stats for Review & Learn mode
export type TaskStats = {
  totalCompleted: number;
  totalPending: number;
  avgFocusTimeSeconds: number;
  avgSatisfaction: number;
  completedTasks: TaskWithReflections[];
};
