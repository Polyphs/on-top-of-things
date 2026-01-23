import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";
import { FocusWizard } from "@/components/FocusWizard";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import { Hourglass, ArrowLeft, LayoutList, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

type Mode = "freedom" | "focus" | "work";

export default function Home() {
  const [mode, setMode] = useState<Mode>("freedom");
  const { data: tasks, isLoading } = useTasks();
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);

  // Derive state
  const pendingTasks = tasks?.filter(t => !t.isCompleted) || [];
  const completedTasks = tasks?.filter(t => t.isCompleted) || [];
  const focusedTask = tasks?.find(t => t.id === focusedTaskId);

  const startFocusMode = () => {
    if (pendingTasks.length > 0) {
      setFocusedTaskId(pendingTasks[0].id);
      setMode("focus");
    }
  };

  const skipTask = () => {
    if (!tasks) return;
    const currentIndex = tasks.findIndex(t => t.id === focusedTaskId);
    const nextTask = tasks.find((t, i) => i > currentIndex && !t.isCompleted);
    
    if (nextTask) {
      setFocusedTaskId(nextTask.id);
    } else {
      // Loop back to start or exit if none left
      const firstTask = tasks.find(t => !t.isCompleted);
      if (firstTask && firstTask.id !== focusedTaskId) {
        setFocusedTaskId(firstTask.id);
      } else {
        setMode("work"); // Or freedom, depending on preference
      }
    }
  };

  const finishWizard = () => {
    setMode("work");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-500">
      {/* Ambient Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] transition-all duration-700 ${mode === 'focus' ? 'scale-150 opacity-50' : ''}`} />
        <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] transition-all duration-700 ${mode === 'focus' ? 'scale-150 opacity-30' : ''}`} />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 min-h-screen flex flex-col">
        
        {/* === FREEDOM MODE === */}
        {mode === "freedom" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col"
          >
            <div className="flex justify-between items-center mb-12">
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
                Freedom Mode
              </h1>
              {pendingTasks.length > 0 && (
                <button
                  onClick={startFocusMode}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Hourglass className="w-4 h-4" />
                  <span>Start Focus</span>
                </button>
              )}
            </div>

            <div className="flex-grow flex flex-col justify-center">
              <TaskInput isCenter={pendingTasks.length === 0} />
              <div className="mt-8">
                {tasks && <TaskList tasks={tasks} />}
              </div>
            </div>
            
            {completedTasks.length > 0 && (
               <div className="mt-12 pt-8 border-t border-dashed border-border/60">
                 <p className="text-sm font-medium text-muted-foreground mb-4">Completed Today</p>
                 <div className="opacity-60 hover:opacity-100 transition-opacity">
                   {completedTasks.map(t => (
                     <div key={t.id} className="text-sm text-muted-foreground line-through py-1">
                       {t.content}
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </motion.div>
        )}

        {/* === FOCUS MODE === */}
        {mode === "focus" && focusedTask && (
          <motion.div
            key="focus"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-grow flex flex-col items-center justify-center py-12"
          >
            <div className="w-full absolute top-8 left-0 px-8 flex justify-between items-center">
              <button
                onClick={() => setMode("freedom")}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit Focus
              </button>
              
              <div className="flex gap-2">
                {pendingTasks.map((t) => (
                  <div 
                    key={t.id} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${t.id === focusedTaskId ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
                  />
                ))}
              </div>
            </div>

            <FocusWizard 
              task={focusedTask} 
              onComplete={finishWizard} 
              onSkip={skipTask}
            />
          </motion.div>
        )}

        {/* === WORK MODE === */}
        {mode === "work" && tasks && (
          <motion.div
            key="work"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-grow flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Work Mode</h1>
                <p className="text-muted-foreground mt-1">Execute your plan with clarity.</p>
              </div>
              <button
                onClick={() => setMode("freedom")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-1/4">Task</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-1/4">Deadline</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-1/4">Outcome</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-1/4">Motivation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pendingTasks.map((task) => {
                      // Helper to safely get reflection answers
                      const getReflection = (questionText: string) => 
                        task.reflections.find(r => r.question.includes(questionText))?.answer || "—";
                      
                      return (
                        <tr key={task.id} className="group hover:bg-muted/10 transition-colors">
                          <td className="py-4 px-6 align-top font-medium text-foreground">
                            {task.content}
                          </td>
                          <td className="py-4 px-6 align-top text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            {getReflection("When")}
                          </td>
                          <td className="py-4 px-6 align-top text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            {getReflection("What")}
                          </td>
                          <td className="py-4 px-6 align-top text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            {getReflection("How")}
                          </td>
                        </tr>
                      );
                    })}
                    {pendingTasks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          No pending tasks. Great job!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setMode("freedom")}
                className="text-sm text-primary hover:underline underline-offset-4"
              >
                Add more tasks
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
