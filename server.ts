import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import { db, Car, User, RepairItem, Technician } from "./src/server/db.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON and URL encoded body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Helper: Calculate stock age in days
  const getStockDays = (car: Car): number => {
    const start = new Date(car.intakeDate);
    const end = car.status === "Đã bán" && car.saleDate ? new Date(car.saleDate) : new Date();
    
    // Clear time part for accurate date difference
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper: Sum costs by type for a car
  const getSummaryCosts = (car: Car) => {
    let paintCost = 0;
    let partsCost = 0;
    let laborCost = 0;
    let warrantyCost = 0;

    car.repairs.forEach((item) => {
      if (item.type === "Đồng sơn") {
        paintCost += item.cost;
      } else if (item.type === "Phụ tùng") {
        partsCost += item.cost;
      } else if (item.type === "Nhân công") {
        laborCost += item.cost;
      }
    });

    if (car.warranties) {
      car.warranties.forEach((item) => {
        warrantyCost += item.cost;
      });
    }

    return {
      paintCost,
      partsCost,
      laborCost,
      warrantyCost,
      totalCost: paintCost + partsCost + laborCost,
    };
  };

  // ==================== AUTH API ====================
  
  // Check if system has any admin accounts
  app.get("/api/auth/check-admin", async (req, res) => {
    try {
      const users = await db.getUsers();
      const hasAdmin = users.some(u => u.role === "admin");
      res.json({ hasAdmin });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Lỗi máy chủ" });
    }
  });

  // Setup the first admin account
  app.post("/api/auth/setup-admin", async (req, res) => {
    try {
      const users = await db.getUsers();
      const hasAdmin = users.some(u => u.role === "admin");
      if (hasAdmin) {
        return res.status(400).json({ error: "Hệ thống đã có tài khoản Quản trị viên." });
      }

      const { username, password, name } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin để tạo tài khoản Quản trị." });
      }

      const created = await db.createUser({
        username: username.trim(),
        passwordHash: password,
        role: "admin",
        name: name.trim()
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Lỗi máy chủ" });
    }
  });
  
  // Login Endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Vui lòng điền tên đăng nhập và mật khẩu." });
      }

      const user = await db.getUserByUsername(username);
      if (!user || user.passwordHash !== password) {
        return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác." });
      }

      // Return user info on success (excluding direct plain password in production, but here safe)
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Lỗi máy chủ" });
    }
  });

  // Get active users list (Admin only helper)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await db.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create new user (Admin only)
  app.post("/api/users", async (req, res) => {
    try {
      const { username, password, name, role } = req.body;
      if (!username || !password || !name || !role) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin tài khoản." });
      }

      const existing = await db.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại trên hệ thống." });
      }

      const created = await db.createUser({
        username,
        passwordHash: password, // simple storage as per instructions
        role,
        name
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user permissions / information (Admin only)
  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { role, name } = req.body;
      const updated = await db.updateUser(id, { role, name });
      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng." });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete user (Admin can delete any user except themselves)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.query.currentUserId as string;

      if (id === currentUserId) {
        return res.status(400).json({ error: "Bạn không thể xóa tài khoản của chính mình!" });
      }

      const success = await db.deleteUser(id);
      if (!success) {
        return res.status(404).json({ error: "Không thể xóa hoặc không tìm thấy người dùng." });
      }
      res.json({ success: true, message: "Xóa tài khoản thành công." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== TECHNICIAN MANAGING API (ADMIN CONTROLLED) ====================

  // Get active technicians list
  app.get("/api/technicians", async (req, res) => {
    try {
      const techs = await db.getTechnicians();
      res.json(techs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create new technician (Admin only)
  app.post("/api/technicians", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập họ tên thợ hoặc gara dọn xe." });
      }
      const created = await db.createTechnician(name);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete technician (Admin only)
  app.delete("/api/technicians/:id", async (req, res) => {
    try {
      const deleted = await db.deleteTechnician(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Không tìm thấy kỹ thuật viên yêu cầu." });
      }
      res.json({ success: true, message: "Đã gỡ bỏ kỹ thuật viên này thành công." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== CAR MANAGING API ====================

  // Get all cars with calculation metrics
  app.get("/api/cars", async (req, res) => {
    try {
      const query = req.query.search as string | undefined;
      let cars = await db.getCars();

      if (query) {
        const lowerSearch = query.trim().toLowerCase();
        cars = cars.filter(car => 
          car.licensePlate.toLowerCase().includes(lowerSearch) ||
          car.brand.toLowerCase().includes(lowerSearch) ||
          car.model.toLowerCase().includes(lowerSearch)
        );
      }

      // Append stockDays and computed costs dynamically
      const responseCars = cars.map(car => {
        const stockDays = getStockDays(car);
        const summaries = getSummaryCosts(car);
        return {
          ...car,
          warranties: car.warranties || [],
          stockDays,
          costs: summaries
        };
      });

      res.json(responseCars);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single car details
  app.get("/api/cars/:id", async (req, res) => {
    try {
      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy xe yêu cầu." });
      }
      res.json({
        ...car,
        warranties: car.warranties || [],
        stockDays: getStockDays(car),
        costs: getSummaryCosts(car)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add a new car (Intake)
  app.post("/api/cars", async (req, res) => {
    try {
      const { licensePlate, brand, model, year, color, intakeDate, purchasePrice, salePrice } = req.body;
      
      if (!licensePlate || !brand || !model || !year || !color || !intakeDate) {
        return res.status(400).json({ error: "Hệ thống yêu cầu nhập đầy đủ thông tin mốc xe về." });
      }

      const cars = await db.getCars();
      const duplicate = cars.find(c => c.licensePlate.trim().toUpperCase() === licensePlate.trim().toUpperCase());
      if (duplicate) {
        return res.status(400).json({ error: `Biển số xe ${licensePlate} đã tồn tại trong kho.` });
      }

      const initialCarData = {
        licensePlate: licensePlate.toUpperCase().trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year),
        color: color.trim(),
        intakeDate: intakeDate,
        purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : 0,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        inspection: {
          engine: "Chưa kiểm định",
          gearbox: "Chưa kiểm định",
          chassis: "Chưa kiểm định",
          electronics: "Chưa kiểm định",
          paint: "Chưa kiểm định",
          notes: ""
        }
      };

      const created = await db.createCar(initialCarData);
      res.status(201).json({
        ...created,
        stockDays: getStockDays(created),
        costs: getSummaryCosts(created)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update general car & stock status
  app.put("/api/cars/:id", async (req, res) => {
    try {
      const { brand, model, year, color, intakeDate, purchasePrice, salePrice, saleDate, status, inspection } = req.body;
      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy xe yêu cầu để chỉnh sửa." });
      }

      const updates: Partial<Car> = {};
      if (brand !== undefined) updates.brand = brand.trim();
      if (model !== undefined) updates.model = model.trim();
      if (year !== undefined) updates.year = parseInt(year);
      if (color !== undefined) updates.color = color.trim();
      if (intakeDate !== undefined) updates.intakeDate = intakeDate;
      if (purchasePrice !== undefined) updates.purchasePrice = parseFloat(purchasePrice);
      if (salePrice !== undefined) updates.salePrice = salePrice ? parseFloat(salePrice) : undefined;
      if (status !== undefined) {
        updates.status = status;
        if (status === "Đã bán") {
          updates.saleDate = saleDate || new Date().toISOString().split("T")[0];
        } else {
          updates.saleDate = undefined; // clear sale date if unsold
        }
      }
      if (inspection !== undefined) {
        updates.inspection = {
          engine: inspection.engine || car.inspection.engine,
          gearbox: inspection.gearbox || car.inspection.gearbox,
          chassis: inspection.chassis || car.inspection.chassis,
          electronics: inspection.electronics || car.inspection.electronics,
          paint: inspection.paint || car.inspection.paint,
          notes: inspection.notes !== undefined ? inspection.notes : car.inspection.notes
        };
      }

      const updated = await db.updateCar(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy hồ sơ xe này dọn dẹp chỉnh sửa." });
      }
      res.json({
        ...updated,
        stockDays: getStockDays(updated),
        costs: getSummaryCosts(updated)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a vehicle (Admin only)
  app.delete("/api/cars/:id", async (req, res) => {
    try {
      const deleted = await db.deleteCar(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Không tìm thấy xe yêu cầu gỡ bỏ." });
      }
      res.json({ success: true, message: "Đã gỡ bỏ thông tin xe thành công." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== REPAIRS API ====================

  // Add repair / parts log line item
  app.post("/api/cars/:id/repairs", async (req, res) => {
    try {
      const { type, name, cost, date, technician } = req.body;
      if (!type || !name || cost === undefined || !date) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin mục sửa chữa." });
      }

      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy thông tin xe." });
      }

      const newRepair: RepairItem = {
        id: "rep-" + Math.random().toString(36).substr(2, 9),
        type,
        name: name.trim(),
        cost: parseFloat(cost),
        date,
        technician: (technician || "").trim()
      };

      const updatedRepairs = [...car.repairs, newRepair];
      
      // Auto upgrade status to "Đang sửa" if previously just in stock
      let status = car.status;
      if (status === "Kho") {
        status = "Đang sửa";
      }

      const updated = await db.updateCar(req.params.id, { 
        repairs: updatedRepairs,
        status 
      });

      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy hồ sơ xe này dọn dẹp để thêm sửa chữa." });
      }

      res.status(201).json({
        ...updated,
        stockDays: getStockDays(updated),
        costs: getSummaryCosts(updated)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete repair check line item
  app.delete("/api/cars/:id/repairs/:repairId", async (req, res) => {
    try {
      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy xe cần cập nhật." });
      }

      const filteredRepairs = car.repairs.filter(r => r.id !== req.params.repairId);
      const updated = await db.updateCar(req.params.id, { repairs: filteredRepairs });
      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy hồ sơ xe này dọn dẹp để gỡ sửa chữa." });
      }
      res.json({
        ...updated,
        warranties: updated.warranties || [],
        stockDays: getStockDays(updated),
        costs: getSummaryCosts(updated)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== WARRANTIES API ====================

  // Add warranty cost item
  app.post("/api/cars/:id/warranties", async (req, res) => {
    try {
      const { name, cost, date } = req.body;
      if (!name || cost === undefined || !date) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin mục bảo hành." });
      }

      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy thông tin xe." });
      }

      const newWarranty = {
        id: "war-" + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        cost: parseFloat(cost),
        date
      };

      const warranties = car.warranties || [];
      const updatedWarranties = [...warranties, newWarranty];

      const updated = await db.updateCar(req.params.id, { 
        warranties: updatedWarranties
      });

      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy hồ sơ xe này để thêm bảo hành." });
      }

      res.status(201).json({
        ...updated,
        warranties: updated.warranties || [],
        stockDays: getStockDays(updated),
        costs: getSummaryCosts(updated)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete warranty cost item
  app.delete("/api/cars/:id/warranties/:warrantyId", async (req, res) => {
    try {
      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy xe cần cập nhật." });
      }

      const warranties = car.warranties || [];
      const filteredWarranties = warranties.filter(w => w.id !== req.params.warrantyId);
      const updated = await db.updateCar(req.params.id, { warranties: filteredWarranties });
      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy hồ sơ xe này để gỡ bảo hành." });
      }

      res.json({
        ...updated,
        warranties: updated.warranties || [],
        stockDays: getStockDays(updated),
        costs: getSummaryCosts(updated)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // ==================== EXCEL EXPORT WORKBOOK GENERATORS ====================

  // Helper format currency to Vietnamese VND
  const formatVND = (num: number) => {
    return num.toLocaleString("vi-VN") + " VNĐ";
  };

  // Export 1: Export detailed information and repairs of a single car
  app.get("/api/export/car/:id", async (req, res) => {
    try {
      const car = await db.getCarById(req.params.id);
      if (!car) {
        return res.status(404).json({ error: "Không tìm thấy xe." });
      }

      const stockDays = getStockDays(car);
      const summaries = getSummaryCosts(car);

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Chi tiết dọn xe");

      // Styles
      const themeBlue = "1E3A8A";
      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "CBD5E1" } },
        left: { style: "thin", color: { argb: "CBD5E1" } },
        bottom: { style: "thin", color: { argb: "CBD5E1" } },
        right: { style: "thin", color: { argb: "CBD5E1" } }
      };

      // 1. Title Block
      ws.mergeCells("A1:F1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "BÁO CÁO CHI TIẾT SỬA CHỮA & HOÀN THIỆN XE";
      titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeBlue } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 40;

      // 2. Metadata Block
      ws.getCell("A3").value = "Biển số xe:";
      ws.getCell("B3").value = car.licensePlate;
      ws.getCell("D3").value = "Ngày nhập kho:";
      ws.getCell("E3").value = car.intakeDate;

      ws.getCell("A4").value = "Hiệu - Dòng xe:";
      ws.getCell("B4").value = `${car.brand} ${car.model}`;
      ws.getCell("D4").value = "Số ngày tồn kho:";
      ws.getCell("E4").value = `${stockDays} ngày`;

      ws.getCell("A5").value = "Năm sản xuất:";
      ws.getCell("B5").value = car.year;
      ws.getCell("D5").value = "Màu sắc ngoại thất:";
      ws.getCell("E5").value = car.color;

      ws.getCell("A6").value = "Tình trạng hiện tại:";
      ws.getCell("B6").value = car.status;

      // Style metadata labels as bold
      ["A3", "D3", "A4", "D4", "A5", "D5", "A6"].forEach(pos => {
        const cell = ws.getCell(pos);
        cell.font = { name: "Segoe UI", bold: true, color: { argb: "4B5563" } };
        cell.alignment = { horizontal: "left" };
      });

      ["B3", "E3", "B4", "E4", "B5", "E5", "B6"].forEach(pos => {
        const cell = ws.getCell(pos);
        cell.font = { name: "Segoe UI", bold: true, color: { argb: "1F2937" } };
      });

      // 3. Technical Inspection Block
      ws.mergeCells("A8:F8");
      const inspectHead = ws.getCell("A8");
      inspectHead.value = "KẾT QUẢ KIỂM ĐỊNH SƠ BỘ TÌNH TRẠNG KHI VỀ (INSPECTION)";
      inspectHead.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "1E3A8A" } };
      inspectHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EFF6FF" } };
      inspectHead.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(8).height = 25;

      const techFields = [
        { label: "Động cơ / Máy móc:", val: car.inspection.engine },
        { label: "Hộp số / Truyền tải:", val: car.inspection.gearbox },
        { label: "Khung gầm / Hệ thống treo:", val: car.inspection.chassis },
        { label: "Hệ thống điện / Thiết bị điều khiển:", val: car.inspection.electronics },
        { label: "Đồng sơn / Ngoại thất:", val: car.inspection.paint },
        { label: "Ghi chú kỹ thuật viên:", val: car.inspection.notes || "Không có" },
      ];

      techFields.forEach((f, idx) => {
        const rowInd = 9 + idx;
        ws.getCell(`A${rowInd}`).value = f.label;
        ws.getCell(`A${rowInd}`).font = { name: "Segoe UI", bold: true, color: { argb: "4B5563" } };
        ws.mergeCells(`B${rowInd}:F${rowInd}`);
        ws.getCell(`B${rowInd}`).value = f.val;
        ws.getCell(`B${rowInd}`).font = { name: "Segoe UI" };
      });

      // 4. Repairs details and parts
      const startRepairRow = 16;
      ws.mergeCells(`A${startRepairRow}:F${startRepairRow}`);
      const repairHead = ws.getCell(`A${startRepairRow}`);
      repairHead.value = "CHI TIẾT PHÍ SỬA CHỮA, PHỤ TÙNG HOÀN THIỆN VÀ DỌN DẸP";
      repairHead.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "1E3A8A" } };
      repairHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EFF6FF" } };
      repairHead.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(startRepairRow).height = 25;

      const headerRowIndex = 17;
      const headers = ["STT", "Hạng mục sửa dọn thực hiện", "Phân loại dọn", "Chi phí thực tế (VNĐ)", "Ngày làm hoàn thành", "Thợ / Đơn vị thực hiện"];
      headers.forEach((h, colIdx) => {
        const cell = ws.getCell(headerRowIndex, colIdx + 1);
        cell.value = h;
        cell.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } }; // Royal Blue
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      });
      ws.getRow(headerRowIndex).height = 25;

      let currentRepRow = 18;
      car.repairs.forEach((rep, index) => {
        ws.getCell(`A${currentRepRow}`).value = index + 1;
        ws.getCell(`B${currentRepRow}`).value = rep.name;
        ws.getCell(`C${currentRepRow}`).value = rep.type;
        ws.getCell(`D${currentRepRow}`).value = rep.cost;
        ws.getCell(`D${currentRepRow}`).numFmt = "#,##0";
        ws.getCell(`E${currentRepRow}`).value = rep.date;
        ws.getCell(`F${currentRepRow}`).value = rep.technician;

        // Alignment and font
        ws.getCell(`A${currentRepRow}`).alignment = { horizontal: "center" };
        ws.getCell(`C${currentRepRow}`).alignment = { horizontal: "center" };
        ws.getCell(`D${currentRepRow}`).alignment = { horizontal: "right" };
        ws.getCell(`E${currentRepRow}`).alignment = { horizontal: "center" };

        for (let C = 1; C <= 6; ++C) {
          const cell = ws.getCell(currentRepRow, C);
          cell.font = { name: "Segoe UI" };
          cell.border = borderStyle;
          if (index % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
          }
        }
        currentRepRow++;
      });

      // 5. Total Summaries Block
      currentRepRow++;
      ws.mergeCells(`A${currentRepRow}:F${currentRepRow}`);
      const sumHead = ws.getCell(`A${currentRepRow}`);
      sumHead.value = "TỔNG HỢP CHI PHÍ & ĐẦU TƯ";
      sumHead.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "1E3A8A" } };
      sumHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EFF6FF" } };
      sumHead.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(currentRepRow).height = 25;

      const summaryItems = [
        { label: "1. Tổng chi phí ĐỒNG SƠN dọn dẹp:", val: summaries.paintCost },
        { label: "2. Tổng chi phí PHỤ TÙNG dọn dẹp:", val: summaries.partsCost },
        { label: "3. Tổng chi phí NHÂN CÔNG dọn dẹp:", val: summaries.laborCost },
        { label: "4. TỔNG CỘNG CHI PHÍ HOÀN THIỆN ĐẦU TƯ XE:", val: summaries.totalCost, highlighted: true }
      ];

      if (car.status === "Đã bán" && car.salePrice) {
        summaryItems.push({ label: "5. GIÁ BÁN THỰC TẾ RA KHÁCH:", val: car.salePrice, highlighted: false });
      }

      summaryItems.forEach((item) => {
        currentRepRow++;
        ws.mergeCells(`A${currentRepRow}:C${currentRepRow}`);
        const labelCell = ws.getCell(`A${currentRepRow}`);
        labelCell.value = item.label;
        labelCell.font = { name: "Segoe UI", bold: item.highlighted };
        labelCell.alignment = { horizontal: "left" };

        ws.mergeCells(`D${currentRepRow}:F${currentRepRow}`);
        const valCell = ws.getCell(`D${currentRepRow}`);
        valCell.value = item.val;
        valCell.numFmt = "#,##0";
        valCell.font = { name: "Segoe UI", bold: true, color: { argb: item.highlighted ? "15803D" : "374151" } };
        valCell.alignment = { horizontal: "left" };
      });

      // Auto size column helper dynamic width calc
      ws.columns.forEach(column => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: false }, cell => {
          if (cell.value && !cell.isMerged) {
            let valStr = cell.value.toString();
            if (typeof cell.value === "number") {
              valStr = cell.value.toLocaleString("vi-VN");
            }
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        });
        column.width = Math.min(maxLen + 4, 50);
      });

      ws.getColumn(1).width = 30;  // STT & Labels column scaled properly for text
      ws.getColumn(2).width = 40;  // Name
      ws.getColumn(3).width = 18;  // Type
      ws.getColumn(4).width = 24;  // Cost
      ws.getColumn(5).width = 20;  // Date
      ws.getColumn(6).width = 26;  // Technician

      const buf = await workbook.xlsx.writeBuffer();
      const safeFilename = car.licensePlate.replace(/[^a-zA-Z0-9-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename=BaoCao-Xe-${safeFilename}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export 2: Export general summary and reports by day, month or overall with color & auto scale
  app.get("/api/export/summary", async (req, res) => {
    try {
      const type = typeof req.query.type === "string" ? req.query.type : "all";
      const value = typeof req.query.value === "string" ? req.query.value : "";
      let cars = await db.getCars();
      
      let titleHeader = "BÁO CÁO TỔNG QUAN KHO XE VÀ CHI PHÍ HOÀN THIỆN ĐẦU TƯ";
      if (type === "day" && value) {
        titleHeader = `BÁO CÁO HOẠT ĐỘNG KHO XE NGÀY ${value}`;
        cars = cars.filter(car => car.intakeDate === value || car.repairs.some(r => r.date === value));
      } else if (type === "month" && value) {
        titleHeader = `BÁO CÁO KHO XE VÀ KINH DOANH THÁNG ${value}`;
        cars = cars.filter(car => car.intakeDate.startsWith(value) || car.repairs.some(r => r.date.startsWith(value)) || (car.saleDate && car.saleDate.startsWith(value)));
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Tổng hợp kho xe");

      // Set Title Row
      ws.mergeCells("A1:K1");
      const titleCell = ws.getCell("A1");
      titleCell.value = titleHeader;
      titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A8A" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 40;

      // Table headers Row (removed purchase Price and profit columns)
      const tableHeaders = [
        "STT", 
        "Biển số xe", 
        "Hiệu - Dòng xe", 
        "Ngày nhập kho", 
        "Tình trạng", 
        "Số ngày tồn kho", 
        "Chi phí Đồng Sơn (VNĐ)", 
        "Chi phí Phụ Tùng (VNĐ)", 
        "Chi phí Nhân Công (VNĐ)", 
        "Tổng chi hoàn thiện dọn dẹp (VNĐ)",
        "Giá bán ra (VNĐ)"
      ];

      const headerRowIndex = 3;
      tableHeaders.forEach((h, colIdx) => {
        const cell = ws.getCell(headerRowIndex, colIdx + 1);
        cell.value = h;
        cell.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } }; // Royal Blue
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "CBD5E1" } },
          left: { style: "thin", color: { argb: "CBD5E1" } },
          bottom: { style: "medium", color: { argb: "1E3A8A" } },
          right: { style: "thin", color: { argb: "CBD5E1" } }
        };
      });
      ws.getRow(headerRowIndex).height = 30;

      let grandPaintCost = 0;
      let grandPartsCost = 0;
      let grandLaborCost = 0;
      let grandTotalRepairCost = 0;
      let grandTotalPrice = 0;

      let currentRow = 4;
      cars.forEach((car, index) => {
        const stockDays = getStockDays(car);
        const summaries = getSummaryCosts(car);
        
        const finalPrice = car.salePrice || 0;

        grandPaintCost += summaries.paintCost;
        grandPartsCost += summaries.partsCost;
        grandLaborCost += summaries.laborCost;
        grandTotalRepairCost += summaries.totalCost;
        grandTotalPrice += finalPrice;

        ws.getCell(`A${currentRow}`).value = index + 1;
        ws.getCell(`B${currentRow}`).value = car.licensePlate;
        ws.getCell(`C${currentRow}`).value = `${car.brand} ${car.model}`;
        ws.getCell(`D${currentRow}`).value = car.intakeDate;
        ws.getCell(`E${currentRow}`).value = car.status;
        ws.getCell(`F${currentRow}`).value = `${stockDays} ngày`;
        ws.getCell(`G${currentRow}`).value = summaries.paintCost;
        ws.getCell(`H${currentRow}`).value = summaries.partsCost;
        ws.getCell(`I${currentRow}`).value = summaries.laborCost;
        ws.getCell(`J${currentRow}`).value = summaries.totalCost;
        ws.getCell(`K${currentRow}`).value = finalPrice || "Chưa bán";

        // Number formatting
        ["G", "H", "I", "J"].forEach(col => {
          ws.getCell(`${col}${currentRow}`).numFmt = "#,##0";
        });
        if (finalPrice) {
          ws.getCell(`K${currentRow}`).numFmt = "#,##0";
        }

        // Alignments
        ws.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
        ws.getCell(`B${currentRow}`).alignment = { horizontal: "center" };
        ws.getCell(`D${currentRow}`).alignment = { horizontal: "center" };
        ws.getCell(`E${currentRow}`).alignment = { horizontal: "center" };
        ws.getCell(`F${currentRow}`).alignment = { horizontal: "center" };
        ["G", "H", "I", "J", "K"].forEach(col => {
          ws.getCell(`${col}${currentRow}`).alignment = { horizontal: "right" };
        });

        // Styling row cells
        for (let C = 1; C <= 11; ++C) {
          const cell = ws.getCell(currentRow, C);
          cell.font = { name: "Segoe UI" };
          cell.border = {
            top: { style: "thin", color: { argb: "F1F5F9" } },
            left: { style: "thin", color: { argb: "E2E8F0" } },
            bottom: { style: "thin", color: { argb: "F1F5F9" } },
            right: { style: "thin", color: { argb: "E2E8F0" } }
          };
          if (index % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
          }
        }

        currentRow++;
      });

      // Divider row
      currentRow++;

      // Grand Total Row
      ws.mergeCells(`A${currentRow}:E${currentRow}`);
      const grandTotalLabel = ws.getCell(`A${currentRow}`);
      grandTotalLabel.value = `TỔNG CỘNG HỆ THỐNG KPI (${cars.length} đầu xe)`;
      grandTotalLabel.font = { name: "Segoe UI", bold: true, color: { argb: "0F172A" } };
      grandTotalLabel.alignment = { horizontal: "left", vertical: "middle" };

      ws.getCell(`F${currentRow}`).value = "";
      ws.getCell(`G${currentRow}`).value = grandPaintCost;
      ws.getCell(`H${currentRow}`).value = grandPartsCost;
      ws.getCell(`I${currentRow}`).value = grandLaborCost;
      ws.getCell(`J${currentRow}`).value = grandTotalRepairCost;
      ws.getCell(`K${currentRow}`).value = grandTotalPrice;

      // Format grand totals
      ["G", "H", "I", "J", "K"].forEach(col => {
        const cell = ws.getCell(`${col}${currentRow}`);
        cell.numFmt = "#,##0";
        cell.font = { name: "Segoe UI", bold: true, color: { argb: "1E3A8A" } };
        cell.alignment = { horizontal: "right" };
      });

      // Border and fill for total row
      for (let C = 1; C <= 11; ++C) {
        const cell = ws.getCell(currentRow, C);
        cell.border = {
          top: { style: "medium", color: { argb: "1E3A8A" } },
          bottom: { style: "double", color: { argb: "1E3A8A" } }
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };
      }

      // Dynamic width scaling
      ws.columns.forEach(column => {
        let maxLen = 12;
        column.eachCell({ includeEmpty: false }, cell => {
          if (cell.value && !cell.isMerged && Number(cell.row) > 2) {
            let valStr = cell.value.toString();
            if (typeof cell.value === "number") {
              valStr = cell.value.toLocaleString("vi-VN");
            }
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        });
        column.width = Math.min(maxLen + 4, 40);
      });

      // Specific manual overrides
      ws.getColumn(1).width = 7;   // STT
      ws.getColumn(2).width = 16;  // Biển số
      ws.getColumn(3).width = 24;  // Hiệu - Dòng
      ws.getColumn(4).width = 16;  // Ngày nhập
      ws.getColumn(5).width = 16;  // Tình trạng
      ws.getColumn(6).width = 16;  // Tồn kho

      const buf = await workbook.xlsx.writeBuffer();
      
      let filename = "BaoCao_TongHop.xlsx";
      if (type === "day") filename = `BaoCao_Ngay_${value}.xlsx`;
      if (type === "month") filename = `BaoCao_Thang_${value}.xlsx`;

      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== MAIN RENDERING & ROUTING ====================

  // Serve static UI bundle on production or development setup fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In bundled CommonJS, __dirname represents the "dist" directory where server.cjs resides
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start the server bound to 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [Full-Stack Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start Full-Stack Server:", err);
});
