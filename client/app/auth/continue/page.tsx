import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Where a sign-in without a callbackUrl lands: admins go to their dashboard.
export default async function ContinuePage() {
  const session = await auth();
  redirect(session?.user?.role === "admin" ? "/admin" : "/");
}
