import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Hourglass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

interface GuestTask {
  id: string;
  content: string;
  createdAt: number;
}

const STORAGE_KEY = "focusflow_guest_tasks";

export function GuestTaskDemo() {
  const [tasks, setTasks] = useState<GuestTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch {
        setTasks([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: GuestTask = {
      id: crypto.randomUUID(),
      content: newTask.trim(),
      createdAt: Date.now(),
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask("");
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="py-16"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold mb-2">Try Freedom Mode</h2>
        <p className="text-muted-foreground">
          Experience quick task capture without signing up. Your tasks are saved locally.
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="What's on your mind?"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              data-testid="input-guest-task"
            />
            <Button onClick={addTask} size="icon" data-testid="button-add-guest-task">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="min-h-[200px]">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Add your first task to get started</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`guest-task-${task.id}`}
                  >
                    <div className="flex-1">
                      <p className="text-foreground">{task.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(task.id)}
                      data-testid={`button-delete-guest-task-${task.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigate("/auth")}
                      data-testid={`button-focus-guest-task-${task.id}`}
                    >
                      <Hourglass className="w-3.5 h-3.5" />
                      Focus
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Sign up to unlock Focus Mode, coaching, and progress tracking
              </p>
              <Button onClick={() => navigate("/auth")} className="gap-2" data-testid="button-signup-from-demo">
                <Hourglass className="w-4 h-4" />
                Create Free Account
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
