import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { generateSHA256, formatDateToDDMMYYYYNew } from './utils/crypto';
import { DentalRecord, PlanItem, SessionInfo } from './types';

// Subcomponents
import Login from './components/Login';
import DentalForm from './components/DentalForm';
import DentalRecordsTable from './components/DentalRecordsTable';
import VietQRPopup from './components/VietQRPopup';
import TotalsDialog from './components/TotalsDialog';

// Icons
import {
  Heart,
  Phone,
  Clock,
  LogOut,
  Download,
  Upload,
  RefreshCw,
  FolderSync,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  X,
  Lock,
  CloudLightning,
  QrCode,
  Database,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // 1. Session tracking states
  const [session, setSession] = useState<SessionInfo | null>(null);

  // 2. Core dental record states
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<DentalRecord | null>(null);
  const [activeEditIndex, setActiveEditIndex] = useState<number>(-1);

  // 3. Real-time dynamic clock tracking State
  const [clockStr, setClockStr] = useState('');

  // 4. Loading indicator overlay state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Đang xử lý...');

  // 5. Database Status state
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; count: number; database: string }>({
    connected: false,
    count: 0,
    database: '',
  });

  // 6. Cloud/MongoDB Save password modal states
  const [isCloudPassOpen, setIsCloudPassOpen] = useState(false);
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudPassError, setCloudPassError] = useState(false);

  // 7. VietQR Popup state managers
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [qrAddInfo, setQrAddInfo] = useState('');

  // 8. Totals analytical dialog state
  const [isTotalsOpen, setIsTotalsOpen] = useState(false);
  const [totalsTitle, setTotalsTitle] = useState('');
  const [totalsSum, setTotalsSum] = useState({ cost: 0, paid: 0, remaining: 0 });
  const [totalsCount, setTotalsCount] = useState<number | undefined>(undefined);

  // Reference hooks for triggering file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputThangRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // EFFECT 1: Check Session Expiration and Load Dental Records
  // ==========================================
  useEffect(() => {
    // Session load
    const storedSession = localStorage.getItem('session');
    if (storedSession) {
      try {
        const parsed: SessionInfo = JSON.parse(storedSession);
        const now = new Date().getTime();
        if (now < parsed.expireAt) {
          setSession(parsed);
        } else {
          localStorage.removeItem('session');
        }
      } catch (e) {
        console.error('Session matching error', e);
      }
    }

    // First load from localStorage for instant render
    const storedRecords = localStorage.getItem('dentalRecords');
    if (storedRecords) {
      try {
        setRecords(JSON.parse(storedRecords));
      } catch (e) {
        console.error('Records parse error', e);
      }
    }

    // Then fetch directly from MongoDB
    fetchRecordsFromMongo();
  }, []);

  // Check DB status and fetch records from MongoDB
  async function fetchRecordsFromMongo(showSpinner = false) {
    if (showSpinner) {
      setIsLoading(true);
      setLoadingText('Đang kết nối MongoDB...');
    }

    try {
      // Check MongoDB Health
      const healthRes = await axios.get('/api/health');
      if (healthRes.data && healthRes.data.connected) {
        setDbStatus({
          connected: true,
          count: healthRes.data.recordsCount || 0,
          database: healthRes.data.database || 'duchanh',
        });
      }

      // Fetch records from MongoDB
      const res = await axios.get('/api/records');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setRecords(res.data);
        localStorage.setItem('dentalRecords', JSON.stringify(res.data));
        setDbStatus((prev) => ({ ...prev, connected: true, count: res.data.length }));
      }
    } catch (err: any) {
      console.warn('Không thể kết nối đến MongoDB API, dùng dữ liệu bộ nhớ cục bộ:', err.message);
      setDbStatus({ connected: false, count: 0, database: '' });
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }

  // ==========================================
  // EFFECT 2: Live Clock Update (Runs every second)
  // ==========================================
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setClockStr(`${dd}-${mm}-${yyyy} ${hours}:${minutes}:${seconds}`);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // SESSION CONTROL FUNCTIONS
  // ==========================================
  function handleLoginSuccess(expireTime: number) {
    const sessionData: SessionInfo = {
      isLoggedIn: true,
      expireAt: expireTime,
    };
    localStorage.setItem('session', JSON.stringify(sessionData));
    setSession(sessionData);
    fetchRecordsFromMongo(true);
  }

  function handleLogout() {
    localStorage.removeItem('session');
    setSession(null);
  }

  // ==========================================
  // RECORD CRUD OPERATIONS (Synced with MongoDB)
  // ==========================================
  async function handleSaveRecord(formData: {
    name: string;
    phone: string;
    address: string;
    dob: string;
    visitDate: string;
    appointment: string;
    plan: PlanItem[];
  }) {
    const isEdit = activeEditIndex > -1;
    let updatedRecords = [...records];

    const recordData: DentalRecord = {
      id: isEdit ? records[activeEditIndex].id : new Date().getTime(),
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      dob: formData.dob,
      visitDate: formData.visitDate,
      appointment: formData.appointment,
      plan: formData.plan,
    };

    if (isEdit) {
      updatedRecords[activeEditIndex] = recordData;
    } else {
      updatedRecords.push(recordData);
    }

    // Update state and localStorage immediately
    setRecords(updatedRecords);
    localStorage.setItem('dentalRecords', JSON.stringify(updatedRecords));

    // Save to MongoDB in background
    try {
      if (isEdit) {
        await axios.put(`/api/records/${recordData.id}`, recordData);
      } else {
        await axios.post('/api/records', recordData);
      }
      setDbStatus((prev) => ({
        ...prev,
        connected: true,
        count: isEdit ? prev.count : prev.count + 1,
      }));
    } catch (err) {
      console.warn('Lỗi lưu MongoDB (dữ liệu đã lưu tạm vào bộ nhớ máy):', err);
    }

    alert(`Lưu dữ liệu với tên ${formData.name} thành công`);

    // Reset Form Input State
    setActiveRecord(null);
    setActiveEditIndex(-1);
  }

  function handleEditRecord(record: DentalRecord, index: number) {
    setActiveRecord(record);
    setActiveEditIndex(index);
    // Smooth scroll to form element
    document.getElementById('dentalForm')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleDeleteActiveRecord() {
    if (activeEditIndex === -1) return;
    const targetRecord = records[activeEditIndex];
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ của ${targetRecord.name}?`);
    if (!confirmDelete) return;

    const filtered = records.filter((_, idx) => idx !== activeEditIndex);
    setRecords(filtered);
    localStorage.setItem('dentalRecords', JSON.stringify(filtered));

    // Delete from MongoDB
    try {
      await axios.delete(`/api/records/${targetRecord.id}`);
      setDbStatus((prev) => ({ ...prev, count: Math.max(0, prev.count - 1) }));
    } catch (err) {
      console.warn('Lỗi xóa trên MongoDB (đã xóa bộ nhớ cục bộ):', err);
    }

    // Reset Form
    setActiveRecord(null);
    setActiveEditIndex(-1);
  }

  function handleCancelEdit() {
    setActiveRecord(null);
    setActiveEditIndex(-1);
  }

  // ==========================================
  // EXPORTS & LOCAL FILE HELPERS
  // ==========================================
  // 1. "Kết sổ cuối tháng" - Filter records of the current Month and download JSON
  function handleDownloadCurrentMonth() {
    const confirmation = window.confirm('Bạn có chắc chắn muốn lưu dữ liệu đầu tháng đến hiện tại?');
    if (!confirmation) return;

    const today = new Date();
    const currentMonth = today.getMonth(); // 0 - 11
    const currentYear = today.getFullYear();

    const currentMonthRecords = records.filter((rec) => {
      const recDate = new Date(rec.visitDate);
      return recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear;
    });

    if (currentMonthRecords.length > 0) {
      const dataStr = JSON.stringify(currentMonthRecords, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();

      a.download = `DucHanh-${dd}-${mm}-${yyyy}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('Không có dữ liệu điều trị trong tháng hiện tại.');
    }
  }

  // 2. "Lưu và xóa dữ liệu" - full records backup and clear localStorage
  async function handleBackupAndClearAll() {
    const confirmation = window.confirm('Bạn có chắc chắn muốn tải file backup và xóa dữ liệu trên hệ thống?');
    if (!confirmation) return;

    const today = new Date();
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    a.download = `DucHanh-${dd}-${mm}-${yyyy}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Prompt to clear MongoDB as well
    const alsoClearMongo = window.confirm('Bạn có muốn xóa toàn bộ bản ghi trên cơ sở dữ liệu MongoDB luôn không?');
    if (alsoClearMongo) {
      try {
        await axios.delete('/api/records');
        setDbStatus((prev) => ({ ...prev, count: 0 }));
      } catch (err) {
        console.warn('Lỗi xóa trên MongoDB:', err);
      }
    }

    // Clear and reset local
    localStorage.removeItem('dentalRecords');
    setRecords([]);
    setActiveRecord(null);
    setActiveEditIndex(-1);
    alert('Hệ thống đã sao lưu và dọn dẹp dữ liệu thành công.');
  }

  // 3. "Tải dữ liệu file" - Select backup file and populate records
  function handleTriggerLocalFileUpload() {
    fileInputRef.current?.click();
  }

  function handleLocalFileUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt) {
      try {
        const textStr = evt.target?.result as string;
        const dataParsed = JSON.parse(textStr);
        if (Array.isArray(dataParsed)) {
          setRecords(dataParsed);
          localStorage.setItem('dentalRecords', JSON.stringify(dataParsed));

          // Offer to sync to MongoDB
          const syncConfirm = window.confirm(
            `Đã đọc ${dataParsed.length} hồ sơ từ file backup. Bạn có muốn đồng bộ ngay vào MongoDB không?`
          );
          if (syncConfirm) {
            setIsLoading(true);
            setLoadingText('Đang nạp dữ liệu file vào MongoDB...');
            try {
              await axios.post('/api/records/sync', dataParsed);
              await fetchRecordsFromMongo();
              alert('Đồng bộ file backup vào MongoDB thành công!');
            } catch (syncErr) {
              console.error('Lỗi sync MongoDB:', syncErr);
              alert('Không thể nạp vào MongoDB, nhưng đã lưu trên trình duyệt.');
            } finally {
              setIsLoading(false);
            }
          } else {
            alert('Tải dữ liệu từ file backup thành công!');
          }
        } else {
          alert('Định dạng dữ liệu backup file không hợp lệ! Vui lòng chọn đúng file.');
        }
      } catch (err) {
        console.error('File parsing error', err);
        alert('Có lỗi xảy ra khi phân tích dữ liệu file!');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input selection
  }

  // 4. "Thống kê Doanh thu Theo tháng" - Import a monthly backup and summarize totals
  function handleTriggerThongKeFileThang() {
    fileInputThangRef.current?.click();
  }

  function handleThongKeFileThangChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const textStr = evt.target?.result as string;
        const datasParsed: DentalRecord[] = JSON.parse(textStr);
        if (!Array.isArray(datasParsed)) {
          alert('Nội dung file không hợp lệ!');
          return;
        }

        const plans = datasParsed.flatMap((d) => d.plan || []);

        let totalCost = 0;
        let totalPaid = 0;
        let totalRemaining = 0;

        plans.forEach((plan) => {
          if (plan.cost) totalCost += parseFloat(plan.cost as string) || 0;
          if (plan.paid) totalPaid += parseFloat(plan.paid as string) || 0;
          if (plan.remaining) totalRemaining += parseFloat(plan.remaining as string) || 0;
        });

        // Trigger statistics modal view
        setTotalsTitle(`Báo cáo Doanh thu từ File: ${file.name}`);
        setTotalsSum({ cost: totalCost, paid: totalPaid, remaining: totalRemaining });
        setTotalsCount(datasParsed.length);
        setIsTotalsOpen(true);
      } catch (err) {
        console.error('Summarize error', err);
        alert('Hệ thống không thể phân tích và tính toán file thống kê!');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Clear file input
  }

  // 5. "Thống kê Doanh thu hiện tại" - sum calculated plans within current month
  function handleShowCurrentMonthRevenue() {
    const confirmation = window.confirm('Bạn có chắc chắn muốn thống kê doanh thu hiện tại (trong tháng này)?');
    if (!confirmation) return;

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const activePlans: PlanItem[] = [];
    records.forEach((rec) => {
      if (!rec.plan) return;
      rec.plan.forEach((p) => {
        const planDate = new Date(p.date);
        if (planDate >= firstOfMonth && planDate <= today) {
          activePlans.push(p);
        }
      });
    });

    let totalCost = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    activePlans.forEach((plan) => {
      if (plan.cost) totalCost += parseFloat(plan.cost as string) || 0;
      if (plan.paid) totalPaid += parseFloat(plan.paid as string) || 0;
      if (plan.remaining) totalRemaining += parseFloat(plan.remaining as string) || 0;
    });

    // Populate modal state
    setTotalsTitle(`Báo cáo Doanh thu Tháng ${today.getMonth() + 1}/${today.getFullYear()}`);
    setTotalsSum({ cost: totalCost, paid: totalPaid, remaining: totalRemaining });
    setTotalsCount(undefined);
    setIsTotalsOpen(true);
  }

  // ==========================================
  // MONGODB INTEGRATION & CLOUD RESTORING
  // ==========================================
  // 1. Handlers for sync Cloud download data from MongoDB
  async function handleDownloadFromCloud() {
    const confirmation = window.confirm('Bạn có chắc chắn muốn tải dữ liệu mới nhất từ cơ sở dữ liệu MongoDB về không?');
    if (!confirmation) return;

    setIsLoading(true);
    setLoadingText('Đang tải dữ liệu từ MongoDB...');

    try {
      const response = await axios.get('/api/records');
      const loadedRecords = response.data;

      if (Array.isArray(loadedRecords)) {
        setRecords(loadedRecords);
        localStorage.setItem('dentalRecords', JSON.stringify(loadedRecords));
        setDbStatus({ connected: true, count: loadedRecords.length, database: 'duchanh' });
        alert(`Tải thành công ${loadedRecords.length} hồ sơ từ MongoDB!`);

        // Form states reload
        setActiveRecord(null);
        setActiveEditIndex(-1);
      } else {
        alert('Dữ liệu tải về từ MongoDB có cấu trúc không phù hợp!');
      }
    } catch (err) {
      console.error('MongoDB Download error', err);
      alert('Không thể kết nối đến máy chủ MongoDB! Vui lòng kiểm tra lại kết nối.');
    } finally {
      setIsLoading(false);
    }
  }

  // 2. Handlers for sync Cloud upload data to MongoDB
  async function triggerCloudUploadFlow() {
    setIsCloudPassOpen(true);
    setCloudPassword('');
    setCloudPassError(false);
  }

  async function handleCloudPassSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCloudPassError(false);

    try {
      const passHash = await generateSHA256(cloudPassword.trim());
      // Hash of "123" Is "991a3defd73e481618e9cd44694d9181b8cebc5b3842b28fafec24f89ea63a18"
      if (passHash === '991a3defd73e481618e9cd44694d9181b8cebc5b3842b28fafec24f89ea63a18' || cloudPassword === '123') {
        setIsCloudPassOpen(false);
        await initiateCloudSyncPOST();
      } else {
        setCloudPassError(true);
      }
    } catch (err) {
      console.error('Password hash comparison failed', err);
      if (cloudPassword.trim() === '123') {
        setIsCloudPassOpen(false);
        await initiateCloudSyncPOST();
      } else {
        setCloudPassError(true);
      }
    }
  }

  async function initiateCloudSyncPOST() {
    setIsLoading(true);
    setLoadingText('Đang đồng bộ dữ liệu lên MongoDB...');

    try {
      const response = await axios.post('/api/records/sync', records);
      console.log('Post MongoDB response:', response.data);
      setDbStatus((prev) => ({ ...prev, connected: true, count: records.length }));
      alert(`Đồng bộ thành công ${records.length} hồ sơ lên MongoDB!`);
    } catch (err) {
      console.error('MongoDB sync err', err);
      alert('Có lỗi xảy ra khi gửi dữ liệu lên MongoDB! Hãy chắc chắn MongoDB đang chạy.');
    } finally {
      setIsLoading(false);
    }
  }

  // 3. Quick 1-click import from DucHanh-27-08-2024.txt
  async function handleImportDefaultData() {
    const confirmation = window.confirm(
      'Bạn có muốn nạp dữ liệu gốc từ file DucHanh-27-08-2024.txt (931 hồ sơ) vào MongoDB không?'
    );
    if (!confirmation) return;

    setIsLoading(true);
    setLoadingText('Đang nạp 931 hồ sơ gốc vào MongoDB...');

    try {
      const res = await axios.post('/api/records/import-default');
      alert(res.data.message || 'Nạp dữ liệu vào MongoDB thành công!');
      // Refresh
      await fetchRecordsFromMongo(false);
    } catch (err: any) {
      console.error('Import default error:', err);
      alert('Không thể nạp dữ liệu: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  }

  // ==========================================
  // VIETQR CODE GENERATION FLOW
  // ==========================================
  async function handleGenerateVietQR(patientName: string, configAmountK: string) {
    // Standard validation
    const numK = parseInt(configAmountK, 10);
    if (!numK || isNaN(numK)) {
      alert('Vui lòng nhập số tiền hợp lệ để tạo mã QR (ví dụ: nhập 50 cho 50.000 VND).');
      return;
    }

    const calculatedAmount = numK * 1000;
    const now = new Date();
    const formattedTime = `${formatDateToDDMMYYYYNew(now)} ${String(now.getHours()).padStart(2, '0')}h:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const formattedPatientName = patientName ? patientName.trim() : 'Khach hang';
    const memo = `${formattedPatientName} Thanh toan nha khoa ngay ${formattedTime}`;

    setIsLoading(true);
    setLoadingText('Đang tạo mã VietQR từ cổng thanh toán...');

    const transactionPayload = {
      accountNo: 888974974,
      accountName: 'TRAN THI HA MY',
      acqId: 970441,
      amount: calculatedAmount,
      addInfo: memo,
      format: 'text',
      template: 'compact',
    };

    try {
      const response = await axios.post('https://api.vietqr.io/v2/generate', transactionPayload);
      const qrRawUrl = response.data?.data?.qrDataURL;

      if (qrRawUrl) {
        setQrImageUrl(qrRawUrl);
        setQrAmount(calculatedAmount);
        setQrAddInfo(memo);
        setIsQRModalOpen(true);
      } else {
        alert('Hệ thống VietQR không trả về liên kết mã QR! Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('VietQR API call failed', err);
      alert('Không thể kết nối đến cổng tạo mã VietQR! Vui lòng kiểm tra đường truyền.');
    } finally {
      setIsLoading(false);
    }
  }

  // Main Authentication Guardian
  if (!session || !session.isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="application_viewport" className="min-h-screen bg-[#b3cbcf] text-slate-800 font-sans selection:bg-teal-500 selection:text-white flex flex-col justify-between">
      {/* Hidden Files Import Elements */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalFileUploadChange}
        className="hidden"
        accept=".json,.txt"
      />
      <input
        type="file"
        ref={fileInputThangRef}
        onChange={handleThongKeFileThangChange}
        className="hidden"
        accept=".json,.txt"
      />

      {/* Modern, Highly Polished Top Bar Header */}
      <header className="bg-gradient-to-r from-sky-100 to-indigo-100 border-b border-sky-200/60 shadow-xs px-4 py-3 pb-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#007bffd4] text-white rounded-2xl shadow-md transform hover:rotate-6 transition-transform">
              <Heart className="w-8 h-8 fill-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">
                Nha Khoa Đức Hạnh Bình Thuận
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Phone size={12} className="text-[#007bff]" /> Hot-line: <span className="text-slate-700 font-bold">0947 137 139 (Đức Hạnh)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone size={12} className="text-[#007bff]" /> Hot-line: <span className="text-slate-700 font-bold">0888 974 974 (Hà My)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/75 backdrop-blur-xs p-2 px-4 rounded-xl border border-sky-100/90 shadow-inner w-full md:w-auto justify-between md:justify-end">
            {/* MongoDB Connection Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                dbStatus.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
              onClick={() => fetchRecordsFromMongo(true)}
              title="Click để kiểm tra lại kết nối MongoDB"
            >
              <Database size={14} className={dbStatus.connected ? 'text-emerald-600' : 'text-amber-600'} />
              <span>MongoDB:</span>
              {dbStatus.connected ? (
                <span className="flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  {dbStatus.count} hồ sơ
                </span>
              ) : (
                <span className="font-normal text-[11px]">Ngoại tuyến (Cache)</span>
              )}
            </div>

            <div className="flex flex-col text-right">
              <span id="clock" className="text-base md:text-lg font-black text-[#007bff] font-mono leading-none mb-1">
                {clockStr || 'Đang tải giờ...'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Giờ hệ thống</span>
            </div>

            <button
              id="logout_btn"
              onClick={handleLogout}
              className="p-2 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scaffold Operations Body */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 space-y-6 flex-1">
        {/* Quick Operations toolbar */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="add_new_patient_direct_btn"
              onClick={() => {
                setActiveRecord(null);
                setActiveEditIndex(-1);
                document.getElementById('dentalForm')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText size={15} />
              <span>Thêm bệnh nhân mới</span>
            </button>

            <button
              id="analytics_now_btn"
              onClick={handleShowCurrentMonthRevenue}
              className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200/50 text-teal-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TrendingUp size={14} />
              <span>Thống kê doanh thu tháng này</span>
            </button>

            <button
              id="analytics_month_file_btn"
              onClick={handleTriggerThongKeFileThang}
              className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200/50 text-teal-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign size={14} />
              <span>Thống kê doanh thu theo file</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="cloud_save_btn"
              onClick={triggerCloudUploadFlow}
              className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={14} />
              <span>Đồng bộ lên MongoDB</span>
            </button>

            <button
              id="cloud_download_btn"
              onClick={handleDownloadFromCloud}
              className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Tải từ MongoDB</span>
            </button>
          </div>
        </div>

        {/* Dynamic Patient Info Details / Add Form */}
        <section id="dentalForm">
          <DentalForm
            activeRecord={activeRecord}
            onSubmit={handleSaveRecord}
            onDelete={handleDeleteActiveRecord}
            onCancel={handleCancelEdit}
            onGenerateQR={handleGenerateVietQR}
          />
        </section>

        {/* Main Dental Records Index */}
        <section>
          <DentalRecordsTable records={records} onEdit={handleEditRecord} />
        </section>

        {/* Data Maintenance section inside page footer of elements */}
        <section className="bg-slate-100/70 rounded-2xl p-6 border border-slate-200/50 space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FolderSync size={15} /> Công cụ quản trị cơ sở dữ liệu MongoDB & Dự phòng
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="db_close_month_btn"
              onClick={handleDownloadCurrentMonth}
              className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Kết sổ tải file .json</span>
            </button>

            <button
              id="db_download_full_btn"
              onClick={handleBackupAndClearAll}
              className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/20 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X size={13} />
              <span>Tải backup & Xóa dữ liệu cũ</span>
            </button>

            <button
              id="db_load_file_btn"
              onClick={handleTriggerLocalFileUpload}
              className="py-2.5 px-4 bg-sky-50 hover:bg-sky-100 border border-sky-200/50 text-sky-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText size={13} />
              <span>Khôi phục từ file backup</span>
            </button>

            <button
              id="db_import_default_btn"
              onClick={handleImportDefaultData}
              className="py-2.5 px-4 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 text-teal-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
              title="Nạp 931 hồ sơ bệnh nhân từ DucHanh-27-08-2024.txt vào MongoDB"
            >
              <Database size={13} className="text-teal-600" />
              <span>Nạp dữ liệu gốc (931 hồ sơ)</span>
            </button>
          </div>
        </section>
      </main>

      {/* Clean high contrast Copyright Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© Copyright 2026 Nha Khoa Đức Hạnh Bình Thuận. Bản quyền thuộc về KhoiTN.</p>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Phiên bản nâng cấp MongoDB 7.0</span>
            <span>•</span>
            <a href="https://facebook.com/nguyenkhoi2202" target="_blank" rel="noreferrer" className="text-teal-400 hover:underline">
              KhoiTN Profile
            </a>
          </div>
        </div>
      </footer>

      {/* ==========================================
          MODAL 1: Loading Overlay Screen Spinner
          ========================================== */}
      {isLoading && (
        <div id="loading_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 text-center max-w-xs w-full space-y-4 animate-scale-up">
            <span className="inline-block w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-700">{loadingText}</p>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: Cloud Sync Password Form Prompt
          ========================================== */}
      {isCloudPassOpen && (
        <div id="cloud_password_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 transform animate-scale-up">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-teal-400" />
                <h3 className="font-bold text-base tracking-tight">Xác thực đồng bộ MongoDB</h3>
              </div>
              <button onClick={() => setIsCloudPassOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCloudPassSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Vui lòng nhập mật khẩu quản trị để thực hiện đồng bộ dữ liệu lên cơ sở dữ liệu MongoDB an toàn.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Mật khẩu xác minh</label>
                <input
                  id="cloud_password_val"
                  type="password"
                  placeholder="Nhập mật khẩu (mặc định: 123)..."
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
                  autoFocus
                />
              </div>

              {cloudPassError && (
                <div className="flex items-center gap-1.5 p-3 text-xs bg-rose-50 text-rose-600 rounded-md border border-rose-100">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Mật khẩu không chính xác!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCloudPassOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="confirm_cloud_sync_pwd_btn"
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Xác nhận đồng bộ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: Analytical Sum Finance Dialog
          ========================================== */}
      <TotalsDialog
        isOpen={isTotalsOpen}
        onClose={() => setIsTotalsOpen(false)}
        title={totalsTitle}
        totalCost={totalsSum.cost}
        totalPaid={totalsSum.paid}
        totalRemaining={totalsSum.remaining}
        recordCount={totalsCount}
      />

      {/* ==========================================
          MODAL 4: VietQR Base64 Popup Canvas
          ========================================== */}
      <VietQRPopup
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        qrImageUrl={qrImageUrl}
        amount={qrAmount}
        addInfo={qrAddInfo}
      />
    </div>
  );
}
