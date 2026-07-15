export type RegistryActionState = {
  ok: boolean;
  message: string;
  createdId?: string;
};

const initialState: RegistryActionState = { ok: false, message: "" };

export function getInitialRegistryActionState() {
  return initialState;
}
