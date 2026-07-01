export type EmployeeActionState = {
  ok: boolean;
  message: string;
};

const initialState: EmployeeActionState = { ok: false, message: "" };

export function getInitialEmployeeActionState() {
  return initialState;
}
