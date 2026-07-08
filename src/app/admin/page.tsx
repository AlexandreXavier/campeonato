import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AdminConsole } from "@/components/portal/admin-console";
import { hasClerkConfig } from "@/lib/runtime-config";

export default async function AdminPage() {
  if (hasClerkConfig) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in");
    }
  }

  return <AdminConsole />;
}
