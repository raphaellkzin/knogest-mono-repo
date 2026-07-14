import { z } from "zod";
import pt from "zod/v4/locales/pt.js";

let configured = false;

export function configureZodPortugueseErrors() {
  if (configured) return;
  z.config(pt());
  configured = true;
}
