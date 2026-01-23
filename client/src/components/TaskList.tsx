import { motion, AnimatePresence } from "framer-motion";
import { useTasks, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { Check, Trash2, GripVertical } from "lucide-react";
import { type TasksListResponse } from "@shared/routes";

interface TaskListProps {
  tasks: TasksListResponse;
}

export function TaskList({ tasks }: TaskListProps) {
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  // Filter out completed tasks for the main view or handle them differently if needed
  // For Freedom mode, we typically want to see pending tasks clearly
  const pendingTasks = tasks.filter(t => !t.isCompleted);

  if (pendingTasks.length === 0) return null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      <AnimatePresence mode="popLayout">
        {pendingTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="group relative flex items-center gap-4 p-4 bg-white/50 hover:bg-white rounded-xl border border-transparent hover:border-border/50 hover:shadow-md transition-all duration-200"
          >
            {/* Completion Toggle */}
            <button
              onClick={() => updateTask.mutate({ id: task.id, isCompleted: true })}
              className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/5 flex items-center justify-center transition-colors group/check"
            >
              <Check className="w-3 h-3 text-primary opacity-0 group-hover/check:opacity-100 transition-opacity" />
            </button>

            {/* Content */}
            <span className="flex-grow font-medium text-foreground/80 group-hover:text-foreground transition-colors">
              {task.content}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => deleteTask.mutate(task.id)}
                className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
