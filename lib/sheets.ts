import { google } from "googleapis";

function getGoogleCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  return JSON.parse(raw);
}

export async function readSheetValues() {
  const credentials = getGoogleCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const spreadsheetId = process.env.SPREADSHEET_ID;
  const range = process.env.SHEET_TAB_NAME;

  if (!spreadsheetId) {
    throw new Error("Missing SPREADSHEET_ID");
  }

  if (!range) {
    throw new Error("Missing SHEET_TAB_NAME");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values ?? [];
}