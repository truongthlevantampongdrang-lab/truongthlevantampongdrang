import { GraduationCap, Users, Award, BookOpen, ChevronRight, Sparkles, Star, Edit, X, Save } from "lucide-react";
import { useEffect, useState, FormEvent } from "react";
import { loadSiteContent, patchSiteContent } from "../siteContentSync";
import { sampleImages } from "../editableAssets";
import ImageUploadField from "./ImageUploadField";

type HighlightItem = {
  title: string;
  description: string;
  image: string;
  tag: string;
};

type HighlightContent = {
  sectionTitle: string;
  sectionDescription: string;
  items: HighlightItem[];
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;
};

type HighlightEditTarget =
  | { type: "all" }
  | { type: "section" }
  | { type: "card"; index: number }
  | { type: "banner" };

interface HeroProps {
  onNavigate: (tab: string) => void;
  isAdminMode: boolean;
  schoolInfo: {
    name: string;
    subTitle: string;
    address: string;
    fullAddress: string;
    phone: string;
    email: string;
    principalName: string;
    principalTitle: string;
    principalWord: string;
    principalAvatar: string;
    heroImage?: string;
    stats?: { label: string; value: string }[];
  };
  updateSchoolInfo: (info: any) => void;
}

export default function Hero({ onNavigate, isAdminMode, schoolInfo, updateSchoolInfo }: HeroProps) {
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [showEditPrincipalModal, setShowEditPrincipalModal] = useState(false);
  const [showEditStatsModal, setShowEditStatsModal] = useState(false);
  const canEditHighlights =
    isAdminMode || (typeof window !== "undefined" && localStorage.getItem("lvt_is_admin") === "true");
  
  // States for school form
  const [schoolForm, setSchoolForm] = useState({ ...schoolInfo });
  const [statsForm, setStatsForm] = useState<{ label: string; value: string }[]>([]);

  // Default values for stats
  const defaultStats = [
    { label: "Học Sinh Thân Yêu", value: "580+" },
    { label: "Thầy Cô Tâm Huyết", value: "35+" },
    { label: "Phòng Học Hiện Đại", value: "18" },
    { label: "Đạt Chuẩn Quốc Gia", value: "Cấp I" },
  ];

  const currentStats = schoolInfo.stats || defaultStats;

  const statIcons = [Users, GraduationCap, BookOpen, Award];
  const statColors = [
    "bg-orange-100 text-orange-600",
    "bg-emerald-100 text-emerald-600",
    "bg-blue-100 text-blue-600",
    "bg-amber-100 text-amber-600",
  ];

  const stats = currentStats.map((stat, i) => ({
    ...stat,
    icon: statIcons[i % statIcons.length],
    color: statColors[i % statColors.length],
  }));

  const defaultHighlightContent: HighlightContent = {
    sectionTitle: "Các Điểm Nhấn Nổi Bật Của Trường",
    sectionDescription: "Sự kết hợp hài hòa giữa chất lượng đào tạo, giữ gìn nét đẹp văn hóa dân tộc và đón đầu xu thế công nghệ giáo dục hiện đại.",
    items: [
    {
      title: "Gìn Giữ Bản Sắc Tây Nguyên",
      description: "Tự hào duy trì Câu lạc bộ Cồng Chiêng Nhí & các tiết học nhạc cụ dân tộc truyền thống, tôn vinh di sản văn hóa Đắk Lắk.",
      image: sampleImages.highlight1,
      tag: "Văn Hóa",
    },
    {
      title: "Công Nghệ & Trí Tuệ Nhân Tạo",
      description: "Ứng dụng công nghệ giáo dục hiện đại và tích hợp Trợ lý AI 'Lê Văn Tám' đồng hành 24/7 cùng phụ huynh và học sinh.",
      image: sampleImages.highlight2,
      tag: "Sáng Tạo",
    },
    {
      title: "Môi Trường Học Hạnh Phúc",
      description: "Mỗi ngày đến trường là một ngày vui. Khuôn viên xanh, phòng lớp thân thiện, bồi dưỡng toàn diện Trí - Thể - Mỹ.",
      image: sampleImages.highlight3,
      tag: "Phát Triển",
    }
    ],
    ctaTitle: "Đồng Hành Phát Triển Cùng Con Em Pơng Drang",
    ctaDescription: "Bạn có biết? Trang web này tích hợp hệ thống quản lý đăng ký câu lạc bộ trực tuyến và tra cứu kết quả học tập của các con cực kỳ tiện lợi cho quý phụ huynh. Đồng thời, Trợ lý AI Lê Văn Tám luôn sẵn sàng giải đáp mọi thắc mắc học tập của học sinh.",
    ctaButtonText: "Trải Nghiệm Cổng Tra Cứu Ngay",
  };

  const [hasLoadedHighlightContent, setHasLoadedHighlightContent] = useState(false);
  const [showEditHighlightsModal, setShowEditHighlightsModal] = useState(false);
  const [highlightEditTarget, setHighlightEditTarget] = useState<HighlightEditTarget>({ type: "all" });
  const [highlightContent, setHighlightContent] = useState<HighlightContent>(() => {
    const saved = localStorage.getItem("lvt_home_highlight_content");
    if (saved) {
      try {
        return { ...defaultHighlightContent, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultHighlightContent;
  });
  const [highlightForm, setHighlightForm] = useState<HighlightContent>(highlightContent);

  useEffect(() => {
    let isMounted = true;

    loadSiteContent()
      .then((content) => {
        if (!isMounted) return;
        if (content.homeHighlightContent && typeof content.homeHighlightContent === "object") {
          setHighlightContent({ ...defaultHighlightContent, ...(content.homeHighlightContent as Partial<HighlightContent>) });
        }
      })
      .catch((error) => {
        console.warn("Home highlight content sync skipped:", error);
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedHighlightContent(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("lvt_home_highlight_content", JSON.stringify(highlightContent));
    if (!hasLoadedHighlightContent) return;

    patchSiteContent({ homeHighlightContent: highlightContent }).catch((error) => {
      console.warn("Home highlight content sync failed:", error);
    });
  }, [highlightContent, hasLoadedHighlightContent]);

  const highlights = highlightContent.items;

  const openHighlightEditor = (target: HighlightEditTarget = { type: "all" }) => {
    setHighlightForm({
      ...highlightContent,
      items: highlightContent.items.map((item) => ({ ...item })),
    });
    setHighlightEditTarget(target);
    setShowEditHighlightsModal(true);
  };

  useEffect(() => {
    const handleOpenHighlightEditor = () => {
      openHighlightEditor();
      window.setTimeout(() => {
        document.getElementById("home-highlights-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };

    window.addEventListener("lvt-open-home-highlight-editor", handleOpenHighlightEditor);
    return () => {
      window.removeEventListener("lvt-open-home-highlight-editor", handleOpenHighlightEditor);
    };
  }, [highlightContent]);

  const handleSaveSchoolInfo = (e: FormEvent) => {
    e.preventDefault();
    updateSchoolInfo(schoolForm);
    setShowEditSchoolModal(false);
  };

  const handleSavePrincipal = (e: FormEvent) => {
    e.preventDefault();
    updateSchoolInfo(schoolForm);
    setShowEditPrincipalModal(false);
  };

  const handleSaveHighlights = (e: FormEvent) => {
    e.preventDefault();
    setHighlightContent({
      ...highlightForm,
      items: highlightForm.items.map((item) => ({
        ...item,
        title: item.title.trim(),
        description: item.description.trim(),
        image: item.image.trim(),
        tag: item.tag.trim(),
      })),
    });
    setShowEditHighlightsModal(false);
  };

  const highlightModalTitle =
    highlightEditTarget.type === "section"
      ? "Chỉnh Sửa Tiêu Đề Khu Vực Điểm Nhấn"
      : highlightEditTarget.type === "card"
        ? `Chỉnh Sửa Thẻ Điểm Nhấn ${highlightEditTarget.index + 1}`
        : highlightEditTarget.type === "banner"
          ? "Chỉnh Sửa Banner Màu Cam"
          : "Chỉnh Sửa Toàn Bộ Khu Vực Điểm Nhấn";

  return (
    <div className="space-y-16 py-6 relative">
      {/* Banner Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Left decoration circle */}
        <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-emerald-700/20 blur-3xl"></div>
        {/* Right decoration circle */}
        <div className="absolute -right-12 -bottom-12 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl"></div>

        {isAdminMode && (
          <button
            onClick={() => {
              setSchoolForm({ ...schoolInfo });
              setShowEditSchoolModal(true);
            }}
            className="absolute top-4 right-4 z-10 flex items-center space-x-1 px-3 py-1.5 bg-amber-500 text-emerald-950 hover:bg-amber-400 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Chỉnh sửa thông tin trường</span>
          </button>
        )}

        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-12 lg:px-20 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Text column */}
            <div className="space-y-6 lg:col-span-7">
              <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-800/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 border border-emerald-700/50">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Trường Tiểu học Đạt Chuẩn Quốc Gia</span>
              </span>
              
              <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
                Ươm Mầm Tri Thức <br />
                <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent font-extrabold">
                  Thắp Sáng Ước Mơ
                </span>
              </h1>
              
              <p className="text-base text-emerald-100 leading-relaxed max-w-xl font-sans">
                Chào mừng Quý phụ huynh, Thầy cô và các em học sinh đến với cổng thông tin điện tử của {schoolInfo.name} ({schoolInfo.address}) - Nơi học sinh hạnh phúc, tự tin học tập sáng tạo và rèn luyện thể chất toàn diện.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={() => onNavigate("portal")}
                  className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-emerald-950 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
                >
                  <span>Cổng Tra Cứu Điểm</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onNavigate("assistant")}
                  className="inline-flex items-center space-x-2 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 active:scale-95 transition-all border border-white/20 backdrop-blur-sm"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Hỏi Trợ Lý AI Lê Văn Tám</span>
                </button>
              </div>
            </div>

            {/* Visual Column */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-sm">
                {/* Yellow accent frame */}
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 opacity-75 blur"></div>
                
                {/* Main image card */}
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-800 bg-emerald-950 aspect-[4/3] shadow-2xl">
                  <img
                    src={schoolInfo.heroImage || sampleImages.heroMain}
                    alt="School classroom"
                    fetchPriority="high"
                    decoding="async"
                    className="h-full w-full object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-transparent"></div>
                  
                  {/* Floating child badge */}
                  <div className="absolute bottom-4 left-4 right-4 bg-emerald-900/90 backdrop-blur-md rounded-lg p-3 border border-emerald-700/50">
                    <p className="text-xs font-bold text-amber-300">Nhà anh hùng trẻ tuổi Lê Văn Tám</p>
                    <p className="text-[10px] text-emerald-100">Cảm hứng về lòng dũng cảm, khát vọng vươn lên cho thế hệ trẻ.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative group/stats">
        {isAdminMode && (
          <button
            onClick={() => {
              setStatsForm(currentStats.map(s => ({ label: s.label, value: s.value })));
              setShowEditStatsModal(true);
            }}
            className="absolute -top-3 right-4 z-10 flex items-center space-x-1 px-3 py-1.5 bg-amber-500 text-emerald-950 hover:bg-amber-400 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Sửa chỉ số thống kê</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 text-center border border-emerald-50 shadow-sm hover:shadow-md hover:border-emerald-100/80 transition-all duration-300"
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className="font-sans text-2xl font-extrabold text-emerald-950">{stat.value}</span>
              <span className="font-sans text-xs font-semibold text-emerald-900/60 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Welcome Letter / Principal Speech */}
      <section className="bg-emerald-50/50 border border-emerald-100/50 rounded-3xl p-8 sm:p-10 relative">
        {isAdminMode && (
          <button
            onClick={() => {
              setSchoolForm({ ...schoolInfo });
              setShowEditPrincipalModal(true);
            }}
            className="absolute top-4 right-4 z-10 flex items-center space-x-1 px-3 py-1.5 bg-amber-500 text-emerald-950 hover:bg-amber-400 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Sửa lời ngỏ Hiệu trưởng</span>
          </button>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="relative h-44 w-44 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
              <img
                src={schoolInfo.principalAvatar}
                alt="Principal Portrait"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="font-sans text-base font-bold text-emerald-950 mt-4">{schoolInfo.principalName}</h3>
            <p className="text-xs text-emerald-700 font-semibold">{schoolInfo.principalTitle}</p>
          </div>
          <div className="md:col-span-8 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Lời Ngỏ Từ Ban Giám Hiệu</span>
            <h2 className="font-sans text-2xl font-extrabold text-emerald-950">
              Chào mừng các em tới ngôi trường hạnh phúc
            </h2>
            <p className="text-sm text-emerald-900/80 leading-relaxed font-sans whitespace-pre-line">
              &ldquo;{schoolInfo.principalWord}&rdquo;
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-700 font-bold">
              <Star className="h-4 w-4 text-amber-400 fill-current" />
              <span>Tiên học lễ - Hậu học văn</span>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Bento-Grid style */}
      <section id="home-highlights-editor" className="space-y-8 relative scroll-mt-28">
        {canEditHighlights && (
          <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-bold text-emerald-950">
              Quản trị: Sửa toàn bộ nội dung trong khu vực điểm nhấn và banner cam bên dưới
            </div>
            <button
              onClick={() => openHighlightEditor({ type: "all" })}
              className="inline-flex items-center justify-center space-x-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-emerald-950 shadow-md transition-all hover:bg-amber-400 active:scale-95"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Sửa khu vực trong hình</span>
            </button>
          </div>
        )}
        <div className="text-center space-y-2 relative">
          {canEditHighlights && (
            <button
              onClick={() => openHighlightEditor({ type: "section" })}
              className="absolute right-0 top-0 hidden items-center space-x-1 rounded-xl bg-emerald-950 px-3 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-900 active:scale-95 sm:inline-flex"
              title="Sửa tiêu đề và nội dung điểm nhấn"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Sửa</span>
            </button>
          )}
          <h2 className="font-sans text-2xl font-extrabold tracking-tight text-emerald-950 sm:text-3xl">
            {highlightContent.sectionTitle}
          </h2>
          <p className="text-sm text-emerald-900/60 max-w-xl mx-auto font-sans">
            {highlightContent.sectionDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="relative flex flex-col overflow-hidden rounded-2xl bg-white border border-emerald-50 hover:border-emerald-100 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {canEditHighlights && (
                <button
                  onClick={() => openHighlightEditor({ type: "card", index: i })}
                  className="absolute right-3 top-3 z-10 inline-flex items-center space-x-1 rounded-full bg-amber-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950 shadow-md transition-all hover:bg-amber-400 active:scale-95"
                  title={`Sửa thẻ điểm nhấn ${i + 1}`}
                >
                  <Edit className="h-3 w-3" />
                  <span>Sửa</span>
                </button>
              )}
              <div className="relative h-48 overflow-hidden bg-emerald-150">
                <img
                  src={h.image}
                  alt={h.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 rounded-full bg-emerald-900/90 backdrop-blur-sm px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white border border-emerald-700/50">
                  {h.tag}
                </span>
              </div>
              <div className="flex-1 p-6 space-y-3">
                <h3 className="font-sans text-lg font-bold text-emerald-950">{h.title}</h3>
                <p className="text-xs text-emerald-900/70 leading-relaxed font-sans">{h.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Creative local resources banner */}
      <section className="rounded-3xl bg-amber-500 text-emerald-950 p-8 sm:p-10 shadow-lg relative overflow-hidden">
        {canEditHighlights && (
          <button
            onClick={() => openHighlightEditor({ type: "banner" })}
            className="absolute right-4 top-4 z-20 inline-flex items-center space-x-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-950 shadow-md transition-all hover:bg-amber-50 active:scale-95"
            title="Sửa banner màu cam"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Sửa banner</span>
          </button>
        )}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-white/10 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h3 className="font-sans text-xl font-extrabold">{highlightContent.ctaTitle}</h3>
            <p className="text-sm font-sans text-emerald-900 leading-relaxed">
              {highlightContent.ctaDescription}
            </p>
          </div>
          <button
            onClick={() => onNavigate("portal")}
            className="rounded-xl bg-emerald-950 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-900 active:scale-95 transition-all shadow-md shrink-0"
          >
            {highlightContent.ctaButtonText}
          </button>
        </div>
      </section>

      {/* Modal Edit Highlights */}
      {showEditHighlightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {highlightModalTitle}
              </h3>
              <button
                onClick={() => setShowEditHighlightsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHighlights} className="mt-4 space-y-4">
              <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
                {(highlightEditTarget.type === "all" || highlightEditTarget.type === "section") && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Tiêu đề khu vực</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tiêu đề chính
                    </label>
                    <input
                      type="text"
                      value={highlightForm.sectionTitle}
                      onChange={(e) => setHighlightForm({ ...highlightForm, sectionTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Mô tả dưới tiêu đề
                    </label>
                    <textarea
                      value={highlightForm.sectionDescription}
                      onChange={(e) => setHighlightForm({ ...highlightForm, sectionDescription: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                )}

                {highlightForm.items.map((item, idx) => {
                  if (highlightEditTarget.type === "section" || highlightEditTarget.type === "banner") {
                    return null;
                  }
                  if (highlightEditTarget.type === "card" && highlightEditTarget.index !== idx) {
                    return null;
                  }

                  return (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Thẻ điểm nhấn {idx + 1}
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Nhãn trên ảnh
                        </label>
                        <input
                          type="text"
                          value={item.tag}
                          onChange={(e) => {
                            const items = highlightForm.items.map((current, itemIndex) =>
                              itemIndex === idx ? { ...current, tag: e.target.value } : current
                            );
                            setHighlightForm({ ...highlightForm, items });
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Tiêu đề thẻ
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const items = highlightForm.items.map((current, itemIndex) =>
                              itemIndex === idx ? { ...current, title: e.target.value } : current
                            );
                            setHighlightForm({ ...highlightForm, items });
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <ImageUploadField
                      label="Ảnh thẻ"
                      value={item.image}
                      fallback={[sampleImages.highlight1, sampleImages.highlight2, sampleImages.highlight3][idx]}
                      aspect="wide"
                      outputWidth={900}
                      outputHeight={506}
                      onChange={(image) => {
                        const items = highlightForm.items.map((current, itemIndex) =>
                          itemIndex === idx ? { ...current, image } : current
                        );
                        setHighlightForm({ ...highlightForm, items });
                      }}
                    />
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Mô tả thẻ
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => {
                          const items = highlightForm.items.map((current, itemIndex) =>
                            itemIndex === idx ? { ...current, description: e.target.value } : current
                          );
                          setHighlightForm({ ...highlightForm, items });
                        }}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  );
                })}

                {(highlightEditTarget.type === "all" || highlightEditTarget.type === "banner") && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Banner màu cam</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tiêu đề banner
                    </label>
                    <input
                      type="text"
                      value={highlightForm.ctaTitle}
                      onChange={(e) => setHighlightForm({ ...highlightForm, ctaTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nội dung banner
                    </label>
                    <textarea
                      value={highlightForm.ctaDescription}
                      onChange={(e) => setHighlightForm({ ...highlightForm, ctaDescription: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Chữ trên nút
                    </label>
                    <input
                      type="text"
                      value={highlightForm.ctaButtonText}
                      onChange={(e) => setHighlightForm({ ...highlightForm, ctaButtonText: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditHighlightsModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-md"
                >
                  <Save className="h-4 w-4" />
                  <span>Lưu nội dung</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit School Info */}
      {showEditSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900">
                ✏️ Chỉnh Sửa Thông Tin Trường
              </h3>
              <button
                onClick={() => setShowEditSchoolModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolInfo} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Trường Học
                </label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Địa Chỉ (Ngắn gọn)
                </label>
                <input
                  type="text"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sở/Cơ quan quản lý giáo dục
                </label>
                <input
                  type="text"
                  value={schoolForm.subTitle}
                  onChange={(e) => setSchoolForm({ ...schoolForm, subTitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <ImageUploadField
                label="Ảnh lớn đầu trang"
                value={schoolForm.heroImage}
                fallback={sampleImages.heroMain}
                aspect="wide"
                outputWidth={900}
                outputHeight={675}
                onChange={(heroImage) => setSchoolForm({ ...schoolForm, heroImage })}
              />

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditSchoolModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-md"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Principal Word */}
      {showEditPrincipalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900">
                ✏️ Chỉnh Sửa Lời Ngỏ Hiệu Trưởng
              </h3>
              <button
                onClick={() => setShowEditPrincipalModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrincipal} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên Hiệu Trưởng
                  </label>
                  <input
                    type="text"
                    value={schoolForm.principalName}
                    onChange={(e) => setSchoolForm({ ...schoolForm, principalName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chức Vụ
                  </label>
                  <input
                    type="text"
                    value={schoolForm.principalTitle}
                    onChange={(e) => setSchoolForm({ ...schoolForm, principalTitle: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <ImageUploadField
                label="Ảnh chân dung"
                value={schoolForm.principalAvatar}
                fallback={sampleImages.principal}
                aspect="square"
                outputWidth={500}
                outputHeight={500}
                onChange={(principalAvatar) => setSchoolForm({ ...schoolForm, principalAvatar })}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung Lời Ngỏ
                </label>
                <textarea
                  value={schoolForm.principalWord}
                  onChange={(e) => setSchoolForm({ ...schoolForm, principalWord: e.target.value })}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditPrincipalModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-md"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Stats */}
      {showEditStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900">
                ✏️ Chỉnh Sửa Chỉ Số Thống Kê
              </h3>
              <button
                onClick={() => setShowEditStatsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSchoolInfo({
                  ...schoolInfo,
                  stats: statsForm,
                });
                setShowEditStatsModal(false);
              }}
              className="mt-4 space-y-4"
            >
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {statsForm.map((stat, idx) => {
                  const IconComponent = statIcons[idx % statIcons.length];
                  const colorClass = statColors[idx % statColors.length];
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClass}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Chỉ số {idx + 1}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Tiêu Đề / Nhãn
                          </label>
                          <input
                            type="text"
                            value={stat.label}
                            onChange={(e) => {
                              const updated = [...statsForm];
                              updated[idx].label = e.target.value;
                              setStatsForm(updated);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Số Liệu / Giá Trị
                          </label>
                          <input
                            type="text"
                            value={stat.value}
                            onChange={(e) => {
                              const updated = [...statsForm];
                              updated[idx].value = e.target.value;
                              setStatsForm(updated);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditStatsModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-md"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
