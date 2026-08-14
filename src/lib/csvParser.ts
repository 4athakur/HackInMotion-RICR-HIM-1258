import { format } from 'date-fns';

export interface RawCSVRow {
  [key: string]: any;
}

export interface ProcessedRow {
  rowIndex: number;
  date: string; // YYYY-MM-DD
  rawDate: string;
  description: string;
  merchant: string;
  amount: number;
  rawAmount: string;
  type: 'income' | 'expense';
  categoryName?: string;
  isValid: boolean;
  errorReason?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selectedForImport: boolean;
}

export interface ParseResult {
  totalParsed: number;
  validRows: ProcessedRow[];
  duplicateRows: ProcessedRow[];
  invalidRows: ProcessedRow[];
}

/**
 * Smart Date Parser supporting multiple common formats:
 * YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY.MM.DD, DD.MM.YYYY, 13 Aug 2026, Aug 13 2026
 */
export function parseSmartDate(rawDateStr: any): { date: string | null; formattedDisplay: string } {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return { date: null, formattedDisplay: String(rawDateStr || '') };
  }

  const str = rawDateStr.trim();
  if (!str) return { date: null, formattedDisplay: '' };

  // 1. ISO or YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const normalized = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { date: normalized, formattedDisplay: normalized };
    }
  }

  // 2. DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    let day = p1;
    let month = p2;

    if (p1 > 12 && p2 <= 12) {
      // p1 is day, p2 is month
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      // p2 is day, p1 is month
      day = p2;
      month = p1;
    } else {
      // Default to DD/MM/YYYY
      day = p1;
      month = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: normalized, formattedDisplay: normalized };
    }
  }

  // 3. Fallback: JS Date Parse (e.g. "13 Aug 2026", "Aug 13, 2026")
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const parsed = new Date(timestamp);
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    if (y >= 1970 && y <= 2100) {
      const normalized = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { date: normalized, formattedDisplay: normalized };
    }
  }

  return { date: null, formattedDisplay: str };
}

/**
 * Extracts normalized transaction details from various bank CSV header conventions
 */
export function processCSVRows(rows: RawCSVRow[], existingTransactions: any[] = []): ParseResult {
  const validRows: ProcessedRow[] = [];
  const duplicateRows: ProcessedRow[] = [];
  const invalidRows: ProcessedRow[] = [];

  // Track unique signatures for internal CSV duplicate detection
  const csvSignatures = new Map<string, number>();

  rows.forEach((row, idx) => {
    const rowIndex = idx + 1; // 1-indexed line in CSV

    // Helper to find column value by case-insensitive name matching
    const getCol = (...headers: string[]) => {
      const keys = Object.keys(row);
      for (const h of headers) {
        const foundKey = keys.find(k => k.trim().toLowerCase() === h.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    // Extract Date
    const rawDate = getCol('date', 'transaction date', 'txn date', 'posting date', 'value date');
    const { date: parsedDate, formattedDisplay: dateDisplay } = parseSmartDate(rawDate);

    // Extract Description & Merchant
    const merchant = getCol('merchant', 'payee', 'vendor', 'name');
    const description = getCol('description', 'narration', 'details', 'particulars', 'transaction details', 'memo');
    const categoryName = getCol('category', 'category name', 'type category');

    // Extract Amount & Type
    const rawAmountStr = getCol('amount', 'transaction amount', 'txn amount', 'net amount', 'total');
    const rawDebit = getCol('debit', 'withdrawal', 'dr', 'debit amount');
    const rawCredit = getCol('credit', 'deposit', 'cr', 'credit amount');
    const rawTypeStr = getCol('type', 'transaction type', 'cr/dr', 'debit/credit').toLowerCase();

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';
    let rawAmountDisplay = rawAmountStr || rawDebit || rawCredit || '';

    // Handle separate Debit/Credit columns
    if (rawDebit && parseFloat(rawDebit.replace(/[^0-9.-]+/g, '')) > 0) {
      amount = Math.abs(parseFloat(rawDebit.replace(/[^0-9.-]+/g, '')));
      type = 'expense';
      rawAmountDisplay = `₹${amount} (Debit)`;
    } else if (rawCredit && parseFloat(rawCredit.replace(/[^0-9.-]+/g, '')) > 0) {
      amount = Math.abs(parseFloat(rawCredit.replace(/[^0-9.-]+/g, '')));
      type = 'income';
      rawAmountDisplay = `₹${amount} (Credit)`;
    } else if (rawAmountStr) {
      const cleanNumStr = rawAmountStr.replace(/[^0-9.-]+/g, '');
      const parsedNum = parseFloat(cleanNumStr);
      if (!isNaN(parsedNum)) {
        amount = Math.abs(parsedNum);
        if (parsedNum < 0 || rawTypeStr.includes('debit') || rawTypeStr.includes('dr') || rawTypeStr.includes('expense')) {
          type = 'expense';
        } else if (rawTypeStr.includes('credit') || rawTypeStr.includes('cr') || rawTypeStr.includes('income') || rawTypeStr.includes('deposit')) {
          type = 'income';
        } else {
          type = 'expense';
        }
      }
    }

    // --- MISSING FIELDS VALIDATION ---
    const validationErrors: string[] = [];

    if (!rawDate) {
      validationErrors.push('Missing Date column');
    } else if (!parsedDate) {
      validationErrors.push(`Unrecognized Date format ("${dateDisplay}")`);
    }

    if (isNaN(amount) || amount <= 0) {
      validationErrors.push(`Invalid or missing Amount ("${rawAmountDisplay || 'Empty'}")`);
    }

    if (!merchant && !description) {
      validationErrors.push('Missing both Merchant and Description');
    }

    if (validationErrors.length > 0) {
      invalidRows.push({
        rowIndex,
        date: parsedDate || '',
        rawDate: rawDate || 'Missing',
        description: description || 'N/A',
        merchant: merchant || 'N/A',
        amount: amount || 0,
        rawAmount: rawAmountDisplay || 'Missing',
        type,
        categoryName,
        isValid: false,
        errorReason: validationErrors.join(' • '),
        selectedForImport: false
      });
      return;
    }

    // If valid required fields, check for DUPLICATES
    const normMerchant = (merchant || description).toLowerCase().trim();
    const signature = `${parsedDate}_${amount.toFixed(2)}_${type}_${normMerchant}`;

    let isDuplicate = false;
    let duplicateReason = '';

    // Check internal CSV duplicates
    if (csvSignatures.has(signature)) {
      const prevRow = csvSignatures.get(signature);
      isDuplicate = true;
      duplicateReason = `Duplicate row inside CSV file (identical to Row #${prevRow})`;
    } else {
      csvSignatures.set(signature, rowIndex);

      // Check existing database transactions
      const dbMatch = existingTransactions.find(t => {
        const tDate = t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '';
        const tAmount = Math.abs(parseFloat(t.amount || '0'));
        const tMerchant = (t.merchant || t.description || '').toLowerCase().trim();
        const tType = t.type || 'expense';

        return tDate === parsedDate &&
               Math.abs(tAmount - amount) < 0.01 &&
               tType === type &&
               (tMerchant.includes(normMerchant) || normMerchant.includes(tMerchant));
      });

      if (dbMatch) {
        isDuplicate = true;
        duplicateReason = `Already exists in database (${format(new Date(dbMatch.date), 'MMM dd, yyyy')} • ₹${parseFloat(dbMatch.amount).toLocaleString('en-IN')} at ${dbMatch.merchant || dbMatch.description})`;
      }
    }

    const processedItem: ProcessedRow = {
      rowIndex,
      date: parsedDate!,
      rawDate,
      description: description || merchant,
      merchant: merchant || description,
      amount,
      rawAmount: rawAmountDisplay,
      type,
      categoryName,
      isValid: true,
      isDuplicate,
      duplicateReason,
      selectedForImport: !isDuplicate // By default, select non-duplicates
    };

    if (isDuplicate) {
      duplicateRows.push(processedItem);
    } else {
      validRows.push(processedItem);
    }
  });

  return {
    totalParsed: rows.length,
    validRows,
    duplicateRows,
    invalidRows
  };
}
