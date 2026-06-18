import { redirect } from "next/navigation";

import { LoginPage } from "@/components/pages/auth/login/login-page";
import { getCurrentSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    redirect("/home");
  }

  return <LoginPage />;
}
