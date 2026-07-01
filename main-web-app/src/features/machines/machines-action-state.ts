export type MachineActionState = {
  ok: boolean;
  message: string;
};

export function getInitialMachineActionState(): MachineActionState {
  return { ok: false, message: "" };
}
