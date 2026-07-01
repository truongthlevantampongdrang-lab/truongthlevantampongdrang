import { MapPin, Phone, Mail, Award, Clock, Heart, Edit, X, Save } from "lucide-react";
import { useState, FormEvent } from "react";

interface FooterProps {
  isAdminMode: boolean;
  footerInfo: {
    schoolName: string;
    schoolLocation: string;
    desc: string;
    level: string;
    address: string;
    phone: string;
    email: string;
    workingTime: string;
    slogan: string;
    sloganAuthor: string;
    quickNote: string;
  };
  updateFooterInfo: (info: any) => void;
}

export default function Footer({ 
  isAdminMode = false, 
  footerInfo = {
    schoolName: "TH LÊ VĂN TÁM",
    schoolLocation: "Xã Pơng Drang, Tỉnh Đắk Lắk",
    desc: "Được thành lập trên mảnh đất Pơng Drang trù phú, giàu truyền thống cách mạng của tỉnh Đắk Lắk. Trường Tiểu học Lê Văn Tám luôn kiên trì mục tiêu xây dựng môi trường giáo dục hạnh phúc, chắp cánh tài năng học đường và bảo tồn văn hóa Tây Nguyên.",
    level: "Trường đạt chuẩn Quốc gia cấp độ I",
    address: "Buôn Ea Đơng, Xã Pơng Drang, Tỉnh Đắk Lắk, Việt Nam",
    phone: "0262.387.1234 (Văn phòng Nhà trường)",
    email: "truongthlevantampongdrang@gmail.com",
    workingTime: "Thời gian làm việc: Thứ Hai - Thứ Sáu (7:00 - 17:00)",
    slogan: "Dạy tốt - Học tốt - Rèn luyện chăm. Vì tương lai con em chúng ta, chung tay xây dựng ngôi trường hạnh phúc và sáng tạo.",
    sloganAuthor: "Tập thể Thầy Cô giáo",
    quickNote: "Học sinh tiêu biểu năm học: 100% đạt chuẩn phẩm chất và năng lực tiểu học."
  }, 
  updateFooterInfo 
}: Partial<FooterProps>) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<"identity" | "contact" | "slogan">("identity");
  const [formState, setFormState] = useState({ ...footerInfo });

  const handleOpenEdit = (tab: "identity" | "contact" | "slogan") => {
    setFormState({ ...footerInfo });
    setActiveEditTab(tab);
    setShowEditModal(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (updateFooterInfo) {
      updateFooterInfo(formState);
    }
    setShowEditModal(false);
  };

  return (
    <footer className="bg-emerald-950 text-emerald-100 relative">
      {/* Decorative top wave */}
      <div className="relative h-4 w-full bg-emerald-950">
        <div className="absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-emerald-950 to-transparent"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          
          {/* Column 1: School Identity */}
          <div className="space-y-4 relative group">
            {isAdminMode && (
              <button
                onClick={() => handleOpenEdit("identity")}
                className="absolute -top-3 -right-3 p-1.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg shadow-md hover:scale-105 transition-all z-10 opacity-80 hover:opacity-100 flex items-center space-x-1 text-xs font-bold"
                title="Chỉnh sửa Giới thiệu chân trang"
              >
                <Edit className="h-3 w-3" />
                <span className="text-[10px]">Sửa</span>
              </button>
            )}
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-emerald-950 font-bold">
                LVT
              </div>
              <div>
                <h3 className="font-sans text-base font-extrabold uppercase tracking-wider text-white">
                  {footerInfo.schoolName}
                </h3>
                <p className="text-xs text-emerald-300">{footerInfo.schoolLocation}</p>
              </div>
            </div>
            <p className="text-sm text-emerald-300/90 leading-relaxed font-sans">
              {footerInfo.desc}
            </p>
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-bold">
              <Award className="h-4 w-4" />
              <span>{footerInfo.level}</span>
            </div>
          </div>

          {/* Column 2: Contact Info */}
          <div className="space-y-4 relative group">
            {isAdminMode && (
              <button
                onClick={() => handleOpenEdit("contact")}
                className="absolute -top-3 -right-3 p-1.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg shadow-md hover:scale-105 transition-all z-10 opacity-80 hover:opacity-100 flex items-center space-x-1 text-xs font-bold"
                title="Chỉnh sửa Liên hệ chân trang"
              >
                <Edit className="h-3 w-3" />
                <span className="text-[10px]">Sửa</span>
              </button>
            )}
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-white border-l-2 border-amber-500 pl-2">
              Thông Tin Liên Hệ
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-emerald-300">
                  {footerInfo.address}
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="text-emerald-300">{footerInfo.phone}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-amber-500 shrink-0" />
                <a 
                  href={`mailto:${footerInfo.email}`}
                  className="text-emerald-300 hover:text-white hover:underline transition-colors break-all"
                >
                  {footerInfo.email}
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="text-emerald-300">{footerInfo.workingTime}</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Slogan & Quick Note */}
          <div className="space-y-4 relative group">
            {isAdminMode && (
              <button
                onClick={() => handleOpenEdit("slogan")}
                className="absolute -top-3 -right-3 p-1.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg shadow-md hover:scale-105 transition-all z-10 opacity-80 hover:opacity-100 flex items-center space-x-1 text-xs font-bold"
                title="Chỉnh sửa Khẩu hiệu chân trang"
              >
                <Edit className="h-3 w-3" />
                <span className="text-[10px]">Sửa</span>
              </button>
            )}
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-white border-l-2 border-amber-500 pl-2">
              Khẩu Hiệu Nhà Trường
            </h3>
            <div className="rounded-xl bg-emerald-900/40 p-4 border border-emerald-800/60">
              <blockquote className="italic text-emerald-200 text-sm font-medium leading-relaxed">
                &ldquo;{footerInfo.slogan}&rdquo;
              </blockquote>
              <p className="text-right text-xs text-amber-400 font-bold mt-2">— {footerInfo.sloganAuthor}</p>
            </div>
            
            <div className="text-xs text-emerald-400">
              <p>{footerInfo.quickNote}</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-emerald-900 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400">
          <p className="font-sans">
            &copy; {new Date().getFullYear()} Trường Tiểu học Lê Văn Tám. Đã bảo lưu mọi quyền.
          </p>
          <p className="flex items-center mt-2 sm:mt-0">
            <span>Thiết kế bằng</span>
            <Heart className="h-3 w-3 mx-1 text-red-500 fill-current animate-beat" />
            <span>cho học sinh Pơng Drang, Đắk Lắk</span>
          </p>
        </div>
      </div>

      {/* Edit Modal for Footer */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 p-4 backdrop-blur-sm text-slate-800">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-900">
                    Chỉnh Sửa Chân Trang (Footer)
                  </h3>
                  <p className="text-xs text-slate-500">Tùy biến thông tin liên hệ và khẩu hiệu</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setActiveEditTab("identity")}
                className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all ${
                  activeEditTab === "identity" 
                    ? "border-emerald-600 text-emerald-700 font-bold" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Thông Tin Trường
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab("contact")}
                className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all ${
                  activeEditTab === "contact" 
                    ? "border-emerald-600 text-emerald-700 font-bold" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Thông Tin Liên Hệ
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab("slogan")}
                className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all ${
                  activeEditTab === "slogan" 
                    ? "border-emerald-600 text-emerald-700 font-bold" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                3. Khẩu Hiệu & Khác
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {activeEditTab === "identity" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Trường</label>
                    <input
                      type="text"
                      value={formState.schoolName}
                      onChange={(e) => setFormState({ ...formState, schoolName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vị Trí Tóm Tắt</label>
                    <input
                      type="text"
                      value={formState.schoolLocation}
                      onChange={(e) => setFormState({ ...formState, schoolLocation: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Chân Trang</label>
                    <textarea
                      rows={3}
                      value={formState.desc}
                      onChange={(e) => setFormState({ ...formState, desc: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Danh Hiệu / Đạt Chuẩn</label>
                    <input
                      type="text"
                      value={formState.level}
                      onChange={(e) => setFormState({ ...formState, level: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeEditTab === "contact" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Chi Tiết</label>
                    <input
                      type="text"
                      value={formState.address}
                      onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                    <input
                      type="text"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hòm Thư (Email)</label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Thời Gian Làm Việc</label>
                    <input
                      type="text"
                      value={formState.workingTime}
                      onChange={(e) => setFormState({ ...formState, workingTime: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeEditTab === "slogan" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Khẩu Hiệu Trường</label>
                    <textarea
                      rows={3}
                      value={formState.slogan}
                      onChange={(e) => setFormState({ ...formState, slogan: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tác Giả Khẩu Hiệu</label>
                    <input
                      type="text"
                      value={formState.sloganAuthor}
                      onChange={(e) => setFormState({ ...formState, sloganAuthor: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Thông Tin Phụ (Ví dụ: Thống kê học sinh)</label>
                    <input
                      type="text"
                      value={formState.quickNote}
                      onChange={(e) => setFormState({ ...formState, quickNote: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md flex items-center space-x-1.5 active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  <span>Lưu Cấu Hình</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
}
