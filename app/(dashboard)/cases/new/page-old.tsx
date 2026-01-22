import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NewCaseForm } from "@/components/cases/new-case-form";

export default async function NewCasePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Case</h1>
        <p className="text-muted-foreground mt-2">
          Enter the client's information to begin a new bankruptcy case
        </p>
      </div>

      <NewCaseForm />
    </div>
  );
}
