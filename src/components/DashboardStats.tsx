import { Car } from "../types";
import { CarFront, Brush, Wrench, CircleDollarSign, CalendarDays, TrendingUp, Archive, Activity, CheckCircle, BadgeCheck } from "lucide-react";

interface DashboardStatsProps {
  cars: Car[];
  userRole: "admin" | "tech" | "acc" | "sales";
}

export default function DashboardStats({ cars, userRole }: DashboardStatsProps) {
  // Safe financial filters
  const canSeePrices = userRole === "admin" || userRole === "acc";

  // Counts
  const totalCars = cars.length;
  const inStockUnsold = cars.filter(c => c.status !== "Đã bán");
  const inStockCount = cars.filter(c => c.status === "Kho").length;
  const repairingCount = cars.filter(c => c.status === "Đang sửa").length;
  const finishedCount = cars.filter(c => c.status === "Đã sửa").length;
  const soldCount = cars.filter(c => c.status === "Đã bán").length;

  // Financial aggregates
  let totalPaint = 0;
  let totalParts = 0;
  let totalLabor = 0;
  let totalPurchase = 0;
  let totalSalePrice = 0;

  cars.forEach(car => {
    totalPaint += car.costs?.paintCost || 0;
    totalParts += car.costs?.partsCost || 0;
    totalLabor += car.costs?.laborCost || 0;
    if (canSeePrices) {
      totalPurchase += car.purchasePrice || 0;
    }
    if (car.status === "Đã bán" && car.salePrice) {
      totalSalePrice += car.salePrice;
    }
  });

  const totalRepairs = totalPaint + totalParts + totalLabor;

  // Average stock days for unsold cars
  const avgStockDaysUnsold = inStockUnsold.length > 0 
    ? Math.round(inStockUnsold.reduce((acc, car) => acc + car.stockDays, 0) / inStockUnsold.length)
    : 0;

  // Warning stock (unsold cars stocked > 30 days)
  const warningStockCount = inStockUnsold.filter(c => c.stockDays > 30).length;

  // Helper format currency
  const formatCurrency = (amt: number) => {
    return amt.toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6" id="dashboard-stats-root">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5" id="stats-summary-cards">
        {/* Card 1: Total Warehouse */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:border-blue-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Kho Xe Hiện Tại</p>
          <div className="flex items-baseline space-x-1.5">
            <h3 className="text-3xl font-black text-slate-900 leading-tight" id="count-in-stock">
              {inStockUnsold.length}
            </h3>
            <span className="text-xs font-semibold text-slate-500">Xe tồn</span>
          </div>
          <div className="flex items-center mt-2 text-xs text-blue-600 font-bold uppercase tracking-wider">
            <span>Đã bán: {soldCount} xe</span>
          </div>
        </div>

        {/* Card 2: Paint costs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:border-blue-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chi Phí Đồng Sơn</p>
          <div className="overflow-hidden">
            <h3 className="text-lg font-black text-slate-900 leading-tight truncate select-all">
              {formatCurrency(totalPaint)}
            </h3>
          </div>
          <div className="flex items-center mt-2.5 text-xs text-amber-600 font-semibold uppercase tracking-wider">
            <span>Sơn dặm, vá vỏ</span>
          </div>
        </div>

        {/* Card 3: Parts cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:border-blue-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chi Phí Phụ Tùng</p>
          <div className="overflow-hidden">
            <h3 className="text-lg font-black text-slate-900 leading-tight truncate select-all">
              {formatCurrency(totalParts)}
            </h3>
          </div>
          <div className="flex items-center mt-2.5 text-xs text-emerald-600 font-semibold uppercase tracking-wider">
            <span>Bảo dưỡng, thay thế</span>
          </div>
        </div>

        {/* Card 4: Total invest cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:border-blue-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng Phí Sửa Chữa</p>
          <div className="overflow-hidden">
            <h3 className="text-lg font-black text-slate-900 leading-tight truncate select-all">
              {formatCurrency(totalRepairs)}
            </h3>
          </div>
          <div className="flex items-center mt-2.5 text-xs text-blue-600 font-semibold uppercase tracking-wider">
            <span>Nhân công: {formatCurrency(totalLabor)}</span>
          </div>
        </div>
      </div>

      {/* Tình trạng & Tồn kho Details Segment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="stats-detailed-grid">
        {/* Status distribution progress bars */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 md:col-span-2">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Activity className="h-4 w-4 text-blue-500" />
            <span>Phân bố trạng thái kho xe ({inStockUnsold.length} xe đang xử lý)</span>
          </h4>

          <div className="space-y-4">
            {/* Kho */}
            <div>
              <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5">
                <span className="font-bold uppercase tracking-wide flex items-center text-slate-500">
                  <Archive className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  Vừa về kho (Chưa sửa)
                </span>
                <span className="font-bold text-slate-800">{inStockCount} xe ({inStockUnsold.length ? Math.round((inStockCount / inStockUnsold.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/55">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                  style={{ width: `${inStockUnsold.length ? (inStockCount / inStockUnsold.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Đang sửa */}
            <div>
              <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5">
                <span className="font-bold uppercase tracking-wide flex items-center text-amber-600">
                  <Activity className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                  Đang dọn dẹp / Sửa chữa
                </span>
                <span className="font-bold text-slate-800">{repairingCount} xe ({inStockUnsold.length ? Math.round((repairingCount / inStockUnsold.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/55">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${inStockUnsold.length ? (repairingCount / inStockUnsold.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Đã sửa */}
            <div>
              <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5">
                <span className="font-bold uppercase tracking-wide flex items-center text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                  Đã hoàn thiện - Chờ bán
                </span>
                <span className="font-bold text-slate-800">{finishedCount} xe ({inStockUnsold.length ? Math.round((finishedCount / inStockUnsold.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/55">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${inStockUnsold.length ? (finishedCount / inStockUnsold.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Age Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2 border-b border-slate-100 pb-3">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <span>Chỉ số ngày tồn kho</span>
            </h4>
            
            <div className="mt-5 text-center">
              <h2 className="text-5xl font-black text-blue-600 tracking-tight" id="avg-stock-days-display">
                {avgStockDaysUnsold} <span className="text-sm font-medium text-slate-500 lowercase">ngày</span>
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-2">Số ngày tồn kho trung bình xe chưa bán</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            {warningStockCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl text-xs text-amber-850 flex items-start space-x-2.5">
                <span className="shrink-0 font-bold bg-amber-200 text-amber-900 rounded-lg h-5.5 w-5.5 flex items-center justify-center text-[10px]">
                  {warningStockCount}
                </span>
                <div className="leading-snug">
                  <span className="font-bold text-amber-950 block">Cảnh báo tồn kho lâu ngày</span>
                  Có {warningStockCount} xe đã nằm kho &gt; 30 ngày chưa thanh khoản.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200/60 p-3 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-bold">Chỉ số thanh khoản lưu kho rất tốt!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
