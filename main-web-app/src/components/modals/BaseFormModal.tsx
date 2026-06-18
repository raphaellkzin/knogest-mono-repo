/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  useForm,
  UseFormReturn,
  DefaultValues,
  FieldValues,
  Path, // Importado para tipagem estrita dos campos do Wizard
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "../ui/progress";
import { toast } from "sonner";

// Definição da estrutura de cada passo do Wizard
export interface WizardStep<TData extends FieldValues> {
  title?: string;
  description?: string;
  // Diz ao form quais campos validar antes de ir para o próximo step
  fields: Path<TData>[];
  component: (form: UseFormReturn<TData>) => React.ReactNode;
  maxWidth?: string;
}

interface BaseFormModalRenderHelpers {
  closeModal: () => void;
}

interface BaseFormModalProps<TData extends FieldValues> {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  schema: z.ZodType<TData>;
  maxWidth?: string;
  defaultValues?: DefaultValues<TData>;
  onSubmit: (data: TData) => Promise<void>;

  // Modo Simples: renderiza o children direto
  children?: (
    form: UseFormReturn<TData>,
    helpers: BaseFormModalRenderHelpers,
  ) => React.ReactNode;

  // Modo Wizard: renderiza através da lista de steps
  steps?: WizardStep<TData>[];
}

export function BaseFormModal<TData extends FieldValues>({
  trigger,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  children,
  steps,
  maxWidth,
}: BaseFormModalProps<TData>) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<TData>({
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  const isWizard = steps && steps.length > 0;
  const isLastStep = isWizard ? currentStep === steps.length - 1 : true;

  const handleSubmitWrapper = async (data: TData) => {
    try {
      await onSubmit(data);
      handleOpenChange(false);
    } catch (error: any) {
      const message = error.message || "Erro no envio do formulário";
      toast.error(message, { position: "top-center" });
    }
  };

  const handleNextStep = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!steps) return;

    // Dispara a validação APENAS dos campos que pertencem a este step
    const fieldsToValidate = steps[currentStep].fields;
    const isStepValid = await form.trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      setTimeout(() => {
        form.reset();
        setCurrentStep(0); // Reseta o wizard para o começo ao fechar
      }, 300);
    }
  };

  // Impede que apertar "Enter" num input dispare o envio final prematuramente em um wizard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && isWizard && !isLastStep) {
      e.preventDefault();
      handleNextStep();
    }
  };

  // Título e descrição dinâmicos (permite sobrescrever no step atual)
  const currentTitle =
    isWizard && steps[currentStep].title ? steps[currentStep].title : title;
  const currentDescription =
    isWizard && steps[currentStep].description
      ? steps[currentStep].description
      : description;

  const progressValue = steps ? ((currentStep + 1) / steps.length) * 100 : 0;
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>

      <DialogContent
        className={`w-full ${
          isWizard && steps?.[currentStep]?.maxWidth
            ? steps[currentStep].maxWidth
            : maxWidth
              ? maxWidth
              : "sm:max-w-160"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {currentTitle}
          </DialogTitle>
          {currentDescription && (
            <DialogDescription>{currentDescription}</DialogDescription>
          )}
          {isWizard && (
            <div className="mt-4">
              <Progress value={progressValue} className="h-2 w-full" />
            </div>
          )}
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmitWrapper)}
          onKeyDown={handleKeyDown}
          className="space-y-4"
        >
          {/* RENDERIZAÇÃO CONDICIONAL: WIZARD VS NORMAL */}
          {isWizard && steps ? (
            <div key={`step-${currentStep}`} className="py-2">
              {steps[currentStep].component(form)}
            </div>
          ) : (
            children &&
            children(form, { closeModal: () => handleOpenChange(false) })
          )}

          <DialogFooter className="pt-4 flex justify-between sm:justify-between w-full">
            {isWizard ? (
              <>
                <div className="flex w-full justify-between">
                  {/* Botão de Cancelar/Voltar na esquerda */}
                  {currentStep === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={form.formState.isSubmitting}
                    >
                      Cancelar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreviousStep}
                      disabled={form.formState.isSubmitting}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                  )}

                  {/* Botão de Próximo/Salvar na direita */}
                  {!isLastStep ? (
                    <Button
                      className="bg-primary-500 hover:bg-primary-600"
                      type="button"
                      onClick={handleNextStep}
                    >
                      Próximo <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="w-[120px] bg-green-600 hover:bg-green-700 px-4"
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className=" h-4 w-4 animate-spin" />
                      )}
                      Finalizar <Check className=" h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            ) : (
              // Botoes do modo de form simples (Comportamento original)
              <div className="flex w-full justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
