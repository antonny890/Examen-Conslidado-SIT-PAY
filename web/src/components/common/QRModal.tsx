import React from 'react';
import { X, Printer, Download, RefreshCw } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  plate: string;
  qrSvg: string;
  qrPngBase64?: string;
  companyName: string;
  tokenSeguro: string;
  onRegenerate?: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  plate,
  qrSvg,
  qrPngBase64,
  companyName,
  tokenSeguro,
  onRegenerate,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>SIT-Pay Arequipa - Código QR Bus ${plate}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 4px solid #0F172A; padding: 30px; border-radius: 20px; display: inline-block; }
            h1 { font-size: 28px; margin: 0 0 10px; color: #0F172A; }
            h2 { font-size: 34px; margin: 15px 0 5px; color: #059669; }
            p { font-size: 14px; color: #475569; margin: 5px 0; }
            .qr { width: 300px; height: 300px; margin: 20px auto; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>SIT-Pay Arequipa</h1>
            <p>PAGA TU PASAJE DIGITAL AQUÍ</p>
            <div class="qr">${qrSvg}</div>
            <h2>PLACA: ${plate}</h2>
            <p>${companyName} • Transporte Urbano Arequipa</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIT-PAY-QR-${plate}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Código QR Oficial del Bus</h3>
            <p className="text-xs text-slate-400">Placa: {plate} • {companyName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Preview Box */}
        <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner">
          <div
            className="w-56 h-56 flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="mt-3 text-slate-950 font-black text-2xl tracking-widest font-mono">
            {plate}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-xs">
            {tokenSeguro}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Imprimir Cartel
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            Descargar SVG
          </button>
        </div>

        {onRegenerate && (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={onRegenerate}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerar Token QR (Si la calcomanía fue comprometida)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
