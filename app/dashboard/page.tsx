"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type RankingItem = {
  rank: number;
  name: string;
  votes: number;
};

type Respondent = {
  id: string;
  timestamp: string;
  formattedTimestamp: string;
  email: string;
  fullName: string;
  birthday: string;
  age: string;
  sex: string;
  address: string;
  guardianName: string;
  relationship: string;
  contactNumber: string;
  guardianEmail: string;
  category: string;
  sportPreferences: string[];
  talentPreferences: string[];
};

type DashboardData = {
  success: boolean;
  asOf: string;
  totalResponses: number;
  sportsOptions: number;
  talentOptions: number;
  sportsRespondents: number;
  talentRespondents: number;
  bothRespondents: number;
  sportsRanking: RankingItem[];
  talentRanking: RankingItem[];
  respondents: Respondent[];
};

type RankingProps = {
  title: string;
  items: RankingItem[];
  emptyText: string;
};

type FieldProps = {
  label: string;
  value: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const [data, setData] = useState<DashboardData | null>(null);
  const [selected, setSelected] = useState<Respondent | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  async function loadData(showLoader = false) {
    try {
      if (showLoader) setLoading(true);

      const res = await fetch("/api/registrations", {
        cache: "no-store",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (res.status === 403) {
        window.location.href = "/auth/error?error=AccessDenied";
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch dashboard data.");
      }

      const json: DashboardData = await res.json();

      if (!json.success) {
        throw new Error("API returned unsuccessful response.");
      }

      setData(json);

      if (json.respondents.length > 0) {
        setSelected((prev) => {
          if (!prev) return json.respondents[0];

          const existing = json.respondents.find(
            (person) => person.id === prev.id
          );

          return existing || json.respondents[0];
        });
      } else {
        setSelected(null);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setData(null);
      setSelected(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
  if (status === "loading") return;

  if (status === "unauthenticated") {
    window.location.href = "/login";
    return;
  }

  loadData(true);

    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [status]);

  const filteredRespondents = useMemo(() => {
    if (!data?.respondents) return [];

    return data.respondents.filter((person) => {
      const matchesSearch = person.fullName
        .toLowerCase()
        .includes(search.toLowerCase());

      const category = person.category.toLowerCase();

      const matchesFilter =
        filter === "All" ||
        (filter === "Sports" && category === "sports workshop") ||
        (filter === "Talent" && category === "talent workshop") ||
        (filter === "Both" &&
          category === "both (sports and talent) workshop");

      return matchesSearch && matchesFilter;
    });
  }, [data, search, filter]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#312e81,_#111827_38%,_#0f172a_70%,_#020617_100%)] px-6 py-10 text-center text-lg font-semibold text-white">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#312e81,_#111827_38%,_#0f172a_70%,_#020617_100%)] px-6 py-10 text-center text-lg font-semibold text-red-300">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#312e81,_#111827_38%,_#0f172a_70%,_#020617_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-5 xl:px-6 xl:py-8 space-y-6">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <img
            src="/summer-camp-banner.jpg"
            alt="Bagong Cabuyao Summer Camp Banner"
            className="w-full h-[220px] md:h-[260px] object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#020617]" />
        </div>

        <div className="sticky top-0 z-20 rounded-[28px] border border-white/10 bg-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="rounded-t-[28px] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-fuchsia-500/20 px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
                  Registration Summary Dashboard
                </p>
                <h1 className="bg-gradient-to-r from-cyan-300 via-blue-200 to-fuchsia-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent xl:text-4xl">
                  Bagong Cabuyao Summer Camp 2026
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  Real-time registration overview powered by Google Sheets
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 xl:items-end">
                <div className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200">
                  Supervisor Access Only
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  Signed in as:{" "}
                  <span className="font-semibold text-cyan-100">
                    {session?.user?.email}
                  </span>
                </div>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="rounded-full border border-red-300/20 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/20"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
              As Of
            </p>
            <p className="text-xl font-bold text-white">{data.asOf || "-"}</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
              Total Responses
            </p>

            <div className="flex items-center justify-between gap-4">
              <p className="text-4xl font-extrabold text-white">
                {data.totalResponses}
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right text-sm text-slate-300">
                <p>Sports ({data.sportsRespondents})</p>
                <p>Talent ({data.talentRespondents})</p>
                <p>Sports & Talent ({data.bothRespondents})</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-4 items-start">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl xl:col-span-1 h-[520px] flex flex-col">
            <h2 className="mb-4 text-2xl font-bold text-white">Respondents</h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/30"
              />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/30"
              >
                <option className="text-black">All</option>
                <option className="text-black">Sports</option>
                <option className="text-black">Talent</option>
                <option className="text-black">Both</option>
              </select>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 custom-scroll">
              {filteredRespondents.length === 0 ? (
                <p className="text-sm text-slate-400">No respondents found.</p>
              ) : (
                filteredRespondents.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelected(person)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selected?.id === person.id
                        ? "border-cyan-300/30 bg-cyan-400/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className="font-semibold text-white">
                      {person.fullName || "Unnamed"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-cyan-200">
                      {person.category || "No category"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <Ranking
            title="Sports Ranking"
            items={data.sportsRanking}
            emptyText="No sports ranking yet."
          />

          <Ranking
            title="Talent Ranking"
            items={data.talentRanking}
            emptyText="No talent ranking yet."
          />

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl xl:col-span-1 h-[520px] flex flex-col">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Participant Details
            </h2>

            {!selected ? (
              <p className="text-sm text-slate-400">
                Select a participant name to view full details.
              </p>
            ) : (
              <div className="space-y-3 text-sm overflow-y-auto flex-1 pr-1 custom-scroll">
                <Field label="Full Name" value={selected.fullName} />
                <Field label="Birthday" value={selected.birthday} />
                <Field label="Age" value={selected.age} />
                <Field label="Sex" value={selected.sex} />
                <Field label="Complete Address" value={selected.address} />
                <Field label="Parent/Guardian Name" value={selected.guardianName} />
                <Field label="Relationship" value={selected.relationship} />
                <Field label="Contact Number" value={selected.contactNumber} />
                <Field
                  label="Email Address"
                  value={selected.guardianEmail || selected.email}
                />
                <Field label="Chosen Category" value={selected.category} />

                {selected.sportPreferences.length > 0 && (
                  <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/10 px-4 py-3">
                    <p className="mb-2 font-semibold uppercase tracking-wide text-cyan-200">
                      Sports Preferences
                    </p>
                    <div className="space-y-1 text-slate-200">
                      {selected.sportPreferences.map((item, index) => (
                        <p key={`sport-${index}`}>
                          {index + 1}. {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {selected.talentPreferences.length > 0 && (
                  <div className="rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/10 px-4 py-3">
                    <p className="mb-2 font-semibold uppercase tracking-wide text-fuchsia-200">
                      Talent Preferences
                    </p>
                    <div className="space-y-1 text-slate-200">
                      {selected.talentPreferences.map((item, index) => (
                        <p key={`talent-${index}`}>
                          {index + 1}. {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <Field label="Timestamp" value={selected.formattedTimestamp} />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <img src="/youth.png" alt="Youth" className="h-12 w-auto object-contain opacity-95" />
            <img src="/sports.png" alt="Sports" className="h-12 w-auto object-contain opacity-95" />
            <img src="/seal.png" alt="Seal" className="h-12 w-auto object-contain opacity-95" />
            <img src="/bagongcabuyao.png" alt="Bagong Cabuyao" className="h-12 w-auto object-contain opacity-95" />
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-300">
              Developed by <span className="font-semibold text-cyan-300">A. Fojas</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Bagong Cabuyao Sports Summer Camp 2026
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
        }

        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </main>
  );
}

function Ranking({ title, items, emptyText }: RankingProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl xl:col-span-1 h-[520px] flex flex-col">
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scroll">
          {items.map((item) => (
            <div
              key={`${item.rank}-${item.name}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <span className="font-medium text-white">
                {item.rank}. {item.name}
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {item.votes}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-cyan-200">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value || ""}</p>
    </div>
  );
}