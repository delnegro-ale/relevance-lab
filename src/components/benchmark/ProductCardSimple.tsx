import { useState } from 'react';
import { BookOpen, Headphones, FileText as FileIcon, ImageOff, ExternalLink, Code2 } from 'lucide-react';
import { buildProductUrl } from '@/lib/product-url';
import { PayloadViewerDialog } from './PayloadViewerDialog';

function getFormatIcon(format: string) {
  const f = (format || '').toLowerCase();
  if (f.includes('audio') || f.includes('audiobook') || f.includes('mp3')) return Headphones;
  if (f.includes('ebook') || f.includes('epub') || f.includes('pdf')) return FileIcon;
  return BookOpen;
}

interface Hit {
  productId: string;
  title?: string;
  position: number;
  score?: number | null;
  publisher?: string;
  format?: string;
  coverUrl?: string;
  rawPayload?: Record<string, any>;
}

interface Props {
  hit: Hit;
  isExpected?: boolean;
}

export function ProductCardSimple({ hit, isExpected = false }: Props) {
  const [showPayload, setShowPayload] = useState(false);
  const coverUrl = hit.coverUrl || `https://media3.ubook.com/catalog/book-cover-image/${hit.productId}/200x300/`;
  const FormatIcon = getFormatIcon(hit.format || '');
  const fullTitle = hit.title || 'Sem título';
  const displayTitle = fullTitle.length > 40 ? `${fullTitle.slice(0, 40)}…` : fullTitle;
  const productUrl = buildProductUrl(hit.productId, hit.format);

  return (
    <>
      <div
        className={`group flex gap-2.5 p-2 rounded-lg transition-colors ${isExpected ? 'bg-success/10 ring-1 ring-success/30' : 'hover:bg-muted/20'}`}
      >
        {/* Position */}
        <div className="flex flex-col items-center justify-start pt-1 shrink-0 w-5">
          <span className="text-[10px] font-mono-data text-muted-foreground font-semibold">{hit.position}</span>
        </div>

        {/* Cover */}
        <div className="w-10 h-14 rounded overflow-hidden bg-muted/50 shrink-0 relative">
          <img
            src={coverUrl}
            alt={fullTitle}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="absolute inset-0 items-center justify-center hidden">
            <ImageOff className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p
            className={`text-xs leading-tight truncate ${isExpected ? 'font-semibold text-success' : 'text-foreground'}`}
            title={fullTitle}
          >
            {displayTitle}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-mono-data text-muted-foreground">ID: {hit.productId}</span>
            {hit.publisher && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{hit.publisher}</span>
            )}
            {hit.format && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
                <FormatIcon className="h-3 w-3" />
                {hit.format}
              </span>
            )}
            {typeof hit.score === 'number' && !isNaN(hit.score) && (
              <span className="text-[10px] font-mono-data text-muted-foreground/50">score: {hit.score.toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* Action icons - visible on hover */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {hit.rawPayload && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowPayload(true); }}
              className="p-1 rounded hover:bg-muted/40 transition-colors"
              title="Ver payload original"
            >
              <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-muted/40 transition-colors"
            title="Abrir página do produto"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>

      {hit.rawPayload && (
        <PayloadViewerDialog
          open={showPayload}
          onOpenChange={setShowPayload}
          payload={hit.rawPayload}
          title={`${fullTitle} (ID: ${hit.productId})`}
        />
      )}
    </>
  );
}
