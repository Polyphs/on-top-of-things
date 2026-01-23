
import { db } from "./db";
import {
  tasks,
  reflections,
  type Task,
  type InsertTask,
  type UpdateTaskRequest,
  type TaskWithReflections,
  type InsertReflection
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getTasks(): Promise<TaskWithReflections[]>;
  getTask(id: number): Promise<TaskWithReflections | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: UpdateTaskRequest): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  addReflection(reflection: InsertReflection): Promise<Reflection>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<TaskWithReflections[]> {
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    
    // Fetch reflections for all tasks
    const allReflections = await db.select().from(reflections);
    
    return allTasks.map(task => ({
      ...task,
      reflections: allReflections.filter(r => r.taskId === task.id)
    }));
  }

  async getTask(id: number): Promise<TaskWithReflections | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;

    const taskReflections = await db.select().from(reflections).where(eq(reflections.taskId, id));
    
    return {
      ...task,
      reflections: taskReflections
    };
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, updates: UpdateTaskRequest): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async addReflection(insertReflection: InsertReflection): Promise<Reflection> {
    const [reflection] = await db.insert(reflections).values(insertReflection).returning();
    return reflection;
  }
}

export const storage = new DatabaseStorage();
