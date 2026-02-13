/**
 * BMW-Script
 * Used by: SI Email Processor
 * Purpose: Extracts data from SI Excel attachments (SI/Vinlist/Shipper sheets)
 * Input: none (reads from workbook directly)
 */
type Cell = string | number | boolean;
type CellValue = Cell | null;
type Grid = CellValue[][];

interface SIData {
  shipperLines: string[];
  consigneeLines: string[];
  notifyLines: string[];
  departureFrom: string;
  blNo: string;
  reference: string;
  documentType: string;
  vessel: string;
  portOfDestination: string;
  totals: {
    totalUnits: number | null;
    weightKgs: number | null;
    cbm: number | null;
  };
}

interface VinlistData {
  header: {
    vessel: string;
    destination: string;
    ets: string;
    blNo: string;
  };
  rows: RowObject[];
}

interface ShipperTableData {
  headers: string[];
  rows: RowObject[];
}

interface RowObject {
  [key: string]: CellValue;
}

interface ParseResult {
  template: string;
  sheetsFound: string[];
  si: SIData;
  vinlist: VinlistData;
  shipperTable: ShipperTableData;
}

function main(workbook: ExcelScript.Workbook): string {

  // ---------- Helpers ----------
  function norm(v: CellValue): string {
    return (v === null || v === undefined) ? "" : v.toString().trim();
  }

  function isEmpty(v: CellValue): boolean {
    return norm(v) === "";
  }

  function getSheetByNameInsensitive(name: string): ExcelScript.Worksheet | null {
    const target = name.toLowerCase();
    const sheets = workbook.getWorksheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toLowerCase() === target) return sheets[i];
    }
    return null;
  }

  function getSheetNames(): string[] {
    const sheets = workbook.getWorksheets();
    const names: string[] = [];
    for (let i = 0; i < sheets.length; i++) names.push(sheets[i].getName());
    return names;
  }

  function usedValues(ws: ExcelScript.Worksheet): Grid {
    const used = ws.getUsedRange();
    if (!used) return [];
    const vals = used.getValues() as Cell[][];

    // Resolve merged cells — getValues() only fills the top-left cell
    let mergedAreas: ExcelScript.RangeAreas | undefined;
    try {
      mergedAreas = used.getMergedAreas();
    } catch (e) {
      // getMergedAreas not available — continue with raw values
    }
    if (mergedAreas) {
      const startRow = used.getRowIndex();
      const startCol = used.getColumnIndex();
      const areas = mergedAreas.getAreas();
      for (const area of areas) {
        const areaRow = area.getRowIndex() - startRow;
        const areaCol = area.getColumnIndex() - startCol;
        const rowCount = area.getRowCount();
        const colCount = area.getColumnCount();
        const value = vals[areaRow][areaCol];
        for (let r = 0; r < rowCount; r++) {
          for (let c = 0; c < colCount; c++) {
            if (r === 0 && c === 0) continue;
            vals[areaRow + r][areaCol + c] = value;
          }
        }
      }
    }

    const out: Grid = [];
    for (let r = 0; r < vals.length; r++) {
      const row: CellValue[] = [];
      for (let c = 0; c < vals[r].length; c++) {
        row.push(vals[r][c] as CellValue);
      }
      out.push(row);
    }
    return out;
  }

  function rowHasExact(valuesRow: CellValue[], textLower: string): boolean {
    for (let c = 0; c < valuesRow.length; c++) {
      if (norm(valuesRow[c]).toLowerCase() === textLower) return true;
    }
    return false;
  }

  function rowHasAnyNonEmpty(valuesRow: CellValue[]): boolean {
    for (let c = 0; c < valuesRow.length; c++) {
      if (!isEmpty(valuesRow[c])) return true;
    }
    return false;
  }

  function findRowIndex(values: Grid, maxScan: number, predicate: (row: CellValue[]) => boolean): number {
    const lim = (values.length < maxScan) ? values.length : maxScan;
    for (let r = 0; r < lim; r++) {
      if (predicate(values[r])) return r;
    }
    return -1;
  }

  function findCellExact(values: Grid, text: string, maxScanRows: number): { r: number; c: number } | null {
    const t = text.toLowerCase();
    const rLim = (values.length < maxScanRows) ? values.length : maxScanRows;
    for (let r = 0; r < rLim; r++) {
      for (let c = 0; c < values[r].length; c++) {
        if (norm(values[r][c]).toLowerCase() === t) return { r, c };
      }
    }
    return null;
  }

  function findCellContains(values: Grid, text: string, maxScanRows: number): { r: number; c: number } | null {
    const t = text.toLowerCase();
    const rLim = (values.length < maxScanRows) ? values.length : maxScanRows;
    for (let r = 0; r < rLim; r++) {
      for (let c = 0; c < values[r].length; c++) {
        const v = norm(values[r][c]).toLowerCase();
        if (v.indexOf(t) >= 0) return { r, c };
      }
    }
    return null;
  }

  function collectBlock(values: Grid, startHeaderText: string, stopHeaderTexts: string[]): string[] {
    const header = findCellExact(values, startHeaderText, 150);
    if (!header) return [];

    const stopsLower: string[] = [];
    for (let i = 0; i < stopHeaderTexts.length; i++) stopsLower.push(stopHeaderTexts[i].toLowerCase());

    const lines: string[] = [];
    for (let r = header.r + 1; r < values.length; r++) {
      const cell = norm(values[r][header.c]);
      if (!cell) continue;

      const lower = cell.toLowerCase();
      for (let i = 0; i < stopsLower.length; i++) {
        if (lower === stopsLower[i]) return lines;
      }

      if (lower === "vessel" || lower === "port of destination" || lower === "marks & numbers") continue;

      lines.push(cell);
    }
    return lines;
  }

  function getRightSideField(values: Grid, labelContains: string): string {
    const cell = findCellContains(values, labelContains, 150);
    if (!cell) return "";

    const same = norm(values[cell.r][cell.c]);
    const below = (cell.r + 1 < values.length) ? norm(values[cell.r + 1][cell.c]) : "";

    const lc = labelContains.toLowerCase();
    const looksLikeLabel = (same.toLowerCase().indexOf(lc) >= 0) || (same.indexOf(":") >= 0);
    return looksLikeLabel ? below : same;
  }

  function toNumberOrNull(v: CellValue): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;

    const s0 = norm(v);
    if (!s0) return null;

    const s = s0.replace(/\s+/g, "").replace(",", ".");
    const n = Number(s);
    return (isFinite(n) ? n : null);
  }

  function normalizeHeader(header: string): string {
    if (header.indexOf("CB/m") >= 0 || header.indexOf("CB/") >= 0 || header.indexOf("CBM") >= 0) {
      return "CBM";
    }
    if (header.toLowerCase().indexOf("weight") >= 0 && header.toLowerCase().indexOf("kg") >= 0) {
      return "WeightKG";
    }
    return header;
  }

  // ---------- Parse SI ----------
  const siWs = getSheetByNameInsensitive("SI");
  const siValues: Grid = siWs ? usedValues(siWs) : [];

  const si: SIData = {
    shipperLines: siValues.length ? collectBlock(siValues, "Shipper", ["Consignee", "Notify", "Vessel"]) : [],
    consigneeLines: siValues.length ? collectBlock(siValues, "Consignee", ["Notify", "Vessel"]) : [],
    notifyLines: siValues.length ? collectBlock(siValues, "Notify", ["Vessel"]) : [],
    departureFrom: siValues.length ? getRightSideField(siValues, "Departure from") : "",
    blNo: siValues.length ? getRightSideField(siValues, "BL-No") : "",
    reference: siValues.length ? getRightSideField(siValues, "Reference") : "",
    documentType: siValues.length ? getRightSideField(siValues, "Type of document") : "",
    vessel: "",
    portOfDestination: "",
    totals: { totalUnits: null, weightKgs: null, cbm: null }
  };

  if (siValues.length) {
    const vesselCell = findCellExact(siValues, "Vessel", 150);
    if (vesselCell && vesselCell.r + 1 < siValues.length) {
      si.vessel = norm(siValues[vesselCell.r + 1][vesselCell.c]);
    }

    const podCell = findCellContains(siValues, "Port of destination", 200);
    if (podCell && podCell.r + 1 < siValues.length) {
      si.portOfDestination = norm(siValues[podCell.r + 1][podCell.c]);
    }

    const marksCell = findCellContains(siValues, "Marks & Numbers", 250);
    if (marksCell && marksCell.r + 1 < siValues.length) {
      // Use header row to find column positions dynamically (handles merged cells)
      const headerRow = siValues[marksCell.r];
      let colUnits = -1, colKgs = -1, colCbm = -1;
      for (let c = 0; c < headerRow.length; c++) {
        const h = norm(headerRow[c]).toLowerCase();
        if (h.indexOf("total") >= 0 && h.indexOf("unit") >= 0) colUnits = c;
        else if (h.indexOf("kgs") >= 0 || h.indexOf("weight") >= 0) colKgs = c;
        else if (h.indexOf("cbm") >= 0 || h.indexOf("cb/m") >= 0) colCbm = c;
      }

      const dataRow = siValues[marksCell.r + 1];
      si.totals.totalUnits = (colUnits >= 0 && dataRow.length > colUnits) ? toNumberOrNull(dataRow[colUnits]) : null;
      si.totals.weightKgs = (colKgs >= 0 && dataRow.length > colKgs) ? toNumberOrNull(dataRow[colKgs]) : null;
      si.totals.cbm = (colCbm >= 0 && dataRow.length > colCbm) ? toNumberOrNull(dataRow[colCbm]) : null;
    }
  }

  // ---------- Parse Vinlist ----------
  const vinWs = getSheetByNameInsensitive("Vinlist");
  const vinValues: Grid = vinWs ? usedValues(vinWs) : [];

  const vinlist: VinlistData = {
    header: { vessel: "", destination: "", ets: "", blNo: "" },
    rows: []
  };

  if (vinValues.length) {
    const headerRowIndex = findRowIndex(vinValues, 30, (row) => rowHasExact(row, "vessel"));
    if (headerRowIndex >= 0 && headerRowIndex + 1 < vinValues.length) {
      const hdrRow: string[] = [];
      for (let c = 0; c < vinValues[headerRowIndex].length; c++) {
        hdrRow.push(norm(vinValues[headerRowIndex][c]));
      }
      const valRow = vinValues[headerRowIndex + 1];

      let iVessel = -1, iDest = -1, iETS = -1, iBL = -1;
      for (let c = 0; c < hdrRow.length; c++) {
        const h = hdrRow[c].toLowerCase();
        if (h === "vessel") iVessel = c;
        else if (h === "destination") iDest = c;
        else if (h === "ets") iETS = c;
        else if (h.indexOf("bl-no") === 0) iBL = c;
      }

      vinlist.header.vessel = (iVessel >= 0 && iVessel < valRow.length) ? norm(valRow[iVessel]) : "";
      vinlist.header.destination = (iDest >= 0 && iDest < valRow.length) ? norm(valRow[iDest]) : "";
      vinlist.header.ets = (iETS >= 0 && iETS < valRow.length) ? norm(valRow[iETS]) : "";
      vinlist.header.blNo = (iBL >= 0 && iBL < valRow.length) ? norm(valRow[iBL]) : "";
    }

    const vinHeaderCell = findCellExact(vinValues, "VIN", 300);
    if (vinHeaderCell) {
      const r0 = vinHeaderCell.r;

      const tableHeaders: string[] = [];
      for (let c = 0; c < vinValues[r0].length; c++) {
        const rawHeader = norm(vinValues[r0][c]);
        tableHeaders.push(normalizeHeader(rawHeader));
      }

      for (let r = r0 + 1; r < vinValues.length; r++) {
        const row = vinValues[r];
        const obj: RowObject = {};
        let hasAny = false;

        for (let c = 0; c < tableHeaders.length; c++) {
          const key = tableHeaders[c] ? tableHeaders[c] : ("col" + (c + 1).toString());
          const value = (c < row.length) ? row[c] : null;
          if (!isEmpty(value)) hasAny = true;
          obj[key] = value;
        }

        if (!hasAny) break;
        vinlist.rows.push(obj);
      }
    }
  }

  // ---------- Parse Shipper ----------
  const shipWs = getSheetByNameInsensitive("Shipper");
  const shipValues: Grid = shipWs ? usedValues(shipWs) : [];

  const shipperTable: ShipperTableData = { headers: [], rows: [] };

  if (shipValues.length) {
    const hdrRowIndex = findRowIndex(shipValues, 20, (row) => rowHasAnyNonEmpty(row));
    if (hdrRowIndex >= 0) {
      for (let c = 0; c < shipValues[hdrRowIndex].length; c++) {
        shipperTable.headers.push(norm(shipValues[hdrRowIndex][c]));
      }

      for (let r = hdrRowIndex + 1; r < shipValues.length; r++) {
        const row = shipValues[r];
        const obj: RowObject = {};
        let hasAny = false;

        for (let c = 0; c < shipperTable.headers.length; c++) {
          const key = shipperTable.headers[c] ? shipperTable.headers[c] : ("col" + (c + 1).toString());
          const value = (c < row.length) ? row[c] : null;
          if (!isEmpty(value)) hasAny = true;
          obj[key] = value;
        }

        if (!hasAny) continue;
        shipperTable.rows.push(obj);
      }
    }
  }

  const result: ParseResult = {
    template: "ANIARA Shipping XLSX (SI/Vinlist/Shipper)",
    sheetsFound: getSheetNames(),
    si,
    vinlist,
    shipperTable
  };

  return JSON.stringify(result);
}
