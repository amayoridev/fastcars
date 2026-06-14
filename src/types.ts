export interface RepairItem {
  id: string;
  type: "Phụ tùng" | "Đồng sơn" | "Nhân công";
  name: string;
  cost: number;
  date: string;
  technician: string;
}

export interface WarrantyItem {
  id: string;
  name: string;
  cost: number;
  date: string;
}

export interface Inspection {
  engine: string;
  gearbox: string;
  chassis: string;
  electronics: string;
  paint: string;
  notes: string;
}

export interface Car {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  intakeDate: string;
  purchasePrice: number;
  salePrice?: number;
  saleDate?: string;
  status: "Kho" | "Đang sửa" | "Đã sửa" | "Đã bán";
  inspection: Inspection;
  repairs: RepairItem[];
  warranties?: WarrantyItem[];
  createdAt: string;
  
  // Computed on backend
  stockDays: number;
  costs: {
    paintCost: number;
    partsCost: number;
    laborCost: number;
    totalCost: number;
    warrantyCost?: number;
  };
}

export interface User {
  id: string;
  username: string;
  role: "admin" | "tech" | "acc" | "sales";
  name: string;
}
