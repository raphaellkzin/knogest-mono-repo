import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toZonedTime, format } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FormattedDateTime {
  date: string; // dd/mm/yyyy
  time: string; // HH:mm
}

export function formatDateToBrazil(dateString: string): FormattedDateTime {
  // Fuso horário de Brasília
  const timeZone = "America/Sao_Paulo";

  // Converte a string ISO para objeto Date
  const date = new Date(dateString);

  // Ajusta o Date para o fuso horário de Brasília
  const zonedDate = toZonedTime(date, timeZone);

  // Formata a data para pt-BR
  const formattedDate = format(zonedDate, "dd/MM/yyyy", { timeZone });

  // Formata o horário em 24h
  const formattedTime = format(zonedDate, "HH:mm", { timeZone });

  return {
    date: formattedDate,
    time: formattedTime,
  };
}

export const timerSleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
