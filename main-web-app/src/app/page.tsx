import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";

export default async function RootPage() {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    redirect("/home");
  }

  redirect("/auth/login");
}
