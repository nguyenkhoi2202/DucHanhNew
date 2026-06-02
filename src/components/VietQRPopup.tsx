import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface VietQRPopupProps {
  isOpen: boolean;
  onClose: () => void;
  qrImageUrl: string;
  amount: number;
  addInfo: string;
}

export default function VietQRPopup({ isOpen, onClose, qrImageUrl, amount, addInfo }: VietQRPopupProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  function handleCopyInfo() {
    navigator.clipboard.writeText(addInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div id="qr_popup_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        id="qr_popup" 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-transform duration-300 relative border border-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
          <h3 className="font-bold text-lg tracking-tight">Mã VietQR Nha Khoa</h3>
          <button 
            id="close_qr_btn"
            onClick={onClose} 
            className="text-white hover:bg-white/10 rounded-full p-1.5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-sm font-medium text-slate-500 mb-1">Quét mã để thanh toán qua MBBank</p>
          <p className="text-xl font-bold text-slate-800 mb-4 font-mono">
            {amount.toLocaleString('vi-VN')} VND
          </p>

          <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100/60 shadow-inner mb-4 flex justify-center items-center w-64 h-64">
            {qrImageUrl ? (
              <img 
                id="qr_image" 
                src={qrImageUrl} 
                alt="VietQR Code" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                <span className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs">Đang tạo mã QR...</span>
              </div>
            )}
          </div>

          <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 text-left space-y-2">
            <div className="grid grid-cols-3 text-xs text-slate-500">
              <span className="font-semibold col-span-1">Chủ tài khoản:</span>
              <span className="col-span-2 text-slate-700 font-medium">TRAN THI HA MY</span>
            </div>
            <div className="grid grid-cols-3 text-xs text-slate-500">
              <span className="font-semibold col-span-1">Số tài khoản:</span>
              <span className="col-span-2 text-slate-700 font-semibold font-mono">888 974 974</span>
            </div>
            <div className="grid grid-cols-3 text-xs text-slate-500">
              <span className="font-semibold col-span-1">Nội dung chuyển:</span>
              <span className="col-span-2 text-slate-700 break-words flex items-center justify-between gap-1 bg-white p-1.5 rounded border border-slate-100">
                <span className="line-clamp-2 text-[11px] font-mono leading-tight">{addInfo}</span>
                <button 
                  onClick={handleCopyInfo}
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-1 rounded shrink-0 transition-colors cursor-pointer"
                  title="Sao chép nội dung"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
