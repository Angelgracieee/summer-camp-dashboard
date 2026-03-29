"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-xl">
        <h1 className="text-2xl font-bold">Supervisor Login</h1>
        <p className="mt-2 text-slate-300">
          Sign in with your allowed Google account to access the dashboard.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}