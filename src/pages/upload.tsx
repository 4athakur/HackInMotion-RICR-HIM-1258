import { useState, useCallback, useEffect } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { 
  Upload as UploadIcon, FileUp, CheckCircle, AlertCircle, 
  AlertTriangle, ArrowUpRight, ArrowDownRight, Check, ShieldAlert 
} from 'lucide-react';
import Papa from 'papaparse';
import clsx from 'clsx';
import { processCSVRows, ParseResult } from '../lib/csvParser.ts';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const api = useApi();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [existingTxs, setExistingTxs] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'valid' | 'duplicate' | 'invalid'>('valid');
  
  const [uploading, setUploading] = useState(false);
  const [importReport, setImportReport] = useState<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    invalidCount: number;
  } | null>(null);

  // Fetch existing transactions on mount for duplicate checking
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get('/transactions');
        setExistingTxs(res.data);
      } catch (err) {
        console.error('Failed to fetch existing transactions for duplicate check', err);
      }
    };
    fetchExisting();
  }, [api]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [existingTxs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (f: File) => {
    setFile(f);
    setImportReport(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const result = processCSVRows(results.data as any[], existingTxs);
        setParsedData(result);

        // Initialize selection map: valid rows default to true, duplicates default to false
        const initialMap: Record<number, boolean> = {};
        result.validRows.forEach(r => { initialMap[r.rowIndex] = true; });
        result.duplicateRows.forEach(r => { initialMap[r.rowIndex] = false; });
        setSelectedRows(initialMap);

        // Set default tab based on findings
        if (result.validRows.length > 0) setActiveTab('valid');
        else if (result.duplicateRows.length > 0) setActiveTab('duplicate');
        else if (result.invalidRows.length > 0) setActiveTab('invalid');
      }
    });
  };

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => ({
      ...prev,
      [rowIndex]: !prev[rowIndex]
    }));
  };

  const toggleSelectAllValid = () => {
    if (!parsedData) return;
    const allSelected = parsedData.validRows.every(r => selectedRows[r.rowIndex]);
    const updated = { ...selectedRows };
    parsedData.validRows.forEach(r => {
      updated[r.rowIndex] = !allSelected;
    });
    setSelectedRows(updated);
  };

  const handleUpload = async () => {
    if (!parsedData) return;

    // Combine selected rows from validRows and duplicateRows
    const itemsToImport = [
      ...parsedData.validRows,
      ...parsedData.duplicateRows
    ].filter(r => selectedRows[r.rowIndex])
     .map(r => ({
        date: r.date,
        description: r.description,
        merchant: r.merchant,
        amount: r.amount,
        type: r.type,
        categoryName: r.categoryName
     }));

    if (itemsToImport.length === 0) {
      alert('No rows selected for import.');
      return;
    }

    setUploading(true);
    try {
      const res = await api.post('/transactions/upload', { items: itemsToImport });
      const importedCount = res.data.count || itemsToImport.length;
      
      const totalParsed = parsedData.totalParsed;
      const skippedCount = totalParsed - importedCount;

      setImportReport({
        success: true,
        importedCount,
        skippedCount,
        invalidCount: parsedData.invalidRows.length
      });

      // Clear current file
      setFile(null);
      setParsedData(null);
      setSelectedRows({});
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to import transactions');
    } finally {
      setUploading(false);
    }
  };

  // Calculate selected import count
  const selectedImportCount = parsedData ? [
    ...parsedData.validRows,
    ...parsedData.duplicateRows
  ].filter(r => selectedRows[r.rowIndex]).length : 0;

  return (
    <div className="space-y-6 text-[#0f172a] max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#002b49] mb-1">Smart CSV Import</h1>
        <p className="text-slate-500 text-sm">
          Intelligent statement parser with multi-date formatting, field validation, and duplicate detection.
        </p>
      </div>

      {/* CSV Drag & Drop Upload Zone */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={clsx(
          "border-2 border-dashed rounded-3xl p-10 text-center transition-all relative shadow-xs",
          file ? "border-[#005b8e] bg-[#e0f2fe]/30" : "border-[#cbd5e1] hover:border-[#005b8e] hover:bg-slate-50 bg-white"
        )}
      >
        <input 
          type="file" 
          accept=".csv" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col items-center justify-center pointer-events-none space-y-3">
          <div className="w-16 h-16 bg-[#e0f2fe] rounded-2xl flex items-center justify-center border border-[#b9e6fe] shadow-xs">
            <FileUp size={32} className="text-[#005b8e]" />
          </div>
          
          {file ? (
            <div>
              <h3 className="text-lg font-bold text-[#002b49]">{file.name}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">
                {parsedData ? `${parsedData.totalParsed} total rows parsed` : 'Parsing file details...'}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-[#002b49]">Drag and drop your bank CSV statement here</h3>
              <p className="text-slate-500 text-xs mt-1">or click to browse files</p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  📅 Formats: YYYY-MM-DD, DD/MM/YYYY, 13-08-2026, 13 Aug 2026
                </span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  💳 Debit/Credit & Amount Columns Supported
                </span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  🛡️ Auto-Duplicate Detection
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parse Summary Cards */}
      {parsedData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#e1e8ed] shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Parsed</span>
            <div className="text-2xl font-black text-[#002b49] mt-1">{parsedData.totalParsed}</div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Rows in file</p>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle size={14} /> Valid Rows
            </span>
            <div className="text-2xl font-black text-emerald-800 mt-1">{parsedData.validRows.length}</div>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Ready for import</p>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={14} /> Duplicates
            </span>
            <div className="text-2xl font-black text-amber-800 mt-1">{parsedData.duplicateRows.length}</div>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Skipped by default</p>
          </div>

          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={14} /> Invalid Rows
            </span>
            <div className="text-2xl font-black text-rose-800 mt-1">{parsedData.invalidRows.length}</div>
            <p className="text-xs text-rose-600 font-medium mt-0.5">Validation errors</p>
          </div>
        </div>
      )}

      {/* Tabbed Data Inspection Panel */}
      {parsedData && (
        <div className="bg-white rounded-3xl shadow-xs border border-[#e1e8ed] overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-[#e1e8ed] bg-slate-50/60 p-2 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('valid')}
              className={clsx(
                "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'valid'
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <CheckCircle size={15} />
              Valid Transactions
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", activeTab === 'valid' ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700")}>
                {parsedData.validRows.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('duplicate')}
              className={clsx(
                "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'duplicate'
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <AlertTriangle size={15} />
              Duplicates Detected
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", activeTab === 'duplicate' ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-700")}>
                {parsedData.duplicateRows.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('invalid')}
              className={clsx(
                "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'invalid'
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <AlertCircle size={15} />
              Invalid Rows & Errors
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", activeTab === 'invalid' ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-700")}>
                {parsedData.invalidRows.length}
              </span>
            </button>
          </div>

          {/* TAB 1: VALID ROWS */}
          {activeTab === 'valid' && (
            <div>
              <div className="p-4 border-b border-[#e1e8ed] bg-slate-50/30 flex justify-between items-center text-xs">
                <button
                  onClick={toggleSelectAllValid}
                  className="font-bold text-[#005b8e] hover:underline flex items-center gap-1.5"
                >
                  <Check size={14} /> Toggle Select All ({parsedData.validRows.length})
                </button>
                <span className="text-slate-500 font-medium">
                  Normalized date formats converted to <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">YYYY-MM-DD</code>
                </span>
              </div>

              {parsedData.validRows.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p className="font-bold">No valid rows found in CSV file.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-[#f8fafc] border-b border-[#e1e8ed]">
                      <tr>
                        <th className="px-4 py-3 font-bold text-center w-12">Import</th>
                        <th className="px-4 py-3 font-bold w-16">Row #</th>
                        <th className="px-4 py-3 font-bold">Parsed Date</th>
                        <th className="px-4 py-3 font-bold">Merchant / Details</th>
                        <th className="px-4 py-3 font-bold text-center">Type</th>
                        <th className="px-4 py-3 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e1e8ed]">
                      {parsedData.validRows.map((r) => (
                        <tr key={r.rowIndex} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-center">
                            <input 
                              type="checkbox"
                              checked={!!selectedRows[r.rowIndex]}
                              onChange={() => toggleRowSelection(r.rowIndex)}
                              className="w-4 h-4 rounded text-[#005b8e] focus:ring-[#005b8e]"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">#{r.rowIndex}</td>
                          <td className="px-4 py-3.5 text-slate-700 font-semibold text-xs whitespace-nowrap">
                            {r.date}
                            {r.rawDate !== r.date && (
                              <span className="block text-[10px] text-slate-400 font-normal">Raw: {r.rawDate}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-[#002b49]">{r.merchant || r.description}</div>
                            {r.merchant && r.description && r.merchant !== r.description && (
                              <div className="text-xs text-slate-400">{r.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={clsx(
                              "inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                              r.type === 'income' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {r.type === 'income' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {r.type}
                            </span>
                          </td>
                          <td className={clsx("px-4 py-3.5 text-right font-extrabold text-[#002b49]")}>
                            ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DUPLICATE ROWS */}
          {activeTab === 'duplicate' && (
            <div>
              <div className="p-4 border-b border-[#e1e8ed] bg-amber-50/50 text-xs text-amber-900 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-amber-600" /> These transactions match existing records or earlier CSV rows. They are skipped by default.
                </span>
              </div>

              {parsedData.duplicateRows.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p className="font-bold text-emerald-700">No duplicate transactions detected!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-[#f8fafc] border-b border-[#e1e8ed]">
                      <tr>
                        <th className="px-4 py-3 font-bold text-center w-12">Force Add</th>
                        <th className="px-4 py-3 font-bold w-16">Row #</th>
                        <th className="px-4 py-3 font-bold">Date</th>
                        <th className="px-4 py-3 font-bold">Merchant / Details</th>
                        <th className="px-4 py-3 font-bold">Duplicate Reason</th>
                        <th className="px-4 py-3 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e1e8ed]">
                      {parsedData.duplicateRows.map((r) => (
                        <tr key={r.rowIndex} className="bg-amber-50/20 hover:bg-amber-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-center">
                            <input 
                              type="checkbox"
                              checked={!!selectedRows[r.rowIndex]}
                              onChange={() => toggleRowSelection(r.rowIndex)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">#{r.rowIndex}</td>
                          <td className="px-4 py-3.5 text-slate-700 font-semibold text-xs whitespace-nowrap">{r.date}</td>
                          <td className="px-4 py-3.5 font-bold text-[#002b49]">{r.merchant || r.description}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                              {r.duplicateReason}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-[#002b49]">
                            ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVALID ROWS */}
          {activeTab === 'invalid' && (
            <div>
              <div className="p-4 border-b border-[#e1e8ed] bg-rose-50/50 text-xs text-rose-900 font-medium flex items-center justify-between">
                <span>
                  <AlertCircle size={16} className="inline mr-1 text-rose-600" /> 
                  These rows failed validation checks and cannot be imported. Review the error details below to fix your CSV.
                </span>
              </div>

              {parsedData.invalidRows.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p className="font-bold text-emerald-700">All rows passed validation checks!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-[#f8fafc] border-b border-[#e1e8ed]">
                      <tr>
                        <th className="px-4 py-3 font-bold w-16">Row #</th>
                        <th className="px-4 py-3 font-bold">Raw Date</th>
                        <th className="px-4 py-3 font-bold">Raw Details</th>
                        <th className="px-4 py-3 font-bold">Raw Amount</th>
                        <th className="px-4 py-3 font-bold">Validation Error Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e1e8ed]">
                      {parsedData.invalidRows.map((r) => (
                        <tr key={r.rowIndex} className="bg-rose-50/20 hover:bg-rose-50/40 transition-colors">
                          <td className="px-4 py-3.5 text-xs font-mono font-bold text-rose-700">#{r.rowIndex}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{r.rawDate}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-[#002b49]">{r.merchant || r.description}</td>
                          <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{r.rawAmount}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-xl text-xs font-bold">
                              <AlertCircle size={13} /> {r.errorReason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Action Footer */}
          <div className="p-4 border-t border-[#e1e8ed] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Ready to import <strong className="text-[#002b49] font-bold text-sm">{selectedImportCount}</strong> transaction(s)
            </div>

            <button 
              onClick={handleUpload}
              disabled={uploading || selectedImportCount === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-xs text-sm"
            >
              {uploading ? (
                <>Importing...</>
              ) : (
                <>
                  <UploadIcon size={18} />
                  Import {selectedImportCount} Selected Records
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* POST-IMPORT DETAILED REPORT MODAL */}
      {importReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
                <CheckCircle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#002b49]">Import Complete</h3>
                <p className="text-xs text-slate-500 font-medium">CSV processing summary report</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-[#e1e8ed]">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-600">Imported Transactions</span>
                <span className="text-emerald-700 font-bold text-base">+{importReport.importedCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-600">Skipped / Duplicates</span>
                <span className="text-amber-700 font-bold">{importReport.skippedCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-600">Invalid Error Rows</span>
                <span className="text-rose-700 font-bold">{importReport.invalidCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              All imported transactions have been automatically categorized using SmartSpend AI.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setImportReport(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setImportReport(null);
                  navigate('/transactions');
                }}
                className="px-5 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                View in Transactions →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

