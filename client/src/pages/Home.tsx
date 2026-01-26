import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";
import { FocusWizard } from "@/components/FocusWizard";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import { Hourglass, ArrowLeft, LayoutList, Loader2, LogIn, Brain, Target, Zap, Play } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

type Mode = "freedom" | "focus" | "work" | "landing";

export default function Home() {
  const [mode, setMode] = useState<Mode>("landing");
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

  if (isLoading && mode !== "landing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: Brain,
      title: "Focus Mode",
      description: "One task at a time. Coaching questions help you visualize success."
    },
    {
      icon: Target,
      title: "Zero Distractions",
      description: "Minimalist interface designed specifically for ADHD minds."
    },
    {
      icon: Zap,
      title: "Quick Capture",
      description: "Jot down ideas instantly before they slip away."
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-500">
      {/* Ambient Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] transition-all duration-700 ${mode === 'focus' ? 'scale-150 opacity-50' : ''}`} />
        <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] transition-all duration-700 ${mode === 'focus' ? 'scale-150 opacity-30' : ''}`} />
      </div>

      {/* Header with Login Button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Hourglass className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">FocusFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {mode !== "landing" && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setMode("landing")}
                data-testid="button-home"
              >
                Home
              </Button>
            )}
            <a 
              href="https://question-ask--coding129.replit.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="default"
                size="sm"
                className="gap-2"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-20 pb-12 min-h-screen flex flex-col">
        
        {/* === LANDING PAGE === */}
        {mode === "landing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col"
          >
            {/* Hero Section */}
            <section className="py-16 text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
              >
                Focus Your ADHD Mind
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-xl mx-auto mb-8"
              >
                A to-do list that works with your brain, not against it. 
                One task at a time. Zero distractions.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center gap-4"
              >
                <Button 
                  size="lg" 
                  onClick={() => setMode("freedom")}
                  className="gap-2"
                  data-testid="button-try-now"
                >
                  Try It Now
                </Button>
                <a 
                  href="https://question-ask--coding129.replit.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="gap-2"
                    data-testid="button-sign-up"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign Up Free
                  </Button>
                </a>
              </motion.div>
            </section>

            {/* Demo Video Section */}
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="py-8"
            >
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-border shadow-2xl">
                <div className="aspect-video flex items-center justify-center bg-muted/30 relative group cursor-pointer" onClick={() => setMode("freedom")}>
                  {/* Placeholder for video - shows app preview */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-lg font-medium">See FocusFlow in Action</p>
                    <p className="text-sm text-white/70 mt-1">Click to try the app</p>
                  </div>
                  {/* App Preview Screenshot */}
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Hourglass className="w-16 h-16 text-primary/40 mx-auto mb-4" />
                      <div className="text-muted-foreground/60 text-sm">App Demo Preview</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Features Section */}
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="py-16"
            >
              <h2 className="text-2xl font-display font-bold text-center mb-12">
                Designed for How Your Brain Works
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="p-6 rounded-2xl bg-white dark:bg-muted/20 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                    data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* CTA Section */}
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="py-16 text-center"
            >
              <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border">
                <h2 className="text-2xl font-display font-bold mb-4">Ready to Focus?</h2>
                <p className="text-muted-foreground mb-6">Start managing your tasks the ADHD-friendly way.</p>
                <div className="flex justify-center gap-4">
                  <Button 
                    size="lg" 
                    onClick={() => setMode("freedom")}
                    data-testid="button-get-started"
                  >
                    Get Started Free
                  </Button>
                  <a 
                    href="https://question-ask--coding129.replit.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="gap-2"
                      data-testid="button-login-cta"
                    >
                      <LogIn className="w-4 h-4" />
                      Login
                    </Button>
                  </a>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}

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
