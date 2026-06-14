import React, { useState, useEffect } from "react";
import { Car, User, RepairItem } from "../types";
import { 
  X, Save, FileSpreadsheet, Brush, Wrench, CircleDollarSign, ShieldAlert,
  ClipboardCheck, Clock, UserPlus, FileEdit, Trash2, Calendar, AlertTriangle, BadgeCheck, ShieldCheck, Plus
} from "lucide-react";

interface CarDetailsProps {
  carId: string;
  user: User;
  onClose: () => void;
  onUpdateSuccess: (updatedCar: Car) => void;
  onDeleteSuccess: (carId: string) => void;
  initialTab?: "general" | "inspection" | "repairs" | "warranties";
}

export default function CarDetails({ carId, user, onClose, onUpdateSuccess, onDeleteSuccess, initialTab = "general" }: CarDetailsProps) {
  const [car, setCar] = useState<Car | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "inspection" | "repairs" | "warranties">(initialTab);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCarDeleteConfirm, setShowCarDeleteConfirm] = useState(false);
  const [repairItemToDelete, setRepairItemToDelete] = useState<string | null>(null);

  // ====== Tab 4 states (Warranties log add form) ======
  const [warrantyName, setWarrantyName] = useState("");
  const [warrantyCost, setWarrantyCost] = useState("");
  const [warrantyDate, setWarrantyDate] = useState(new Date().toISOString().split("T")[0]);
  const [warrantyItemToDelete, setWarrantyItemToDelete] = useState<string | null>(null);

  const formatPriceInput = (value: string | number) => {
    const str = typeof value === "number" ? value.toString() : value;
    const digits = str.replace(/\D/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // ====== Tab 1 states (General & Stock) ======
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(2020);
  const [color, setColor] = useState("");
  const [intakeDate, setIntakeDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>("");
  const [status, setStatus] = useState<Car["status"]>("Kho");

  // ====== Tab 2 states (Technical check) ======
  const [engineCheck, setEngineCheck] = useState("");
  const [gearboxCheck, setGearboxCheck] = useState("");
  const [chassisCheck, setChassisCheck] = useState("");
  const [electronicsCheck, setElectronicsCheck] = useState("");
  const [paintCheck, setPaintCheck] = useState("");
  const [notesCheck, setNotesCheck] = useState("");

  // ====== Tab 3 states (Repairs log add form) ======
  const [repairType, setRepairType] = useState<"Phụ tùng" | "Đồng sơn" | "Nhân công">("Phụ tùng");
  const [repairName, setRepairName] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [repairDate, setRepairDate] = useState(new Date().toISOString().split("T")[0]);
  const [repairTech, setRepairTech] = useState(user?.name || user?.username || "Nhân viên");
  const [techList, setTechList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchTechList();
  }, []);

  const fetchTechList = async () => {
    try {
      const res = await fetch("/api/technicians");
      if (res.ok) {
        const data = await res.json();
        setTechList(data);
        if (data.length > 0) {
          setRepairTech(data[0].name);
        }
      }
    } catch (err) {
      console.error("Lỗi tải danh mục thợ:", err);
    }
  };

  // Check role-based capabilities
  const canSeePrices = user.role === "admin" || user.role === "acc";
  const canModifyTech = user.role === "admin" || user.role === "tech" || user.role === "acc";
  const canDeleteCar = user.role === "admin";
  const canAddRepairs = user.role === "admin" || user.role === "tech" || user.role === "acc";
  const canEditPrices = user.role === "admin" || user.role === "acc";
  const isSalesPerson = user.role === "sales";

  // Fetch specific car on mount or change
  useEffect(() => {
    fetchCarData();
  }, [carId]);

  const fetchCarData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/cars/${carId}`);
      if (!response.ok) throw new Error("Không thể truy vấn hồ sơ xe dọn.");
      const data: Car = await response.json();
      
      setCar(data);
      
      // Seed Tab 1 states
      setBrand(data.brand);
      setModel(data.model);
      setYear(data.year);
      setColor(data.color);
      setIntakeDate(data.intakeDate);
      setPurchasePrice(data.purchasePrice);
      setSalePrice(data.salePrice ? formatPriceInput(data.salePrice) : "");
      setStatus(data.status);
      setSaleDate(data.saleDate || new Date().toISOString().split("T")[0]);

      // Seed Tab 2 states
      setEngineCheck(data.inspection.engine === "Chưa kiểm định" ? "" : data.inspection.engine);
      setGearboxCheck(data.inspection.gearbox === "Chưa kiểm định" ? "" : data.inspection.gearbox);
      setChassisCheck(data.inspection.chassis === "Chưa kiểm định" ? "" : data.inspection.chassis);
      setElectronicsCheck(data.inspection.electronics === "Chưa kiểm định" ? "" : data.inspection.electronics);
      setPaintCheck(data.inspection.paint === "Chưa kiểm định" ? "" : data.inspection.paint);
      setNotesCheck(data.inspection.notes || "");
    } catch (err: any) {
      setError(err.message || "Tải dữ liệu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  // Save General details tab
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSaveLoading(true);

    try {
      const finalBrand = brand.trim() || "Toyota";
      const finalModel = model.trim() || "Vios 1.5G";
      const finalYear = year ? (parseInt(year.toString()) || 2020) : 2020;
      const finalColor = color.trim() || "Trắng";
      const finalIntakeDate = intakeDate || new Date().toISOString().split("T")[0];

      const body: any = {
        brand: finalBrand,
        model: finalModel,
        year: finalYear,
        color: finalColor,
        intakeDate: finalIntakeDate,
        status,
      };

      if (canEditPrices) {
        body.purchasePrice = purchasePrice || 300000000;
      }

      if (status === "Đã bán") {
        const rawSaleCost = salePrice ? salePrice.toString().replace(/\./g, "") : "";
        const finalSalePrice = rawSaleCost ? parseFloat(rawSaleCost) : 400000000;
        body.salePrice = finalSalePrice;
        body.saleDate = saleDate || new Date().toISOString().split("T")[0];
      } else {
        const rawSaleCost = salePrice ? salePrice.toString().replace(/\./g, "") : "";
        body.salePrice = rawSaleCost ? parseFloat(rawSaleCost) : undefined;
      }

      const response = await fetch(`/api/cars/${carId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const updatedData = await response.json();
      if (!response.ok) throw new Error(updatedData.error || "Lỗi lưu thông tin xe.");

      setCar(updatedData);
      onUpdateSuccess(updatedData);
      setSuccessMsg("Đã cập nhật cấu hình thông tin xe thành công!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Save Tech Inspection tab
  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSaveLoading(true);

    try {
      const finalEngine = engineCheck.trim() || "Hoạt động bình thường";
      const finalGearbox = gearboxCheck.trim() || "Mượt mà, không giật";
      const finalChassis = chassisCheck.trim() || "Khung gầm chắc chắn";
      const finalElectronics = electronicsCheck.trim() || "Điều hòa mát sâu, điện ổn định";
      const finalPaint = paintCheck.trim() || "Sơn đẹp, không xước xát";
      const finalNotes = notesCheck.trim() || "Sẵn sàng bàn giao";

      const response = await fetch(`/api/cars/${carId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspection: {
            engine: finalEngine,
            gearbox: finalGearbox,
            chassis: finalChassis,
            electronics: finalElectronics,
            paint: finalPaint,
            notes: finalNotes
          }
        })
      });

      const updatedData = await response.json();
      if (!response.ok) throw new Error(updatedData.error || "Lỗi lưu kỹ thuật.");

      setCar(updatedData);
      onUpdateSuccess(updatedData);
      setSuccessMsg("Đã lưu chuyên án kiểm định thành công!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete vehicle overall (Admin)
  const handleDeleteCar = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(`/api/cars/${carId}`, { method: "DELETE" });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Không thể gỡ xe.");

      onDeleteSuccess(carId);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setSaveLoading(false);
    }
  };

  // Add Repair item
  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const finalRepairName = repairName.trim() || ("Sơn dặm bảo dưỡng gầm");
    const rawCost = repairCost ? repairCost.toString().replace(/\./g, "") : "";
    const finalCost = rawCost ? (parseFloat(rawCost) || 500000) : 500000;
    const finalDate = repairDate || new Date().toISOString().split("T")[0];

    setSaveLoading(true);
    try {
      const response = await fetch(`/api/cars/${carId}/repairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: repairType,
          name: finalRepairName,
          cost: finalCost,
          date: finalDate,
          technician: repairTech
        })
      });

      const updatedCar = await response.json();
      if (!response.ok) throw new Error(updatedCar.error || "Gặp lỗi lưu thông số sửa dọn.");

      setCar(updatedCar);
      onUpdateSuccess(updatedCar);
      setRepairName("");
      setRepairCost("");
      setSuccessMsg(`Đã bổ sung ${repairType} vào danh lục sửa chữa!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete local repair Item
  const handleDeleteRepairItem = (repairId: string) => {
    setRepairItemToDelete(repairId);
  };

  const executeDeleteRepairItem = async (repairId: string) => {
    setSaveLoading(true);
    try {
      const response = await fetch(`/api/cars/${carId}/repairs/${repairId}`, {
        method: "DELETE"
      });
      const updatedCar = await response.json();
      if (!response.ok) throw new Error(updatedCar.error || "Không thể xóa sửa dọn.");

      setCar(updatedCar);
      onUpdateSuccess(updatedCar);
      setSuccessMsg("Đã gỡ mục sửa chữa.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // ====== Tab 4 handlers (Warranties after-sale claims) ======

  // Add warranty cost item
  const handleAddWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const finalWarrantyName = warrantyName.trim() || "Thay thế thiết bị hỏng hóc";
    const rawCost = warrantyCost ? warrantyCost.toString().replace(/\./g, "") : "";
    const finalCost = rawCost ? (parseFloat(rawCost) || 500000) : 500000;
    const finalDate = warrantyDate || new Date().toISOString().split("T")[0];

    setSaveLoading(true);
    try {
      const response = await fetch(`/api/cars/${carId}/warranties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalWarrantyName,
          cost: finalCost,
          date: finalDate
        })
      });

      const updatedCar = await response.json();
      if (!response.ok) throw new Error(updatedCar.error || "Gặp lỗi lưu thông số bảo hành.");

      setCar(updatedCar);
      onUpdateSuccess(updatedCar);
      setWarrantyName("");
      setWarrantyCost("");
      setSuccessMsg("Đã bổ sung hạng mục bảo hành sau bán thành công!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete warranty cost item
  const executeDeleteWarrantyItem = async (warrantyId: string) => {
    setError("");
    setSuccessMsg("");
    setSaveLoading(true);
    try {
      const response = await fetch(`/api/cars/${carId}/warranties/${warrantyId}`, {
        method: "DELETE"
      });
      const updatedCar = await response.json();
      if (!response.ok) throw new Error(updatedCar.error || "Không thể gỡ mục bảo hành.");

      setCar(updatedCar);
      onUpdateSuccess(updatedCar);
      setSuccessMsg("Đã gỡ hạng mục bảo hành thành công dọn.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Export excel of current car
  const handleExportCarExcel = () => {
    window.location.href = `/api/export/car/${carId}`;
  };

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString("vi-VN") + " đ";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="car-details-loading">
        <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-3 border border-slate-100">
          <Clock className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang đồng bộ hồ sơ xe...</p>
        </div>
      </div>
    );
  }

  if (!car) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-40 p-4 overflow-y-auto" id="car-details-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" id="car-details-content">
        
        {/* Detail Header bar */}
        <div className="bg-slate-950 p-4 shrink-0 flex justify-between items-center text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            {/* Metallic stylized plate */}
            <span className="font-mono text-sm font-extrabold bg-indigo-600 text-white rounded px-2.5 py-0.5 tracking-wider border border-indigo-400/30">
              {car.licensePlate}
            </span>
            <div className="flex flex-col">
              <h2 className="text-xs font-bold uppercase text-slate-300">Chi tiết kho & dọn xe</h2>
              <span className="text-[11px] text-slate-400">{car.brand} {car.model} ({car.year})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              id="btn-detail-export-excel"
              onClick={handleExportCarExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Xuất Excel Xe</span>
            </button>

            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition" id="btn-close-details">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="bg-slate-900/90 border-b border-slate-800 flex text-slate-400 text-xs shrink-0 select-none">
          <button
            id="tab-btn-general"
            onClick={() => setActiveTab("general")}
            className={`px-5 py-3.5 font-bold border-b-2 transition ${
              activeTab === "general" 
                ? "text-indigo-400 border-indigo-500 bg-slate-800/40" 
                : "border-transparent hover:text-slate-200"
            }`}
          >
            Sơ bộ & Tồn kho
          </button>
          <button
            id="tab-btn-inspection"
            onClick={() => setActiveTab("inspection")}
            className={`px-5 py-3.5 font-bold border-b-2 transition ${
              activeTab === "inspection" 
                ? "text-indigo-400 border-indigo-500 bg-slate-800/40" 
                : "border-transparent hover:text-slate-200"
            }`}
          >
            Kiểm định dọn đẹp
          </button>
          <button
            id="tab-btn-repairs"
            onClick={() => setActiveTab("repairs")}
            className={`px-5 py-3.5 font-bold border-b-2 transition ${
              activeTab === "repairs" 
                ? "text-indigo-400 border-indigo-500 bg-slate-800/40" 
                : "border-transparent hover:text-slate-200"
            }`}
          >
            Hạng mục sửa chữa & Phụ tùng ({car.repairs.length})
          </button>
          {car.status === "Đã bán" && (
            <button
              id="tab-btn-warranties"
              onClick={() => setActiveTab("warranties")}
              className={`px-5 py-3.5 font-bold border-b-2 transition ${
                activeTab === "warranties" 
                  ? "text-indigo-400 border-indigo-500 bg-slate-800/40" 
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              Nhật ký bảo hành ({car.warranties?.length || 0})
            </button>
          )}
        </div>

        {/* Modal content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4" id="car-details-body">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold flex items-center" id="detail-error">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold flex items-center" id="detail-success">
              <BadgeCheck className="h-4 w-4 mr-2" />
              {successMsg}
            </div>
          )}

          {/* ==================== TAB 1: GENERAL & STOCK WORKFLOW ==================== */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="grid grid-cols-1 md:grid-cols-2 gap-6" id="general-details-form">
              {/* Specs segment */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b pb-2">Thông số cơ bản của xe</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hãng xe <span className="text-slate-400 font-normal">(Trống mặc định: Toyota)</span></label>
                    <input
                      type="text"
                      disabled={isSalesPerson}
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Toyota"
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 bg-slate-50/50 disabled:opacity-60 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Dòng xe <span className="text-slate-400 font-normal">(Trống mặc định: Vios 1.5G)</span></label>
                    <input
                      type="text"
                      disabled={isSalesPerson}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Vios 1.5G"
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 bg-slate-50/50 disabled:opacity-60 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Năm sản xuất <span className="text-slate-400 font-normal">(Trống mặc định: 2020)</span></label>
                    <input
                      type="number"
                      disabled={isSalesPerson}
                      value={year || ""}
                      onChange={(e) => setYear(parseInt(e.target.value) || 2020)}
                      placeholder="2020"
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 bg-slate-50/50 disabled:opacity-60 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Màu sơn xe <span className="text-slate-400 font-normal">(Trống mặc định: Trắng)</span></label>
                    <input
                      type="text"
                      disabled={isSalesPerson}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Trắng"
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 bg-slate-50/50 disabled:opacity-60 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Ngày nhập kho xe về <span className="text-slate-400 font-normal">(Hôm nay)</span></label>
                    <input
                      type="date"
                      disabled={isSalesPerson}
                      value={intakeDate}
                      onChange={(e) => setIntakeDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 bg-slate-50/50 disabled:opacity-60 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Secure Price box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase">Tổng chi phí sửa dọn thực tế</h5>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Tổng cộng (Đồng sơn + Phụ tùng + Nhân công)</span>
                    <span className="text-base font-black text-indigo-700 block mt-1" id="total-car-investment">
                      {formatCurrency(car.costs?.totalCost || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Segment */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b pb-2">Tình trạng lưu kho & Bán xe</h4>
                
                <div className="space-y-3.5">
                  {/* Stock age indicator */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Thời gian nằm kho hiện tại:</span>
                    <span className="font-bold text-indigo-600 bg-white border border-indigo-200 px-2.5 py-0.5 rounded">
                      {car.stockDays} Ngày
                    </span>
                  </div>

                  {/* Status selection */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Trạng thái xe trong kho</label>
                    <select
                      id="details-status-select"
                      value={status}
                      onChange={(e) => {
                        const newStatus = e.target.value as Car["status"];
                        setStatus(newStatus);
                        if (newStatus === "Đã bán" && !saleDate) {
                          setSaleDate(new Date().toISOString().split("T")[0]);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Kho">Nhập kho (Chưa sửa)</option>
                      <option value="Đang sửa">Đang dọn dẹp sửa chữa</option>
                      <option value="Đã sửa">Đã dọn xong - Chờ bán</option>
                      <option value="Đã bán">Đã thanh khoản (Đã bán) 🤝</option>
                    </select>
                  </div>

                  {/* Sales tracking fields (conditional) */}
                  {status === "Đã bán" && (
                    <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl space-y-3">
                      <h5 className="text-[10px] font-bold text-sky-800 uppercase block">Thông tin giao dịch bán</h5>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-sky-800 font-bold block">Giá bán thực tế (VND) <span className="font-normal text-sky-600 block">(Vd: 400.000.000)</span></label>
                          <input
                            type="text"
                            value={salePrice}
                            onChange={(e) => setSalePrice(formatPriceInput(e.target.value))}
                            className="w-full mt-1 px-2.5 py-1.5 border border-sky-200 bg-white font-bold text-slate-800 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                            placeholder="400.000.000"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-sky-800 font-bold block">Ngày giao xe <span className="font-normal text-sky-600 block">(Mặc định: Hôm nay)</span></label>
                          <input
                            type="date"
                            value={saleDate}
                            onChange={(e) => setSaleDate(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 border border-sky-200 bg-white font-semibold text-slate-800 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      {canSeePrices && salePrice && (
                        <div className="pt-2 text-xs text-sky-900 border-t border-sky-150 flex justify-between font-bold">
                          <span>LỢI NHUẬN KHÁCH HÀNG:</span>
                          <span>
                            {formatCurrency(parseFloat(salePrice) - (car.costs?.totalCost || 0))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save actions */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  {canDeleteCar ? (
                    <button
                      id="btn-delete-car"
                      type="button"
                      onClick={() => setShowCarDeleteConfirm(true)}
                      className="px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-1.5 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Xóa Xe</span>
                    </button>
                  ) : <div />}

                  <button
                    id="btn-save-general"
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>Lưu Cấu Hình</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ==================== TAB 2: TECHNICAL INSPECTION CHECKBOOK ==================== */}
          {activeTab === "inspection" && (
            <form onSubmit={handleSaveInspection} className="space-y-5" id="inspection-details-form">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Kiểm soát tình trạng chuyên sâu</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Nhập chi tiết về động cơ, gầm hốc bệ khi xe vừa nhập kho để phác thảo các hạng mục cần sửa dọn.</p>
                </div>
                {!canModifyTech && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center font-medium">
                    <ShieldAlert className="h-3 w-3 mr-1" /> Chỉ kỹ thuật viên/kế toán mới được sửa dọn
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Engine Check */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. ĐỘNG CƠ / MÁY MÓC (ENGINE) (Mặc định: Hoạt động bình thường)</label>
                  <input
                    type="text"
                    disabled={!canModifyTech}
                    value={engineCheck}
                    onChange={(e) => setEngineCheck(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Hoạt động bình thường"
                  />
                </div>

                {/* Gearbox Check */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. HỘP SỐ / TRUYỀN ĐỘNG (GEARBOX) (Mặc định: Mượt mà, không giật)</label>
                  <input
                    type="text"
                    disabled={!canModifyTech}
                    value={gearboxCheck}
                    onChange={(e) => setGearboxCheck(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Mượt mà, không giật"
                  />
                </div>

                {/* Chassis Check */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. KHUNG GẦM / HỆ THỐNG PHANH (CHASSIS) (Mặc định: Khung gầm chắc chắn)</label>
                  <input
                    type="text"
                    disabled={!canModifyTech}
                    value={chassisCheck}
                    onChange={(e) => setChassisCheck(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Khung gầm chắc chắn"
                  />
                </div>

                {/* Electronics Check */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. HỆ THỐNG ĐIỆN & ĐIỀU HÒA (ELECTRONICS) (Mặc định: Điều hòa mát sâu, điện ổn định)</label>
                  <input
                    type="text"
                    disabled={!canModifyTech}
                    value={electronicsCheck}
                    onChange={(e) => setElectronicsCheck(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Điều hòa mát sâu, điện ổn định"
                  />
                </div>

                {/* Paint Check */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">5. ĐỒNG SƠN & NGOẠI THẤT (PAINT & BODY) (Mặc định: Sơn đẹp, không xước xát)</label>
                  <input
                    type="text"
                    disabled={!canModifyTech}
                    value={paintCheck}
                    onChange={(e) => setPaintCheck(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Sơn đẹp, không xước xát"
                  />
                </div>

                {/* General technical notes */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1.5 text-slate-700">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GHI CHÚ CHUNG (Mặc định: Sẵn sàng bàn giao)</label>
                  <textarea
                    rows={1}
                    disabled={!canModifyTech}
                    value={notesCheck}
                    onChange={(e) => setNotesCheck(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[38px] max-h-24 font-semibold"
                    placeholder="Sẵn sàng bàn giao"
                  />
                </div>
              </div>

              {canModifyTech && (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    id="btn-save-inspection"
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>Lưu Phiếu Kiểm Định</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ==================== TAB 3: REPAIRS LISTING & TRANSACTION ENTRIES ==================== */}
          {activeTab === "repairs" && (
            <div className="space-y-6" id="repairs-tab-view">
              
              {/* Splitted summary breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100 flex items-center space-x-3">
                  <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0">
                    <Brush className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Chi phí đồng sơn riêng</span>
                    <strong className="text-sm text-slate-800 font-extrabold block mt-0.5">
                      {formatCurrency(car.costs?.paintCost || 0)}
                    </strong>
                  </div>
                </div>

                <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100 flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-lg shrink-0">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Chi phí phụ tùng riêng</span>
                    <strong className="text-sm text-slate-800 font-extrabold block mt-0.5">
                      {formatCurrency(car.costs?.partsCost || 0)}
                    </strong>
                  </div>
                </div>

                <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100 flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500 text-white rounded-lg shrink-0">
                    <CircleDollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Tiền Công / Khác</span>
                    <strong className="text-sm text-slate-800 font-extrabold block mt-0.5">
                      {formatCurrency(car.costs?.laborCost || 0)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Form Entry - Add Repairs Line Item */}
              {canAddRepairs && (
                <form onSubmit={handleAddRepair} className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-3.5" id="add-repair-item-form">
                  <div className="flex items-center space-x-1.5 border-b border-slate-200/50 pb-2">
                    <UserPlus className="h-4 w-4 text-slate-600" />
                    <h5 className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider">Thêm hạng mục chi phí dọn dẹp</h5>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Hộp loại chi phí */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Loại chi phí</label>
                      <select
                        id="repair-type-select"
                        value={repairType}
                        onChange={(e) => setRepairType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Phụ tùng">🔩 Phụ tùng</option>
                        <option value="Đồng sơn">🎨 Đồng sơn</option>
                        <option value="Nhân công">👨‍🔧 Nhân công</option>
                      </select>
                    </div>

                    {/* Tên hạng mục */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên phụ tùng/Hạng mục <span className="text-slate-400 font-normal">(Trống mặc định: Sơn dặm bảo dưỡng gầm)</span></label>
                      <input
                        type="text"
                        value={repairName}
                        onChange={(e) => setRepairName(e.target.value)}
                        placeholder="Sơn dặm bảo dưỡng gầm"
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    {/* Chi phí */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Đơn Giá thực (VND) <span className="text-slate-400 font-normal">(Trống mặc định: 500.000)</span></label>
                      <input
                        type="text"
                        value={repairCost}
                        onChange={(e) => setRepairCost(formatPriceInput(e.target.value))}
                        placeholder="500.000"
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Ngày thực hiện */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ngày làm <span className="text-slate-400 font-normal">(Mặc định: Hôm nay)</span></label>
                      <input
                        type="date"
                        value={repairDate}
                        onChange={(e) => setRepairDate(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs focus:outline-none font-semibold"
                      />
                    </div>

                    {/* Thợ sửa chữa */}
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Người làm / Đơn vị thực hiện</label>
                      <select
                        id="repair-tech-select"
                        value={repairTech}
                        onChange={(e) => setRepairTech(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {techList.map((tech) => (
                          <option key={tech.id} value={tech.name}>
                            {tech.name}
                          </option>
                        ))}
                        {techList.length === 0 && (
                          <option value={user?.name || user?.username || "Nhân viên"}>
                            {user?.name || user?.username || "Nhân viên"}
                          </option>
                        )}
                      </select>
                    </div>

                    {/* Submit */}
                    <div className="col-span-2 flex items-end">
                      <button
                        id="btn-add-repair-submit"
                        type="submit"
                        disabled={saveLoading}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white font-semibold text-xs rounded-lg transition"
                      >
                        {saveLoading ? "Lưu...." : "+ Thêm Vào Hồ Sơ"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Main repair list logs tables */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b pb-1">Chi tiết thực hiện</h5>
                
                {car.repairs.length === 0 ? (
                  <div className="py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    Xe chưa phát sinh các công tác sửa chữa, đồng kỹ dọn bọc phụ tùng nào.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white" id="repairs-table-container">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-3">Hạng mục chi phí</th>
                          <th className="p-3">Phân phân loại</th>
                          <th className="p-3 text-right">Chi phí thực tế</th>
                          <th className="p-3">Ngày hoàn thiện</th>
                          <th className="p-3">Người sửa dọn</th>
                          {canAddRepairs && <th className="p-3 text-center">Xóa</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                        {car.repairs.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-800 font-bold max-w-[170px] truncate" title={item.name}>{item.name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.type === "Đồng sơn" 
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : item.type === "Phụ tùng"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-3 text-right text-slate-900 font-bold font-mono">{formatCurrency(item.cost)}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">{item.date}</td>
                            <td className="p-3 text-slate-500 italic max-w-[120px] truncate" title={item.technician}>{item.technician || "Vô danh"}</td>
                            {canAddRepairs && (
                              <td className="p-3 text-center">
                                <button
                                  id={`btn-delete-repair-item-${item.id}`}
                                  onClick={() => handleDeleteRepairItem(item.id)}
                                  className="p-1 hover:bg-rose-50 text-rose-500 rounded transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === "warranties" && car.status === "Đã bán" && (
            <div className="space-y-6 animate-fadeIn" id="warranties-details-panel">
              {/* Info Header */}
              <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl flex items-start space-x-3 text-indigo-950">
                <ShieldCheck className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <h5 className="font-bold uppercase tracking-wider">Hỗ trợ bảo hành sau bán hàng</h5>
                  <p className="text-slate-600 leading-relaxed">
                    Đây là nơi kiểm soát các khoản chi hoạt động sau dọn dẹp liên quan đến bảo hành cho dòng xe đã bán ra khách hàng. Phí bảo hành này được tính riêng với tổng định phí sửa dọn ban đầu.
                  </p>
                  {car.costs?.warrantyCost && car.costs.warrantyCost > 0 ? (
                    <p className="font-bold text-indigo-700">
                      Tổng chi phí bảo hành phát sinh hiện tại: {formatCurrency(car.costs.warrantyCost)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to Add Warranty Item */}
                {canAddRepairs && (
                  <form onSubmit={handleAddWarranty} className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 h-fit" id="form-add-warranty">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5 flex items-center">
                      <Plus className="h-4 w-4 mr-1 text-indigo-600" />
                      <span>Thêm mục bảo hành</span>
                    </h4>

                    {/* Hạng mục */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên danh mục bảo hành <span className="text-slate-400 font-normal">(Trống mặc định: Thay thế thiết bị hỏng hóc)</span></label>
                      <input
                        type="text"
                        value={warrantyName}
                        onChange={(e) => setWarrantyName(e.target.value)}
                        placeholder="Thay thế thiết bị hỏng hóc"
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    {/* Chi phí */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chi phí bảo hành (VND) <span className="text-slate-400 font-normal">(Trống mặc định: 500.000)</span></label>
                      <input
                        type="text"
                        value={warrantyCost}
                        onChange={(e) => setWarrantyCost(formatPriceInput(e.target.value))}
                        placeholder="500.000"
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    {/* Ngày thực hiện */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ngày bảo hành <span className="text-slate-400 font-normal">(Mặc định: Hôm nay)</span></label>
                      <input
                        type="date"
                        value={warrantyDate}
                        onChange={(e) => setWarrantyDate(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs focus:outline-none font-semibold"
                      />
                    </div>

                    <button
                      id="btn-add-warranty-submit"
                      type="submit"
                      disabled={saveLoading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
                    >
                      {saveLoading ? "Đang xử lý..." : "Lưu nhật ký bảo hành"}
                    </button>
                  </form>
                )}

                {/* Warranty Records Table */}
                <div className={`lg:col-span-${canAddRepairs ? "2" : "3"} space-y-4`}>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                    Nhật ký các lần bảo hành ({(car.warranties || []).length})
                  </h4>

                  {(car.warranties || []).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-8 text-center text-slate-400">
                      <ShieldCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold uppercase">Chưa có phát sinh bảo hành</p>
                      <p className="text-[11px] mt-0.5">Xe vận hành ổn định sau khi bán ra khách hàng.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">Hạng mục chi tiết</th>
                            <th className="p-3 text-right">Chi phí bảo hành (VND)</th>
                            <th className="p-3 text-center">Ngày thực hiện</th>
                            {canAddRepairs && <th className="p-3 text-center">Hành động</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium font-sans">
                          {(car.warranties || []).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="p-3 text-slate-850 font-bold">{item.name}</td>
                              <td className="p-3 text-right text-slate-900 font-bold font-mono">{formatCurrency(item.cost)}</td>
                              <td className="p-3 text-center font-mono text-[11px] text-slate-500">{item.date}</td>
                              {canAddRepairs && (
                                <td className="p-3 text-center">
                                  <button
                                    id={`btn-delete-warranty-item-${item.id}`}
                                    onClick={() => executeDeleteWarrantyItem(item.id)}
                                    disabled={saveLoading}
                                    className="p-1 hover:bg-rose-50 text-rose-500 rounded transition disabled:opacity-50"
                                    title="Xóa mục này"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal overall Footer summary bar */}
        <div className="bg-slate-50 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 text-xs w-full gap-2">
          <div className="flex items-center space-x-2 text-slate-600 text-[11px]">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Ngày đăng: {new Date(car.createdAt || "").toLocaleString("vi-VN")}</span>
          </div>

          <div className="font-bold flex items-center space-x-1">
            <span className="text-slate-500 text-[11px] uppercase shrink-0">Tổng mức đầu tư cho xe dọn dẹp:</span>
            <span className="text-sm text-rose-600 bg-rose-55 font-mono bg-white border border-rose-100 px-2 py-0.5 rounded">
              {formatCurrency(car.costs?.totalCost || 0)}
            </span>
          </div>
        </div>

        {/* Modal Confirmations */}
        {showCarDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4 border border-rose-100">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Xác nhận xóa xe dọn?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Bạn có chắc chắn muốn xóa hoàn toàn xe <strong className="text-slate-800">{car?.licensePlate}</strong> ra khỏi hệ thống? Thao tác này KHÔNG THỂ khôi phục.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-3">
                <button
                  id="btn-cancel-delete"
                  type="button"
                  onClick={() => setShowCarDeleteConfirm(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-delete"
                  type="button"
                  onClick={() => {
                    setShowCarDeleteConfirm(false);
                    handleDeleteCar();
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-550 rounded-xl shadow-md transition cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {repairItemToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-100">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Gỡ bỏ mục sửa chữa?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Bạn có chắc chắn muốn gỡ bỏ hạng mục sửa chữa này ra khỏi bảng tính của xe?
              </p>
              <div className="mt-6 flex items-center justify-center space-x-3">
                <button
                  id="btn-cancel-repair-delete"
                  type="button"
                  onClick={() => setRepairItemToDelete(null)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-repair-delete"
                  type="button"
                  onClick={() => {
                    const id = repairItemToDelete;
                    setRepairItemToDelete(null);
                    executeDeleteRepairItem(id);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-550 rounded-xl shadow-md transition cursor-pointer"
                >
                  Xác nhận gỡ bỏ
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
