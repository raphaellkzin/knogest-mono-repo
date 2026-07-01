"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  OperationsModal,
  type OperationsModalSize,
} from "@/components/ui/operations-modal";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface BaseFormModalRenderHelpers {
  closeModal: () => void;
  currentStep: number;
  goToStep: (step: number) => void;
}

export interface WizardStep<TData extends FieldValues> {
  title: string;
  fields: Path<TData>[];
  component: (
    form: UseFormReturn<TData>,
    helpers: BaseFormModalRenderHelpers,
  ) => React.ReactNode;
}

interface BaseFormModalProps<TData extends FieldValues> {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  icon?: LucideIcon;
  schema: z.ZodType<TData>;
  size?: OperationsModalSize;
  defaultValues?: DefaultValues<TData>;
  onSubmit: (data: TData) => Promise<void | boolean>;
  confirmClose?: (dirty: boolean) => boolean | Promise<boolean>;
  onSessionStart?: () => void;
  submitLabel?: string;
  children?: (
    form: UseFormReturn<TData>,
    helpers: BaseFormModalRenderHelpers,
  ) => React.ReactNode;
  steps?: WizardStep<TData>[];
}

export function BaseFormModal<TData extends FieldValues>({
  children,
  defaultValues,
  description,
  icon,
  confirmClose,
  onSessionStart,
  onSubmit,
  schema,
  size = "lg",
  steps,
  submitLabel = "Salvar",
  title,
  trigger,
}: BaseFormModalProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const advancingRef = React.useRef(false);
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);

  const form = useForm<TData>({
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  const isWizard = Boolean(steps?.length);
  const activeStep = isWizard ? steps?.[currentStep] : undefined;
  const isLastStep = isWizard ? currentStep === (steps?.length ?? 1) - 1 : true;
  const isSubmitting = form.formState.isSubmitting;
  const navigationDisabled = isSubmitting || isAdvancing;

  React.useEffect(() => {
    if (open && isWizard) {
      stepHeadingRef.current?.focus();
    }
  }, [currentStep, isWizard, open]);

  const goToStep = (step: number) => {
    if (!steps || navigationDisabled || step < 0 || step >= steps.length)
      return;
    setCurrentStep(step);
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) return;

    if (!nextOpen && form.formState.isDirty && confirmClose) {
      const confirmed = await confirmClose(true);
      if (!confirmed) return;
    }

    if (nextOpen) {
      onSessionStart?.();
      form.reset(defaultValues);
      setCurrentStep(0);
      advancingRef.current = false;
      setIsAdvancing(false);
    }

    setOpen(nextOpen);
  };

  const helpers: BaseFormModalRenderHelpers = {
    closeModal: () => {
      if (!isSubmitting) setOpen(false);
    },
    currentStep,
    goToStep,
  };

  const handleSubmitWrapper = async (data: TData) => {
    try {
      const shouldClose = await onSubmit(data);
      if (shouldClose === false) return;
      setOpen(false);
      form.reset(defaultValues);
      setCurrentStep(0);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar.";
      toast.error(message, { position: "top-center" });
    }
  };

  const handleNextStep = async () => {
    if (!steps || navigationDisabled || advancingRef.current) return;

    advancingRef.current = true;
    setIsAdvancing(true);

    try {
      const isStepValid = await form.trigger(steps[currentStep].fields, {
        shouldFocus: true,
      });

      if (isStepValid) {
        setCurrentStep((previous) => Math.min(previous + 1, steps.length - 1));
      }
    } finally {
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (
      event.key === "Enter" &&
      !event.nativeEvent.isComposing &&
      isWizard &&
      !isLastStep &&
      (event.target as HTMLElement).tagName === "INPUT"
    ) {
      event.preventDefault();
      void handleNextStep();
    }
  };

  return (
    <OperationsModal
      bodyClassName="overflow-hidden p-0"
      description={description}
      icon={icon}
      onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}
      open={open}
      size={size}
      title={title}
      trigger={trigger}
    >
      <form
        className="flex max-h-[calc(100vh-9rem)] min-h-0 flex-col"
        onKeyDown={handleKeyDown}
        onSubmit={form.handleSubmit(handleSubmitWrapper)}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isWizard && steps && activeStep ? (
            <>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
                Etapa {currentStep + 1} de {steps.length}: {activeStep.title}
              </h2>
              <WizardProgress steps={steps} currentStep={currentStep} />
              <div className="mt-5 min-h-52">
                {activeStep.component(form, helpers)}
              </div>
            </>
          ) : (
            children?.(form, helpers)
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-popover px-5 py-4">
          {isWizard ? (
            <>
              {currentStep === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-11"
                  onClick={() => void handleOpenChange(false)}
                  disabled={navigationDisabled}
                >
                  Cancelar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-11"
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={navigationDisabled}
                >
                  <ChevronLeft className="size-4" />
                  Voltar
                </Button>
              )}

              {!isLastStep ? (
                <Button
                  type="button"
                  size="lg"
                  className="min-h-11"
                  onClick={() => void handleNextStep()}
                  disabled={navigationDisabled}
                >
                  Avançar
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  className="min-h-11"
                  disabled={navigationDisabled}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {submitLabel}
                </Button>
              )}
            </>
          ) : (
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                )}
                {submitLabel}
              </Button>
            </div>
          )}
        </footer>
      </form>
    </OperationsModal>
  );
}

function WizardProgress<TData extends FieldValues>({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: WizardStep<TData>[];
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
            {steps[currentStep].title}
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
