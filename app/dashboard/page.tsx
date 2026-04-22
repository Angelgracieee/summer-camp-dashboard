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
  onItemClick: (name: string, type: "Sports" | "Talent") => void;
};

type FieldProps = {
  label: string;
  value: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const [rawData, setRawData] = useState<DashboardData | null>(null);
  const [selected, setSelected] = useState<Respondent | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [modalData, setModalData] = useState<{
    name: string;
    type: "Sports" | "Talent";
  } | null>(null);

  const [modalSexFilter, setModalSexFilter] = useState<"All" | "Male" | "Female">("All");
  const [modalAgeFilter, setModalAgeFilter] = useState<"Any Age" | "7-10" | "11-14" | "15-17">("Any Age");
  const [modalSearch, setModalSearch] = useState("");

  const data = useMemo(() => {
    if (!rawData) return null;

    const processRanking = (ranking: RankingItem[], type: "sportPreferences" | "talentPreferences") => {
      return ranking
        .map((item) => {
          const uniqueCount = rawData.respondents.filter((r) => 
            r[type].includes(item.name)
          ).length;
          return { ...item, votes: uniqueCount };
        })
        .sort((a, b) => b.votes - a.votes)
        .map((item, index) => ({ ...item, rank: index + 1 }));
    };

    return {
      ...rawData,
      sportsRanking: processRanking(rawData.sportsRanking, "sportPreferences"),
      talentRanking: processRanking(rawData.talentRanking, "talentPreferences"),
    };
  }, [rawData]);

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

      setRawData(json);

      if (json.respondents.length > 0) {
        setSelected((prev) => {
          if (!prev) return json.respondents[0];
          const existing = json.respondents.find((p) => p.id === prev.id);
          return existing || json.respondents[0];
        });
      } else {
        setSelected(null);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setRawData(null);
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
    const interval = setInterval(() => loadData(false), 10000);
    return () => clearInterval(interval);
  }, [status]);

  const filteredRespondents = useMemo(() => {
    if (!data?.respondents) return [];
    return data.respondents.filter((person) => {
      const matchesSearch = person.fullName.toLowerCase().includes(search.toLowerCase());
      const category = person.category.toLowerCase();
      const matchesFilter =
        filter === "All" ||
        (filter === "Sports" && category === "sports workshop") ||
        (filter === "Talent" && category === "talent workshop") ||
        (filter === "Both" && category === "both (sports and talent) workshop");
      return matchesSearch && matchesFilter;
    });
  }, [data, search, filter]);

  const { stats, ageStats, participantsByChoice, exportData } = useMemo(() => {
    if (!modalData || !data) return { 
        stats: { all: 0, male: 0, female: 0 }, 
        ageStats: { "7-10": 0, "11-14": 0, "15-17": 0 },
        participantsByChoice: { first: [], second: [], third: [] },
        exportData: []
    };

    const itemName = modalData.name;
    const prefKey = modalData.type === "Sports" ? "sportPreferences" : "talentPreferences";

    const baseList = data.respondents.filter((p) => p[prefKey].includes(itemName));
    
    const counts = {
        all: baseList.length,
        male: baseList.filter(p => p.sex.toLowerCase() === "male").length,
        female: baseList.filter(p => p.sex.toLowerCase() === "female").length
    };

    const ageCounts = {
        "7-10": baseList.filter(p => parseInt(p.age) >= 7 && parseInt(p.age) <= 10).length,
        "11-14": baseList.filter(p => parseInt(p.age) >= 11 && parseInt(p.age) <= 14).length,
        "15-17": baseList.filter(p => parseInt(p.age) >= 15 && parseInt(p.age) <= 17).length
    };

    const filteredList = baseList.filter((p) => {
      const sexMatch = modalSexFilter === "All" || p.sex.toLowerCase() === modalSexFilter.toLowerCase();
      const searchMatch = p.fullName.toLowerCase().includes(modalSearch.toLowerCase());
      
      let ageMatch = false;
      const ageNum = parseInt(p.age);
      if (modalAgeFilter === "Any Age") ageMatch = true;
      else if (modalAgeFilter === "7-10") ageMatch = ageNum >= 7 && ageNum <= 10;
      else if (modalAgeFilter === "11-14") ageMatch = ageNum >= 11 && ageNum <= 14;
      else if (modalAgeFilter === "15-17") ageMatch = ageNum >= 15 && ageNum <= 17;

      return sexMatch && ageMatch && searchMatch;
    });

    // Sort by Choice Level (1st, 2nd, 3rd)
    const sortedList = [...filteredList].sort((a, b) => {
      return a[prefKey].indexOf(itemName) - b[prefKey].indexOf(itemName);
    });

    const exportRows = sortedList.map((p) => {
      const choiceIdx = p[prefKey].indexOf(itemName);
      const labels = ["1st Choice", "2nd Choice", "3rd Choice"];
      return {
        "Email (Registrant)": p.email, // Added email before name
        "Full Name": p.fullName,
        "Choice Level": labels[choiceIdx] || "N/A",
        "Birthday": p.birthday,
        "Age": p.age,
        "Sex": p.sex,
        "Complete Address": p.address,
        "Parent/Guardian": p.guardianName,
        "Relationship": p.relationship,
        "Contact Number": p.contactNumber,
        "Guardian Email": p.guardianEmail || "N/A",
        "Category": p.category,
        "Timestamp": p.formattedTimestamp
      };
    });

    return {
      stats: counts,
      ageStats: ageCounts,
      participantsByChoice: {
        first: filteredList.filter((p) => p[prefKey].indexOf(itemName) === 0),
        second: filteredList.filter((p) => p[prefKey].indexOf(itemName) === 1),
        third: filteredList.filter((p) => p[prefKey].indexOf(itemName) === 2),
      },
      exportData: exportRows
    };
  }, [modalData, data, modalSexFilter, modalAgeFilter, modalSearch]);

  const handleExport = () => {
    if (exportData.length === 0) return;
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(","),
      ...exportData.map(row => headers.map(h => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${modalData?.name}_Participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#312e81,_#111827_38%,_#0f172a_70%,_#020617_100%)] px-6 py-10 text-center text-lg font-semibold text-white">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") window.location.href = "/login";
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
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <img
            src="/summer-camp-banner.jpg"
            alt="Bagong Cabuyao Summer Camp Banner"
            className="h-auto w-full object-cover"
          />
        </div>

       <div className="rounded-[28px] border border-white/10 bg-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
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
                  Signed in as: <span className="font-semibold text-cyan-100">{session?.user?.email}</span>
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
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-200">As Of</p>
            <p className="text-xl font-bold text-white">{data.asOf || "-"}</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-200">Total Responses</p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-4xl font-extrabold text-white">{data.totalResponses}</p>
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
                filteredRespondents.map((person, index) => (
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
                      {index + 1}. {person.fullName || "Unnamed"}
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
            onItemClick={(name) => {
                setModalData({ name, type: "Sports" });
                setModalSexFilter("All");
                setModalAgeFilter("Any Age");
                setModalSearch("");
            }}
          />

          <Ranking
            title="Talent Ranking"
            items={data.talentRanking}
            emptyText="No talent ranking yet."
            onItemClick={(name) => {
                setModalData({ name, type: "Talent" });
                setModalSexFilter("All");
                setModalAgeFilter("Any Age");
                setModalSearch("");
            }}
          />

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl xl:col-span-1 h-[520px] flex flex-col">
            <h2 className="mb-4 text-2xl font-bold text-white">Participant Details</h2>
            {!selected ? (
              <p className="text-sm text-slate-400">Select a participant name to view full details.</p>
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
                <Field label="Email Address" value={selected.guardianEmail || selected.email} />
                <Field label="Chosen Category" value={selected.category} />

                {selected.sportPreferences.length > 0 && (
                  <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/10 px-4 py-3">
                    <p className="mb-2 font-semibold uppercase tracking-wide text-cyan-200">Sports Preferences</p>
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
                    <p className="mb-2 font-semibold uppercase tracking-wide text-fuchsia-200">Talent Preferences</p>
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
            <p className="mt-1 text-xs text-slate-500">Bagong Cabuyao Summer Camp 2026</p>
          </div>
        </div>
      </div>

      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[32px] border border-white/20 bg-slate-900 shadow-2xl flex flex-col">
            <div className="border-b border-white/10 bg-white/5 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{modalData.name}</h3>
                    <p className="text-xs uppercase tracking-widest text-cyan-300">{modalData.type} Interest Breakdown</p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    📥 Export Sorted CSV
                  </button>
                </div>
                <button 
                  onClick={() => setModalData(null)}
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setModalSexFilter("All")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalSexFilter === "All" 
                                ? "bg-white text-slate-900 border-white" 
                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/30"
                            }`}
                        >
                            ALL <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalSexFilter === "All" ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"}`}>{stats.all}</span>
                        </button>
                        <button
                            onClick={() => setModalSexFilter("Male")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalSexFilter === "Male" 
                                ? "bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                                : "bg-blue-500/5 text-blue-400 border-blue-500/20"
                            }`}
                        >
                            MALE <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalSexFilter === "Male" ? "bg-white text-blue-600" : "bg-blue-500/20 text-blue-300"}`}>{stats.male}</span>
                        </button>
                        <button
                            onClick={() => setModalSexFilter("Female")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalSexFilter === "Female" 
                                ? "bg-fuchsia-500 text-white border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.3)]" 
                                : "bg-fuchsia-500/5 text-fuchsia-400 border-fuchsia-500/20"
                            }`}
                        >
                            FEMALE <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalSexFilter === "Female" ? "bg-white text-fuchsia-600" : "bg-fuchsia-500/20 text-fuchsia-300"}`}>{stats.female}</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setModalAgeFilter("Any Age")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalAgeFilter === "Any Age" 
                                ? "bg-white text-slate-900 border-white" 
                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/30"
                            }`}
                        >
                            ANY AGE <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalAgeFilter === "Any Age" ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"}`}>{stats.all}</span>
                        </button>
                        <button
                            onClick={() => setModalAgeFilter("7-10")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalAgeFilter === "7-10" 
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/30"
                            }`}
                        >
                            7-10 <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalAgeFilter === "7-10" ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"}`}>{ageStats["7-10"]}</span>
                        </button>
                        <button
                            onClick={() => setModalAgeFilter("11-14")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalAgeFilter === "11-14" 
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/30"
                            }`}
                        >
                            11-14 <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalAgeFilter === "11-14" ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"}`}>{ageStats["11-14"]}</span>
                        </button>
                        <button
                            onClick={() => setModalAgeFilter("15-17")}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 font-bold text-xs ${
                                modalAgeFilter === "15-17" 
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]" 
                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/30"
                            }`}
                        >
                            15-17 <span className={`px-2 py-0.5 rounded-md text-[10px] ${modalAgeFilter === "15-17" ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"}`}>{ageStats["15-17"]}</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-end">
                    <div className="relative w-full">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search names in this ranking..."
                            value={modalSearch}
                            onChange={(e) => setModalSearch(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-white/10 pl-11 pr-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/30 transition-all"
                        />
                    </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <ModalSection title="1st Choice" participants={participantsByChoice.first} color="border-cyan-500/30 bg-cyan-500/5 text-cyan-200" />
                <ModalSection title="2nd Choice" participants={participantsByChoice.second} color="border-blue-500/30 bg-blue-500/5 text-blue-200" />
                <ModalSection title="3rd Choice" participants={participantsByChoice.third} color="border-slate-500/30 bg-slate-500/5 text-slate-300" />
              </div>
            </div>
            
            <div className="border-t border-white/10 bg-white/5 px-6 py-4 text-center">
              <button 
                onClick={() => setModalData(null)}
                className="rounded-xl bg-white/10 px-8 py-2.5 text-sm font-bold hover:bg-white/20 transition-all border border-white/10"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 9999px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}</style>
    </main>
  );
}

function ModalSection({ title, participants, color }: { title: string, participants: Respondent[], color: string }) {
  return (
    <div className="flex flex-col h-[300px] lg:h-[450px] border border-white/5 bg-white/5 rounded-3xl p-4 overflow-hidden">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400 border-l-4 border-white/20 pl-3 shrink-0">
        {title} ({participants.length})
      </h4>

      <div className="flex-1 overflow-y-auto pr-2 custom-scroll space-y-2">
        {participants.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-4 bg-white/5 rounded-2xl">No matches.</p>
        ) : (
          participants.map((p, index) => (
            <div 
              key={p.id} 
              className={`rounded-xl border p-3 text-sm font-medium transition-all ${color}`}
            >
              <div className="flex justify-between items-center">
                <span className="truncate">{index + 1}. {p.fullName}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Ranking({ title, items, emptyText, onItemClick }: RankingProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl xl:col-span-1 h-[520px] flex flex-col">
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scroll">
          {items.map((item) => (
            <button
              key={`${item.rank}-${item.name}`}
              onClick={() => onItemClick(item.name, title.includes("Sports") ? "Sports" : "Talent")}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:border-cyan-300/40 hover:bg-cyan-400/5"
            >
              <span className="font-medium text-white group-hover:text-cyan-200 transition-colors">
                {item.rank}. {item.name}
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100 group-hover:bg-cyan-400/20 group-hover:border-cyan-300/40 transition">
                {item.votes}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-cyan-200">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value || ""}</p>
    </div>
  );
}