import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, SkipForward, CheckCircle2 } from "lucide-react";
import { type TaskWithReflections } from "@shared/schema";
import { useAddReflection } from "@/hooks/use-tasks";

interface FocusWizardProps {
  task: TaskWithReflections;
  onComplete: () => void;
  onSkip: () => void;
}

const QUESTIONS = [
  {
    id: "deadline",
    text: "When do you want to finish this?",
    placeholder: "e.g., By 5 PM today...",
    subtext: "Setting a concrete boundary helps create urgency."
  },
  {
    id: "outcome",
    text: "What will the finished state look like?",
    placeholder: "e.g., The report is sent and my inbox is empty...",
    subtext: "Visualize the result, not the process."
  },
  {
    id: "motivation",
    text: "How will finishing this make you feel?",
    placeholder: "e.g., Relieved, capable, free...",
    subtext: "Connect with the emotional reward."
  }
];

export function FocusWizard({ task, onComplete, onSkip }: FocusWizardProps) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const addReflection = useAddReflection();

  const currentQuestion = QUESTIONS[step];
  const isLastStep = step === QUESTIONS.length - 1;

  // Reset answer when step changes
  useEffect(() => {
    setAnswer("");
  }, [step]);

  const handleNext = async () => {
    // Save reflection if there's an answer
    if (answer.trim()) {
      try {
        await addReflection.mutateAsync({
          taskId: task.id,
          question: currentQuestion.text,
          answer: answer
        });
      } catch (error) {
        console.error("Failed to save reflection", error);
        // Continue anyway - UX shouldn't block on this in focus mode
      }
    }

    if (isLastStep) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Task Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 rounded-full">
          Focus Item
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          {task.content}
        </h2>
      </motion.div>

      {/* Wizard Card */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 border border-border/50"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {currentQuestion.text}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentQuestion.subtext}
                </p>
              </div>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="w-full min-h-[120px] p-4 rounded-xl bg-muted/30 border-2 border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all resize-none text-lg outline-none"
                autoFocus
              />

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={onSkip}
                  className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip Task
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {step + 1} of {QUESTIONS.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px] transition-all duration-200"
                  >
                    {isLastStep ? (
                      <>
                        Start Working <CheckCircle2 className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        Next <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
