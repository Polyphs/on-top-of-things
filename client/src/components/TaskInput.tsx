import { useState } from "react";
import { useCreateTask } from "@/hooks/use-tasks";
import { Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskInputProps {
  isCenter?: boolean;
}

export function TaskInput({ isCenter = false }: TaskInputProps) {
  const [content, setContent] = useState("");
  const createTask = useCreateTask();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    createTask.mutate(
      { content },
      {
        onSuccess: () => setContent(""),
      }
    );
  };

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        y: isCenter ? 0 : 0,
        scale: isCenter ? 1.1 : 1,
      }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      className={`w-full max-w-xl mx-auto ${isCenter ? 'my-32' : 'mb-8'}`}
    >
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-6 py-4 rounded-2xl bg-white shadow-lg border-2 border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all duration-300 text-lg placeholder:text-muted-foreground/60 input-ring"
          disabled={createTask.isPending}
        />
        <button
          type="submit"
          disabled={!content.trim() || createTask.isPending}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-primary text-primary-foreground opacity-0 group-focus-within:opacity-100 data-[has-content=true]:opacity-100 hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          data-has-content={!!content.trim()}
        >
          {createTask.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>
      </form>
    </motion.div>
  );
}
