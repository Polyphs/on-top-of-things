
import { db } from "./db";
import {
  users,
  otpCodes,
  tasks,
  reflections,
  taskReviews,
  type User,
  type InsertUser,
  type Task,
  type UpdateTaskRequest,
  type TaskWithReflections,
  type InsertReflection,
  type Reflection,
  type TaskReview,
  type InsertTaskReview,
  type TaskStats
} from "@shared/schema";
import { eq, desc, and, or, gt, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProfileName(profileName: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  verifyUser(email: string): Promise<User>;
  updatePassword(email: string, hashedPassword: string): Promise<User>;

  // OTP
  createOtp(email: string, code: string, type: string): Promise<void>;
  verifyOtp(email: string, code: string, type: string): Promise<boolean>;
  deleteOtps(email: string, type: string): Promise<void>;

  // Tasks
  getTasks(userId: number): Promise<TaskWithReflections[]>;
  getTask(id: number, userId: number): Promise<TaskWithReflections | undefined>;
  createTask(userId: number, content: string): Promise<Task>;
  updateTask(id: number, userId: number, updates: UpdateTaskRequest): Promise<Task>;
  deleteTask(id: number, userId: number): Promise<void>;
  startFocusOnTask(id: number, userId: number): Promise<Task>;
  completeTask(id: number, userId: number): Promise<Task>;
  addReflection(taskId: number, question: string, answer: string): Promise<Reflection>;
  addReview(taskId: number, satisfactionRating: number, improvements?: string): Promise<TaskReview>;
  getTaskStats(userId: number): Promise<TaskStats>;
}

export class DatabaseStorage implements IStorage {
  // === Users ===
  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByProfileName(profileName: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.profileName, profileName));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async verifyUser(email: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ isVerified: true })
      .where(eq(users.email, email.toLowerCase()))
      .returning();
    return user;
  }

  async updatePassword(email: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [user] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email.toLowerCase()))
      .returning();
    return user;
  }

  // === OTP ===
  async createOtp(email: string, code: string, type: string): Promise<void> {
    // Delete existing OTPs for this email and type
    await db.delete(otpCodes).where(
      and(eq(otpCodes.email, email.toLowerCase()), eq(otpCodes.type, type))
    );
    
    // Create new OTP that expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(otpCodes).values({
      email: email.toLowerCase(),
      code,
      type,
      expiresAt,
    });
  }

  async verifyOtp(email: string, code: string, type: string): Promise<boolean> {
    const [otp] = await db.select().from(otpCodes).where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.type, type),
        gt(otpCodes.expiresAt, new Date())
      )
    );
    return !!otp;
  }

  async deleteOtps(email: string, type: string): Promise<void> {
    await db.delete(otpCodes).where(
      and(eq(otpCodes.email, email.toLowerCase()), eq(otpCodes.type, type))
    );
  }

  // === Tasks ===
  async getTasks(userId: number): Promise<TaskWithReflections[]> {
    const allTasks = await db.select().from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
    
    const allReflections = await db.select().from(reflections);
    const allReviews = await db.select().from(taskReviews);
    
    return allTasks.map(task => ({
      ...task,
      reflections: allReflections.filter(r => r.taskId === task.id),
      reviews: allReviews.filter(r => r.taskId === task.id)
    }));
  }

  async getTask(id: number, userId: number): Promise<TaskWithReflections | undefined> {
    const [task] = await db.select().from(tasks).where(
      and(eq(tasks.id, id), eq(tasks.userId, userId))
    );
    if (!task) return undefined;

    const taskReflections = await db.select().from(reflections).where(eq(reflections.taskId, id));
    const taskReviewsList = await db.select().from(taskReviews).where(eq(taskReviews.taskId, id));
    
    return {
      ...task,
      reflections: taskReflections,
      reviews: taskReviewsList
    };
  }

  async createTask(userId: number, content: string): Promise<Task> {
    const [task] = await db.insert(tasks).values({
      userId,
      content,
    }).returning();
    return task;
  }

  async updateTask(id: number, userId: number, updates: UpdateTaskRequest): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated;
  }

  async deleteTask(id: number, userId: number): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }

  async startFocusOnTask(id: number, userId: number): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set({ startedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated;
  }

  async completeTask(id: number, userId: number): Promise<Task> {
    const [task] = await db.select().from(tasks).where(
      and(eq(tasks.id, id), eq(tasks.userId, userId))
    );
    
    let focusTime = 0;
    if (task?.startedAt) {
      focusTime = Math.floor((Date.now() - new Date(task.startedAt).getTime()) / 1000);
    }

    const [updated] = await db.update(tasks)
      .set({ 
        isCompleted: true, 
        completedAt: new Date(),
        focusTimeSeconds: focusTime
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated;
  }

  async addReflection(taskId: number, question: string, answer: string): Promise<Reflection> {
    const [reflection] = await db.insert(reflections).values({
      taskId,
      question,
      answer
    }).returning();
    return reflection;
  }

  async addReview(taskId: number, satisfactionRating: number, improvements?: string): Promise<TaskReview> {
    const [review] = await db.insert(taskReviews).values({
      taskId,
      satisfactionRating,
      improvements
    }).returning();
    return review;
  }

  async getTaskStats(userId: number): Promise<TaskStats> {
    const allTasks = await this.getTasks(userId);
    const completedTasks = allTasks.filter(t => t.isCompleted);
    const pendingTasks = allTasks.filter(t => !t.isCompleted);

    const totalFocusTime = completedTasks.reduce((sum, t) => sum + (t.focusTimeSeconds || 0), 0);
    const avgFocusTime = completedTasks.length > 0 ? totalFocusTime / completedTasks.length : 0;

    const allReviews = completedTasks.flatMap(t => t.reviews);
    const avgSatisfaction = allReviews.length > 0 
      ? allReviews.reduce((sum, r) => sum + r.satisfactionRating, 0) / allReviews.length 
      : 0;

    return {
      totalCompleted: completedTasks.length,
      totalPending: pendingTasks.length,
      avgFocusTimeSeconds: avgFocusTime,
      avgSatisfaction,
      completedTasks
    };
  }
}

export const storage = new DatabaseStorage();
