import { useState } from "react";
import { Download, Calendar, CalendarRange, Table2, ShieldAlert } from "lucide-react";

interface ReportsPanelProps {
  userRole: "admin" | "tech" | "acc" | "sales";
}

export default function ReportsPanel({ userRole }: ReportsPanelProps) {
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  const canExport = userRole === "admin" || userRole === "acc";

  const handleExport = (type: "all" | "day" | "month") => {
    let url = "/api/export/summary?";
    if (type === "all") {
      url += "type=all";
    } else if (type === "day") {
      url += `type=day&value=${selectedDay}`;
    } else if (type === "month") {
      url += `type=month&value=${selectedMonth}`;
    }

    // Direct browser redirect to trigger file download
    window.location.href = url;
  };

  if (!canExport) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto" id="reports-unauthorized-view">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h4 className="font-bold text-slate-800 text-sm">Hạn chế quyền truy cập báo cáo</h4>
        <p className="text-xs text-slate-400 mt-1.5">
          Chỉ Quản Trị Viên và Kế Toán hệ thống mới có quyền truy cập, tổng hợp báo cáo tài chính và xuất dữ liệu Excel.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6" id="reports-panel-root">
      <div>
        <h3 className="text-md font-bold text-slate-900 tracking-tight">HỆ THỐNG XUẤT BÁO CÁO CÔNG VIỆC & DOANH SỐ EXCEL</h3>
        <p className="text-xs text-slate-400 mt-1">Kết xuất bảng tính Excel đầy đủ về chi phí, doanh số, tồn trữ, và thống kê chi phí đồng sơn & phụ tùng độc lập.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="reports-type-grid">
        {/* Export Type 1: Export Detail Daily */}
        <div className="border border-slate-100 bg-slate-50/55 hover:bg-slate-50 p-4 rounded-xl flex flex-col justify-between transition">
          <div className="space-y-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Báo cáo theo ngày</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Xuất các xe có hoạt động nhập kho hoặc có hồ sơ sửa chữa hoàn thành trong ngày được chọn.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100/70 space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Chọn ngày lập báo cáo</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:focus:ring-indigo-500"
              />
            </div>
            <button
              id="btn-export-day"
              onClick={() => handleExport("day")}
              className="w-full py-1.5 flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải Excel Ngày</span>
            </button>
          </div>
        </div>

        {/* Export Type 2: Export Detail Monthly */}
        <div className="border border-slate-100 bg-slate-50/55 hover:bg-slate-50 p-4 rounded-xl flex flex-col justify-between transition">
          <div className="space-y-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
              <CalendarRange className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Báo cáo tổng hợp tháng</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Xuất dữ liệu toàn diện xe có phát sinh chi phí hoặc bán ra trong kỳ hạn tháng.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100/70 space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Chọn tháng lập báo cáo</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:focus:ring-indigo-500"
              />
            </div>
            <button
              id="btn-export-month"
              onClick={() => handleExport("month")}
              className="w-full py-1.5 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải Excel Tháng</span>
            </button>
          </div>
        </div>

        {/* Export Type 3: Comprehensive */}
        <div className="border border-slate-100 bg-indigo-950 p-4 rounded-xl flex flex-col justify-between text-white">
          <div className="space-y-2">
            <div className="p-2 bg-indigo-700 text-indigo-200 rounded-lg w-fit">
              <Table2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-300 text-xs uppercase tracking-wide">Tất cả lịch sử kho</h4>
              <p className="text-[11px] text-indigo-200/70 mt-0.5">Xuất tất cả các đầu xe từ trước tới nay, kèm theo thông số tính phân bổ chi phí sửa chữa dòn sơn, gốc sắm xe và dự đoán thanh khoản.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-900 space-y-3">
            <button
              id="btn-export-all"
              onClick={() => handleExport("all")}
              className="w-full py-2 flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-505 text-white font-semibold text-xs rounded-lg transition shadow-lg shadow-indigo-950/40"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Báo Cáo Trọn Đời (All-Time)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
