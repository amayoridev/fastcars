import React, { useState } from "react";
import { X, CarFront, FileText, Calendar, DollarSign, PenTool } from "lucide-react";
import { Car } from "../types";

interface AddCarModalProps {
  onClose: () => void;
  onSuccess: (newCar: Car) => void;
}

export default function AddCarModal({ onClose, onSuccess }: AddCarModalProps) {
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [color, setColor] = useState("");
  const [intakeDate, setIntakeDate] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPriceInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Fallbacks from placeholders as per user request
    const finalLicensePlate = (licensePlate.trim() || "30A-12345").trim().toUpperCase();
    const finalBrand = brand.trim() || "Toyota";
    const finalModel = model.trim() || "Vios 1.5G";
    const finalColor = color.trim() || "Trắng";
    
    const parsedYear = year ? parseInt(year) : 2020;
    const finalYear = isNaN(parsedYear) ? 2020 : parsedYear;
    
    const finalIntakeDate = intakeDate || new Date().toISOString().split("T")[0];

    setLoading(true);

    try {
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licensePlate: finalLicensePlate,
          brand: finalBrand,
          model: finalModel,
          year: finalYear,
          color: finalColor,
          intakeDate: finalIntakeDate,
          salePrice: salePrice ? parseFloat(salePrice.replace(/\./g, "")) : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi khi tạo mới hồ sơ xe.");
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" id="add-car-modal-backdrop">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden" id="add-car-modal-content">
        {/* Header */}
        <div className="bg-slate-950 p-4 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <CarFront className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold tracking-tight text-md">NHẬP THÔNG TIN XE VỀ KHO</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition" id="btn-close-modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" id="add-car-form">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-xs font-medium" id="add-car-error">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Biển số xe */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Biển số xe <span className="text-slate-400 font-normal">(Trống mặc định: 30A-12345)</span>
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder="30A-12345"
              />
            </div>

            {/* Màu vỏ xe */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Màu sắc sơn xe <span className="text-slate-400 font-normal">(Trống mặc định: Trắng)</span>
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder="Trắng"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Thương hiệu <span className="text-slate-400 font-normal">(Trống mặc định: Toyota)</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder="Toyota"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Dòng xe chi tiết <span className="text-slate-400 font-normal">(Trống mặc định: Vios 1.5G)</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder="Vios 1.5G"
              />
            </div>

            {/* Year */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Năm sản xuất <span className="text-slate-400 font-normal">(Trống mặc định: 2020)</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1980"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder="2020"
              />
            </div>

            {/* Intake date */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Ngày nhập kho <span className="text-slate-400 font-normal">(Hôm nay)</span>
              </label>
              <input
                type="date"
                value={intakeDate}
                onChange={(e) => setIntakeDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder={todayStr}
              />
            </div>

            {/* Sale price */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Giá chào bán dự tính (VNĐ)
              </label>
              <input
                type="text"
                value={salePrice}
                onChange={(e) => setSalePrice(formatPriceInput(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                placeholder="Không bắt buộc"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              id="btn-add-car-cancel"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition font-semibold"
            >
              Hủy bỏ
            </button>
            <button
              id="btn-add-car-submit"
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition disabled:opacity-50 uppercase tracking-wide"
            >
              {loading ? "Đang xử lý..." : "Nhập xe kho"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
