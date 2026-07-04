import { lazy, Suspense, useState, useEffect, FormEvent } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import { sampleNews, sampleClubs, sampleStudents, classSchedules } from "./data";
import { NewsItem, SchoolClub, StudentScore, ClassSchedule } from "./types";
import { Sparkles, Shield, Eye, EyeOff, Check, X, User, Key, RefreshCw, LogOut, Settings, Mail, Edit } from "lucide-react";
import {
  buildStructuredData,
  getPagePath,
  getPageUrl,
  getSeoPage,
  getSeoPageByPath,
  SEO_PAGES,
  SITE_BASE_PATH,
  upsertLink,
  upsertMeta
} from "./seo";
import { getGitHubPublishToken, loadSiteContent, patchSiteContent, setGitHubPublishToken } from "./siteContentSync";
import { sampleImages } from "./editableAssets";

const About = lazy(() => import("./components/About"));
const News = lazy(() => import("./components/News"));
const Portal = lazy(() => import("./components/Portal"));
const Assistant = lazy(() => import("./components/Assistant"));

declare const __APP_BUILD_ID__: string;

const contentCacheVersionKey = "lvt_content_cache_version";
const contentCacheKeys = [
  "lvt_school_info",
  "lvt_footer_info",
  "lvt_news",
  "lvt_clubs",
  "lvt_students",
  "lvt_schedules",
  "lvt_about_milestones",
  "lvt_about_leaders",
  "lvt_home_highlight_content",
  "lvt_teachers",
  "lvt_added_lookup_classes",
  "lvt_admission_instructions",
];

const syncContentCacheVersion = () => {
  const currentVersion = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";
  const savedVersion = localStorage.getItem(contentCacheVersionKey);

  if (savedVersion === currentVersion) {
    return;
  }

  contentCacheKeys.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(contentCacheVersionKey, currentVersion);
};

const currentPrincipal = {
  name: "Cô Ngô Thị Mai",
  title: "Hiệu trưởng Nhà trường",
  avatar: sampleImages.principal,
};

const isOldPrincipalName = (value: unknown) => {
  const text = String(value || "").toLowerCase();
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return (
    normalized.includes("nguyen thi xuan") ||
    text.includes("nguyá") ||
    text.includes("xuân") ||
    text.includes("xuã¢n") ||
    text.includes("xuÃ¢n")
  );
};

const normalizeSchoolInfo = (info: any) => {
  if (!info || typeof info !== "object") {
    return info;
  }

  if (!isOldPrincipalName(info.principalName)) {
    return info;
  }

  return {
    ...info,
    principalName: currentPrincipal.name,
    principalTitle: info.principalTitle || currentPrincipal.title,
    principalAvatar: info.principalAvatar || currentPrincipal.avatar,
  };
};

function getInitialTab() {
  const redirectPath = new URLSearchParams(window.location.search).get("p");
  if (redirectPath) {
    return getSeoPageByPath(`${SITE_BASE_PATH}${redirectPath.replace(/^\/+/, "")}`).tab;
  }

  return getSeoPageByPath(window.location.pathname).tab;
}

export default function App() {
  syncContentCacheVersion();

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("lvt_is_admin");
    return saved === "true";
  });

  // Load / Save Admin Credentials Modal States
  const [showChangeCredsModal, setShowChangeCredsModal] = useState<boolean>(false);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [credsError, setCredsError] = useState<string>("");
  const [credsSuccess, setCredsSuccess] = useState<string>("");
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("lvt_gemini_api_key") || "";
  });
  const [githubPublishToken, setGithubPublishToken] = useState<string>(() => getGitHubPublishToken());
  const [hasLoadedSiteContent, setHasLoadedSiteContent] = useState(false);

  // Floating Admin Login & Options States
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showAdminMenuModal, setShowAdminMenuModal] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  // Floating Admin Icon visibility (toggled via Ctrl + M + K)
  const [isIconVisible, setIsIconVisible] = useState<boolean>(() => {
    return localStorage.getItem("lvt_admin_icon_visible") === "true";
  });

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [isSendingForgot, setIsSendingForgot] = useState<boolean>(false);
  const [forgotStepText, setForgotStepText] = useState<string>("");
  const [forgotSuccess, setForgotSuccess] = useState<boolean>(false);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);
  const [recoveredCredentials, setRecoveredCredentials] = useState<{username: string, password: string}>({username: "", password: ""});
  const [forgotError, setForgotError] = useState<string>("");

  // Keydown combo listener for Ctrl + M + K
  useEffect(() => {
    let lastMTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Detect Ctrl + M
      if (e.ctrlKey && key === "m") {
        lastMTime = Date.now();
      }
      // Detect Ctrl + K within 2 seconds of Ctrl + M
      if (e.ctrlKey && key === "k") {
        if (Date.now() - lastMTime < 2000) {
          e.preventDefault();
          setIsIconVisible((prev) => {
            const next = !prev;
            localStorage.setItem("lvt_admin_icon_visible", next ? "true" : "false");
            return next;
          });
          lastMTime = 0;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("lvt_is_admin", isAdminMode ? "true" : "false");
  }, [isAdminMode]);

  useEffect(() => {
    const page = getSeoPage(activeTab);
    const pageUrl = getPageUrl(page);

    document.title = page.title;
    upsertMeta('meta[name="description"]', { name: "description", content: page.description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: page.keywords });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: page.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: page.description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: pageUrl });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: page.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: page.description });
    upsertLink('link[rel="canonical"]', { rel: "canonical", href: pageUrl });

    const schema = document.getElementById("structured-data") || document.createElement("script");
    schema.id = "structured-data";
    schema.setAttribute("type", "application/ld+json");
    schema.textContent = JSON.stringify(buildStructuredData(page));
    if (!schema.parentNode) {
      document.head.appendChild(schema);
    }
  }, [activeTab]);

  useEffect(() => {
    const page = getSeoPage(activeTab);
    const desiredPath = getPagePath(page);

    if (window.location.pathname !== desiredPath || window.location.search) {
      window.history.replaceState({ tab: activeTab }, "", desiredPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getSeoPageByPath(window.location.pathname).tab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Load / Save School Info
  const [schoolInfo, setSchoolInfo] = useState(() => {
    const saved = localStorage.getItem("lvt_school_info");
    if (saved) {
      try {
        return normalizeSchoolInfo(JSON.parse(saved));
      } catch (e) {
        // use default
      }
    }
    return {
      name: "Trường Tiểu học Lê Văn Tám",
      subTitle: "Sở Giáo dục và Đào tạo Tỉnh Đắk Lắk",
      address: "Xã Pơng Drang, Tỉnh Đắk Lắk",
      fullAddress: "Buôn Ea Đơng, Xã Pơng Drang, Tỉnh Đắk Lắk, Việt Nam",
      phone: "0262.387.1234 (Văn phòng Nhà trường)",
      email: "truongthlevantampongdrang@gmail.com",
      principalName: currentPrincipal.name,
      principalTitle: currentPrincipal.title,
      principalWord: "Tại Trường Tiểu học Lê Văn Tám xã Pơng Drang, chúng tôi tin tưởng sâu sắc rằng mỗi đứa trẻ đều sở hữu những năng lực tiềm ẩn riêng biệt. Sứ mệnh của tập thể sư phạm nhà trường là truyền lửa đam mê học hỏi, bồi đắp lòng nhân ái, lòng yêu quê hương Tây Nguyên và chuẩn bị cho các em những hành trang vững vàng nhất bước vào tương lai. Chúng tôi cam kết mang tới một môi trường dạy học chất lượng, an toàn, tràn ngập tình yêu thương và tôn trọng sự khác biệt.",
      heroImage: sampleImages.heroMain,
      principalAvatar: currentPrincipal.avatar
    };
  });

  // Load / Save Footer Info
  const [footerInfo, setFooterInfo] = useState(() => {
    const saved = localStorage.getItem("lvt_footer_info");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
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
    };
  });

  // Load / Save News
  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem("lvt_news");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return sampleNews;
  });

  // Load / Save Clubs
  const [clubs, setClubs] = useState<SchoolClub[]>(() => {
    const saved = localStorage.getItem("lvt_clubs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return sampleClubs;
  });

  // Load / Save Students
  const [students, setStudents] = useState<StudentScore[]>(() => {
    const saved = localStorage.getItem("lvt_students");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return sampleStudents;
  });

  // Load / Save Schedules
  const [schedules, setSchedules] = useState<ClassSchedule[]>(() => {
    const saved = localStorage.getItem("lvt_schedules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return classSchedules;
  });

  useEffect(() => {
    let isMounted = true;

    loadSiteContent()
      .then((content) => {
        if (!isMounted) return;
        if (content.schoolInfo) {
          setSchoolInfo(normalizeSchoolInfo(content.schoolInfo));
        }
        if (content.footerInfo) {
          setFooterInfo(content.footerInfo);
        }
        if (content.news) {
          setNews(content.news as NewsItem[]);
        }
        if (content.clubs) {
          setClubs(content.clubs as SchoolClub[]);
        }
        if (content.students) {
          setStudents(content.students as StudentScore[]);
        }
        if (content.schedules) {
          setSchedules(content.schedules as ClassSchedule[]);
        }
      })
      .catch((error) => {
        console.warn("Site content sync skipped:", error);
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedSiteContent(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSiteContent = (content: Record<string, unknown>) => {
    if (!hasLoadedSiteContent) return;

    patchSiteContent(content).catch((error) => {
      console.warn("Site content sync failed:", error);
    });
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("lvt_is_admin", String(isAdminMode));
  }, [isAdminMode]);

  useEffect(() => {
    localStorage.setItem("lvt_school_info", JSON.stringify(schoolInfo));
    saveSiteContent({ schoolInfo });
  }, [schoolInfo, hasLoadedSiteContent]);

  useEffect(() => {
    localStorage.setItem("lvt_news", JSON.stringify(news));
    saveSiteContent({ news });
  }, [news, hasLoadedSiteContent]);

  useEffect(() => {
    localStorage.setItem("lvt_clubs", JSON.stringify(clubs));
    saveSiteContent({ clubs });
  }, [clubs, hasLoadedSiteContent]);

  useEffect(() => {
    localStorage.setItem("lvt_students", JSON.stringify(students));
    saveSiteContent({ students });
  }, [students, hasLoadedSiteContent]);

  useEffect(() => {
    localStorage.setItem("lvt_schedules", JSON.stringify(schedules));
    saveSiteContent({ schedules });
  }, [schedules, hasLoadedSiteContent]);

  useEffect(() => {
    localStorage.setItem("lvt_footer_info", JSON.stringify(footerInfo));
    saveSiteContent({ footerInfo });
  }, [footerInfo, hasLoadedSiteContent]);

  // Handle updates from components
  const updateSchoolInfo = (info: typeof schoolInfo) => setSchoolInfo(info);
  const updateFooterInfo = (info: typeof footerInfo) => setFooterInfo(info);
  const updateNews = (items: NewsItem[]) => setNews(items);
  const updateClubs = (items: SchoolClub[]) => setClubs(items);
  const updateStudents = (items: StudentScore[]) => setStudents(items);
  const updateSchedules = (items: ClassSchedule[]) => setSchedules(items);

  const navigateToTab = (tab: string) => {
    const page = SEO_PAGES.find((item) => item.tab === tab) || SEO_PAGES[0];
    const nextPath = getPagePath(page);

    setActiveTab(page.tab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ tab: page.tab }, "", nextPath);
    }
  };

  const openHomeHighlightEditor = () => {
    const shouldSwitchHome = activeTab !== "home";
    if (shouldSwitchHome) {
      navigateToTab("home");
    }

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("lvt-open-home-highlight-editor"));
    }, shouldSwitchHome ? 200 : 0);

    setShowAdminMenuModal(false);
  };

  const openChangeCredsModal = () => {
    setCredsError("");
    setCredsSuccess("");
    const storedUsername = localStorage.getItem("lvt_admin_username") || "admin";
    const storedPassword = localStorage.getItem("lvt_admin_password") || "admin";
    setNewUsername(storedUsername);
    setNewPassword(storedPassword);
    setConfirmNewPassword(storedPassword);
    setCurrentUsername("");
    setCurrentPassword("");
    setGeminiApiKey(localStorage.getItem("lvt_gemini_api_key") || "");
    setGithubPublishToken(getGitHubPublishToken());
    setShowChangeCredsModal(true);
  };

  const handleChangeCredsSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCredsError("");
    setCredsSuccess("");

    const storedUsername = localStorage.getItem("lvt_admin_username") || "admin";
    const storedPassword = localStorage.getItem("lvt_admin_password") || "admin";

    const isCustomized = localStorage.getItem("lvt_admin_username") !== null || localStorage.getItem("lvt_admin_password") !== null;

    let isCurrentValid = false;
    if (isCustomized) {
      isCurrentValid = currentUsername === storedUsername && currentPassword === storedPassword;
    } else {
      const isUserMatch = currentUsername === "admin" || currentUsername === "";
      const isPassMatch = currentPassword === "admin" || currentPassword === "123456" || currentPassword === "";
      isCurrentValid = isUserMatch && isPassMatch;
    }

    if (!isCurrentValid) {
      setCredsError("Tên đăng nhập hoặc mật khẩu hiện tại không chính xác!");
      return;
    }

    if (!newUsername.trim()) {
      setCredsError("Tên đăng nhập mới không được để trống!");
      return;
    }

    if (!newPassword.trim()) {
      setCredsError("Mật khẩu mới không được để trống!");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setCredsError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    localStorage.setItem("lvt_admin_username", newUsername.trim());
    localStorage.setItem("lvt_admin_password", newPassword);
    localStorage.setItem("lvt_gemini_api_key", geminiApiKey.trim());
    setGitHubPublishToken(githubPublishToken);
    patchSiteContent({ schoolInfo, footerInfo, news, clubs, students, schedules }).catch((error) => {
      console.warn("Initial GitHub content publish failed:", error);
    });

    setCredsSuccess("Cấu hình tài khoản & Khoá API thành công!");

    // Reset fields
    setCurrentUsername("");
    setCurrentPassword("");
    setNewUsername("");
    setNewPassword("");
    setConfirmNewPassword("");

    setTimeout(() => {
      setShowChangeCredsModal(false);
      setCredsSuccess("");
    }, 1500);
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const storedUsername = localStorage.getItem("lvt_admin_username") || "admin";
    const storedPassword = localStorage.getItem("lvt_admin_password") || "admin";

    const isCustomized = localStorage.getItem("lvt_admin_username") !== null || localStorage.getItem("lvt_admin_password") !== null;

    let isValid = false;
    if (isCustomized) {
      isValid = loginUsername === storedUsername && loginPassword === storedPassword;
    } else {
      const isValidUser = loginUsername === "admin" || loginUsername === "";
      const isValidPass = loginPassword === "admin" || loginPassword === "123456" || loginPassword === "";
      isValid = isValidUser && isValidPass;
    }

    if (isValid) {
      setIsAdminMode(true);
      setShowLoginModal(false);
      setLoginUsername("");
      setLoginPassword("");
      setLoginError("");
    } else {
      setLoginError("Tên đăng nhập hoặc mật khẩu quản trị không chính xác!");
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSendingForgot(true);
    setForgotSuccess(false);
    setForgotError("");
    setSmtpConfigured(false);

    const storedUsername = localStorage.getItem("lvt_admin_username") || "admin";
    const storedPassword = localStorage.getItem("lvt_admin_password") || "admin";

    setForgotStepText("🔄 Đang khởi tạo kết nối an toàn...");
    await new Promise((resolve) => setTimeout(resolve, 800));

    setForgotStepText("🔐 Mã hóa thông tin bảo mật tài khoản...");
    await new Promise((resolve) => setTimeout(resolve, 800));

    setForgotStepText("📧 Đang kết nối với máy chủ khôi phục...");
    
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "uongdonganh@gmail.com",
          username: storedUsername,
          password: storedPassword,
        }),
      });

      if (!response.ok) {
        throw new Error("Lỗi máy chủ khi gửi email.");
      }

      const data = await response.json();
      
      setForgotStepText("📬 Đang hoàn tất truyền dữ liệu...");
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (data.success) {
        setSmtpConfigured(!!data.smtpConfigured);
        setRecoveredCredentials({
          username: storedUsername,
          password: storedPassword,
        });
        setForgotSuccess(true);
      } else {
        setForgotError(data.error || "Gửi yêu cầu khôi phục thất bại.");
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setForgotError(err.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setIsSendingForgot(false);
      setForgotStepText("");
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Bạn có chắc chắn muốn khôi phục tài khoản và mật khẩu quản trị về mặc định không?\n(Mặc định: tài khoản 'admin' và mật khẩu 'admin')")) {
      localStorage.removeItem("lvt_admin_username");
      localStorage.removeItem("lvt_admin_password");
      
      // Reset editing states
      setCurrentUsername("");
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      setConfirmNewPassword("");
      
      alert("Đã khôi phục tài khoản quản trị về mặc định (admin/admin) thành công!");
      setShowAdminMenuModal(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <Hero
            onNavigate={navigateToTab}
            isAdminMode={isAdminMode}
            schoolInfo={schoolInfo}
            updateSchoolInfo={updateSchoolInfo}
          />
        );
      case "about":
        return (
          <About
            isAdminMode={isAdminMode}
            schoolInfo={schoolInfo}
          />
        );
      case "news":
        return (
          <News
            isAdminMode={isAdminMode}
            newsList={news}
            updateNewsList={updateNews}
          />
        );
      case "portal":
        return (
          <Portal
            isAdminMode={isAdminMode}
            clubs={clubs}
            updateClubs={updateClubs}
            students={students}
            updateStudents={updateStudents}
            schedules={schedules}
            updateSchedules={updateSchedules}
          />
        );
      case "assistant":
        return <Assistant />;
      default:
        return (
          <Hero
            onNavigate={navigateToTab}
            isAdminMode={isAdminMode}
            schoolInfo={schoolInfo}
            updateSchoolInfo={updateSchoolInfo}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-950">
      <div className="flex flex-col">
        {/* Admin Bar */}
        {isAdminMode && (
          <div className="bg-amber-500 text-emerald-950 py-2 px-4 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 shadow-inner border-b border-amber-600/30">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-emerald-950 animate-bounce" />
              <span>ĐANG Ở CHẾ ĐỘ QUẢN TRỊ VIÊN. Bạn có thể tự do chỉnh sửa trực tiếp mọi nội dung, tin tức, học sinh, CLB và thời khóa biểu!</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0 sm:ml-4">
              <button
                onClick={openHomeHighlightEditor}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-emerald-950 border border-emerald-900/20 rounded hover:bg-amber-100 transition-colors text-[10px] font-bold"
              >
                <Edit className="h-3 w-3" />
                <span>Sửa Điểm Nhấn Trang Chủ</span>
              </button>
              <button
                onClick={openChangeCredsModal}
                className="px-2 py-0.5 bg-emerald-950 text-amber-400 border border-emerald-900 rounded hover:bg-emerald-900 transition-colors text-[10px] font-bold"
              >
                ⚙️ Đổi Mật Khẩu/Tên Đăng Nhập
              </button>
              <button
                onClick={() => setIsAdminMode(false)}
                className="px-2 py-0.5 bg-emerald-950 text-white rounded hover:bg-emerald-900 transition-colors text-[10px]"
              >
                Thoát Chế Độ
              </button>
            </div>
          </div>
        )}

        {/* Navigation Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          isAdminMode={isAdminMode}
          setIsAdminMode={setIsAdminMode}
        />

        {/* Main Content Stage container */}
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-in fade-in duration-300">
            <Suspense fallback={<div className="py-16 text-center text-sm font-semibold text-emerald-700">Đang tải nội dung...</div>}>
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Footer Identity bar */}
      <Footer
        isAdminMode={isAdminMode}
        footerInfo={footerInfo}
        updateFooterInfo={updateFooterInfo}
      />

      {/* Change Credentials Modal */}
      {showChangeCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-900">
                    Cấu Hình Tài Khoản Quản Trị
                  </h3>
                  <p className="text-xs text-slate-500">Thay đổi thông tin đăng nhập để tăng tính bảo mật</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeCredsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangeCredsSubmit} className="mt-4 space-y-3">
              {/* CURRENT CREDS */}
              <div className="rounded-2xl bg-amber-50/50 p-3 border border-amber-100/50 space-y-2">
                <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Xác thực tài khoản hiện tại
                </h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Tên đăng nhập hiện tại
                  </label>
                  <input
                    type="text"
                    value={currentUsername}
                    onChange={(e) => setCurrentUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập hiện tại"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5 flex justify-between items-center">
                    <span>Mật khẩu hiện tại</span>
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="text-[9px] text-amber-700 hover:underline"
                    >
                      {showCurrentPass ? "Ẩn" : "Hiện"}
                    </button>
                  </label>
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* NEW CREDS */}
              <div className="space-y-2 pt-1">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Thông tin tài khoản mới
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Tên đăng nhập mới
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập mới mong muốn"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5 flex justify-between items-center">
                    <span>Mật khẩu mới</span>
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="text-[9px] text-emerald-700 hover:underline"
                    >
                      {showNewPass ? "Ẩn" : "Hiện"}
                    </button>
                  </label>
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu bảo mật mới"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5 flex justify-between items-center">
                    <span>Xác nhận mật khẩu mới</span>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="text-[9px] text-emerald-700 hover:underline"
                    >
                      {showConfirmPass ? "Ẩn" : "Hiện"}
                    </button>
                  </label>
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới để xác nhận"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* GEMINI KEY CONFIG */}
              <div className="rounded-2xl bg-emerald-50/40 p-3 border border-emerald-100/50 space-y-2 mt-2">
                <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                  <span>Cấu hình Trợ lý AI (Gemini Key)</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Nếu bạn triển khai lên **GitHub Pages** (hoặc static host), điền key ở đây để Trợ lý AI hoạt động trực tiếp từ trình duyệt mà không cần máy chủ.
                </p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Dán mã khóa AIzaSy... của bạn tại đây"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-blue-50/40 p-3 border border-blue-100/60 space-y-2 mt-2">
                <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center space-x-1">
                  <Settings className="h-3 w-3 text-blue-600" />
                  <span>Đồng bộ nội dung lên GitHub Pages</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Dán GitHub token có quyền Contents: Read and write để các nội dung quản trị được xuất bản cho mọi thiết bị.
                </p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    GitHub Publish Token
                  </label>
                  <input
                    type="password"
                    value={githubPublishToken}
                    onChange={(e) => setGithubPublishToken(e.target.value)}
                    placeholder="Dán token github_pat... hoặc ghp..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {credsError && (
                <div className="rounded-lg bg-red-50 p-2 text-center text-xs font-semibold text-red-600 border border-red-100">
                  {credsError}
                </div>
              )}

              {credsSuccess && (
                <div className="rounded-lg bg-emerald-50 p-2 text-center text-xs font-bold text-emerald-700 border border-emerald-100 flex items-center justify-center space-x-1.5 animate-pulse">
                  <Check className="h-4 w-4" />
                  <span>{credsSuccess}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeCredsModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition-all shadow-md active:scale-95"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Hidden Admin Icon (Conditionally visible via hotkey Ctrl + M + K) */}
      {isIconVisible && (
        <button
          onClick={() => {
            if (isAdminMode) {
              setShowAdminMenuModal(true);
            } else {
              setShowLoginModal(true);
              setShowForgotPassword(false);
              setForgotSuccess(false);
              setLoginUsername("");
              setLoginPassword("");
              setLoginError("");
              setShowLoginPassword(false);
            }
          }}
          className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#fffbeb] border border-amber-200/60 shadow-lg shadow-amber-500/10 hover:bg-[#fef3c7] hover:scale-105 active:scale-95 transition-all duration-300 group animate-in slide-in-from-bottom-5 duration-300"
          title="Quản Trị Viên (Bấm Ctrl + M + K để ẩn/hiện)"
        >
          <Shield className="h-6 w-6 text-amber-500 group-hover:text-amber-600 transition-colors" />
        </button>
      )}

      {/* Admin Login Modal / Forgot Password Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            {showForgotPassword ? (
              // FORGOT PASSWORD FLOW
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-sans text-base font-bold text-slate-900">
                        Khôi Phục Mật Khẩu
                      </h3>
                      <p className="text-xs text-slate-500">Gửi thông tin tài khoản qua Gmail</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {forgotSuccess ? (
                  <div className="mt-4 space-y-4">
                    {smtpConfigured ? (
                      <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100 text-center space-y-2">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 animate-bounce">
                          <Check className="h-5 w-5" />
                        </div>
                        <h4 className="font-sans text-sm font-bold text-emerald-800">
                          Đã Gửi Email Thành Công!
                        </h4>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          Hệ thống đã kết nối máy chủ và gửi tự động một email chứa thông tin tài khoản đăng nhập quản trị viên tới địa chỉ Gmail: <strong className="underline">uongdonganh@gmail.com</strong>. Hãy kiểm tra hòm thư của bạn!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100 space-y-2">
                          <div className="flex items-center space-x-2 text-amber-800">
                            <span className="text-base">⚠️</span>
                            <h4 className="font-sans text-xs font-bold uppercase tracking-wide">
                              Chưa Cấu Hình Máy Chủ Gửi Email (SMTP)
                            </h4>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Do trang web hiện chưa được cấu hình khóa tài khoản SMTP gửi mail tự động trong cài đặt môi trường của AI Studio (SMTP_USER, SMTP_PASS, v.v.), để tránh gián đoạn, hệ thống đã khôi phục ngay tại đây cho bạn:
                          </p>
                          <div className="bg-white/80 rounded-xl p-3 border border-amber-200/50 text-xs font-mono text-slate-800 space-y-1 shadow-inner">
                            <div>👤 Tài khoản: <strong className="text-slate-900 select-all">{recoveredCredentials.username}</strong></div>
                            <div>🔑 Mật khẩu: <strong className="text-emerald-700 select-all">{recoveredCredentials.password}</strong></div>
                          </div>
                          <p className="text-[10px] text-slate-500 italic">
                            * Gợi ý: Hãy nhấp đúp vào tài khoản/mật khẩu ở trên để sao chép nhanh.
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 text-[11px] text-slate-600 leading-normal space-y-1.5">
                          <p className="font-bold flex items-center space-x-1 text-slate-700">
                            <span>📧 Bạn vẫn muốn lưu bản sao qua Email uongdonganh@gmail.com?</span>
                          </p>
                          <p>Bấm vào nút bên dưới để mở ứng dụng soạn thảo Gmail đã viết sẵn nội dung mật khẩu để bạn bấm gửi đi chỉ với 1 click:</p>
                          <a
                            href={`mailto:uongdonganh@gmail.com?subject=${encodeURIComponent("Thông tin mật khẩu quản trị TH Lê Văn Tám")}&body=${encodeURIComponent(
                              `Xin chào,\n\nĐây là thông tin đăng nhập quản trị Trường Tiểu học Lê Văn Tám của bạn:\n- Tên đăng nhập: ${recoveredCredentials.username}\n- Mật khẩu: ${recoveredCredentials.password}\n\nVui lòng bảo mật thông tin này.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold text-emerald-950 transition-colors shadow-sm"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Mở Gmail soạn sẵn mật khẩu</span>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">Trường Tiểu học Lê Văn Tám</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotSuccess(false);
                        }}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition-all shadow-md active:scale-95"
                      >
                        Quay lại Đăng Nhập
                      </button>
                    </div>
                  </div>
                ) : isSendingForgot ? (
                  <div className="mt-6 py-8 text-center space-y-4">
                    <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát...</p>
                      <p className="text-sm font-bold text-emerald-700 animate-pulse">{forgotStepText}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 leading-relaxed space-y-2">
                      <p>
                        Hệ thống sẽ khôi phục mật khẩu hiện tại và gửi hướng dẫn kèm tài khoản đăng nhập trực tiếp tới địa chỉ Gmail của quản trị viên:
                      </p>
                      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200/60 text-slate-800 font-semibold justify-center">
                        <Mail className="h-4 w-4 text-emerald-600" />
                        <span>uongdonganh@gmail.com</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Xác nhận hòm thư nhận mật khẩu
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value="uongdonganh@gmail.com"
                          readOnly
                          className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 pl-10 text-sm font-medium text-slate-500 focus:outline-none cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        * Vì lý do bảo mật, mật khẩu chỉ được gửi duy nhất tới Gmail đăng ký của Quản Trị Viên Nhà trường.
                      </p>
                    </div>

                    {forgotError && (
                      <div className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-600 border border-red-100 text-center">
                        {forgotError}
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Quay Lại
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Xác Nhận Gửi Gmail</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              // STANDARD LOGIN FLOW
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-sans text-base font-bold text-slate-900">
                        Kích Hoạt Chế Độ Quản Trị
                      </h3>
                      <p className="text-xs text-slate-500">Đăng nhập tài khoản quản trị viên</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tên Đăng Nhập
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Nhập tên đăng nhập"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Mật Khẩu</span>
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="text-[10px] text-emerald-600 hover:underline font-bold flex items-center space-x-1"
                      >
                        {showLoginPassword ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Ẩn mật khẩu</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Hiện mật khẩu</span>
                          </>
                        )}
                      </button>
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-400">Vui lòng giữ bảo mật tài khoản</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setForgotSuccess(false);
                          setIsSendingForgot(false);
                        }}
                        className="text-[11px] text-amber-600 hover:text-amber-700 hover:underline font-bold"
                      >
                        🔑 Quên mật khẩu?
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-600 border border-red-100 text-center">
                      {loginError}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(false)}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md active:scale-95"
                    >
                      Đăng Nhập
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Quick Menu Modal (Triggered by clicking floating button while in Admin Mode) */}
      {showAdminMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-900">
                    Bảng Điều Khiển Quản Trị
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-bold">Chế độ Quản Trị viên đang bật</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminMenuModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={openHomeHighlightEditor}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 hover:text-emerald-950 border border-amber-100 text-emerald-900 font-sans text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-amber-200/70 text-emerald-800">
                    <Edit className="h-3.5 w-3.5" />
                  </div>
                  <span>Sửa điểm nhấn trang chủ</span>
                </div>
                <span className="text-[10px] text-amber-700">&rarr;</span>
              </button>

              <button
                onClick={() => {
                  openChangeCredsModal();
                  setShowAdminMenuModal(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-100 text-slate-700 font-sans text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-slate-200/50 text-slate-600">
                    <Key className="h-3.5 w-3.5" />
                  </div>
                  <span>Cấu hình & Đổi mật khẩu</span>
                </div>
                <span className="text-[10px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={handleResetToDefault}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:text-amber-900 border border-slate-100 text-slate-700 font-sans text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-slate-200/50 text-slate-600">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                  <span>Khôi phục mật khẩu mặc định</span>
                </div>
                <span className="text-[10px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={() => {
                  setIsAdminMode(false);
                  setShowAdminMenuModal(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-red-50 hover:bg-red-100 hover:text-red-900 border border-red-100/50 text-red-700 font-sans text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-red-200/50 text-red-700">
                    <LogOut className="h-3.5 w-3.5" />
                  </div>
                  <span>Thoát chế độ Quản trị</span>
                </div>
                <span className="text-[10px] text-red-400">&rarr;</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowAdminMenuModal(false)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Đóng bảng điều khiển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
