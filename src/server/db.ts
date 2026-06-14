import { MongoClient, ObjectId, Collection } from "mongodb";
import fs from "fs";
import path from "path";
import os from "os";

// Define TypeScript interfaces for our application models
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

export interface Technician {
  id: string;
  name: string;
}

export interface Car {
  id: string;         // mapped from _id for mongo or as-is for json
  licensePlate: string; // Biển số xe
  brand: string;        // Hiệu xe
  model: string;        // Dòng xe
  year: number;         // Năm sản xuất
  color: string;        // Màu sắc
  intakeDate: string;   // Ngày nhập kho (YYYY-MM-DD)
  purchasePrice: number; // Giá mua
  salePrice?: number;    // Giá bán
  saleDate?: string;    // Ngày bán (YYYY-MM-DD)
  status: "Kho" | "Đang sửa" | "Đã sửa" | "Đã bán"; // Tình trạng
  inspection: {
    engine: string;      // Động cơ
    gearbox: string;     // Hộp số
    chassis: string;     // Khung gầm
    electronics: string; // Hệ thống điện
    paint: string;       // Đồng sơn ngoại thất
    notes: string;       // Ghi chú chung
  };
  repairs: RepairItem[];
  warranties?: WarrantyItem[];
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Plain-text or simple hashed for local, we will support easy verification
  role: "admin" | "tech" | "acc" | "sales";
  name: string;
}

// Resolve safe writable data directory inside application workspace
const LOCAL_DATA_DIR = path.join(process.cwd(), "data");

const CARS_FILE = path.join(LOCAL_DATA_DIR, "cars.json");
const USERS_FILE = path.join(LOCAL_DATA_DIR, "users.json");
const TECHNICIANS_FILE = path.join(LOCAL_DATA_DIR, "technicians.json");

// Default seeded technicians / performers list
const SEEDED_TECHNICIANS: Technician[] = [];

// Default seeded users
const SEEDED_USERS: User[] = [];

// Default seeded cars to populate the dashboard on first load
const SEEDED_CARS: Car[] = [];

class DBManager {
  private client: MongoClient | null = null;
  private isMongo = false;

  constructor() {
    this.init();
  }

  private async init() {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ":****@")}`);
        this.client = new MongoClient(mongoUri);
        await this.client.connect();
        this.isMongo = true;
        console.log("✅ Successfully connected to MongoDB!");
        
        // Seed database if empty
        await this.seedMongoIfNeeded();
      } catch (err) {
        console.error("❌ MongoDB connection error. Falling back to Local JSON Files!", err);
        this.isMongo = false;
        this.client = null;
        this.initLocalJSON();
      }
    } else {
      console.log("ℹ️ No MONGODB_URI found. Using Local JSON Files for offline storage.");
      this.isMongo = false;
      this.initLocalJSON();
    }
  }

  private initLocalJSON() {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(SEEDED_USERS, null, 2), "utf-8");
    }
    if (!fs.existsSync(CARS_FILE)) {
      fs.writeFileSync(CARS_FILE, JSON.stringify(SEEDED_CARS, null, 2), "utf-8");
    }
    if (!fs.existsSync(TECHNICIANS_FILE)) {
      fs.writeFileSync(TECHNICIANS_FILE, JSON.stringify(SEEDED_TECHNICIANS, null, 2), "utf-8");
    }
    console.log("✅ Local JSON storage initialized.");
  }

  private async seedMongoIfNeeded() {
    if (!this.client) return;
    const db = this.client.db();
    
    // Check users
    const usersCount = await db.collection("users").countDocuments();
    if (usersCount === 0 && SEEDED_USERS.length > 0) {
      await db.collection("users").insertMany(SEEDED_USERS.map(u => ({ ...u, _id: u.id } as any)));
      console.log("🌱 Seeded users collection in MongoDB.");
    }

    // Check cars
    const carsCount = await db.collection("cars").countDocuments();
    if (carsCount === 0) {
      const mongoSeeded = SEEDED_CARS.map(c => {
        const { id, ...rest } = c;
        return { ...rest, _id: id };
      });
      await db.collection("cars").insertMany(mongoSeeded as any);
      console.log("🌱 Seeded cars collection in MongoDB.");
    }

    // Check technicians
    const techsCount = await db.collection("technicians").countDocuments();
    if (techsCount === 0) {
      await db.collection("technicians").insertMany(SEEDED_TECHNICIANS.map(t => ({ name: t.name, _id: t.id } as any)));
      console.log("🌱 Seeded technicians collection in MongoDB.");
    }
  }

  // --- Helper to read files in local JSON mode ---
  private readLocalFile(filePath: string): any[] {
    try {
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private writeLocalFile(filePath: string, data: any[]) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing file:", filePath, err);
    }
  }

  // --- User Queries ---
  async getUsers(): Promise<User[]> {
    if (this.isMongo && this.client) {
      const db = this.client.db();
      const users = await db.collection("users").find().toArray();
      return users.map((u: any) => ({
        id: u._id.toString(),
        username: u.username,
        passwordHash: u.passwordHash,
        role: u.role,
        name: u.name
      }));
    } else {
      return this.readLocalFile(USERS_FILE);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const newUser: User = {
      ...user,
      id: "u-" + Math.random().toString(36).substr(2, 9)
    };

    if (this.isMongo && this.client) {
      const db = this.client.db();
      await db.collection("users").insertOne({
        _id: newUser.id as any,
        username: newUser.username,
        passwordHash: newUser.passwordHash,
        role: newUser.role,
        name: newUser.name
      });
    } else {
      const users = this.readLocalFile(USERS_FILE);
      users.push(newUser);
      this.writeLocalFile(USERS_FILE, users);
    }
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    
    // Remove undefined or null fields to prevent overwriting existing data
    Object.keys(cleanUpdates).forEach(key => {
      if (cleanUpdates[key] === undefined || cleanUpdates[key] === null) {
        delete cleanUpdates[key];
      }
    });

    if (this.isMongo && this.client) {
      const db = this.client.db();
      await db.collection("users").updateOne({ _id: id as any }, { $set: cleanUpdates });
      const updatedUser = await db.collection("users").findOne({ _id: id as any });
      if (!updatedUser) return null;
      return {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        passwordHash: updatedUser.passwordHash,
        role: updatedUser.role,
        name: updatedUser.name
      };
    } else {
      const users = this.readLocalFile(USERS_FILE);
      const index = users.findIndex(u => u.id === id);
      if (index === -1) return null;
      users[index] = { ...users[index], ...cleanUpdates };
      this.writeLocalFile(USERS_FILE, users);
      return users[index];
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.isMongo && this.client) {
      const db = this.client.db();
      const result = await db.collection("users").deleteOne({ _id: id as any });
      return result.deletedCount > 0;
    } else {
      const users = this.readLocalFile(USERS_FILE);
      const filtered = users.filter(u => u.id !== id);
      if (filtered.length === users.length) return false;
      this.writeLocalFile(USERS_FILE, filtered);
      return true;
    }
  }

  // --- Car Queries ---
  async getCars(): Promise<Car[]> {
    if (this.isMongo && this.client) {
      try {
        const db = this.client.db();
        const cars = await db.collection("cars").find().toArray();
        return cars.map((c: any) => ({
          ...c,
          id: c._id.toString()
        })) as Car[];
      } catch (err) {
        console.error("Failed to query cars from MongoDB, falling back to local file runtime", err);
        return this.readLocalFile(CARS_FILE);
      }
    } else {
      return this.readLocalFile(CARS_FILE);
    }
  }

  async getCarById(id: string): Promise<Car | null> {
    const cars = await this.getCars();
    return cars.find(c => c.id === id) || null;
  }

  async createCar(carData: Omit<Car, "id" | "createdAt" | "repairs" | "status">): Promise<Car> {
    const newCar: Car = {
      ...carData,
      id: "car-" + Math.random().toString(36).substr(2, 9),
      status: "Kho",
      repairs: [],
      warranties: [],
      createdAt: new Date().toISOString()
    };

    if (this.isMongo && this.client) {
      const db = this.client.db();
      const mongoDoc = { ...newCar, _id: newCar.id as any };
      delete (mongoDoc as any).id;
      await db.collection("cars").insertOne(mongoDoc);
    } else {
      const cars = this.readLocalFile(CARS_FILE);
      cars.push(newCar);
      this.writeLocalFile(CARS_FILE, cars);
    }
    return newCar;
  }

  async updateCar(id: string, updates: Partial<Car>): Promise<Car | null> {
    // Avoid overwriting id or createdAt
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    delete cleanUpdates.createdAt;

    if (this.isMongo && this.client) {
      const db = this.client.db();
      await db.collection("cars").updateOne({ _id: id as any }, { $set: cleanUpdates });
      return this.getCarById(id);
    } else {
      const cars = this.readLocalFile(CARS_FILE);
      const index = cars.findIndex(c => c.id === id);
      if (index === -1) return null;
      cars[index] = { ...cars[index], ...cleanUpdates };
      this.writeLocalFile(CARS_FILE, cars);
      return cars[index];
    }
  }

  async deleteCar(id: string): Promise<boolean> {
    if (this.isMongo && this.client) {
      const db = this.client.db();
      const result = await db.collection("cars").deleteOne({ _id: id as any });
      return result.deletedCount > 0;
    } else {
      const cars = this.readLocalFile(CARS_FILE);
      const filtered = cars.filter(c => c.id !== id);
      if (filtered.length === cars.length) return false;
      this.writeLocalFile(CARS_FILE, filtered);
      return true;
    }
  }

  // --- Technician Queries ---
  async getTechnicians(): Promise<Technician[]> {
    if (this.isMongo && this.client) {
      try {
        const db = this.client.db();
        const techs = await db.collection("technicians").find().toArray();
        return techs.map((t: any) => ({
          id: t._id.toString(),
          name: t.name
        }));
      } catch (err) {
        console.error("Failed to query technicians from MongoDB, falling back to local file runtime", err);
        return this.readLocalFile(TECHNICIANS_FILE);
      }
    } else {
      return this.readLocalFile(TECHNICIANS_FILE);
    }
  }

  async createTechnician(name: string): Promise<Technician> {
    const newTech: Technician = {
      id: "t-" + Math.random().toString(36).substr(2, 9),
      name: name.trim()
    };
    if (this.isMongo && this.client) {
      const db = this.client.db();
      await db.collection("technicians").insertOne({
        _id: newTech.id as any,
        name: newTech.name
      });
    } else {
      const techs = this.readLocalFile(TECHNICIANS_FILE);
      techs.push(newTech);
      this.writeLocalFile(TECHNICIANS_FILE, techs);
    }
    return newTech;
  }

  async deleteTechnician(id: string): Promise<boolean> {
    if (this.isMongo && this.client) {
      const db = this.client.db();
      const result = await db.collection("technicians").deleteOne({ _id: id as any });
      return result.deletedCount > 0;
    } else {
      const techs = this.readLocalFile(TECHNICIANS_FILE);
      const filtered = techs.filter(t => t.id !== id);
      if (filtered.length === techs.length) return false;
      this.writeLocalFile(TECHNICIANS_FILE, filtered);
      return true;
    }
  }
}

// Singleton database instance
export const db = new DBManager();
