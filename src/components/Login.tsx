import React, { useState, useEffect } from "react";
import { LogIn, Shield, UserPlus } from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // First-time admin setup fields
  const [setupName, setSetupName] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/auth/check-admin")
      .then((res) => res.json())
      .then((data) => {
        setHasAdmin(!!data.hasAdmin);
      })
      .catch((err) => {
        console.error("Error checking system admin presence:", err);
        setHasAdmin(true); // Fallback to login if error
      });
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !setupUsername.trim() || !setupPassword.trim()) {
      setError("Vui lòng điền đầy đủ tất cả thông tin.");
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setupName.trim(),
          username: setupUsername.trim(),
          password: setupPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Tạo tài khoản quản trị thất bại");
      }

      // Automatically sign in the user upon successful setup
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi trong quá trình cấu hình tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  if (hasAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" id="login-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 text-xs mt-3 font-semibold tracking-wider uppercase">Đang khởi tạo hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="login-container">
      {/* Background Decorative Grid/Blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700/60 z-10">
        <div>
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              {hasAdmin ? <LogIn className="h-8 w-8" /> : <UserPlus className="h-8 w-8 text-emerald-400" />}
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-black text-white tracking-tight uppercase" id="login-title">
            Fast<span className="text-red-500">cars</span> XE CŨ
          </h2>
          <p className="mt-2 text-center text-xs text-slate-400 uppercase tracking-widest font-semibold">
            {hasAdmin ? "Hệ thống kiểm soát & chi phí hoàn thiện" : "Thiết lập hệ thống lần đầu"}
          </p>
        </div>

        {hasAdmin ? (
          /* Normal Sign-In Form */
          <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit} id="login-form">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-xs font-semibold" id="login-error">
                {error}
              </div>
            )}

            <div className="rounded-md space-y-4">
              <div>
                <label htmlFor="username" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-slate-700 bg-slate-800/80 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  placeholder="Nhập tên tài khoản..."
                />
              </div>

              <div>
                <label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Mật khẩu
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-slate-700 bg-slate-800/80 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            </div>

            <div>
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-900/20 transition duration-150 ease-in-out disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Đang xử lý..." : "Đăng nhập hệ thống"}
              </button>
            </div>
          </form>
        ) : (
          /* First-time Admin Configuration Setup Form */
          <form className="mt-8 space-y-5" onSubmit={handleSetupAdminSubmit} id="setup-admin-form">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs leading-relaxed" id="setup-welcome">
              <strong className="block font-bold mb-1">Chào mừng bạn đến với Fastcars!</strong>
              Cơ sở dữ liệu người dùng hiện đang trống. Hãy thiết lập tài khoản Quản trị viên (Admin) đầu tiên để kích hoạt đầy đủ tính năng của hệ thống.
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-xs font-semibold" id="setup-error">
                {error}
              </div>
            )}

            <div className="rounded-md space-y-4">
              <div>
                <label htmlFor="setup-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Họ tên Quản trị viên
                </label>
                <input
                  id="setup-name"
                  name="setup-name"
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-slate-700 bg-slate-800/80 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  placeholder="Ví dụ: Nguyễn Văn A..."
                />
              </div>

              <div>
                <label htmlFor="setup-username" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tên đăng nhập mới
                </label>
                <input
                  id="setup-username"
                  name="setup-username"
                  type="text"
                  required
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-slate-700 bg-slate-800/80 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  placeholder="Nhập tên đăng nhập quý khách muốn..."
                />
              </div>

              <div>
                <label htmlFor="setup-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Mật khẩu quản trị
                </label>
                <input
                  id="setup-password"
                  name="setup-password"
                  type="password"
                  required
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-slate-700 bg-slate-800/80 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  placeholder="Mật khẩu bảo mật..."
                />
              </div>

              <div>
                <label htmlFor="setup-confirm-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Xác nhận mật khẩu
                </label>
                <input
                  id="setup-confirm-password"
                  name="setup-confirm-password"
                  type="password"
                  required
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-slate-700 bg-slate-800/80 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  placeholder="Nhập lại mật khẩu để xác nhận..."
                />
              </div>
            </div>

            <div>
              <button
                id="btn-setup-submit"
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-950/20 transition duration-150 ease-in-out disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Đang xử lý..." : "Tạo tài khoản & Kích hoạt"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
