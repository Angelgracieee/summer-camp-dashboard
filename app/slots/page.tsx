"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Respondent = {
  id: string;
  timestamp: string;
  fullName: string;
  category: string;
  sportPreferences: string[];
  talentPreferences: string[];
};

type DashboardData = {
  success: boolean;
  sportsRanking: { name: string }[];
  talentRanking: { name: string }[];
  respondents: Respondent[];
};

const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row =>
    Object.values(row)
      .map(value => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.replace(/\s+/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function SlotAllocationPage() {
  const { data: session, status } = useSession();
  const [rawData, setRawData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<string, number>>({});

  // INDEPENDENT SEARCH STATES
  const [sportsSearch, setSportsSearch] = useState("");
  const [talentSearch, setTalentSearch] = useState("");
  const [partialSearch, setPartialSearch] = useState("");
  const [waitlistSearch, setWaitlistSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/registrations", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setRawData(json);
          const initialSlots: Record<string, number> = {};
          json.sportsRanking.forEach((s: any) => (initialSlots[s.name] = 100));
          json.talentRanking.forEach((t: any) => (initialSlots[t.name] = 100));
          setSlots(initialSlots);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const allocations = useMemo(() => {
    if (!rawData) return { sports: {}, talent: {}, waitlist: [], partialWaitlist: [], totalUniqueAllocated: 0 };

    const sportsAlloc: Record<string, { list: any[]; filled: number }> = {};
    const talentAlloc: Record<string, { list: any[]; filled: number }> = {};
    const waitlist: any[] = [];
    const partialWaitlist: any[] = [];
    const allocatedPeopleIds = new Set();

    rawData.sportsRanking.forEach((r) => (sportsAlloc[r.name] = { list: [], filled: 0 }));
    rawData.talentRanking.forEach((r) => (talentAlloc[r.name] = { list: [], filled: 0 }));

    const sortedParticipants = [...rawData.respondents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedParticipants.forEach((person) => {
      const cat = person.category.toLowerCase();
      const isDualRequest = cat.includes("both");
      let assignedSport: string | null = null;
      let assignedTalent: string | null = null;
      let sPref = 0; let tPref = 0;

      if (cat.includes("sports") || isDualRequest) {
        for (let i = 0; i < person.sportPreferences.length; i++) {
          const choice = person.sportPreferences[i];
          if (sportsAlloc[choice] && sportsAlloc[choice].filled < (slots[choice] ?? 100)) {
            assignedSport = choice; sPref = i + 1; break;
          }
        }
      }

      if (cat.includes("talent") || isDualRequest) {
        for (let i = 0; i < person.talentPreferences.length; i++) {
          const choice = person.talentPreferences[i];
          if (talentAlloc[choice] && talentAlloc[choice].filled < (slots[choice] ?? 100)) {
            assignedTalent = choice; tPref = i + 1; break;
          }
        }
      }

      if (assignedSport) {
        sportsAlloc[assignedSport].filled++;
        allocatedPeopleIds.add(person.id);
        sportsAlloc[assignedSport].list.push({
          ...person,
          isDual: isDualRequest,
          choiceLevel: sPref,
          assignedTo: assignedSport,
          partnerSlot: assignedTalent || "WAITLISTED",
          isPartnerAllocated: !!assignedTalent
        });
      }

      if (assignedTalent) {
        talentAlloc[assignedTalent].filled++;
        allocatedPeopleIds.add(person.id);
        talentAlloc[assignedTalent].list.push({
          ...person,
          isDual: isDualRequest,
          choiceLevel: tPref,
          assignedTo: assignedTalent,
          partnerSlot: assignedSport || "WAITLISTED",
          isPartnerAllocated: !!assignedSport
        });
      }

      if (isDualRequest) {
        if ((assignedSport && !assignedTalent) || (!assignedSport && assignedTalent)) {
          partialWaitlist.push({ ...person, secured: assignedSport || assignedTalent, missed: !assignedSport ? "Sports" : "Talent" });
        }
        if (!assignedSport && !assignedTalent) waitlist.push(person);
      } else if (!assignedSport && !assignedTalent) {
        waitlist.push(person);
      }
    });

    return {
      sports: sportsAlloc,
      talent: talentAlloc,
      waitlist,
      partialWaitlist,
      totalUniqueAllocated: allocatedPeopleIds.size
    };
  }, [rawData, slots]);

  if (loading) return <div className="p-10 text-white bg-[#020617] min-h-screen font-mono italic">Synchronizing Matrix...</div>;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-8 font-sans">
      <div className="max-w-[1800px] mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Allocation Engine - First Come, First Serve</h1>

            <div className="flex flex-wrap gap-8 mt-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Total Applicants</span>
                <span className="text-2xl font-black text-white leading-tight">{rawData?.respondents.length || 0}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-8">
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">Allocated (Individuals)</span>
                <span className="text-2xl font-black text-emerald-400 leading-tight">{allocations.totalUniqueAllocated}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-8">
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-[0.2em]">Waitlisted (Total)</span>
                <span className="text-2xl font-black text-rose-400 leading-tight">{allocations.waitlist.length}</span>
              </div>
            </div>
          </div>
          <a href="/dashboard" className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-all text-sm uppercase tracking-widest">Return Home</a>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CapacityCard title="Sports Thresholds" allocs={allocations.sports} slots={slots} updateSlot={(n: any, v: any) => setSlots(p => ({ ...p, [n]: v }))} />
          <CapacityCard title="Talent Thresholds" allocs={allocations.talent} slots={slots} updateSlot={(n: any, v: any) => setSlots(p => ({ ...p, [n]: v }))} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

          <TabbedDetailFrame title="Sports Roster" data={allocations.sports} color="cyan" searchQuery={sportsSearch} setSearchQuery={setSportsSearch} />

          <TabbedDetailFrame title="Talent Roster" data={allocations.talent} color="fuchsia" searchQuery={talentSearch} setSearchQuery={setTalentSearch} />

          {/* PARTIAL WAITLIST */}
          <div className="bg-white/5 border border-amber-500/20 rounded-[40px] p-6 h-[800px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="text-xl font-bold text-amber-400 uppercase tracking-tighter italic">Partial Hits</h3>
                <p className="text-[10px] text-amber-500/50 font-bold uppercase mb-4 tracking-widest">Count: {allocations.partialWaitlist.length}</p>
              </div>
              <button
                onClick={() => downloadCSV(allocations.partialWaitlist, "Partial_Waitlist")}
                className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
              >
                📥 Export CSV
              </button>
            </div>

            <input
              type="text" placeholder="Search partial hits..." value={partialSearch} onChange={(e) => setPartialSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs mb-4 outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600 italic"
            />

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {allocations.partialWaitlist.filter(p => p.fullName.toLowerCase().includes(partialSearch.toLowerCase())).map((p) => (
                <div key={p.id} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl hover:bg-amber-500/10 transition-colors">
                  <p className="text-sm font-bold text-amber-200">{p.fullName}</p>
                  <p className="text-[9px] text-slate-500 mt-2 uppercase">Secured: <span className="text-emerald-400 font-bold">{p.secured}</span></p>
                  <p className="text-[9px] text-rose-500 font-bold mt-1 uppercase italic tracking-tighter">Missed: {p.missed}</p>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL WAITLIST */}
          <div className="bg-white/5 border border-rose-500/20 rounded-[40px] p-6 h-[800px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="text-xl font-bold text-rose-400 uppercase tracking-tighter italic">No Allocation</h3>
                <p className="text-[10px] text-rose-500/50 font-bold uppercase mb-4 tracking-widest">Count: {allocations.waitlist.length}</p>
              </div>
              <button
                onClick={() => downloadCSV(allocations.waitlist, "Total_Waitlist")}
                className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
              >
                📥 Export CSV
              </button>
            </div>

            <input
              type="text" placeholder="Search waitlist..." value={waitlistSearch} onChange={(e) => setWaitlistSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs mb-4 outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-600 italic"
            />

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {allocations.waitlist.filter(p => p.fullName.toLowerCase().includes(waitlistSearch.toLowerCase())).map((p) => (
                <div key={p.id} className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl hover:bg-rose-500/10 transition-colors">
                  <p className="text-sm font-bold text-rose-200">{p.fullName}</p>
                  <p className="text-[9px] text-rose-500/60 font-black uppercase mt-1 tracking-tighter">{p.category}</p>
                </div>
              ))}
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}

function CapacityCard({ title, allocs, slots, updateSlot }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl shadow-2xl">
      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 max-h-[250px] overflow-y-auto pr-6 custom-scrollbar">
        {Object.keys(allocs).map(name => {
          const filled = allocs[name].filled;
          const limit = slots[name] || 0;
          const isFull = filled >= limit && limit !== 0;
          return (
            <div key={name} className="group">
              <div className="flex justify-between text-xs items-center mb-2">
                <span className={`truncate max-w-[150px] transition-colors ${isFull ? "text-rose-400 font-bold" : "text-slate-400 group-hover:text-slate-200 uppercase tracking-tighter"}`}>{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500">{filled}/{limit}</span>
                  <input
                    type="number" value={slots[name] === 0 ? "" : slots[name]}
                    onChange={e => updateSlot(name, e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
                    className="w-12 bg-white/5 rounded-lg border border-white/10 text-center text-[10px] py-1 outline-none transition-all focus:border-white/40"
                  />
                </div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${isFull ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"}`} style={{ width: `${Math.min((filled / (limit || 1)) * 100, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabbedDetailFrame({ title, data, color, searchQuery, setSearchQuery }: any) {
  const categories = Object.keys(data);
  const [activeTab, setActiveTab] = useState("ALL_PARTICIPANTS");

  // Global list combined from all categories
  const allParticipants = useMemo(() => {
    const combined: any[] = [];
    Object.keys(data).forEach(catName => {
      data[catName].list.forEach((p: any) => combined.push(p));
    });
    return combined;
  }, [data]);

  const frameTotal = useMemo(() => {
    const ids = new Set();
    allParticipants.forEach((p: any) => ids.add(p.id));
    return ids.size;
  }, [allParticipants]);

  const handleExport = () => {
    const listToExport = activeTab === "ALL_PARTICIPANTS" ? allParticipants : data[activeTab]?.list;
    if (!listToExport) return;

    const exportData = listToExport.map((p, i) => {
      // If they only picked one category, don't say they are waitlisted for the other
      const secondaryStatus = p.isDual ? (p.partnerSlot || "WAITLISTED") : "NOT REQUESTED";

      return {
        Rank: i + 1,
        Name: p.fullName,
        Assigned_Activity: p.assignedTo,
        Category: p.category,
        Preference_Level: p.choiceLevel,
        Allocation_Type: p.isDual ?
          (p.isPartnerAllocated ? "FULL DUAL SECURED" : "PARTIAL SECURED") :
          "SINGLE CATEGORY SECURED",
        Secondary_Category_Status: secondaryStatus
      };
    });

    downloadCSV(exportData, `${title}_${activeTab}`);
  };

  const activeColor = color === "cyan" ? "bg-cyan-600 shadow-cyan-900/30" : "bg-fuchsia-600 shadow-fuchsia-900/30";
  const borderColor = color === "cyan" ? "border-cyan-500/20" : "border-fuchsia-500/20";
  const badgeColor = color === "cyan" ? "text-cyan-400 border-cyan-500/30" : "text-fuchsia-400 border-fuchsia-500/30";

  // Filter logic: if there is a search query, search EVERYTHING. If not, filter by tab.
  const filteredList = useMemo(() => {
    const source = (searchQuery.trim() !== "" || activeTab === "ALL_PARTICIPANTS")
      ? allParticipants
      : data[activeTab]?.list || [];

    return source.filter((p: any) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeTab, allParticipants, data]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-[40px] p-6 h-[800px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-sm">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">{title}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Unique: {frameTotal}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
        >
          📥 Export CSV
        </button>
      </div>

      <input
        type="text" placeholder={`Search all ${title.toLowerCase()}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        className={`w-full bg-white/5 border ${borderColor} rounded-xl px-4 py-2 text-xs my-4 outline-none focus:border-white/40 transition-all placeholder:text-slate-600 italic`}
      />

      <div className="flex flex-col gap-1 mb-4 p-2 bg-black/40 rounded-[20px] overflow-y-auto max-h-[180px] custom-scrollbar border border-white/5 shadow-inner">
        {/* ALL CATEGORIES TAB */}
        <button onClick={() => setActiveTab("ALL_PARTICIPANTS")}
          className={`w-full flex justify-between items-center px-4 py-2 text-[10px] font-bold rounded-xl transition-all ${activeTab === "ALL_PARTICIPANTS" ? `${activeColor} text-white shadow-lg` : "text-slate-500 hover:bg-white/5 uppercase"
            }`}
        >
          <span>ALL CATEGORIES</span>
          <span className="font-mono opacity-60 text-[9px]">{allParticipants.length}</span>
        </button>

        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            className={`w-full flex justify-between items-center px-4 py-2 text-[10px] font-bold rounded-xl transition-all ${activeTab === cat ? `${activeColor} text-white shadow-lg` : "text-slate-500 hover:bg-white/5 uppercase"
              }`}
          >
            <span className="truncate">{cat}</span>
            <span className="font-mono opacity-60 text-[9px]">{data[cat].list.length}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {filteredList.map((p: any, i: number) => (
          <div key={`${p.id}-${i}`} className={`p-4 rounded-[20px] border transition-all hover:scale-[1.01] ${p.isDual ? "bg-blue-600/10 border-blue-500/30" : `bg-white/5 ${borderColor}`}`}>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-100 block tracking-tight">{i + 1}. {p.fullName}</span>
              <span className={`text-[7px] px-2 py-0.5 rounded border font-black uppercase ${badgeColor}`}>
                {p.assignedTo}
              </span>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Pref {p.choiceLevel}</span>
              {p.isDual && (
                <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${p.isPartnerAllocated ? "bg-amber-500 text-black shadow-lg shadow-amber-900/20" : "bg-blue-600 text-white"}`}>
                  {p.partnerSlot}
                </span>
              )}
            </div>
          </div>
        ))}
        {filteredList.length === 0 && (
          <p className="text-center text-[10px] text-slate-600 mt-10 uppercase italic">No participants found</p>
        )}
      </div>
    </div>
  );
}