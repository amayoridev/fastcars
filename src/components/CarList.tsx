import { useState } from "react";
import { Car } from "../types";
import { Search, Calendar, RefreshCw, Layers, ShieldCheck, Timer, Plus, Brush, Wrench } from "lucide-react";

interface CarListProps {
  cars: Car[];
  userRole: "admin" | "tech" | "acc" | "sales";
  onSelectCar: (car: Car, initialTab?: "general" | "inspection" | "repairs" | "warranties") => void;
  onOpenAddModal: () => void;
}

export default function CarList({ cars, userRole, onSelectCar, onOpenAddModal }: CarListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Tất cả");
  const [sortBy, setSortBy] = useState<string>("newest"); // newest, oldest, stockDays, repairCost

  const canAddCars = userRole === "admin" || userRole === "acc" || userRole === "sales";

  // Filter cars list
  const filteredCars = cars.filter(car => {
    const matchesSearch = 
      car.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "Tất cả" || car.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Sort filtered list
  const sortedCars = [...filteredCars].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.intakeDate).getTime() - new Date(a.intakeDate).getTime();
      case "oldest":
        return new Date(a.intakeDate).getTime() - new Date(b.intakeDate).getTime();
      case "stockDays":
        return b.stockDays - a.stockDays;
      case "repairCost":
        return (b.costs?.totalCost || 0) - (a.costs?.totalCost || 0);
      default:
        return 0;
    }
  });

  // Helpers for decoration
  const getStatusBadgeClass = (status: Car["status"]) => {
    switch (status) {
      case "Kho":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      case "Đang sửa":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Đã sửa":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "Đã bán":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      default:
        return "bg-slate-100 text-slate-750 border border-slate-200";
    }
  };

  const getStockDaysBadgeClass = (days: number, status: string) => {
    if (status === "Đã bán") {
      return "text-slate-500 font-bold bg-slate-100 border border-slate-200/60";
    }
    if (days > 30) {
      return "text-rose-700 font-bold bg-rose-50 border border-rose-200 animate-pulse";
    }
    if (days > 15) {
      return "text-amber-700 font-bold bg-amber-50 border border-amber-200";
    }
    return "text-blue-700 font-bold bg-blue-50 border border-blue-100";
  };

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-5" id="car-list-root">
      {/* Search and Filters panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="search-car-input"
            type="text"
            placeholder="Tìm biển số xe, dòng xe (vios, accent, ford)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-250 bg-slate-50 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Filters and sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filtering */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái:</span>
            <select
              id="filter-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Tất cả">Tất cả xe</option>
              <option value="Kho">Nhập kho (Chưa sửa)</option>
              <option value="Đang sửa">Đang sửa chữa</option>
              <option value="Đã sửa">Đã xong - Chờ bán</option>
              <option value="Đã bán">Đã bán hoàn tất</option>
            </select>
          </div>

          {/* Sorter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sắp xếp:</span>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Mới nhập kho</option>
              <option value="oldest">Cũ nhất kho</option>
              <option value="stockDays">Số ngày tồn kho 📈</option>
              <option value="repairCost">Chi phí sửa chữa 💰</option>
            </select>
          </div>

          {/* Add Car Button - Admin/Accountant only */}
          {canAddCars && (
            <button
              id="btn-open-add-car"
              onClick={onOpenAddModal}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-150 ease-in-out flex items-center space-x-1 shadow-lg shadow-blue-900/10 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nhập xe kho</span>
            </button>
          )}
        </div>
      </div>

      {/* Car Items Grid */}
      {sortedCars.length === 0 ? (
        <div className="bg-white rounded-2xl py-12 px-6 border border-slate-200 text-center text-slate-400" id="empty-car-list">
          <Search className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">Không tìm thấy dữ liệu xe cũ phù hợp</p>
          <p className="text-xs mt-1">Vui lòng kiểm tra lại biển số, thương hiệu hoặc cấu hình bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="car-items-grid">
          {sortedCars.map((car) => {
            const hasLongStock = car.status !== "Đã bán" && car.stockDays > 30;
            return (
              <div
                id={`car-card-${car.id}`}
                key={car.id}
                onClick={() => onSelectCar(car, "general")}
                className={`bg-white rounded-2xl border p-5 hover:shadow-lg hover:border-blue-300 cursor-pointer transition flex flex-col justify-between ${
                  hasLongStock ? "border-amber-300 ring-2 ring-amber-500/10 bg-amber-50/10" : "border-slate-200"
                }`}
              >
                {/* Visual License Plate Plate header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    {/* Monospace license plate with metallic look border */}
                    <span className="font-mono text-xs font-black uppercase bg-slate-900 text-slate-50 border border-slate-700 rounded px-2.5 py-1 tracking-wider inline-block shadow-inner">
                      {car.licensePlate}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">{car.brand} • {car.model}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${getStatusBadgeClass(car.status)}`}>
                    {car.status === "Kho" ? "Nhập kho" : car.status}
                  </span>
                </div>

                {/* Car Core specs info */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-2 py-3 my-2 border-y border-slate-100 text-xs text-slate-600 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Năm: <strong className="text-slate-800">{car.year}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                    <span>Sơn: <strong className="text-slate-800">{car.color}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    <span>Hộp số: <strong className="text-slate-800 truncate" title={car.inspection.gearbox}>{car.inspection.gearbox === "Chưa kiểm định" ? "Kiểm tra sau" : "Ổn định"}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Timer className="h-3.5 w-3.5 text-blue-500" />
                    <span>Về: <strong className="text-slate-800 font-mono">{car.intakeDate}</strong></span>
                  </div>
                </div>

                {/* Costs & Stock Age Bottom row */}
                <div className="pt-3 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl border-t border-slate-100">
                  {/* Stock counter */}
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lưu kho</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${getStockDaysBadgeClass(car.stockDays, car.status)}`}>
                      {car.stockDays} ngày {car.status === "Đã bán" ? "(Bán)" : ""}
                    </span>
                    {car.status === "Đã bán" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCar(car, "warranties");
                        }}
                        className="mt-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-550 flex items-center space-x-1 px-2.5 py-1 rounded shadow-sm hover:shadow active:scale-95 transition cursor-pointer"
                        title="Bấm vào để xem & nhập nhật ký bảo hành sau bán"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>Bảo hành</span>
                      </button>
                    )}
                  </div>

                  {/* Repair costs indicators */}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng phí dọn</span>
                    <span className="text-xs font-black text-slate-900 mt-1 block">
                      {formatCurrency(car.costs?.totalCost || 0)}
                    </span>
                    {car.costs && car.costs.totalCost > 0 && (
                      <div className="flex items-center justify-end space-x-2 text-[9px] text-slate-400 mt-1">
                        <span className="flex items-center font-bold text-amber-600"><Brush className="h-2.5 w-2.5 mr-0.5" />{formatCurrency(car.costs.paintCost || 0)}</span>
                        <span>•</span>
                        <span className="flex items-center font-bold text-emerald-600"><Wrench className="h-2.5 w-2.5 mr-0.5" />{formatCurrency(car.costs.partsCost || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
