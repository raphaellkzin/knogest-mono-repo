"use client";

import { Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type FormWizardProgressStep = {
  title: string;
};

export function FormWizardProgress({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: FormWizardProgressStep[];
}) {
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <nav aria-label="Progresso do formulário">
      <ol className="hidden sm:flex">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li
              key={step.title}
              className="relative flex flex-1 flex-col items-center gap-2 text-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-4 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-px bg-border",
                    isComplete && "bg-primary",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-input bg-popover text-sm font-bold text-muted-foreground",
                  isCurrent && "border-primary text-primary",
                  isComplete &&
                    "border-primary bg-primary text-primary-foreground",
                )}
              >
                {isComplete ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium text-muted-foreground",
                  (isCurrent || isComplete) && "font-bold text-foreground",
                )}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="sm:hidden">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          <span className="truncate text-muted-foreground">
            {steps[currentStep]?.title}
          </span>
        </div>
        <Progress
          value={progressValue}
          aria-label={`Etapa ${currentStep + 1} de ${steps.length}`}
        />
      </div>
    </nav>
  );
}
