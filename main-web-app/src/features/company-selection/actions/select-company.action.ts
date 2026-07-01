"use server";

import { selectCompany } from "../company-selection.server";

export async function selectCompanyAction(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  await selectCompany(companyId);
}
