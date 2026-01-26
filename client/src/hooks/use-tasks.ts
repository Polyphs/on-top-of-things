
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type TaskInput } from "@shared/routes";
import type { TaskStats } from "@shared/schema";

export function useTasks() {
  return useQuery({
    queryKey: [api.tasks.list.path],
    queryFn: async () => {
      const res = await fetch(api.tasks.list.path);
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch tasks");
      }
      return api.tasks.list.responses[200].parse(await res.json());
    },
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: [api.tasks.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.tasks.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch task");
      return api.tasks.get.responses[200].parse(await res.json());
    },
  });
}

export function useTaskStats() {
  return useQuery<TaskStats>({
    queryKey: [api.tasks.stats.path],
    queryFn: async () => {
      const res = await fetch(api.tasks.stats.path);
      if (!res.ok) {
        if (res.status === 401) {
          return {
            totalCompleted: 0,
            totalPending: 0,
            avgFocusTimeSeconds: 0,
            avgSatisfaction: 0,
            completedTasks: [],
          };
        }
        throw new Error("Failed to fetch stats");
      }
      return res.json();
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TaskInput) => {
      const res = await fetch(api.tasks.create.path, {
        method: api.tasks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.tasks.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create task");
      }
      return api.tasks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<TaskInput>) => {
      const url = buildUrl(api.tasks.update.path, { id });
      const res = await fetch(url, {
        method: api.tasks.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return api.tasks.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tasks.delete.path, { id });
      const res = await fetch(url, { method: api.tasks.delete.method });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] }),
  });
}

export function useStartFocus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tasks.startFocus.path, { id });
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to start focus");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] }),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tasks.complete.path, { id });
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tasks.stats.path] });
    },
  });
}

export function useAddReflection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, question, answer }: { taskId: number; question: string; answer: string }) => {
      const url = buildUrl(api.tasks.addReflection.path, { id: taskId });
      const res = await fetch(url, {
        method: api.tasks.addReflection.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });
      if (!res.ok) throw new Error("Failed to add reflection");
      return api.tasks.addReflection.responses[201].parse(await res.json());
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.get.path, taskId] });
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}

export function useAddReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, satisfactionRating, improvements }: { taskId: number; satisfactionRating: number; improvements?: string }) => {
      const url = buildUrl(api.tasks.addReview.path, { id: taskId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ satisfactionRating, improvements }),
      });
      if (!res.ok) throw new Error("Failed to add review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tasks.stats.path] });
    },
  });
}
