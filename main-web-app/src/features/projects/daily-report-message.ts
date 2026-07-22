import type { ProjectDailyReportDetail } from "./daily-reports.types";

const activities = [
  ["earthworks", "Terraplanagem"],
  ["drainage", "Drenagem"],
  ["paving", "Pavimentação"],
] as const;
const climates = [
  ["rain", "Chuva"],
  ["dry", "Seco"],
  ["waterlogged_soil", "Solo Encharcado"],
] as const;

export function buildProjectDailyReportMessage(
  report: ProjectDailyReportDetail,
) {
  const selectedActivityLabels = activities
    .filter(([value]) => report.activityTypes.includes(value))
    .map(([, label]) => label);
  const title = selectedActivityLabels.length
    ? `Relatório ${selectedActivityLabels.join(" / ")} – RDO`
    : "Relatório Diário de Obra – RDO";
  const roleCounts = countBy(
    report.employees.map((employee) => employee.jobRole),
  );
  const machineCounts = countBy(report.machines.map((machine) => machine.name));
  const hourMeters = report.machines.filter(
    (machine) => machine.meterType === "hour_meter",
  );
  const odometers = report.machines.filter(
    (machine) => machine.meterType === "odometer",
  );

  return [
    title,
    `Informações Analíticas – ${formatCivilDate(report.reportDate)}`,
    "",
    `🏡 ${report.project.name}`,
    `👤 Supervisor: ${report.supervisor.name}`,
    ...report.technicalResponsibilities.map(
      (responsibility) => `👤 Técnico Eng.: ${responsibility.name}`,
    ),
    `📍 Município: ${location(report.project.municipality, report.project.state)}`,
    `📑 Contrato: ${report.project.contract ?? "Não informado"}`,
    `🕘 Turno: ${report.shift === "day" ? "Diurno" : "Noturno"}`,
    "",
    "⏰ Horário Padrão",
    ...report.schedulePeriods.map(
      (period) =>
        `${period.startTime} às ${period.endTime}${period.endDayOffset > period.startDayOffset ? " (+1 dia)" : ""}`,
    ),
    `Escala: ${report.scheduleScale}`,
    "",
    ...activities.map(
      ([value, label]) =>
        `( ${report.activityTypes.includes(value) ? "X" : " "} ) ${label}`,
    ),
    "",
    "🌤️ Clima",
    ...climates.map(
      ([value, label]) =>
        `( ${report.climateConditions.includes(value) ? "X" : " "} ) ${label}`,
    ),
    "",
    `🌦️ Índice Pluviométrico: ${formatDecimal(report.rainfall.dailyMm)} mm`,
    `Total acumulado no mês: ${formatDecimal(report.rainfall.monthlyMm)} mm`,
    "",
    "👷🏽‍♂️ Mão de obra",
    ...(roleCounts.length
      ? roleCounts.map(
          ([role, quantity]) =>
            `${twoDigits(quantity)} ${pluralizeRole(role, quantity)}`,
        )
      : ["Nenhum participante informado"]),
    "",
    "🧾 Jornada individual",
    ...report.employees.map((employee) => {
      const shiftStatus = employee.completedFullShift
        ? "turno completo"
        : "turno parcial";
      return `${employee.name} — ${employee.jobRole}: ${formatDuration(employee.regularWorkedMinutes)} normais, ${shiftStatus}, ${formatDuration(employee.overtimeMinutes)} extras`;
    }),
    "",
    "🚜 Equipamentos",
    ...(machineCounts.length
      ? machineCounts.map(
          ([name, quantity]) => `${twoDigits(quantity)} ${name}`,
        )
      : ["Nenhum equipamento utilizado"]),
    "",
    "⛽ Abastecimento das máquinas",
    "Não informado",
    "",
    ...meterSection(
      "⏱️ Horímetro das máquinas",
      "🕰️",
      hourMeters,
      "Nenhum horímetro registrado",
    ),
    ...(odometers.length ? [""] : []),
    ...meterSection("🛣️ Odômetro das máquinas", "📏", odometers),
    "",
    "🚧 Atividades Executadas",
    report.executedActivities,
    "",
    "⚠️ Interferências",
    report.interferences || "Nenhuma interferência registrada",
    "",
    "Encerramento das atividades",
    `Início ${report.activityWindow.startTime}`,
    `Final ${report.activityWindow.endTime}${report.activityWindow.endDayOffset ? " (+1 dia)" : ""}`,
    "",
    `${weekday(report.reportDate)} ${formatCivilDate(report.reportDate)}.`,
  ].join("\n");
}

function meterSection(
  title: string,
  icon: string,
  machines: ProjectDailyReportDetail["machines"],
  emptyMessage?: string,
) {
  if (!machines.length) return emptyMessage ? [title, "", emptyMessage] : [];
  return [
    title,
    "",
    ...machines.flatMap((machine, index) => [
      `${icon} ${machine.name}${machine.model ? ` — ${machine.model}` : ""}`,
      `Início: ${formatDecimal(machine.startMeterReading.value)}`,
      `Final: ${formatDecimal(machine.endMeterReading.value)}`,
      ...(index === machines.length - 1 ? [] : [""]),
    ]),
  ];
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right, "pt-BR"),
  );
}

function pluralizeRole(role: string, quantity: number) {
  if (quantity === 1) return role;
  const words = role.split(" ");
  const last = words.at(-1)!;
  const plural = /[rz]$/iu.test(last)
    ? `${last}es`
    : /al$/iu.test(last)
      ? `${last.slice(0, -2)}ais`
      : /el$/iu.test(last)
        ? `${last.slice(0, -2)}eis`
        : /ol$/iu.test(last)
          ? `${last.slice(0, -2)}ois`
          : /ul$/iu.test(last)
            ? `${last.slice(0, -2)}uis`
            : /m$/iu.test(last)
              ? `${last.slice(0, -1)}ns`
              : `${last}s`;
  return [...words.slice(0, -1), plural].join(" ");
}

function location(municipality: string | null, state: string | null) {
  if (municipality && state) return `${municipality}–${state}`;
  return municipality ?? state ?? "Não informado";
}

function formatCivilDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function weekday(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function formatDuration(minutes: number) {
  return `${twoDigits(Math.floor(minutes / 60))}:${twoDigits(minutes % 60)}`;
}

function formatDecimal(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
