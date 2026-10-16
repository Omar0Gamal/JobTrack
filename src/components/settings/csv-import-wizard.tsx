"use client";

import * as React from "react";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  FileCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CSV_TARGET_FIELDS,
  autoMapCsvHeaders,
  parseCsvText,
  validateMappedCsvRows,
  type CsvTargetFieldKey,
} from "@/lib/csv/parser";
import { importCsvRowsAction } from "@/server/actions/import-export.actions";
import { toast } from "sonner";

interface CsvImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

export function CsvImportWizard({
  open,
  onOpenChange,
  onImportComplete,
}: CsvImportWizardProps) {
  const [step, setStep] = React.useState<WizardStep>(1);
  const [fileName, setFileName] = React.useState<string>("");
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvRows, setCsvRows] = React.useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<
    Record<string, CsvTargetFieldKey | "IGNORE">
  >({});
  const [isLoadingSample, setIsLoadingSample] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState<{
    importedCount: number;
    skippedCount: number;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setStep(1);
    setFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setIsLoadingSample(false);
    setIsSubmitting(false);
    setImportSummary(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleProcessCsvText = (text: string, name: string) => {
    const { headers, rows, parseErrors } = parseCsvText(text);

    if (parseErrors.length > 0 && rows.length === 0) {
      toast.error(`CSV Parse error: ${parseErrors[0]}`);
      return;
    }

    if (headers.length === 0 || rows.length === 0) {
      toast.error("The selected CSV file contains no headers or data rows.");
      return;
    }

    setFileName(name);
    setCsvHeaders(headers);
    setCsvRows(rows);

    const initialMapping = autoMapCsvHeaders(headers);
    setColumnMapping(initialMapping);
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        handleProcessCsvText(content, file.name);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = async () => {
    try {
      setIsLoadingSample(true);
      const res = await fetch("/sample-applications-import.csv");
      if (!res.ok) {
        throw new Error("Could not load sample CSV template");
      }
      const text = await res.text();
      handleProcessCsvText(text, "sample-applications-import.csv");
      toast.success("Loaded sample CSV template with 5 applications!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load sample CSV"
      );
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleMappingChange = (
    header: string,
    target: CsvTargetFieldKey | "IGNORE"
  ) => {
    setColumnMapping((prev) => ({
      ...prev,
      [header]: target,
    }));
  };

  // Validation output for step 3
  const validationResult = React.useMemo(() => {
    if (csvRows.length === 0) {
      return { validRows: [], invalidRows: [], previewRows: [] };
    }
    return validateMappedCsvRows(csvRows, columnMapping);
  }, [csvRows, columnMapping]);

  const hasRequiredMappings = React.useMemo(() => {
    const mappedValues = Object.values(columnMapping);
    const hasCompany = mappedValues.includes("company");
    const hasRole = mappedValues.includes("role");
    return hasCompany && hasRole;
  }, [columnMapping]);

  const handleCommitImport = async () => {
    if (validationResult.validRows.length === 0) {
      toast.error("No valid applications to import.");
      return;
    }

    try {
      setIsSubmitting(true);
      setStep(4);
      const res = await importCsvRowsAction(
        validationResult.validRows.map((r) => r.data)
      );

      if (res.ok) {
        setImportSummary(res.data);
        toast.success(`Successfully imported ${res.data.importedCount} applications!`);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        toast.error(res.error || "Failed to import rows");
        setStep(3);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">
                Import Applications via CSV
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload your job applications from a spreadsheet or another job tracker.
              </DialogDescription>
            </div>
            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-6">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                1
              </span>
              <span>Upload</span>
              <span className="text-muted-foreground/40">→</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                2
              </span>
              <span>Map</span>
              <span className="text-muted-foreground/40">→</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                3
              </span>
              <span>Preview</span>
              <span className="text-muted-foreground/40">→</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 4 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                4
              </span>
              <span>Summary</span>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: Upload CSV */}
        {step === 1 && (
          <div className="space-y-4 py-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-8 text-center cursor-pointer bg-muted/20 hover:bg-muted/40"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                Click to browse or drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports UTF-8 CSV exports from LinkedIn, Huntr, Excel, and Google Sheets
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSampleCsv}
                disabled={isLoadingSample}
                className="gap-2 text-xs w-full sm:w-auto"
              >
                {isLoadingSample ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileCheck className="h-3.5 w-3.5 text-primary" />
                )}
                Load Sample CSV
              </Button>

              <a
                href="/sample-applications-import.csv"
                download="sample-applications-import.csv"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download sample CSV template
              </a>
            </div>
          </div>
        )}

        {/* STEP 2: Map Columns */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  File: <strong className="text-foreground">{fileName}</strong> ({csvRows.length} rows detected)
                </p>
                <p className="text-xs text-muted-foreground">
                  Match each column from your file to JobTrack fields. Required:{" "}
                  <strong className="text-foreground">Company</strong> and{" "}
                  <strong className="text-foreground">Role</strong>.
                </p>
              </div>
            </div>

            {!hasRequiredMappings && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Please map at least <strong>Company</strong> and <strong>Role / Job Title</strong> to proceed.
                </span>
              </div>
            )}

            <div className="border border-border rounded-md overflow-hidden max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">CSV Column</TableHead>
                    <TableHead className="text-xs font-semibold">Sample Value (Row 1)</TableHead>
                    <TableHead className="text-xs font-semibold">Map to JobTrack Field</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvHeaders.map((header) => {
                    const sampleVal = csvRows[0]?.[header] ?? "";
                    const currentTarget = columnMapping[header] ?? "IGNORE";

                    return (
                      <TableRow key={header}>
                        <TableCell className="text-xs font-medium">{header}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {sampleVal || <span className="italic text-muted-foreground/60">&lt;empty&gt;</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentTarget}
                            onValueChange={(val) =>
                              handleMappingChange(header, val as CsvTargetFieldKey | "IGNORE")
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              <SelectItem value="IGNORE" className="text-xs text-muted-foreground">
                                (Ignore this column)
                              </SelectItem>
                              {CSV_TARGET_FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key} className="text-xs">
                                  {f.label} {f.required ? "*" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Upload
              </Button>

              <Button
                size="sm"
                onClick={() => setStep(3)}
                disabled={!hasRequiredMappings}
                className="gap-1.5 text-xs"
              >
                Preview &amp; Validate
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview First 10 Rows & Validation */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="text-xs">
                <span>Total records in file: <strong>{csvRows.length}</strong></span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {validationResult.validRows.length} ready to import
                </span>
                {validationResult.invalidRows.length > 0 && (
                  <>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {validationResult.invalidRows.length} rows have errors (will be skipped)
                    </span>
                  </>
                )}
              </div>
              <Badge variant="outline" className="text-[11px]">
                Showing first {validationResult.previewRows.length} rows
              </Badge>
            </div>

            <div className="border border-border rounded-md overflow-hidden max-h-[340px] overflow-x-auto overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[11px]">
                    <TableHead className="w-12 text-center">Row</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Validation Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResult.previewRows.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={
                        row.valid
                          ? "hover:bg-emerald-500/5"
                          : "bg-rose-500/5 hover:bg-rose-500/10"
                      }
                    >
                      <TableCell className="text-xs text-center font-mono text-muted-foreground">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {row.mapped.company ?? <span className="text-rose-500 italic">Missing</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.mapped.role ?? <span className="text-rose-500 italic">Missing</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.mapped.status ?? "APPLIED"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.mapped.location || row.mapped.locationType || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.mapped.salaryMin || row.mapped.salaryMax
                          ? `${row.mapped.salaryMin ?? 0} - ${row.mapped.salaryMax ?? ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.valid ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                            Ready
                          </span>
                        ) : (
                          <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-400 space-y-0.5">
                            {row.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Mapping
              </Button>

              <Button
                size="sm"
                onClick={handleCommitImport}
                disabled={validationResult.validRows.length === 0}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Import {validationResult.validRows.length} Valid Applications
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Commit & Summary */}
        {step === 4 && (
          <div className="py-8 text-center space-y-4">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Importing applications and generating timeline history...
                </p>
                <p className="text-xs text-muted-foreground">
                  Writing database transaction scoped to your account.
                </p>
              </div>
            ) : importSummary ? (
              <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Import Completed!
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your applications have been imported and are now visible on your board and table.
                  </p>
                </div>

                <div className="w-full border border-border rounded-md p-3 bg-muted/20 text-xs space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Imported:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {importSummary.importedCount} applications
                    </strong>
                  </div>
                  {importSummary.skippedCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Skipped (invalid):</span>
                      <strong className="text-rose-600 dark:text-rose-400">
                        {importSummary.skippedCount} rows
                      </strong>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  className="w-full text-xs shadow-xs"
                >
                  Done &amp; View Board
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
