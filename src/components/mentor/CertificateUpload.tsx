import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openDataUrl } from "@/lib/file";

export interface CertFile {
  name: string;
  data: string; // base64 data URL
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 6;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const CertificateUpload = ({ value, onChange }: { value: CertFile[]; onChange: (files: CertFile[]) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const valid: File[] = [];
    for (const file of incoming) {
      if (file.type !== "application/pdf") {
        toast({ title: "PDF only", description: `${file.name} isn't a PDF.`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast({ title: "File too large", description: `${file.name} exceeds 5 MB.`, variant: "destructive" });
        continue;
      }
      valid.push(file);
    }
    if (value.length + valid.length > MAX_FILES) {
      toast({ title: "Too many files", description: `You can upload up to ${MAX_FILES} certificates.`, variant: "destructive" });
      return;
    }
    const read = await Promise.all(valid.map(async (f) => ({ name: f.name, data: await readAsDataUrl(f) })));
    onChange([...value, ...read]);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-xl py-6 text-muted-foreground hover:border-primary/50 hover:bg-secondary/30 transition-colors"
      >
        <Upload className="h-6 w-6" />
        <span className="text-sm font-medium">Upload certificate PDFs</span>
        <span className="text-xs">PDF only · up to 5 MB each · max {MAX_FILES} files</span>
      </button>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((cert, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm truncate flex-1">{cert.name}</span>
              <Button type="button" size="sm" variant="ghost" className="h-7 gap-1" onClick={() => openDataUrl(cert.data)}>
                <Eye className="h-3.5 w-3.5" />View
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
