"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressBar } from "@/components/features/onboarding-progress";
import { WelcomeSlide } from "@/components/features/onboarding-welcome";
import { BrokerConnectSlide } from "@/components/features/onboarding-broker";
import { RiskProfileSlide } from "@/components/features/onboarding-risk";

const SLIDES = [ WelcomeSlide, BrokerConnectSlide, RiskProfileSlide ];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const CurrentSlide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Finish onboarding and go to app
      router.push("/");
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-background overflow-hidden relative">
      {/* Absolute floating background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Progress Bar (Header) */}
      <div className="flex-none z-10">
        <ProgressBar currentStep={step + 1} totalSteps={SLIDES.length} />
      </div>

      {/* Main Slide Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex flex-col"
          >
            <CurrentSlide />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="flex-none p-6 pt-2 pb-10 z-10">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-accent text-background font-black text-base shadow-xl hover:bg-accent/90 transition-all flex justify-center items-center"
        >
          {isLast ? "Launch Investment Radar" : "Continue"}
        </motion.button>

        {/* Skip button for early slides */}
        {!isLast ? (
          <button
            onClick={() => router.push("/")}
            className="w-full mt-4 text-xs font-bold text-muted uppercase tracking-widest hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        ) : (
          <div className="h-8" /> // spacing placeholder
        )}
      </div>
    </div>
  );
}
