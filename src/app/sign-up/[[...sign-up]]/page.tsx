"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

import { hasClerkConfig } from "@/lib/runtime-config";

export default function SignUpPage() {
  if (!hasClerkConfig) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center text-white">
        <div>
          <h1 className="text-3xl font-black">Clerk ainda não configurado</h1>
          <p className="mt-3 text-slate-300">
            Define `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` para ativar registo.
          </p>
          <Link className="mt-6 inline-flex rounded-lg bg-cyan-300 px-4 py-2 font-bold text-slate-950" href="/">
            Voltar ao portal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <SignUp />
    </main>
  );
}
