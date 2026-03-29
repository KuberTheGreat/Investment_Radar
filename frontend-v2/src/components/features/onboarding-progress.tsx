import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="w-full pt-12 pb-6 px-6">
      <div className="flex gap-2 w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex-1 h-full bg-surface-3 relative">
            {i < currentStep && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 bg-accent rounded-full"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted">
        <span>Step {currentStep}</span>
        <span>{currentStep === totalSteps ? "Finish" : "Next"}</span>
      </div>
    </div>
  );
}
