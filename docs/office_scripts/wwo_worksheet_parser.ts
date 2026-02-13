/**
 * WWO Worksheet Parser
 * Used by: WWO Worksheet Parser flow
 * Purpose: Extracts bookings + structured rates from WWO worksheets
 * Input: none (reads from workbook directly)
 */
function main(workbook: ExcelScript.Workbook): string {
  const result: {
    fileName: string;
    sheets: { name: string; data: string[][] }[];
    error: string | null;
    customer: string;
    bookings: Booking[];
    totalBookings: number;
    rates: Rate[];
    totalRates: number;
  } = {
    fileName: workbook.getName(),
    sheets: [],
    error: null,
    customer: "",
    bookings: [],
    totalBookings: 0,
    rates: [],
    totalRates: 0
  };

  try {
    const worksheets = workbook.getWorksheets();

    // === PART 1: Extract customer & bookings from FIRST sheet ===
    const mainSheet = worksheets[0];
    const mainRange = mainSheet.getUsedRange();

    if (mainRange) {
      const mainValues = getValuesWithMerges(mainSheet, mainRange);

      // Find customer from title rows
      for (let i = 0; i < Math.min(5, mainValues.length); i++) {
        const rowText = mainValues[i].join(" ").toUpperCase();
        if (rowText.includes("BMW")) {
          result.customer = "BMW";
          break;
        } else if (rowText.includes("TOYOTA")) {
          result.customer = "TOYOTA";
          break;
        } else if (rowText.includes("MERCEDES") || rowText.includes("DAIMLER")) {
          result.customer = "MERCEDES";
          break;
        } else if (rowText.includes("VOLVO")) {
          result.customer = "VOLVO";
          break;
        }
      }

      // Find header row and column indices dynamically
      let headerRowIndex = -1;
      let COL = {
        ETD: -1, VESSEL: -1, POL: -1, POD: -1, SHIPPER: -1,
        BOOKING_NO: -1, BL_NO: -1, BL_TYPE: -1, BOOKED_QTY: -1
      };

      for (let i = 0; i < Math.min(10, mainValues.length); i++) {
        const row = mainValues[i];
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || "").trim().toUpperCase();
          if (cell.includes("POL") && cell.includes("ETD")) COL.ETD = c;
          else if (cell === "VESSEL") COL.VESSEL = c;
          else if (cell === "POL") COL.POL = c;
          else if (cell === "POD") COL.POD = c;
          else if (cell === "SHIPPER") COL.SHIPPER = c;
          else if (cell.includes("BOOKING") && cell.includes("NO")) COL.BOOKING_NO = c;
          else if (cell.includes("B/L") && cell.includes("NO") && !cell.includes("TYPE")) COL.BL_NO = c;
          else if (cell.includes("B/L") && cell.includes("TYPE")) COL.BL_TYPE = c;
          else if (cell.includes("BOOKED") && cell.includes("QTY")) COL.BOOKED_QTY = c;
        }
        if (COL.BL_NO >= 0) {
          headerRowIndex = i;
          break;
        }
      }

      // Extract bookings if header found
      if (headerRowIndex >= 0) {
        for (let i = headerRowIndex + 1; i < mainValues.length; i++) {
          const row = mainValues[i];
          const blNumber = String(row[COL.BL_NO] || "").trim();

          // Skip empty or instruction rows
          if (!blNumber ||
            blNumber.toLowerCase().includes("record") ||
            blNumber.toLowerCase().includes("action") ||
            blNumber.toLowerCase().includes("per bill")) {
            continue;
          }

          result.bookings.push({
            blNumber: blNumber,
            bookingNumber: String(row[COL.BOOKING_NO] || "").trim(),
            blType: String(row[COL.BL_TYPE] || "").trim(),
            polCode: String(row[COL.POL] || "").trim(),
            podCode: String(row[COL.POD] || "").trim(),
            vessel: String(row[COL.VESSEL] || "").trim(),
            shipper: String(row[COL.SHIPPER] || "").trim(),
            etd: formatDate(row[COL.ETD]),
            bookedQty: parseNumber(row[COL.BOOKED_QTY])
          });
        }

        result.totalBookings = result.bookings.length;
      }
    }

    // === PART 2: Extract structured rates from "Rates" sheet ===
    for (let i = 0; i < worksheets.length; i++) {
      const ws = worksheets[i];
      const name = ws.getName().toLowerCase();
      if (name === "rates" || name === "rate") {
        result.rates = parseRatesSheet(ws);
        result.totalRates = result.rates.length;
        break;
      }
    }

    // === PART 3: Extract raw sheet data (kept for debugging) ===
    for (let i = 0; i < worksheets.length; i++) {
      const ws = worksheets[i];
      const name = ws.getName();
      const nameLower = name.toLowerCase();
      if (nameLower.includes("rate") ||
        nameLower.includes("mapping") ||
        nameLower.includes("bmw") ||
        nameLower.includes("rr")) {
        const sheetData = extractSheet(ws);
        if (sheetData.length > 0) {
          result.sheets.push({ name: name, data: sheetData });
        }
      }
    }

  } catch (e) {
    result.error = String(e);
  }

  return JSON.stringify(result);
}

// === Interfaces ===

interface Booking {
  blNumber: string;
  bookingNumber: string;
  blType: string;
  polCode: string;
  podCode: string;
  vessel: string;
  shipper: string;
  etd: string;
  bookedQty: number | null;
}

interface Rate {
  manufacturer: string;
  polCode: string;
  podCode: string;
  heightTier: string | null;
  charges: Charge[];
}

interface Charge {
  chargeCode: string;
  description: string;
  rate: number;
  currency: string;
  freightTerms: string;
}

// === Rate sheet parser ===

function parseRatesSheet(sheet: ExcelScript.Worksheet): Rate[] {
  const usedRange = sheet.getUsedRange();
  if (!usedRange) return [];

  const values = getValuesWithMerges(sheet, usedRange);
  if (!values || values.length < 2) return [];

  // Find the header row containing "POL" and "POD"
  let headerRow = -1;
  let colPOL = -1, colPOD = -1, colCustomer = -1, colModelType = -1;
  let colORA = -1, colBAH = -1, colBAM = -1, colETS = -1;
  let colTHD = -1, colWHD = -1, colPSD = -1;

  for (let r = 0; r < Math.min(10, values.length); r++) {
    for (let c = 0; c < values[r].length; c++) {
      const cell = String(values[r][c] || "").trim().toUpperCase();
      if (cell === "POL") colPOL = c;
      if (cell === "POD") colPOD = c;
      if (cell === "CUSTOMER") colCustomer = c;
      if (cell === "MODEL TYPE") colModelType = c;
      if (cell.startsWith("ORA")) colORA = c;
      if (cell.startsWith("BAH")) colBAH = c;
      if (cell.startsWith("BAM")) colBAM = c;
      if (cell.startsWith("ETS")) colETS = c;
      if (cell.startsWith("THD")) colTHD = c;
      if (cell.startsWith("WHD")) colWHD = c;
      if (cell.startsWith("PSD")) colPSD = c;
    }
    if (colPOL >= 0 && colPOD >= 0) {
      headerRow = r;
      break;
    }
  }

  if (headerRow < 0 || colPOL < 0 || colPOD < 0) return [];

  const rates: Rate[] = [];

  for (let r = headerRow + 1; r < values.length; r++) {
    const row = values[r];
    const polCode = String(row[colPOL] || "").trim();
    const podCode = String(row[colPOD] || "").trim();
    const customer = String(row[colCustomer] || "").trim();

    // Skip empty rows or footnote rows
    if (!polCode || !podCode || !customer) continue;
    if (polCode.startsWith("*") || polCode.startsWith("Change")) continue;

    // Map manufacturer
    let manufacturer = customer.toUpperCase();
    if (manufacturer.includes("ROLLS") || manufacturer.includes("RR")) {
      manufacturer = "ROLLS_ROYCE";
    } else if (manufacturer.includes("BMW")) {
      manufacturer = "BMW";
    }

    // Map height tier
    const modelType = String(row[colModelType] || "").trim();
    let heightTier: string | null = null;
    if (modelType.includes(">1.62") || modelType.toLowerCase().includes("over 1.62")) {
      heightTier = "high";
    } else if (modelType.includes("<1.62") || modelType.toLowerCase().includes("up to 1.62")) {
      heightTier = "standard";
    }

    // Determine freight terms based on destination
    const isNYC = podCode === "USNYC";

    // Build charges array
    const charges: Charge[] = [];

    // ORA, BAH, BAM, ETS — numeric USD values
    addSimpleCharge(charges, "OCEAN", "Ocean Freight",
      row[colORA], "USD", isNYC ? "COLLECT" : "PREPAID");

    if (colBAH >= 0) addSimpleCharge(charges, "BAH", "Bunker Adjustment Factor",
      row[colBAH], "USD", isNYC ? "COLLECT" : "PREPAID");

    if (colBAM >= 0) addSimpleCharge(charges, "BAM", "Bunker Adjustment Mechanism",
      row[colBAM], "USD", isNYC ? "COLLECT" : "PREPAID");

    if (colETS >= 0) addSimpleCharge(charges, "ETS", "EU Emissions Trading",
      row[colETS], "USD", isNYC ? "COLLECT" : "PREPAID");

    // THD, WHD, PSD — mixed currency values like "CAD 20.50*", "USD 95.00", "AUD 113.00"
    if (colTHD >= 0) addMixedCharge(charges, "THD", "Terminal Handling Destination",
      row[colTHD], "COLLECT");

    if (colWHD >= 0) {
      const whdTerms = isNYC ? "COLLECT" : (podCode === "CAHAL" ? "PREPAID" : "COLLECT");
      addMixedCharge(charges, "WHD", "Wharfage Destination", row[colWHD], whdTerms);
    }

    if (colPSD >= 0) addMixedCharge(charges, "PSD", "Port Service Destination",
      row[colPSD], "COLLECT");

    if (charges.length > 0) {
      rates.push({ manufacturer, polCode, podCode, heightTier, charges });
    }
  }

  return rates;
}

/** Add a charge from a simple numeric cell (currency known from header) */
function addSimpleCharge(
  charges: Charge[], code: string, desc: string,
  value: string | number | boolean, currency: string, terms: string
): void {
  if (value === null || value === undefined) return;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === "n/a" || str.toLowerCase() === "tariff") return;

  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    charges.push({ chargeCode: code, description: desc, rate: num, currency: currency, freightTerms: terms });
  }
}

/** Add a charge from a mixed-currency cell like "CAD 20.50*" or "AUD 113.00" */
function addMixedCharge(
  charges: Charge[], code: string, desc: string,
  value: string | number | boolean, terms: string
): void {
  if (value === null || value === undefined) return;
  let str = String(value).trim();
  if (!str || str.toLowerCase() === "n/a" || str.toLowerCase() === "tariff") return;

  // Remove asterisks and extra spaces
  str = str.replace(/\*/g, "").trim();

  // Try "CUR 123.45" format (e.g., "CAD 20.50", "AUD 113.00", "USD 95.00")
  const match = str.match(/^([A-Z]{3})\s+([\d.]+)/);
  if (match) {
    const rate = Number(match[2]);
    if (!isNaN(rate) && rate > 0) {
      charges.push({ chargeCode: code, description: desc, rate: rate, currency: match[1], freightTerms: terms });
    }
    return;
  }

  // Try plain number (assume USD)
  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    charges.push({ chargeCode: code, description: desc, rate: num, currency: "USD", freightTerms: terms });
  }
}

// === Utility functions ===

/** Get values from a range with merged cells resolved.
 *  getValues() only returns the value in the top-left cell of a merged area;
 *  this function fills all cells in each merged area with that value. */
function getValuesWithMerges(
  sheet: ExcelScript.Worksheet,
  range: ExcelScript.Range
): (string | number | boolean)[][] {
  const values = range.getValues();

  let mergedAreas: ExcelScript.RangeAreas | undefined;
  try {
    mergedAreas = range.getMergedAreas();
  } catch (e) {
    return values;
  }
  if (!mergedAreas) return values;

  const startRow = range.getRowIndex();
  const startCol = range.getColumnIndex();
  const areas = mergedAreas.getAreas();

  for (const area of areas) {
    const areaRow = area.getRowIndex() - startRow;
    const areaCol = area.getColumnIndex() - startCol;
    const rowCount = area.getRowCount();
    const colCount = area.getColumnCount();
    const value = values[areaRow][areaCol];

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        if (r === 0 && c === 0) continue;
        values[areaRow + r][areaCol + c] = value;
      }
    }
  }

  return values;
}

function extractSheet(sheet: ExcelScript.Worksheet): string[][] {
  const usedRange = sheet.getUsedRange();
  if (!usedRange) return [];

  const values = getValuesWithMerges(sheet, usedRange);
  if (!values) return [];

  const data: string[][] = [];
  const maxRows = Math.min(values.length, 100);

  for (let r = 0; r < maxRows; r++) {
    if (!values[r]) continue;

    const row: string[] = [];
    let hasContent = false;
    const maxCols = Math.min(values[r].length, 30);

    for (let c = 0; c < maxCols; c++) {
      const cell = values[r][c];
      const str = (cell === null || cell === undefined) ? "" : String(cell).trim();
      row.push(str);
      if (str !== "") hasContent = true;
    }

    if (hasContent) {
      data.push(row);
    }
  }

  return data;
}

function formatDate(value: string | number | boolean): string {
  if (!value) return "";
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  return String(value);
}

function parseNumber(value: string | number | boolean): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}
