export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;


  let message = "Your Google account is not allowed to access this dashboard.";


  if (error && error !== "AccessDenied") {
    message = "Something went wrong during sign in.";
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-xl">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-3 text-slate-300">{message}</p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
        >
          Back to Login
        </a>
      </div>
    </main>
  );
}

