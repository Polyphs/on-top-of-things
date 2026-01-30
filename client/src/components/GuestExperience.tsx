import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Hourglass, Sparkles, ListTodo, Briefcase, ChevronRight, Check, ArrowLeft, Play, Pause, Coffee, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";

interface GuestTask {
  id: string;
  content: string;
  createdAt: number;
  isCompleted: boolean;
  reflection?: {
    deadline: string;
    outcome: string;
    motivation: string;
  };
}

interface TaskTimer {
  startTime: number;
  pausedAt: number | null;
  accumulated: number; // seconds accumulated before current run
}

type GuestMode = "freedom" | "focus" | "work";

const STORAGE_KEY = "ot2_guest_tasks";
const TIMER_STORAGE_KEY = "ot2_guest_timers";

export function GuestExperience() {
  const [tasks, setTasks] = useState<GuestTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [mode, setMode] = useState<GuestMode>("freedom");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({ deadline: "", outcome: "", motivation: "" });
  const [, navigate] = useLocation();
  
  // Timer state: tracks running timers per task
  const [timers, setTimers] = useState<Record<string, TaskTimer>>({});
  const [tick, setTick] = useState(0); // Force re-render for timer display

  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);
  const focusedTask = tasks.find(t => t.id === focusedTaskId);

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

  // Load timers from localStorage
  useEffect(() => {
    const storedTimers = localStorage.getItem(TIMER_STORAGE_KEY);
    if (storedTimers) {
      try {
        setTimers(JSON.parse(storedTimers));
      } catch {
        setTimers({});
      }
    }
  }, []);

  // Save timers to localStorage
  useEffect(() => {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
  }, [timers]);

  // Timer tick - update every second for running timers
  useEffect(() => {
    const hasRunningTimer = Object.values(timers).some(t => t.pausedAt === null);
    if (!hasRunningTimer) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timers]);

  // Timer helper functions
  const getElapsedSeconds = useCallback((taskId: string): number => {
    const timer = timers[taskId];
    if (!timer) return 0;
    
    if (timer.pausedAt !== null) {
      // Timer is paused - show accumulated time
      return timer.accumulated;
    }
    
    // Timer is running - calculate current elapsed time
    const currentRunSeconds = Math.floor((Date.now() - timer.startTime) / 1000);
    return timer.accumulated + currentRunSeconds;
  }, [timers, tick]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (taskId: string) => {
    setTimers(prev => ({
      ...prev,
      [taskId]: {
        startTime: Date.now(),
        pausedAt: null,
        accumulated: prev[taskId]?.accumulated || 0
      }
    }));
  };

  const pauseTimer = (taskId: string) => {
    const timer = timers[taskId];
    if (!timer || timer.pausedAt !== null) return;
    
    const currentRunSeconds = Math.floor((Date.now() - timer.startTime) / 1000);
    setTimers(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        pausedAt: Date.now(),
        accumulated: prev[taskId].accumulated + currentRunSeconds
      }
    }));
  };

  const stopTimer = (taskId: string) => {
    setTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[taskId];
      return newTimers;
    });
  };

  const isTimerRunning = (taskId: string): boolean => {
    const timer = timers[taskId];
    return timer !== undefined && timer.pausedAt === null;
  };

  const isTimerPaused = (taskId: string): boolean => {
    const timer = timers[taskId];
    return timer !== undefined && timer.pausedAt !== null;
  };

  const getPausedDuration = (taskId: string): number => {
    const timer = timers[taskId];
    if (!timer || timer.pausedAt === null) return 0;
    return Math.floor((Date.now() - timer.pausedAt) / 1000);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: GuestTask = {
      id: crypto.randomUUID(),
      content: newTask.trim(),
      createdAt: Date.now(),
      isCompleted: false,
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask("");
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const startFocus = (taskId: string) => {
    setFocusedTaskId(taskId);
    setWizardStep(0);
    setWizardAnswers({ deadline: "", outcome: "", motivation: "" });
    setMode("focus");
  };

  // Save reflection without completing the task (completion happens in Work Mode via checkbox)
  const finishFocus = () => {
    if (!focusedTaskId) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === focusedTaskId
          ? { ...t, reflection: wizardAnswers }
          : t
      )
    );
    setFocusedTaskId(null);
    setMode("work");
  };

  // Complete task via checkbox in Work Mode
  const completeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, isCompleted: true }
          : t
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
  };

  const wizardQuestions = [
    { key: "deadline", question: "When does this need to be done?", placeholder: "e.g., By end of today, This week, No rush" },
    { key: "outcome", question: "What does success look like?", placeholder: "Describe what 'done' means to you..." },
    { key: "motivation", question: "Why does this matter to you?", placeholder: "Connect with your reason..." },
  ];

  const ModeNav = () => (
    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 mb-6">
      <Button
        variant={mode === "freedom" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("freedom")}
        className="rounded-full gap-1.5"
        data-testid="guest-nav-freedom"
      >
        <ListTodo className="w-4 h-4" />
        Freedom
      </Button>
      <Button
        variant={mode === "focus" ? "default" : "ghost"}
        size="sm"
        onClick={() => pendingTasks.length > 0 && startFocus(pendingTasks[0].id)}
        disabled={pendingTasks.length === 0}
        className="rounded-full gap-1.5"
        data-testid="guest-nav-focus"
      >
        <Hourglass className="w-4 h-4" />
        Focus
      </Button>
      <Button
        variant={mode === "work" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("work")}
        className="rounded-full gap-1.5"
        data-testid="guest-nav-work"
      >
        <Briefcase className="w-4 h-4" />
        Work
      </Button>
    </div>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="py-16"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold mb-2">Try the Full Experience</h2>
        <p className="text-muted-foreground">
          Experience all modes without signing up. Your tasks are saved locally.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
          <div className="flex justify-center">
            <ModeNav />
          </div>

          {/* FREEDOM MODE */}
          {mode === "freedom" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Add your first task to get started</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {pendingTasks.map((task) => (
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
                          className="gap-1.5"
                          onClick={() => startFocus(task.id)}
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

              {completedTasks.length > 0 && (
                <div className="mt-6 pt-4 border-t border-dashed border-border/60">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Completed</p>
                  <div className="opacity-60">
                    {completedTasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="text-sm text-muted-foreground line-through py-1">
                        {t.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* FOCUS MODE */}
          {mode === "focus" && focusedTask && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8"
            >
              <div className="flex justify-center gap-2 mb-8">
                {pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      t.id === focusedTaskId ? "w-8 bg-primary" : "w-2 bg-muted"
                    }`}
                  />
                ))}
              </div>

              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-2">Currently focusing on:</p>
                <h3 className="text-xl font-semibold text-foreground">{focusedTask.content}</h3>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  {wizardStep < wizardQuestions.length ? (
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-1">
                          Question {wizardStep + 1} of {wizardQuestions.length}
                        </p>
                        <h4 className="text-lg font-medium mb-4">
                          {wizardQuestions[wizardStep].question}
                        </h4>
                        <Textarea
                          placeholder={wizardQuestions[wizardStep].placeholder}
                          value={wizardAnswers[wizardQuestions[wizardStep].key as keyof typeof wizardAnswers]}
                          onChange={(e) =>
                            setWizardAnswers((prev) => ({
                              ...prev,
                              [wizardQuestions[wizardStep].key]: e.target.value,
                            }))
                          }
                          className="mb-4 min-h-[100px]"
                          data-testid={`input-wizard-${wizardQuestions[wizardStep].key}`}
                        />
                        <div className="flex justify-between">
                          <Button
                            variant="ghost"
                            onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                            disabled={wizardStep === 0}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                          </Button>
                          <Button
                            onClick={() => setWizardStep((s) => s + 1)}
                            data-testid="button-wizard-next"
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-primary" />
                        </div>
                        <h4 className="text-lg font-medium mb-2">Ready to work!</h4>
                        <p className="text-muted-foreground text-sm mb-6">
                          You've clarified your focus. Now go complete this task!
                        </p>
                        <Button onClick={finishFocus} className="gap-2" data-testid="button-go-to-work">
                          <Briefcase className="w-4 h-4" />
                          Go to Work Mode
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {mode === "focus" && !focusedTask && (
            <div className="text-center py-12 text-muted-foreground">
              <Hourglass className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Add a task in Freedom mode to start focusing</p>
              <Button variant="outline" className="mt-4" onClick={() => setMode("freedom")}>
                Go to Freedom Mode
              </Button>
            </div>
          )}

          {/* WORK MODE */}
          {mode === "work" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-4">
                <h3 className="font-medium text-foreground mb-1">Work Mode</h3>
                <p className="text-sm text-muted-foreground">Execute your tasks. Check the box when complete.</p>
              </div>

              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No tasks yet. Add some in Freedom mode!</p>
                  <Button variant="outline" className="mt-4" onClick={() => setMode("freedom")}>
                    Go to Freedom Mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.map((task) => {
                    const elapsed = getElapsedSeconds(task.id);
                    const running = isTimerRunning(task.id);
                    const paused = isTimerPaused(task.id);
                    const pausedFor = getPausedDuration(task.id);
                    const showBreak = running && elapsed >= 480; // 8 minutes = 480 seconds
                    const blinkPause = paused && pausedFor >= 300; // 5 minutes = 300 seconds
                    
                    return (
                      <Card key={task.id} className="overflow-visible">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              checked={false}
                              onCheckedChange={() => {
                                completeTask(task.id);
                                stopTimer(task.id);
                              }}
                              className="mt-1"
                              data-testid={`checkbox-complete-${task.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{task.content}</p>
                              {task.reflection && (
                                <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
                                  <p><span className="font-medium">Deadline:</span> {task.reflection.deadline || "Not set"}</p>
                                  <p><span className="font-medium">Outcome:</span> {task.reflection.outcome || "Not set"}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {(running || paused) && (
                                <span className={`font-mono text-sm tabular-nums min-w-[50px] text-right ${running ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                  {formatTimer(elapsed)}
                                </span>
                              )}
                              
                              {showBreak && (
                                <div className="flex items-center gap-1 text-amber-500" title="Time for a break!">
                                  <Coffee className="w-4 h-4" />
                                </div>
                              )}
                              
                              {!running && !paused && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startTimer(task.id)}
                                  title="Start timer"
                                  data-testid={`button-start-timer-${task.id}`}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              
                              {running && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => pauseTimer(task.id)}
                                  title="Pause timer"
                                  data-testid={`button-pause-timer-${task.id}`}
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                              )}
                              
                              {paused && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startTimer(task.id)}
                                  title="Resume timer"
                                  className={blinkPause ? 'animate-pulse bg-primary/20' : ''}
                                  data-testid={`button-resume-timer-${task.id}`}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              
                              {(running || paused) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => stopTimer(task.id)}
                                  title="Stop timer"
                                  data-testid={`button-stop-timer-${task.id}`}
                                >
                                  <Square className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {completedTasks.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-dashed border-border/60">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Completed</p>
                      {completedTasks.map((task) => (
                        <div key={task.id} className="py-2 text-sm text-muted-foreground line-through">
                          {task.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Sign Up CTA */}
          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Create an account to unlock analytics, sync across devices, and more
            </p>
            <Button onClick={() => navigate("/auth")} className="gap-2" data-testid="button-signup-from-demo">
              <Hourglass className="w-4 h-4" />
              Create Free Account
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
