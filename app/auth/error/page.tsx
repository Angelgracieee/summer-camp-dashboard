"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">
          {error === "AccessDenied"
            ? "Your account is not allowed."
            : "Authentication failed."}
        </p>

        <Link href="/login" className="mt-4 inline-block underline">
          Back to Login
        </Link>
      </div>
    </main>
  );
}