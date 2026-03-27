import { NextResponse } from "next/server";
import { readSheetValues } from "@/lib/sheets";

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

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function formatDateOnly(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return clean(value);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return clean(value);

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toPreferences(values: unknown[]) {
  return values.map(clean).filter(Boolean);
}

function countRanking(items: string[]): RankingItem[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = clean(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, votes]) => ({ name, votes }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name))
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      votes: item.votes,
    }));
}

export async function GET() {
  try {
    const rows = await readSheetValues();

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        asOf: "",
        totalResponses: 0,
        sportsOptions: 0,
        talentOptions: 0,
        sportsRespondents: 0,
        talentRespondents: 0,
        bothRespondents: 0,
        sportsRanking: [],
        talentRanking: [],
        respondents: [],
      });
    }

    const dataRows = rows.slice(1);

    const respondents: Respondent[] = dataRows.map((row, index) => {
      const timestamp = row[0];
      const email = clean(row[1]);
      const fullName = clean(row[3]);
      const birthday = row[4];
      const age = clean(row[5]);
      const sex = clean(row[6]);
      const address = clean(row[7]);
      const guardianName = clean(row[8]);
      const relationship = clean(row[9]);
      const contactNumber = clean(row[10]);
      const guardianEmail = clean(row[11]);
      const category = clean(row[12]);

      let sportPreferences: string[] = [];
      let talentPreferences: string[] = [];

      if (category === "Sports Workshop") {
        sportPreferences = toPreferences([row[13], row[14], row[15]]);
      } else if (category === "Talent Workshop") {
        talentPreferences = toPreferences([row[16], row[17], row[18]]);
      } else if (category === "Both (Sports and Talent) Workshop") {
        sportPreferences = toPreferences([row[19], row[20], row[21]]);
        talentPreferences = toPreferences([row[22], row[23], row[24]]);
      }

      return {
        id: String(index + 1),
        timestamp: clean(timestamp),
        formattedTimestamp: formatDateTime(timestamp),
        email,
        fullName,
        birthday: formatDateOnly(birthday),
        age,
        sex,
        address,
        guardianName,
        relationship,
        contactNumber,
        guardianEmail,
        category,
        sportPreferences,
        talentPreferences,
      };
    });

    const sportsRanking = countRanking(
      respondents.flatMap((person) => person.sportPreferences)
    );

    const talentRanking = countRanking(
      respondents.flatMap((person) => person.talentPreferences)
    );

    const sportsRespondents = respondents.filter(
      (person) => person.category === "Sports Workshop"
    ).length;

    const talentRespondents = respondents.filter(
      (person) => person.category === "Talent Workshop"
    ).length;

    const bothRespondents = respondents.filter(
      (person) => person.category === "Both (Sports and Talent) Workshop"
    ).length;

    const asOf =
      respondents.length > 0
        ? respondents[respondents.length - 1].formattedTimestamp
        : "";

    return NextResponse.json({
      success: true,
      asOf,
      totalResponses: respondents.length,
      sportsOptions: sportsRanking.length,
      talentOptions: talentRanking.length,
      sportsRespondents,
      talentRespondents,
      bothRespondents,
      sportsRanking,
      talentRanking,
      respondents,
    });
  } catch (error) {
    console.error("Failed to load sheet data:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to load sheet data",
      },
      { status: 500 }
    );
  }
}