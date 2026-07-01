export type RegistryActionState = {
  ok: boolean;
  message: string;
};

const initialState: RegistryActionState = { ok: false, message: "" };

export function getInitialRegistryActionState() {
  return initialState;
}
