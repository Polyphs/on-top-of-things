
import { motion, AnimatePresence } from "framer-motion";
import { useTasks, useDeleteTask, useUpdateTask, useCompleteTask } from "@/hooks/use-tasks";
import { Check, Trash2, Hourglass } from "lucide-react";
import { type TasksListResponse } from "@shared/routes";
import { Button } from "@/components/ui/button";

interface TaskListProps {
  tasks: TasksListResponse;
  onStartFocus?: (taskId: number) => void;
}

export function TaskList({ tasks, onStartFocus }: TaskListProps) {
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();

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
            className="group relative flex items-center gap-3 p-4 bg-white/50 dark:bg-muted/20 hover:bg-white dark:hover:bg-muted/30 rounded-xl border border-transparent hover:border-border/50 hover:shadow-md transition-all duration-200"
          >
            {/* Completion Toggle */}
            <button
              onClick={() => completeTask.mutate(task.id)}
              className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/5 flex items-center justify-center transition-colors group/check"
              data-testid={`button-complete-${task.id}`}
            >
              <Check className="w-3 h-3 text-primary opacity-0 group-hover/check:opacity-100 transition-opacity" />
            </button>

            {/* Content */}
            <span className="flex-grow font-medium text-foreground/80 group-hover:text-foreground transition-colors">
              {task.content}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Focus Mode Button */}
              {onStartFocus && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartFocus(task.id)}
                  className="gap-1 text-primary hover:text-primary"
                  data-testid={`button-focus-${task.id}`}
                >
                  <Hourglass className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Focus</span>
                </Button>
              )}
              
              {/* Delete Button */}
              <button
                onClick={() => deleteTask.mutate(task.id)}
                className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete task"
                data-testid={`button-delete-${task.id}`}
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
