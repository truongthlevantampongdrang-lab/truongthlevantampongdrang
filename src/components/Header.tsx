import { School, Menu, X, Sparkles, Shield, Key, Eye, EyeOff, User } from "lucide-react";
import { useState, FormEvent } from "react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdminMode: boolean;
  setIsAdminMode: (v: boolean) => void;
}

export default function Header({ activeTab, setActiveTab, isAdminMode, setIsAdminMode }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: "home", label: "Trang Chủ" },
    { id: "about", label: "Giới Thiệu" },
    { id: "news", label: "Tin Tức & Hoạt Động" },
    { id: "portal", label: "Cổng Tra Cứu & Đăng Ký" },
    { id: "assistant", label: "Trợ Lý AI Lê Văn Tám", icon: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-[60] w-full border-b border-emerald-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo & School Name */}
            <div 
              className="flex cursor-pointer items-center space-x-3"
              onClick={() => { setActiveTab("home"); setIsOpen(false); }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-200">
                <School className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-sans text-xs font-bold uppercase tracking-wider text-amber-600">
                  Sở Giáo dục và Đào tạo Tỉnh Đắk Lắk
                </span>
                <h1 className="font-sans text-lg font-extrabold tracking-tight text-emerald-950 sm:text-xl">
                  TH LÊ VĂN TÁM
                </h1>
                <span className="block font-sans text-[10px] text-emerald-700">
                  Xã Pơng Drang, Tỉnh Đắk Lắk
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative px-3.5 py-2 rounded-lg font-sans text-sm font-semibold transition-all duration-200 flex items-center space-x-1.5 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-emerald-900/70 hover:bg-emerald-50/50 hover:text-emerald-950"
                    }`}
                  >
                    {item.icon && <Sparkles className="h-4 w-4 text-amber-500" />}
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-emerald-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Mobile menu button */}
            <div className="flex items-center space-x-2 md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center rounded-lg p-2 text-emerald-800 hover:bg-emerald-50 focus:outline-none"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="border-t border-emerald-50 bg-white md:hidden animate-in fade-in slide-in-from-top-5 duration-200">
            <div className="space-y-1 px-4 py-3 pb-4">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2 rounded-lg px-4 py-3 font-sans text-left text-base font-bold transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white"
                        : "text-emerald-900 hover:bg-emerald-50"
                    }`}
                  >
                    {item.icon && <Sparkles className={`h-5 w-5 ${isActive ? "text-amber-300" : "text-amber-500"}`} />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
