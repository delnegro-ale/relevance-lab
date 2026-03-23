import { TestCase } from '@/types/experiment';
import { parseCsv } from '@/lib/csv-parser';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onUpload: (tc: TestCase[]) => void;
  testCases: TestCase[];
}

export function CsvUploader({ onUpload, testCases }: Props) {
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onUpload(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => document.getElementById('csv-input')?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer group"
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
        <p className="text-sm text-muted-foreground">Arraste um CSV ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Formato: keyword,product_ids</p>
        <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {testCases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{testCases.length} keywords carregadas</span>
          </div>
          <div className="max-h-52 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-2 text-left text-xs text-muted-foreground font-medium">Keyword</th>
                  <th className="p-2 text-left text-xs text-muted-foreground font-medium">IDs Esperados</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="p-2 font-medium">{tc.keyword}</td>
                    <td className="p-2 text-muted-foreground font-mono-data text-xs">{tc.expectedIds.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
