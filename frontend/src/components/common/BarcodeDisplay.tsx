import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';

interface BarcodeDisplayProps {
  value: string;
  bookTitle?: string;
  accessionNumber?: string;
  shelfLocation?: string;
  showPrintButton?: boolean;
}

export const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({
  value,
  bookTitle,
  accessionNumber,
  shelfLocation,
  showPrintButton = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 12,
          margin: 6,
          background: '#ffffff',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.warn('JsBarcode rendering error:', err);
      }
    }
  }, [value]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 shadow-xs max-w-xs mx-auto">
      <div className="print-area flex flex-col items-center bg-white p-3 border border-dashed border-slate-300 rounded-lg">
        {bookTitle && (
          <p className="text-xs font-bold text-slate-800 text-center line-clamp-1 max-w-[220px]">
            {bookTitle}
          </p>
        )}
        {accessionNumber && (
          <p className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
            Acc: {accessionNumber}
          </p>
        )}
        <svg ref={svgRef} className="my-1 max-w-full" />
        {shelfLocation && (
          <p className="text-[10px] text-slate-500 font-medium text-center">
            Loc: {shelfLocation}
          </p>
        )}
      </div>

      {showPrintButton && (
        <button
          onClick={handlePrint}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Label</span>
        </button>
      )}
    </div>
  );
};
