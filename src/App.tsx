import React, { useState, useEffect } from "react";
import { 
  Plus, Search, LogOut, CarFront, FileSpreadsheet, Users2, ShieldAlert,
  Archive, CircleUser, HelpCircle, Activity, ChevronRight, UserPlus, RefreshCw
} from "lucide-react";
import { User, Car } from "./types";
import Login from "./components/Login";
import CarList from "./components/CarList";
import CarDetails from "./components/CarDetails";
import AddCarModal from "./components/AddCarModal";
import DashboardStats from "./components/DashboardStats";
import ReportsPanel from "./components/ReportsPanel";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "reports" | "users">("inventory");
  
  // Selected car for inspection / details modal
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedCarInitialTab, setSelectedCarInitialTab] = useState<"general" | "inspection" | "repairs" | "warranties">("general");
  const [showAddModal, setShowAddModal] = useState(false);

  // Admin user creator states
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<User["role"]>("tech");
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userError, setUserError] = useState("");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");

  // States for renaming users (fixing name loss)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Customizable Technicians management states
  const [techsList, setTechsList] = useState<{ id: string; name: string }[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [techError, setTechError] = useState("");
  const [techSuccess, setTechSuccess] = useState("");

  // Load and auto authenticate from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem("car_repair_user_session");
    if (savedSession) {
      try {
        const decoded = JSON.parse(savedSession);
        setCurrentUser(decoded);
      } catch {
        localStorage.removeItem("car_repair_user_session");
      }
    }
  }, []);

  // Fetch cars list whenever user is authenticated
  useEffect(() => {
    if (currentUser) {
      fetchCars();
      fetchTechnicians();
      if (currentUser.role === "admin") {
        fetchUsers();
      }
    }
  }, [currentUser]);

  const fetchCars = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cars");
      if (!res.ok) throw new Error("Truy cập cơ sở dữ liệu thất bại.");
      const data = await res.json();
      setCars(data);
    } catch (err) {
      console.error("Lỗi đồng bộ danh sách xe:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("Lỗi đồng bộ người dùng:", err);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await fetch("/api/technicians");
      if (res.ok) {
        const data = await res.json();
        setTechsList(data);
      }
    } catch (err) {
      console.error("Lỗi đồng bộ thợ sửa chữa:", err);
    }
  };

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    setTechError("");
    setTechSuccess("");

    if (!newTechName.trim()) {
      return setTechError("Vui lòng điền họ tên thợ hoặc tên đơn vị.");
    }

    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTechName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi lưu trữ.");

      setNewTechName("");
      setTechSuccess("Đã thêm thợ / đơn vị hoàn thiện thành công!");
      fetchTechnicians();
    } catch (err: any) {
      setTechError(err.message);
    }
  };

  const handleDeleteTechnician = async (id: string) => {
    if (!window.confirm("Bạn có tin chắc muốn gỡ bỏ thợ / gara này ra khỏi danh sách chọn?")) return;
    try {
      const res = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTechnicians();
      } else {
        const data = await res.json();
        alert(data.error || "Không thể loại bỏ thợ.");
      }
    } catch (err: any) {
      console.error("Lỗi loại bỏ thợ:", err);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("car_repair_user_session", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("car_repair_user_session");
    setSelectedCarId(null);
    setShowAddModal(false);
  };

  // Car mutations handlers
  const handleCarAdded = (newCar: Car) => {
    setShowAddModal(false);
    // Reload cars
    fetchCars();
  };

  const handleCarUpdated = (updatedCar: Car) => {
    setCars(prev => prev.map(c => c.id === updatedCar.id ? { ...c, ...updatedCar } : c));
  };

  const handleCarDeleted = (carId: string) => {
    setCars(prev => prev.filter(c => c.id !== carId));
    setSelectedCarId(null);
  };

  // Admin section: create users
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setUserSuccessMessage("");

    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      return setUserError("Vui lòng nhập đầy đủ thông tin.");
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword, // simple storage
          name: newName.trim(),
          role: newRole
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tạo tài khoản thất bại.");

      setUserSuccessMessage(`Đã lập thành công tài khoản ${data.username} (${data.name})!`);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: User["role"]) => {
    try {
      setUserError("");
      setUserSuccessMessage("");
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật phân quyền thất bại.");
      
      setUserSuccessMessage(`Đã cập nhật phân quyền cho tài khoản ${data.username} thành công!`);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const handleSaveUserName = async (userId: string) => {
    if (!editingName.trim()) {
      setUserError("Họ và tên không được để trống.");
      return;
    }
    try {
      setUserError("");
      setUserSuccessMessage("");
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật họ và tên thất bại.");
      
      setUserSuccessMessage(`Đã đổi họ và tên cho tài khoản ${data.username} thành công!`);
      setEditingUserId(null);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const handleDeleteUser = async (userToDel: User) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userToDel.name}" (${userToDel.username})? Hành động này không thể hoàn tác.`)) {
      return;
    }
    
    try {
      setUserError("");
      setUserSuccessMessage("");
      const res = await fetch(`/api/users/${userToDel.id}?currentUserId=${currentUser?.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xóa người dùng thất bại.");
      
      setUserSuccessMessage(`Đã xóa tài khoản "${userToDel.username}" ra khỏi hệ thống!`);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  // Helper for rendering role tags
  const getRoleBadgeClass = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return "bg-rose-100 text-rose-800 border border-rose-200";
      case "acc":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "tech":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "sales":
        return "bg-sky-100 text-sky-800 border border-sky-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getRoleVietnameseName = (role: User["role"]) => {
    switch (role) {
      case "admin": return "Quản Trị Viên";
      case "acc": return "Kế Toán / Thủ Kho";
      case "tech": return "Kỹ Thuật Viên";
      case "sales": return "Cố vấn dịch vụ";
    }
  };

  // Guard Clause for Authentication
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden" id="app-root-layout">
      {/* Sidebar (Left on MD, top-row on mobile) */}
      <aside className="w-full md:w-64 bg-slate-900 flex flex-col shrink-0 select-none border-b border-slate-800 md:border-b-0 md:border-r border-slate-800 text-white justify-between">
        <div className="flex flex-col">
          {/* Logo element */}
          <div className="p-6 border-b border-slate-800/60 flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">Fast<span className="text-red-500">cars</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ĐỒNG SƠN &amp; PHỤ TÙNG</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible w-full gap-2 md:gap-0">
            <button
              id="menu-btn-inventory"
              onClick={() => setActiveTab("inventory")}
              className={`w-full px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center space-x-3 shrink-0 cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span>Kho &amp; Sửa Chữa</span>
            </button>

            <button
              id="menu-btn-reports"
              onClick={() => setActiveTab("reports")}
              className={`w-full px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center space-x-3 shrink-0 cursor-pointer ${
                activeTab === "reports"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>Báo Cáo Excel</span>
            </button>

            {currentUser.role === "admin" && (
              <button
                id="menu-btn-users"
                onClick={() => setActiveTab("users")}
                className={`w-full px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center space-x-3 shrink-0 cursor-pointer ${
                  activeTab === "users"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Users2 className="h-4 w-4 shrink-0" />
                <span>Nhân Sự Hub</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer with current user and Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 hidden md:block">
          <div className="bg-slate-850/80 rounded-xl p-3.5 border border-slate-850">
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs uppercase tracking-wider text-white shrink-0">
                {(currentUser.name || currentUser.username || "U").charAt(0)}
              </div>
              <div className="overflow-hidden leading-tight">
                <span className="font-bold text-xs block text-slate-200 truncate" title={currentUser.name || currentUser.username}>
                  {currentUser.name || currentUser.username}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block ${getRoleBadgeClass(currentUser.role)}`}>
                  {getRoleVietnameseName(currentUser.role)}
                </span>
              </div>
            </div>
            
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="w-full text-center py-2 text-[10px] font-bold tracking-widest text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition uppercase duration-150 cursor-pointer"
            >
              ĐĂNG XUẤT
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Stage */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Main top header bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <CarFront className="h-4.5 w-4.5 text-blue-600" />
            <span className="text-xs font-black text-slate-900 tracking-wider uppercase">
              HỆ THỐNG KIỂM SOÁT SỬA CHỮA XE CŨ
            </span>
          </div>

          <div className="flex items-center space-x-3 md:hidden">
            <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100 px-2 py-1 rounded">
              {currentUser.name || currentUser.username}
            </span>
            <button 
              onClick={handleLogout} 
              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 bg-slate-50" id="main-content-panels">
          {loading && cars.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3" id="app-general-loader">
              <RefreshCw className="h-7 w-7 text-blue-600 animate-spin" />
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Đang kết xuất dữ liệu...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn" id="stage-active-container">
              
              {/* ==================== TAB 1 STATEMENT: INVENTORY & REPAIR CONTROL ==================== */}
              {activeTab === "inventory" && (
                <div className="space-y-6" id="panel-inventory-view">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight uppercase flex items-center">
                        <span>Bản Đồ Theo Dõi Tiến Độ Sửa Chữa Xe Cũ</span>
                        <button 
                          id="btn-sync-database"
                          onClick={fetchCars}
                          title="Đồng bộ hệ thống" 
                          className="ml-2.5 p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-150 transition cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </h2>
                      <p className="text-xs text-slate-400">Xem tiến trình bọc đồng sơn dặm vỏ, thay thế phụ tùng cơ khí & dồn lũy kế số ngày tồn kho thực tế.</p>
                    </div>
                  </div>

                  {/* Top quick widgets statistics panels */}
                  <DashboardStats cars={cars} userRole={currentUser.role} />

                  {/* Filters, query and list blocks */}
                  <CarList 
                    cars={cars} 
                    userRole={currentUser.role} 
                    onSelectCar={(car, initialTab) => {
                      setSelectedCarId(car.id);
                      setSelectedCarInitialTab(initialTab || "general");
                    }}
                    onOpenAddModal={() => setShowAddModal(true)}
                  />
                </div>
              )}

              {/* ==================== TAB 2 STATEMENT: FINANCE EXCEL REPORTS EXPORT ==================== */}
              {activeTab === "reports" && (
                <div className="space-y-6" id="panel-reports-view">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">Trung Tâm Tổng Hợp &amp; Kết Xuất Thống Kê</h2>
                    <p className="text-xs text-slate-400">Kết xuất báo cáo Excel cho dữ liệu kiểm soát hoàn thiện xe kinh doanh.</p>
                  </div>

                  <ReportsPanel userRole={currentUser.role} />
                </div>
              )}

              {/* ==================== TAB 3 STATEMENT: HUMAN RESOURCE PERMISSIONS (ADMIN ONLY) ==================== */}
              {activeTab === "users" && currentUser.role === "admin" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn" id="panel-users-view">
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                      <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">Danh Sách Nhân Sự Vận Hành</h2>
                      <p className="text-xs text-slate-400 font-medium">Nơi phân quyền tài khoản tương ứng với các chức năng kiểm soát kỹ thuật, thủ kho, kế toán hệ thống và hành động xóa.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="accounts-table-container">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-4">Họ và tên</th>
                            <th className="p-4">Tên tài khoản</th>
                            <th className="p-4 text-center">Phân quyền</th>
                            <th className="p-4 text-center w-[120px]">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                          {usersList.map((usr) => (
                            <tr key={usr.id} className="hover:bg-slate-50/50">
                              <td className="p-4 text-slate-950 font-bold">
                                {editingUserId === usr.id ? (
                                  <div className="flex items-center space-x-1.5" id={`edit-user-container-${usr.id}`}>
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold bg-white text-slate-900"
                                      maxLength={50}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveUserName(usr.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingUserId(null)}
                                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span>{usr.name || usr.username}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(usr.id);
                                        setEditingName(usr.name || usr.username);
                                      }}
                                      className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-normal cursor-pointer"
                                    >
                                      [Đổi tên]
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-mono text-blue-600 font-bold">{usr.username}</td>
                              <td className="p-4 text-center">
                                {usr.id === currentUser.id ? (
                                  <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${getRoleBadgeClass(usr.role)}`}>
                                    {getRoleVietnameseName(usr.role)} (Bạn)
                                  </span>
                                ) : (
                                  <select
                                    value={usr.role}
                                    onChange={(e) => handleUpdateUserRole(usr.id, e.target.value as any)}
                                    className="text-xs font-bold px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold"
                                  >
                                    <option value="admin">Quản Trị Viên</option>
                                    <option value="tech">Kỹ Thuật Viên</option>
                                    <option value="acc">Kế Toán / Thủ Kho</option>
                                    <option value="sales">Cố vấn dịch vụ</option>
                                  </select>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                {usr.id === currentUser.id ? (
                                  <span className="text-slate-400 text-[10px] italic font-semibold">Tài khoản chính</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(usr)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent rounded transition cursor-pointer"
                                  >
                                    Xóa
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Create Account Form Column */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 h-fit">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center border-b border-slate-100 pb-3">
                      <UserPlus className="h-4 w-4 mr-1.5 text-blue-500" />
                      <span>Cấp mới tài khoản</span>
                    </h3>

                    <form onSubmit={handleCreateUserSubmit} className="space-y-4" id="create-user-form">
                      {userError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold">
                          {userError}
                        </div>
                      )}
                      {userSuccessMessage && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold">
                          {userSuccessMessage}
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên đầy đủ</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full mt-1.5 px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên đăng nhập</label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="vd: tech_nam"
                          className="w-full mt-1.5 px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mật khẩu mới</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu..."
                          className="w-full mt-1.5 px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vai trò phân quyền</label>
                        <select
                          id="create-role-select"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as any)}
                          className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        >
                          <option value="tech">Kỹ Thuật Viên</option>
                          <option value="acc">Kế Toán / Thủ Kho</option>
                          <option value="sales">Cố vấn dịch vụ</option>
                          <option value="admin">Quản Trị Viên (Full)</option>
                        </select>
                      </div>

                      <button
                        id="btn-create-user"
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-150 cursor-pointer shadow-md shadow-blue-900/10"
                      >
                        Cấp tài khoản nhân sự
                      </button>
                    </form>
                  </div>
                </div>

                {/* Separator line */}
                <div className="border-t border-slate-200 my-8 pb-2"></div>

                {/* Technicians Management Panel (Customizable select lists of performing parties) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn" id="panel-technicians-view">
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                      <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">Danh Sách Thợ / Đơn Vị Thực Hiện</h2>
                      <p className="text-xs text-slate-400 font-medium">Danh sách các cá nhân hoặc đơn vị gara dọn xe dùng làm dữ liệu chọn khi nhập hồ sơ sửa dọn dẹp xe.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="techs-table-container">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-4">Tên thợ hàng / Đối tác liên kết</th>
                            <th className="p-4 text-center w-[120px]">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                          {techsList.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="p-4 text-slate-950 font-bold">{t.name}</td>
                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTechnician(t.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-transparent rounded transition cursor-pointer"
                                >
                                  Gỡ danh sách
                                </button>
                              </td>
                            </tr>
                          ))}
                          {techsList.length === 0 && (
                            <tr>
                              <td className="p-4 text-slate-400 italic text-center" colSpan={2}>
                                Chưa có thợ dọn dẹp nào được cấu hình trong danh sách.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Create Tech / Gara form */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 h-fit relative z-10">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center border-b border-slate-100 pb-3">
                      <UserPlus className="h-4 w-4 mr-1.5 text-indigo-500" />
                      <span>Thêm Thợ &amp; Gara dọn</span>
                    </h3>

                    <form onSubmit={handleCreateTechnician} className="space-y-4" id="create-tech-form">
                      {techError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold">
                          {techError}
                        </div>
                      )}
                      {techSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold">
                          {techSuccess}
                        </div>
                      )}

                      <div className="relative z-20">
                        <label htmlFor="tech-name-input-field" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 cursor-pointer">Họ và tên hoặc Tên xưởng</label>
                        <input
                          id="tech-name-input-field"
                          type="text"
                          required
                          value={newTechName}
                          onChange={(e) => setNewTechName(e.target.value)}
                          placeholder="vd: Đồng sơn Thành Phát, Thợ điện Nam..."
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold relative z-30 cursor-text"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-150 cursor-pointer shadow-md shadow-slate-900/10"
                      >
                        Thêm vào danh sách chọn
                      </button>
                    </form>
                  </div>
                </div>
                </>
              )}

            </div>
          )}
        </main>

        {/* Simple decorative background watermarks/credit line in workspace as per specifications */}
        <footer className="bg-slate-100 text-center py-2 shrink-0 border-t border-slate-200 text-[10px] text-slate-400 font-medium select-none">
          Phần mềm Quản lý quy trình dọn dẹp và sửa chữa xe cũ • local-engine enabled
        </footer>
      </div>

      {/* ==================== CHILDREN VIEW FLOATING WINDOWS - MODALS ==================== */}

      {/* Floating Modal details view */}
      {selectedCarId && (
        <CarDetails 
          carId={selectedCarId}
          initialTab={selectedCarInitialTab}
          user={currentUser}
          onClose={() => {
            setSelectedCarId(null);
            setSelectedCarInitialTab("general");
          }}
          onUpdateSuccess={handleCarUpdated}
          onDeleteSuccess={handleCarDeleted}
        />
      )}

      {/* Floating Modal additive input form */}
      {showAddModal && (
        <AddCarModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCarAdded}
        />
      )}
    </div>
  );
}
