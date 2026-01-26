
import { useState } from "react";
import { useTasks, useTaskStats, useStartFocus, useCompleteTask, useAddReview } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";
import { FocusWizard } from "@/components/FocusWizard";
import { motion } from "framer-motion";
import { Hourglass, ArrowLeft, Loader2, LogIn, Brain, Target, Zap, Play, Home as HomeIcon, ListTodo, BarChart3, Briefcase, LogOut, Star } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Mode = "landing" | "freedom" | "focus" | "work" | "review";

export default function Home() {
  const [mode, setMode] = useState<Mode>("landing");
  const { data: tasks, isLoading } = useTasks();
  const { data: stats } = useTaskStats();
  const { user, isAuthenticated, logout, logoutPending } = useAuth();
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const startFocusMutation = useStartFocus();
  const completeTaskMutation = useCompleteTask();
  const addReviewMutation = useAddReview();

  // Review state
  const [reviewTaskId, setReviewTaskId] = useState<number | null>(null);
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [improvements, setImprovements] = useState("");

  // Derive state
  const pendingTasks = tasks?.filter(t => !t.isCompleted) || [];
  const completedTasks = tasks?.filter(t => t.isCompleted) || [];
  const focusedTask = tasks?.find(t => t.id === focusedTaskId);

  const startFocusMode = (taskId?: number) => {
    const targetId = taskId || (pendingTasks.length > 0 ? pendingTasks[0].id : null);
    if (targetId) {
      setFocusedTaskId(targetId);
      startFocusMutation.mutate(targetId);
      setMode("focus");
    }
  };

  const skipTask = () => {
    if (!tasks) return;
    const currentIndex = pendingTasks.findIndex(t => t.id === focusedTaskId);
    const nextTask = pendingTasks[currentIndex + 1];
    
    if (nextTask) {
      setFocusedTaskId(nextTask.id);
      startFocusMutation.mutate(nextTask.id);
    } else if (pendingTasks.length > 0 && pendingTasks[0].id !== focusedTaskId) {
      setFocusedTaskId(pendingTasks[0].id);
      startFocusMutation.mutate(pendingTasks[0].id);
    } else {
      setMode("work");
    }
  };

  const finishWizard = () => {
    if (focusedTaskId) {
      completeTaskMutation.mutate(focusedTaskId);
    }
    setMode("work");
  };

  const handleSubmitReview = async () => {
    if (!reviewTaskId || satisfactionRating === 0) return;
    try {
      await addReviewMutation.mutateAsync({
        taskId: reviewTaskId,
        satisfactionRating,
        improvements: improvements || undefined
      });
      toast({ title: "Review submitted!" });
      setReviewTaskId(null);
      setSatisfactionRating(0);
      setImprovements("");
    } catch {
      toast({ title: "Failed to submit review", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    setMode("landing");
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const features = [
    { icon: Brain, title: "Focus Mode", description: "One task at a time. Coaching questions help you visualize success." },
    { icon: Target, title: "Zero Distractions", description: "Minimalist interface designed specifically for ADHD minds." },
    { icon: Zap, title: "Quick Capture", description: "Jot down ideas instantly before they slip away." }
  ];

  // Navigation component
  const ModeNavigation = () => (
    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
      <Button
        variant={mode === "freedom" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("freedom")}
        className="rounded-full gap-1.5"
        data-testid="nav-freedom"
      >
        <ListTodo className="w-4 h-4" />
        <span className="hidden sm:inline">Freedom</span>
      </Button>
      <Button
        variant={mode === "focus" ? "default" : "ghost"}
        size="sm"
        onClick={() => pendingTasks.length > 0 && startFocusMode()}
        disabled={pendingTasks.length === 0}
        className="rounded-full gap-1.5"
        data-testid="nav-focus"
      >
        <Hourglass className="w-4 h-4" />
        <span className="hidden sm:inline">Focus</span>
      </Button>
      <Button
        variant={mode === "work" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("work")}
        className="rounded-full gap-1.5"
        data-testid="nav-work"
      >
        <Briefcase className="w-4 h-4" />
        <span className="hidden sm:inline">Work</span>
      </Button>
      <Button
        variant={mode === "review" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMode("review")}
        className="rounded-full gap-1.5"
        data-testid="nav-review"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="hidden sm:inline">Review</span>
      </Button>
    </div>
  );

  if (isLoading && mode !== "landing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-500">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] transition-all duration-700 ${mode === 'focus' ? 'scale-150 opacity-50' : ''}`} />
        <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] transition-all duration-700 ${mode === 'focus' ? 'scale-150 opacity-30' : ''}`} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode("landing")}>
            <Hourglass className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">FocusFlow</span>
          </div>
          
          {/* Mode Navigation - only show when authenticated and not on landing */}
          {isAuthenticated && mode !== "landing" && <ModeNavigation />}
          
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Hi, {user?.profileName}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logoutPending}
                  className="gap-2"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-2"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-20 pb-12 min-h-screen flex flex-col">
        
        {/* === LANDING PAGE === */}
        {mode === "landing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow flex flex-col">
            <section className="py-16 text-center">
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
                Focus Your ADHD Mind
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                A to-do list that works with your brain, not against it. One task at a time. Zero distractions.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center gap-4 flex-wrap">
                {isAuthenticated ? (
                  <Button size="lg" onClick={() => setMode("freedom")} className="gap-2" data-testid="button-get-started">
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={() => navigate("/auth")} className="gap-2" data-testid="button-get-started">
                      Get Started Free
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="gap-2" data-testid="button-login-hero">
                      <LogIn className="w-4 h-4" />
                      Login
                    </Button>
                  </>
                )}
              </motion.div>
            </section>

            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="py-8">
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-border shadow-2xl">
                <div className="aspect-video flex items-center justify-center bg-muted/30 relative group cursor-pointer" onClick={() => isAuthenticated ? setMode("freedom") : navigate("/auth")}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-lg font-medium">See FocusFlow in Action</p>
                    <p className="text-sm text-white/70 mt-1">Click to try the app</p>
                  </div>
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Hourglass className="w-16 h-16 text-primary/40 mx-auto mb-4" />
                      <div className="text-muted-foreground/60 text-sm">App Demo Preview</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="py-16">
              <h2 className="text-2xl font-display font-bold text-center mb-12">Designed for How Your Brain Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature, i) => (
                  <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="p-6 rounded-2xl bg-white dark:bg-muted/20 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </motion.div>
        )}

        {/* === FREEDOM MODE === */}
        {mode === "freedom" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Freedom Mode</h1>
                <p className="text-muted-foreground text-sm">Capture tasks freely. Focus when ready.</p>
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <TaskInput isCenter={pendingTasks.length === 0} />
              <div className="mt-8">
                {tasks && <TaskList tasks={tasks} onStartFocus={startFocusMode} />}
              </div>
            </div>
            
            {completedTasks.length > 0 && (
              <div className="mt-12 pt-8 border-t border-dashed border-border/60">
                <p className="text-sm font-medium text-muted-foreground mb-4">Completed</p>
                <div className="opacity-60 hover:opacity-100 transition-opacity">
                  {completedTasks.slice(0, 5).map(t => (
                    <div key={t.id} className="text-sm text-muted-foreground line-through py-1">{t.content}</div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* === FOCUS MODE === */}
        {mode === "focus" && focusedTask && (
          <motion.div key="focus" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-grow flex flex-col items-center justify-center py-12">
            <div className="w-full absolute top-24 left-0 px-8 flex justify-center">
              <div className="flex gap-2">
                {pendingTasks.map((t) => (
                  <div key={t.id} className={`h-1.5 rounded-full transition-all duration-300 ${t.id === focusedTaskId ? 'w-8 bg-primary' : 'w-2 bg-muted'}`} />
                ))}
              </div>
            </div>

            <FocusWizard task={focusedTask} onComplete={finishWizard} onSkip={skipTask} />
          </motion.div>
        )}

        {/* === WORK MODE === */}
        {mode === "work" && tasks && (
          <motion.div key="work" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-grow flex flex-col">
            <div className="mb-8">
              <h1 className="text-2xl font-display font-bold text-foreground">Work Mode</h1>
              <p className="text-muted-foreground text-sm">Execute your plan with clarity.</p>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pendingTasks.map((task) => {
                      const getReflection = (q: string) => task.reflections.find(r => r.question.includes(q))?.answer || "—";
                      return (
                        <tr key={task.id} className="group hover:bg-muted/10 transition-colors">
                          <td className="py-4 px-6 font-medium text-foreground">{task.content}</td>
                          <td className="py-4 px-6 text-sm text-muted-foreground">{getReflection("When")}</td>
                          <td className="py-4 px-6 text-sm text-muted-foreground">{getReflection("What")}</td>
                          <td className="py-4 px-6 text-sm text-muted-foreground">{getReflection("How")}</td>
                        </tr>
                      );
                    })}
                    {pendingTasks.length === 0 && (
                      <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No pending tasks. Great job!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* === REVIEW & LEARN MODE === */}
        {mode === "review" && (
          <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-grow flex flex-col gap-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Review & Learn</h1>
              <p className="text-muted-foreground text-sm">Reflect on completed work and improve your process.</p>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">{stats?.totalCompleted || 0}</div>
                  <div className="text-sm text-muted-foreground">Tasks Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-accent">{stats?.totalPending || 0}</div>
                  <div className="text-sm text-muted-foreground">Pending Tasks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-foreground">{formatTime(stats?.avgFocusTimeSeconds || 0)}</div>
                  <div className="text-sm text-muted-foreground">Avg Focus Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-foreground flex items-center justify-center gap-1">
                    {(stats?.avgSatisfaction || 0).toFixed(1)}
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Satisfaction</div>
                </CardContent>
              </Card>
            </div>

            {/* Completed Tasks Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {completedTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No completed tasks yet. Complete some tasks to see your progress!</p>
                ) : (
                  <div className="space-y-4">
                    {completedTasks.map(task => (
                      <div key={task.id} className="p-4 border border-border rounded-xl">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div>
                            <h4 className="font-medium">{task.content}</h4>
                            {task.focusTimeSeconds && task.focusTimeSeconds > 0 && (
                              <p className="text-sm text-muted-foreground">Focus time: {formatTime(task.focusTimeSeconds)}</p>
                            )}
                          </div>
                          {task.reviews.length === 0 && (
                            <Button size="sm" variant="outline" onClick={() => setReviewTaskId(task.id)} data-testid={`button-review-${task.id}`}>
                              Add Review
                            </Button>
                          )}
                        </div>
                        
                        {task.reviews.length > 0 && (
                          <div className="bg-muted/30 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-muted-foreground">Satisfaction:</span>
                              <div className="flex">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-4 h-4 ${s <= task.reviews[0].satisfactionRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                                ))}
                              </div>
                            </div>
                            {task.reviews[0].improvements && (
                              <p className="text-muted-foreground"><span className="font-medium">Improvements:</span> {task.reviews[0].improvements}</p>
                            )}
                          </div>
                        )}

                        {/* Review Form */}
                        {reviewTaskId === task.id && (
                          <div className="mt-4 p-4 bg-muted/20 rounded-lg space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">How satisfied are you with the process? (1-5)</label>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(rating => (
                                  <button
                                    key={rating}
                                    onClick={() => setSatisfactionRating(rating)}
                                    className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                                      satisfactionRating === rating ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
                                    }`}
                                    data-testid={`rating-${rating}`}
                                  >
                                    {rating}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">What improvements would you make going forward?</label>
                              <Textarea
                                value={improvements}
                                onChange={(e) => setImprovements(e.target.value)}
                                placeholder="Share your thoughts..."
                                className="resize-none"
                                data-testid="input-improvements"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleSubmitReview} disabled={satisfactionRating === 0 || addReviewMutation.isPending} data-testid="button-submit-review">
                                {addReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
                              </Button>
                              <Button variant="ghost" onClick={() => { setReviewTaskId(null); setSatisfactionRating(0); setImprovements(""); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
