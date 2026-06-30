import { redirect } from "next/navigation";

import { CompanySelectionEmpty } from "@/features/company-selection/components/company-selection-empty";
import { CompanySelectionPage } from "@/features/company-selection/components/company-selection-page";
import { getCompanySelectionViewModel } from "@/features/company-selection/company-selection.server";

export default async function Page() {
  const { companies, selectedCompany } = await getCompanySelectionViewModel();

  if (selectedCompany) redirect("/home");
  if (companies.length === 0) return <CompanySelectionEmpty />;
  return <CompanySelectionPage companies={companies} />;
}
