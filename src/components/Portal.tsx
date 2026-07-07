import { useState, FormEvent, useEffect, ChangeEvent, DragEvent, useRef, useMemo } from "react";
import { readSheet } from "read-excel-file/browser";
import { StudentScore, ClubRegistration, SchoolClub, ClassSchedule, ScheduleDay } from "../types";
import { Search, GraduationCap, Calendar, Clock, User, Phone, CheckCircle, FileText, Sparkles, BookOpen, Music, Palette, Award, Globe, Dribbble, ClipboardList, Edit, Trash2, Plus, Save, X, Upload, Users, Settings, Layers, Move, Check, HelpCircle, AlertTriangle, Info, Download, MessageCircle, Send } from "lucide-react";
import { loadSiteContent, patchSiteContent, safeSetLocalStorage } from "../siteContentSync";
import { sampleImages } from "../editableAssets";
import ImageUploadField from "./ImageUploadField";

// Helper to parse Class and Teacher from "Lớp 5A - GVCN: Thầy Lê Anh Tuấn"
export function parseClassAndTeacher(fullClassName: string) {
  const parts = fullClassName.split(" - GVCN: ");
  return {
    className: parts[0] || fullClassName,
    teacher: parts[1] || "Chưa phân công"
  };
}

export function getCleanClassName(fullClassName: string) {
  const { className } = parseClassAndTeacher(fullClassName);
  return className.startsWith("Lớp ") ? className : `Lớp ${className}`;
}

export function getOnlyClassName(fullClassName: string) {
  const { className } = parseClassAndTeacher(fullClassName);
  return className.replace(/^Lớp\s+/i, "");
}

export function makeFullClassName(className: string, teacher: string) {
  if (!teacher || teacher === "Chưa phân công") return className;
  return `${className} - GVCN: ${teacher}`;
}

interface PortalProps {
  isAdminMode: boolean;
  clubs: SchoolClub[];
  updateClubs: (items: SchoolClub[]) => void;
  students: StudentScore[];
  updateStudents: (items: StudentScore[]) => void;
  schedules: ClassSchedule[];
  updateSchedules: (items: ClassSchedule[]) => void;
}

type RealtimeQaMessage = { role: "parent" | "school"; content: string; time: string };

const getQaMessageKey = (message: RealtimeQaMessage, index: number) =>
  `${index}:${message.role}:${message.time}:${message.content}`;

const MAX_IMPORT_FILE_SIZE = 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
const MAX_IMPORT_TEXT_LENGTH = 250000;
const EXCEL_EXTENSIONS = [".xlsx"];

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (rows: Record<string, unknown>[], filename: string) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ].join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const isExcelFileName = (name: string) => {
  const lowerName = name.toLowerCase();
  return EXCEL_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
};

const normalizeExcelCell = (value: unknown) => {
  if (value instanceof Date) {
    return value.toLocaleDateString("vi-VN");
  }

  return String(value ?? "").replace(/\s+/g, " ").trim();
};

const excelFileToText = async (file: File) => {
  const rows = await readSheet(file);
  return rows
    .slice(0, MAX_IMPORT_ROWS)
    .map((row) => row.map(normalizeExcelCell).filter(Boolean).join(" "))
    .filter(Boolean)
    .join("\n");
};

export default function Portal({ isAdminMode, clubs, updateClubs, students, updateStudents, schedules, updateSchedules }: PortalProps) {
  const pendingSiteContentRef = useRef<Record<string, unknown>>({});
  const saveSiteContentTimerRef = useRef<number | null>(null);
  const [hasLoadedSiteContent, setHasLoadedSiteContent] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"grades" | "schedule" | "clubs" | "teachers">("grades");

  // Grades Search States
  const [studentSearchId, setStudentSearchId] = useState("");
  const [searchedStudent, setSearchedStudent] = useState<StudentScore | null>(null);
  const [searchGradesError, setSearchGradesError] = useState("");

  // Schedule States
  const [selectedScheduleClass, setSelectedScheduleClass] = useState(schedules[0]?.className || "");

  // Teacher Pool States
  const [teachers, setTeachers] = useState<string[]>(() => {
    const saved = localStorage.getItem("lvt_teachers");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        localStorage.removeItem("lvt_teachers");
      }
    }
    // Extract default teachers
    const tSet = new Set<string>();
    schedules.forEach(s => {
      const { teacher } = parseClassAndTeacher(s.className);
      if (teacher && teacher !== "Chưa phân công") tSet.add(teacher);
    });
    ["Cô Nguyễn Thị Hà", "Cô H'Nghia Niê", "Thầy Lê Anh Tuấn", "Cô Lê Thị Mai", "Thầy Nguyễn Văn Hùng", "Cô Trịnh Thị Oanh"].forEach(t => tSet.add(t));
    return Array.from(tSet);
  });

  useEffect(() => {
    safeSetLocalStorage("lvt_teachers", JSON.stringify(teachers));
    saveSiteContent({ teachers });
  }, [teachers]);

  // Synchronize selectedScheduleClass when schedules change or if the class is deleted
  useEffect(() => {
    if (selectedScheduleClass && !schedules.some(s => s.className === selectedScheduleClass)) {
      setSelectedScheduleClass(schedules[0]?.className || "");
    } else if (!selectedScheduleClass && schedules.length > 0) {
      setSelectedScheduleClass(schedules[0].className);
    }
  }, [schedules, selectedScheduleClass]);

  // vnEdu Bulk Importer States
  const [showVnEduModal, setShowVnEduModal] = useState(false);
  const [vnEduInputText, setVnEduInputText] = useState("");
  const [vnEduTargetClass, setVnEduTargetClass] = useState(parseClassAndTeacher(selectedScheduleClass).className || "5A");
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // New Class Modal State
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState(teachers[0] || "");

  // Teacher Panel State
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");

  // Timetable Drag and Drop States
  const [draggedSubject, setDraggedSubject] = useState<{ dayIdx: number; subIdx: number } | null>(null);
  const [draggedBankSubject, setDraggedBankSubject] = useState<string | null>(null);
  const [inlineEditingCell, setInlineEditingCell] = useState<{ dayIdx: number; subIdx: number } | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState("");

  // Auto-normalize schedules to 8 subjects (4 Sáng, 4 Chiều)
  useEffect(() => {
    let needsNormalize = false;
    const normalized = schedules.map(s => {
      let schNeedsNormalize = false;
      const days = s.days.map(d => {
        if (d.subjects.length < 8) {
          needsNormalize = true;
          schNeedsNormalize = true;
          let subs = [...d.subjects];
          while (subs.length < 8) {
            if (subs.length === 4) subs.push("Hoạt động TN");
            else if (subs.length === 5) subs.push("Tự học");
            else if (subs.length === 6) subs.push("Thể dục");
            else subs.push("CLB Tự chọn");
          }
          return { ...d, subjects: subs };
        }
        return d;
      });
      return schNeedsNormalize ? { ...s, days } : s;
    });

    if (needsNormalize) {
      updateSchedules(normalized);
    }
  }, [schedules, updateSchedules]);

  // Keep target class in sync with selected timetable class
  useEffect(() => {
    if (selectedScheduleClass) {
      setVnEduTargetClass(parseClassAndTeacher(selectedScheduleClass).className);
    }
  }, [selectedScheduleClass]);

  // Admission Registration States
  const defaultAdmissionInstructions = [
    "Độ tuổi quy định: Trẻ 6 tuổi (sinh năm 2020) cư trú hợp pháp tại xã Pơng Drang, huyện Krông Búk.",
    "Các bước thực hiện:",
    "Điền đầy đủ thông tin vào mẫu đăng ký tuyển sinh trực tuyến.",
    "Lưu lại mã hồ sơ tuyển sinh được cấp sau khi gửi đăng ký.",
    "Sử dụng số điện thoại cha mẹ để theo dõi tiến độ phê duyệt trực tuyến.",
    "Khi hồ sơ được chấp nhận: Nhà trường sẽ gửi tin nhắn/gọi điện mời cha mẹ mang bản sao khai sinh và mã số định danh tới văn phòng trường để đối chiếu chính thức."
  ].join("\n");
  const [selectedClubId, setSelectedClubId] = useState(clubs[0]?.id || "");
  const [registrationForm, setRegistrationForm] = useState({
    studentName: "",
    studentClass: "",
    parentName: "",
    parentPhone: "",
    birthDate: "",
    gender: "Nam",
    address: "",
    notes: ""
  });
  const [registrations, setRegistrations] = useState<ClubRegistration[]>(() => {
    const saved = localStorage.getItem("lvt_admission_registrations");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [admissionInstructions, setAdmissionInstructions] = useState(() => localStorage.getItem("lvt_admission_instructions") || defaultAdmissionInstructions);
  const [isEditingAdmissionInstructions, setIsEditingAdmissionInstructions] = useState(false);
  const [instructionDraft, setInstructionDraft] = useState(admissionInstructions);
  const [isQaOpen, setIsQaOpen] = useState(false);
  const [qaInput, setQaInput] = useState("");
  const qaMessagesEndRef = useRef<HTMLDivElement>(null);
  const previousLatestParentKeyRef = useRef("");
  const [lastSeenParentQaKey, setLastSeenParentQaKey] = useState(() => localStorage.getItem("lvt_last_seen_parent_qa") || "");
  const [qaAdminNotice, setQaAdminNotice] = useState<RealtimeQaMessage | null>(null);
  const [qaMessages, setQaMessages] = useState<RealtimeQaMessage[]>(() => {
    const saved = localStorage.getItem("lvt_realtime_qa_messages");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        role: "school",
        content: "Xin chào quý phụ huynh. Nhà trường sẵn sàng hỗ trợ về tuyển sinh, hồ sơ và lịch học.",
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      }
    ];
  });

  useEffect(() => {
    safeSetLocalStorage("lvt_admission_registrations", JSON.stringify(registrations));
    saveSiteContent({ admissionRegistrations: registrations });
  }, [registrations]);

  useEffect(() => {
    safeSetLocalStorage("lvt_admission_instructions", admissionInstructions);
    saveSiteContent({ admissionInstructions });
  }, [admissionInstructions]);

  useEffect(() => {
    safeSetLocalStorage("lvt_realtime_qa_messages", JSON.stringify(qaMessages));
    saveSiteContent({ realtimeQaMessages: qaMessages });
  }, [qaMessages]);

  // --- CMS MODALS STATES ---
  // Student Modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState({
    id: "",
    name: "",
    className: "",
    birthDate: "",
    avatar: "",
    math: 10,
    vietnamese: 10,
    science: 10,
    english: 10,
    historyGeo: 10,
    informatics: 10,
    conduct: "Tốt" as any,
    comment: "",
    rank: "Hoàn thành xuất sắc"
  });

  // Club Modal
  const [showClubModal, setShowClubModal] = useState(false);
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [clubForm, setClubForm] = useState({
    id: "",
    name: "",
    description: "",
    schedule: "",
    teacher: "",
    iconName: "BookOpen",
    color: "from-emerald-50 to-teal-600"
  });

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleClass, setEditingScheduleClass] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ClassSchedule | null>(null);

  // --- GRADES LOOKUP CLASS MANAGEMENT ---
  const [selectedLookupClass, setSelectedLookupClass] = useState<string>("Tất cả");
  const [addedLookupClasses, setAddedLookupClasses] = useState<string[]>(() => {
    const saved = localStorage.getItem("lvt_added_lookup_classes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        localStorage.removeItem("lvt_added_lookup_classes");
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetLocalStorage("lvt_added_lookup_classes", JSON.stringify(addedLookupClasses));
    saveSiteContent({ addedLookupClasses });
  }, [addedLookupClasses]);

  useEffect(() => {
    let isMounted = true;

    loadSiteContent()
      .then((content) => {
        if (!isMounted) return;
        if (content.teachers && !localStorage.getItem("lvt_teachers")) {
          setTeachers(content.teachers as string[]);
        }
        if (content.admissionRegistrations) {
          setRegistrations(content.admissionRegistrations as ClubRegistration[]);
        }
        if (content.admissionInstructions) {
          setAdmissionInstructions(String(content.admissionInstructions));
        }
        if (content.realtimeQaMessages) {
          setQaMessages(content.realtimeQaMessages as RealtimeQaMessage[]);
        }
        if (content.addedLookupClasses && !localStorage.getItem("lvt_added_lookup_classes")) {
          setAddedLookupClasses(content.addedLookupClasses as string[]);
        }
      })
      .catch((error) => {
        console.warn("Portal content sync skipped:", error);
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

  useEffect(() => {
    if (!hasLoadedSiteContent || (!isQaOpen && !isAdminMode)) return;

    let isMounted = true;
    const syncRealtimeQaMessages = async () => {
      try {
        const content = await loadSiteContent();
        const incoming = content.realtimeQaMessages;
        if (!isMounted || !Array.isArray(incoming)) return;

        setQaMessages((current) => {
          const next = incoming as RealtimeQaMessage[];
          return JSON.stringify(current) === JSON.stringify(next) ? current : next;
        });
      } catch (error) {
        console.warn("Realtime Q&A sync skipped:", error);
      }
    };

    syncRealtimeQaMessages();
    const syncTimer = window.setInterval(syncRealtimeQaMessages, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(syncTimer);
    };
  }, [hasLoadedSiteContent, isQaOpen, isAdminMode]);

  useEffect(() => {
    if (isQaOpen) {
      qaMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isQaOpen, qaMessages]);

  const parentQaMessages = useMemo(
    () => qaMessages
      .map((message, index) => ({ message, key: getQaMessageKey(message, index) }))
      .filter((item) => item.message.role === "parent"),
    [qaMessages]
  );
  const latestParentQa = parentQaMessages[parentQaMessages.length - 1] || null;
  const lastSeenParentIndex = parentQaMessages.findIndex((item) => item.key === lastSeenParentQaKey);
  const unreadParentQaCount = isAdminMode
    ? lastSeenParentIndex === -1
      ? parentQaMessages.length
      : Math.max(parentQaMessages.length - lastSeenParentIndex - 1, 0)
    : 0;

  useEffect(() => {
    if (!isAdminMode || !latestParentQa) return;

    if (!previousLatestParentKeyRef.current) {
      previousLatestParentKeyRef.current = latestParentQa.key;
      return;
    }

    if (previousLatestParentKeyRef.current !== latestParentQa.key) {
      previousLatestParentKeyRef.current = latestParentQa.key;
      if (!isQaOpen && latestParentQa.key !== lastSeenParentQaKey) {
        setQaAdminNotice(latestParentQa.message);
      }
    }
  }, [isAdminMode, isQaOpen, lastSeenParentQaKey, latestParentQa]);

  useEffect(() => {
    if (!isAdminMode || !isQaOpen || !latestParentQa) return;

    setLastSeenParentQaKey(latestParentQa.key);
    localStorage.setItem("lvt_last_seen_parent_qa", latestParentQa.key);
    setQaAdminNotice(null);
  }, [isAdminMode, isQaOpen, latestParentQa]);

  const saveSiteContent = (content: Record<string, unknown>) => {
    if (!hasLoadedSiteContent || !isAdminMode) return;

    pendingSiteContentRef.current = {
      ...pendingSiteContentRef.current,
      ...content,
    };

    if (saveSiteContentTimerRef.current) {
      window.clearTimeout(saveSiteContentTimerRef.current);
    }

    saveSiteContentTimerRef.current = window.setTimeout(() => {
      const patch = pendingSiteContentRef.current;
      pendingSiteContentRef.current = {};
      saveSiteContentTimerRef.current = null;

      patchSiteContent(patch).catch((error) => {
        console.warn("Portal content sync failed:", error);
      });
    }, 900);
  };

  const [showAddLookupClassModal, setShowAddLookupClassModal] = useState(false);
  const [newLookupClassName, setNewLookupClassName] = useState("");

  // Custom Confirmation & Alert Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "success" | "error" | "info" | "warning";
  } | null>(null);

  const triggerConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    type: "danger" | "warning" | "info" = "danger",
    confirmText: string = "Xác nhận xóa",
    cancelText: string = "Hủy bỏ"
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      confirmText,
      cancelText,
      type
    });
  };

  const triggerAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setAlertDialog({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const lookupClasses = Array.from(new Set([
    "Tất cả",
    ...students.map(s => s.className),
    ...addedLookupClasses
  ])).filter(Boolean).sort((a, b) => {
    if (a === "Tất cả") return -1;
    if (b === "Tất cả") return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  const handleAddLookupClass = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = newLookupClassName.trim().toUpperCase();
    if (!cleanName) return;

    if (lookupClasses.some(c => c.toUpperCase() === cleanName)) {
      triggerAlert("Cảnh báo", `Lớp học "${cleanName}" đã tồn tại!`, "warning");
      return;
    }

    setAddedLookupClasses([...addedLookupClasses, cleanName]);
    setSelectedLookupClass(cleanName);
    setShowAddLookupClassModal(false);
    setNewLookupClassName("");
  };

  const handleDeleteLookupClass = (className: string) => {
    if (className === "Tất cả") return;
    
    const count = students.filter(s => s.className === className).length;
    const confirmMessage = count > 0 
      ? `Bạn có chắc chắn muốn xóa lớp học "${className}" không?\nLƯU Ý: Lớp này hiện có ${count} học sinh. Việc xóa lớp sẽ XÓA TOÀN BỘ học sinh và điểm số của lớp này khỏi hệ thống!`
      : `Bạn có chắc chắn muốn xóa lớp học "${className}" trống này không?`;

    triggerConfirm(
      "Xóa lớp học",
      confirmMessage,
      () => {
        if (count > 0) {
          const remainingStudents = students.filter(s => s.className !== className);
          updateStudents(remainingStudents);
        }
        setAddedLookupClasses(addedLookupClasses.filter(c => c !== className));
        
        if (selectedLookupClass === className) {
          setSelectedLookupClass("Tất cả");
        }
        
        if (searchedStudent && searchedStudent.className === className) {
          setSearchedStudent(null);
        }
        triggerAlert("Thành công", `Đã xóa lớp học "${className}" thành công.`, "success");
      },
      "danger",
      "Xóa lớp học"
    );
  };

  const filteredStudents = students.filter(s => {
    if (selectedLookupClass === "Tất cả") return true;
    return s.className === selectedLookupClass;
  });

  // --- SEARCH HANDLER ---
  const handleSearchGrades = (e: FormEvent) => {
    e.preventDefault();
    setSearchGradesError("");
    setSearchedStudent(null);

    if (!studentSearchId.trim()) {
      setSearchGradesError("Vui lòng nhập mã học sinh hoặc tên học sinh.");
      return;
    }

    const found = students.find(
      (s) => s.id.toLowerCase() === studentSearchId.trim().toLowerCase() ||
             s.name.toLowerCase().includes(studentSearchId.trim().toLowerCase())
    );

    if (found) {
      setSearchedStudent(found);
    } else {
      setSearchGradesError("Không tìm thấy học sinh phù hợp. Gợi ý: LVT-2026-01, Nguyễn Minh Anh, H'Riêk Niê...");
    }
  };

  // --- VNEDU BULK IMPORTER HANDLERS ---
  const handleVnEduFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportSuccess("");

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setImportError("File Excel quá lớn. Vui lòng tải file tối đa 1MB để đảm bảo an toàn.");
      e.target.value = "";
      return;
    }

    if (!isExcelFileName(file.name)) {
      setImportError("Chỉ hỗ trợ tải file Excel định dạng .xlsx.");
      e.target.value = "";
      return;
    }

    excelFileToText(file)
      .then((text) => {
        if (!text) {
          setImportError("Không đọc được dữ liệu trong file Excel. Vui lòng kiểm tra sheet đầu tiên.");
          return;
        }

        setVnEduInputText(text);
        handleParseVnEdu(text);
      })
      .catch((error: any) => {
        setImportError(`Không thể đọc file Excel: ${error.message || "File không hợp lệ."}`);
      });
    e.target.value = "";
  };

  const handleParseVnEdu = (textToParse: string) => {
    setImportError("");
    setParsedStudents([]);

    if (textToParse.length > MAX_IMPORT_TEXT_LENGTH) {
      setImportError("Nội dung nhập quá dài. Vui lòng chia nhỏ file hoặc bảng điểm trước khi nhập.");
      return;
    }

    if (!textToParse.trim()) {
      setImportError("Vui lòng tải file Excel .xlsx từ vnEdu.");
      return;
    }

    try {
      const lines = textToParse.split("\n");
      const results: any[] = [];
      
      // Auto detect target class from text if possible (e.g., Lớp: 5A or Lớp 5A)
      let detectedClass = vnEduTargetClass || "5A";
      const classMatch = textToParse.match(/Lớp:\s*([0-9A-Za-z]+)/i) || textToParse.match(/Lớp\s*([0-9A-Za-z]+)/i);
      if (classMatch) {
        detectedClass = classMatch[1].trim();
        setVnEduTargetClass(detectedClass);
      }

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Pattern for birthday DD/MM/YYYY
        const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (!dateMatch) continue;

        const birthDate = dateMatch[1];
        const dateIndex = line.indexOf(birthDate);

        // Student name is the text before birthdate
        let preDate = line.substring(0, dateIndex).trim();
        
        // Remove leading STT number
        preDate = preDate.replace(/^\d+\s+/, "").trim();
        preDate = preDate.replace(/^\d+/, "").trim(); // backup if there is no space
        
        // Remove trailing checkmarks, spaces or "Nữ" (gender flag)
        preDate = preDate.replace(/\s*[✓✓xX]\s*$/, "").trim();
        preDate = preDate.replace(/\s+Nữ\s*$/i, "").trim();

        const name = preDate || "Học sinh";

        // Extract numbers after the birth date
        const postDate = line.substring(dateIndex + birthDate.length);
        const numberMatches = postDate.match(/(\d+(?:\.\d+)?)/g);

        const grades = {
          vietnamese: 10,
          math: 10,
          science: 10,
          historyGeo: 10,
          english: 10,
          informatics: 10
        };

        if (numberMatches && numberMatches.length >= 1) {
          const numbers = numberMatches.map(n => parseFloat(n));
          // Standard primary school subject ordering in vnEdu summary:
          // 0: Tiếng Việt, 1: Toán, 2: Khoa học, 3: Lịch sử và Địa lí, 4: Ngoại ngữ 1, 5: Tin học
          if (numbers.length >= 1) grades.vietnamese = numbers[0];
          if (numbers.length >= 2) grades.math = numbers[1];
          if (numbers.length >= 3) grades.science = numbers[2];
          if (numbers.length >= 4) grades.historyGeo = numbers[3];
          if (numbers.length >= 5) grades.english = numbers[4];
          if (numbers.length >= 6) grades.informatics = numbers[5];
        }

        // Auto ranking based on scores or keyword
        let rank = "Hoàn thành tốt";
        if (grades.math >= 9 && grades.vietnamese >= 9) {
          rank = "Hoàn thành xuất sắc";
        }
        if (line.includes("xuất sắc") || line.includes("Xuất sắc")) {
          rank = "Hoàn thành xuất sắc";
        } else if (line.includes("Cần cố gắng") || line.includes("Chưa hoàn thành")) {
          rank = "Chưa hoàn thành";
        }

        // Conduct
        let conduct = "Tốt";
        if (line.includes("Khá")) conduct = "Khá";
        else if (line.includes("Đạt")) conduct = "Đạt";
        else if (line.includes("Cần cố gắng")) conduct = "Cần cố gắng";

        const tempId = `LVT-${birthDate.split("/").reverse()[0] || "2026"}-${String(results.length + 1).padStart(2, "0")}`;

        results.push({
          id: tempId,
          name,
          className: detectedClass,
          birthDate,
          avatar: sampleImages.studentDefault,
          grades,
          conduct,
          comment: `Học sinh học tập tích cực, rèn luyện tốt các năng lực cốt lõi.`,
          rank
        });
      }

      if (results.length === 0) {
        setImportError("Không tìm thấy dữ liệu học sinh nào hợp lệ. Hãy kiểm tra định dạng văn bản (phải chứa tên và ngày sinh dạng DD/MM/YYYY).");
      } else {
        setParsedStudents(results);
      }
    } catch (err: any) {
      setImportError("Lỗi khi phân tích dữ liệu: " + err.message);
    }
  };

  const handleImportConfirm = () => {
    if (parsedStudents.length === 0) return;

    const updatedStudents = [...students];

    parsedStudents.forEach(newStu => {
      // Avoid duplicate IDs
      let finalId = newStu.id;
      let counter = 1;
      while (updatedStudents.some(s => s.id === finalId)) {
        const parts = newStu.id.split("-");
        finalId = `${parts[0]}-${parts[1] || "2026"}-${String(parseInt(parts[2] || "0") + counter).padStart(2, "0")}`;
        counter++;
      }
      
      updatedStudents.push({
        ...newStu,
        id: finalId,
        className: vnEduTargetClass // Apply selected target class
      });
    });

    updateStudents(updatedStudents);
    setImportSuccess(`Đã cập nhật thành công ${parsedStudents.length} học sinh từ vnEdu vào lớp ${vnEduTargetClass}!`);
    setParsedStudents([]);
    setVnEduInputText("");
    
    setTimeout(() => {
      setImportSuccess("");
      setShowVnEduModal(false);
    }, 2000);
  };

  // --- TEACHER POOL MANAGEMENT HANDLERS ---
  const handleAddTeacher = (e: FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    if (teachers.includes(newTeacherName.trim())) {
      triggerAlert("Cảnh báo", "Tên giáo viên này đã tồn tại trong danh sách!", "warning");
      return;
    }
    setTeachers([...teachers, newTeacherName.trim()]);
    setNewTeacherName("");
    triggerAlert("Thành công", "Đã thêm giáo viên mới thành công.", "success");
  };

  const handleDeleteTeacher = (name: string) => {
    triggerConfirm(
      "Xóa giáo viên",
      `Bạn có chắc muốn xóa giáo viên "${name}" ra khỏi danh sách trường?\nLƯU Ý: Các lớp đang do giáo viên này chủ nhiệm sẽ chuyển sang trạng thái "Chưa phân công".`,
      () => {
        setTeachers(teachers.filter(t => t !== name));
        
        // Update schedules to set teacher to "Chưa phân công" for classes with this teacher
        const updatedSchedules = schedules.map(s => {
          const { className, teacher } = parseClassAndTeacher(s.className);
          if (teacher === name) {
            const newFullClassName = makeFullClassName(className, "Chưa phân công");
            return {
              ...s,
              className: newFullClassName
            };
          }
          return s;
        });
        updateSchedules(updatedSchedules);
        triggerAlert("Thành công", `Đã xóa giáo viên "${name}" ra khỏi danh sách trường.`, "success");
      },
      "danger",
      "Xóa giáo viên"
    );
  };

  // --- DYNAMIC TIMETABLE CLASS SCHEDULE HANDLERS ---
  const handleAddNewClass = (e: FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const fullClassString = makeFullClassName(newClassName.trim(), newClassTeacher);
    if (schedules.some(s => parseClassAndTeacher(s.className).className.toLowerCase() === newClassName.trim().toLowerCase())) {
      triggerAlert("Cảnh báo", "Lớp học này đã tồn tại thời khóa biểu!", "warning");
      return;
    }

    const defaultDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"].map(day => ({
      day,
      subjects: ["Chào cờ", "Toán", "Tiếng Việt", "Tự học", "Hoạt động TN", "Kỹ thuật", "Mỹ thuật", "Sinh hoạt lớp"]
    }));

    const newSchedule: ClassSchedule = {
      className: fullClassString,
      days: defaultDays
    };

    const updatedSchedules = [...schedules, newSchedule];
    updateSchedules(updatedSchedules);
    setSelectedScheduleClass(fullClassString);
    setShowNewClassModal(false);
    setNewClassName("");
    triggerAlert("Thành công", `Đã thêm thời khóa biểu mới cho lớp ${newClassName}!`, "success");
  };

  const handleDeleteClass = (fullClassString: string) => {
    const { className } = parseClassAndTeacher(fullClassString);
    triggerConfirm(
      "Xóa thời khóa biểu",
      `Bạn có chắc muốn xóa toàn bộ thời khóa biểu của lớp "${className}"? Hành động này sẽ không thể khôi phục!`,
      () => {
        const remaining = schedules.filter(s => s.className !== fullClassString);
        updateSchedules(remaining);
        if (selectedScheduleClass === fullClassString) {
          if (remaining.length > 0) {
            setSelectedScheduleClass(remaining[0].className);
          } else {
            setSelectedScheduleClass("");
          }
        }
        triggerAlert("Thành công", `Đã xóa thành công thời khóa biểu của lớp "${className}".`, "success");
      },
      "danger",
      "Xóa thời khóa biểu"
    );
  };

  const handleUpdateClassTeacher = (fullClassString: string, targetTeacher: string) => {
    const { className } = parseClassAndTeacher(fullClassString);
    const newFullClassString = makeFullClassName(className, targetTeacher);

    const updated = schedules.map(s => {
      if (s.className === fullClassString) {
        return { ...s, className: newFullClassString };
      }
      return s;
    });

    updateSchedules(updated);
    setSelectedScheduleClass(newFullClassString);
  };

  // --- TIMETABLE DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: DragEvent, dayIdx: number, subIdx: number) => {
    if (!isAdminMode) return;
    setDraggedSubject({ dayIdx, subIdx });
    setDraggedBankSubject(null);
    e.dataTransfer.setData("text/plain", schedules.find(s => s.className === selectedScheduleClass)?.days[dayIdx].subjects[subIdx] || "");
  };

  const handleBankDragStart = (e: DragEvent, subject: string) => {
    if (!isAdminMode) return;
    setDraggedBankSubject(subject);
    setDraggedSubject(null);
    e.dataTransfer.setData("text/plain", subject);
  };

  const handleDrop = (e: DragEvent, dayIdx: number, subIdx: number) => {
    if (!isAdminMode) return;
    e.preventDefault();

    const currentSchedule = schedules.find(s => s.className === selectedScheduleClass);
    if (!currentSchedule) return;

    const updatedSchedules = schedules.map(s => {
      if (s.className !== selectedScheduleClass) return s;

      const newDays = s.days.map((d, dIdx) => {
        if (dIdx === dayIdx) {
          const newSubs = [...d.subjects];
          if (draggedBankSubject) {
            newSubs[subIdx] = draggedBankSubject;
          } else if (draggedSubject) {
            // Check if dropped on the exact same cell
            if (draggedSubject.dayIdx === dayIdx && draggedSubject.subIdx === subIdx) return d;

            const sourceSubject = s.days[draggedSubject.dayIdx].subjects[draggedSubject.subIdx];
            newSubs[subIdx] = sourceSubject;
          }
          return { ...d, subjects: newSubs };
        }
        
        // Handle the source cell if we are swapping
        if (draggedSubject && dIdx === draggedSubject.dayIdx) {
          const newSubs = [...d.subjects];
          const targetSubject = s.days[dayIdx].subjects[subIdx];
          newSubs[draggedSubject.subIdx] = targetSubject;
          return { ...d, subjects: newSubs };
        }

        return d;
      });

      return { ...s, days: newDays };
    });

    updateSchedules(updatedSchedules);
    setDraggedSubject(null);
    setDraggedBankSubject(null);
  };

  const handleInlineEditCell = (dayIdx: number, subIdx: number, value: string) => {
    const cleanValue = value.trim() || "Nghỉ";
    const updated = schedules.map(s => {
      if (s.className !== selectedScheduleClass) return s;
      const newDays = s.days.map((d, dIdx) => {
        if (dIdx === dayIdx) {
          const newSubs = [...d.subjects];
          newSubs[subIdx] = cleanValue;
          return { ...d, subjects: newSubs };
        }
        return d;
      });
      return { ...s, days: newDays };
    });
    updateSchedules(updated);
    setInlineEditingCell(null);
  };

  // --- STUDENT CMS HANDLERS ---
  const handleOpenAddStudent = () => {
    const initialClass = selectedLookupClass !== "Tất cả" 
      ? selectedLookupClass 
      : (lookupClasses.find(c => c !== "Tất cả") || "4A");

    setEditingStudentId(null);
    setStudentForm({
      id: "LVT-2026-" + String(students.length + 1).padStart(2, '0'),
      name: "",
      className: initialClass,
      birthDate: "10/10/2016",
      avatar: sampleImages.studentDefault,
      math: 9,
      vietnamese: 9,
      science: 9,
      english: 9,
      historyGeo: 9,
      informatics: 9,
      conduct: "Tốt",
      comment: "Học sinh gương mẫu, tự giác.",
      rank: "Hoàn thành xuất sắc"
    });
    setShowStudentModal(true);
  };

  const handleOpenEditStudent = (student: StudentScore) => {
    setEditingStudentId(student.id);
    setStudentForm({
      id: student.id,
      name: student.name,
      className: student.className,
      birthDate: student.birthDate,
      avatar: student.avatar,
      math: student.grades.math,
      vietnamese: student.grades.vietnamese,
      science: student.grades.science,
      english: student.grades.english,
      historyGeo: student.grades.historyGeo,
      informatics: student.grades.informatics,
      conduct: student.conduct,
      comment: student.comment,
      rank: student.rank
    });
    setShowStudentModal(true);
  };

  const handleDeleteStudent = (studentId: string) => {
    const studentName = students.find(s => s.id === studentId)?.name || "";
    triggerConfirm(
      "Xóa học sinh",
      `Bạn có chắc chắn muốn xóa học sinh "${studentName}" (Mã: ${studentId}) khỏi hệ thống? Hành động này không thể hoàn tác!`,
      () => {
        const updated = students.filter(s => s.id !== studentId);
        updateStudents(updated);
        if (searchedStudent && searchedStudent.id === studentId) {
          setSearchedStudent(null);
        }
        triggerAlert("Thành công", `Đã xóa học sinh "${studentName}" thành công.`, "success");
      },
      "danger",
      "Xóa học sinh"
    );
  };

  const handleSaveStudent = (e: FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.id) {
      triggerAlert("Cảnh báo", "Họ tên và Mã học sinh không được bỏ trống.", "warning");
      return;
    }

    const newStudent: StudentScore = {
      id: studentForm.id,
      name: studentForm.name,
      className: studentForm.className,
      birthDate: studentForm.birthDate,
      avatar: studentForm.avatar || sampleImages.studentDefault,
      grades: {
        math: Number(studentForm.math),
        vietnamese: Number(studentForm.vietnamese),
        science: Number(studentForm.science),
        english: Number(studentForm.english),
        historyGeo: Number(studentForm.historyGeo),
        informatics: Number(studentForm.informatics)
      },
      conduct: studentForm.conduct,
      comment: studentForm.comment,
      rank: studentForm.rank
    };

    if (editingStudentId) {
      const updated = students.map(s => s.id === editingStudentId ? newStudent : s);
      updateStudents(updated);
      if (searchedStudent && searchedStudent.id === editingStudentId) {
        setSearchedStudent(newStudent);
      }
    } else {
      updateStudents([...students, newStudent]);
    }

    setShowStudentModal(false);
  };

  // --- CLUB CMS HANDLERS ---
  const handleOpenAddClub = () => {
    setEditingClubId(null);
    setClubForm({
      id: "club-" + Date.now(),
      name: "",
      description: "",
      schedule: "Chiều Thứ Hai (15h30 - 17h00)",
      teacher: "Thầy/Cô phụ trách",
      iconName: "BookOpen",
      color: "from-blue-500 to-indigo-600"
    });
    setShowClubModal(true);
  };

  const handleOpenEditClub = (club: SchoolClub) => {
    setEditingClubId(club.id);
    setClubForm({ ...club });
    setShowClubModal(true);
  };

  const handleDeleteClub = (clubId: string) => {
    const clubName = clubs.find(c => c.id === clubId)?.name || "";
    triggerConfirm(
      "Xóa câu lạc bộ",
      `Bạn có chắc chắn muốn xóa Câu lạc bộ "${clubName}" không? Các đăng ký tham gia của học sinh đối với CLB này sẽ bị hủy bỏ!`,
      () => {
        const updated = clubs.filter(c => c.id !== clubId);
        updateClubs(updated);
        if (selectedClubId === clubId && updated.length > 0) {
          setSelectedClubId(updated[0].id);
        }
        triggerAlert("Thành công", `Đã xóa câu lạc bộ "${clubName}" thành công.`, "success");
      },
      "danger",
      "Xóa câu lạc bộ"
    );
  };

  const handleSaveClub = (e: FormEvent) => {
    e.preventDefault();
    if (!clubForm.name || !clubForm.description) {
      triggerAlert("Cảnh báo", "Tên và mô tả câu lạc bộ không được để trống.", "warning");
      return;
    }

    if (editingClubId) {
      const updated = clubs.map(c => c.id === editingClubId ? clubForm : c);
      updateClubs(updated);
    } else {
      updateClubs([...clubs, clubForm]);
    }

    setShowClubModal(false);
  };

  // --- SCHEDULE CMS HANDLERS ---
  const handleOpenEditSchedule = () => {
    const current = schedules.find(s => s.className === selectedScheduleClass);
    if (current) {
      setEditingScheduleClass(selectedScheduleClass);
      // Deep copy
      setScheduleForm(JSON.parse(JSON.stringify(current)));
      setShowScheduleModal(true);
    }
  };

  const handleSaveSchedule = (e: FormEvent) => {
    e.preventDefault();
    if (scheduleForm) {
      const updated = schedules.map(s => s.className === editingScheduleClass ? scheduleForm : s);
      updateSchedules(updated);
      setShowScheduleModal(false);
    }
  };

  const handleSubjectChange = (dayIdx: number, subIdx: number, val: string) => {
    if (scheduleForm) {
      const updated = { ...scheduleForm };
      updated.days[dayIdx].subjects[subIdx] = val;
      setScheduleForm(updated);
    }
  };

  // --- ADMISSION REGISTRATION FORM ---
  const handleClubRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!registrationForm.studentName || !registrationForm.birthDate || !registrationForm.address || !registrationForm.parentName || !registrationForm.parentPhone) {
      triggerAlert("Cảnh báo", "Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "warning");
      return;
    }

    const newReg: ClubRegistration = {
      ...registrationForm,
      studentClass: "Tuyển sinh lớp 1",
      clubId: "admission-grade-1",
      status: "Đã tiếp nhận",
      registeredAt: new Date().toLocaleString("vi-VN")
    };

    setRegistrations([newReg, ...registrations]);
    setRegistrationSuccess(true);

    setRegistrationForm({
      studentName: "",
      studentClass: "",
      parentName: "",
      parentPhone: "",
      birthDate: "",
      gender: "Nam",
      address: "",
      notes: ""
    });

    setTimeout(() => {
      setRegistrationSuccess(false);
    }, 5000);
  };

  const handleSaveAdmissionInstructions = () => {
    const clean = instructionDraft.trim();
    if (!clean) {
      triggerAlert("Cảnh báo", "Nội dung hướng dẫn nộp hồ sơ không được để trống.", "warning");
      return;
    }
    setAdmissionInstructions(clean);
    setIsEditingAdmissionInstructions(false);
    triggerAlert("Thành công", "Đã cập nhật hướng dẫn nộp hồ sơ.", "success");
  };

  const handleDownloadAdmissionRegistrations = () => {
    if (registrations.length === 0) {
      triggerAlert("Thông báo", "Chưa có hồ sơ đăng ký tuyển sinh để tải về.", "info");
      return;
    }

    const rows = registrations.map((reg, index) => ({
      "STT": index + 1,
      "Họ tên phụ huynh": reg.parentName,
      "Số điện thoại": reg.parentPhone,
      "Họ tên học sinh": reg.studentName,
      "Ngày sinh": reg.birthDate || "",
      "Giới tính": reg.gender || "",
      "Địa chỉ thường trú/tạm trú": reg.address || "",
      "Nguyện vọng/Ghi chú": reg.notes || "",
      "Trạng thái": reg.status || "Đã tiếp nhận",
      "Thời gian đăng ký": reg.registeredAt
    }));
    downloadCsv(rows, `danh-sach-dang-ky-tuyen-sinh-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleSendQaMessage = (e: FormEvent) => {
    e.preventDefault();
    const content = qaInput.trim();
    if (!content) return;

    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setQaMessages(prev => [...prev, { role: isAdminMode ? "school" : "parent", content, time }]);
    setQaInput("");
  };

  const renderClubIcon = (iconName: string) => {
    switch (iconName) {
      case "Music": return <Music className="h-5 w-5" />;
      case "Palette": return <Palette className="h-5 w-5" />;
      case "Award": return <Award className="h-5 w-5" />;
      case "Globe": return <Globe className="h-5 w-5" />;
      case "Dribbble": return <Dribbble className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  const scheduleData = schedules.find(s => s.className === selectedScheduleClass);

  return (
    <div className="space-y-10 py-6 font-sans relative">
      
      {/* Page Header */}
      <section className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          Hệ Thống Trực Tuyến
        </span>
        <h2 className="text-3xl font-extrabold text-emerald-950">
          Cổng Tra Cứu & Đăng Ký Trực Tuyến
        </h2>
        <p className="text-sm text-emerald-900/70">
          Giải pháp công nghệ hỗ trợ Phụ huynh và Học sinh tra cứu kết quả học tập, xem thời khóa biểu hàng ngày và đăng ký tuyển sinh lớp 1 trực tuyến.
        </p>
      </section>

      {/* Sub Tabs Controls */}
      <section className="flex justify-center">
        <div className="bg-emerald-50/70 border border-emerald-100 p-1 rounded-2xl flex space-x-1">
          <button
            onClick={() => setActiveSubTab("grades")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === "grades"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-emerald-900/60 hover:text-emerald-950"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Tra Cứu Điểm Số</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab("schedule")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === "schedule"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-emerald-900/60 hover:text-emerald-950"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Thời Khóa Biểu</span>
          </button>

          <button
            onClick={() => setActiveSubTab("clubs")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === "clubs"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-emerald-900/60 hover:text-emerald-950"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Đăng Ký Tuyển Sinh</span>
          </button>
        </div>
      </section>

      {/* 1. GRADES SEARCH VIEW */}
      {activeSubTab === "grades" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* CLASS SELECTION & MANAGEMENT ROW */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-50 shadow-sm max-w-5xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-sans text-sm font-bold text-slate-950 flex items-center space-x-1.5">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <span>Danh sách Lớp học & Sĩ số</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Chọn lớp học để xem nhanh danh sách học sinh và điểm số định kỳ
                </p>
              </div>

              {isAdminMode && (
                <button
                  type="button"
                  onClick={() => setShowAddLookupClassModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm lớp mới</span>
                </button>
              )}
            </div>

            {/* Scrollable Class Cards */}
            <div className="flex flex-wrap gap-2.5">
              {lookupClasses.map((cls) => {
                const isSelected = selectedLookupClass === cls;
                const studentCount = cls === "Tất cả" 
                  ? students.length 
                  : students.filter(s => s.className === cls).length;

                return (
                  <div
                    key={cls}
                    className={`relative group rounded-2xl px-4 py-2.5 border transition-all duration-200 flex items-center space-x-3 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10 scale-102"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-800"
                    }`}
                    onClick={() => {
                      setSelectedLookupClass(cls);
                      setSearchedStudent(null);
                    }}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-extrabold">
                        {cls === "Tất cả" ? "Tất cả các lớp" : `Lớp ${cls}`}
                      </span>
                      <span className={`text-[10px] font-medium ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                        {studentCount} học sinh
                      </span>
                    </div>

                    {/* Delete button (Admin only, not for "Tất cả") */}
                    {isAdminMode && cls !== "Tất cả" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLookupClass(cls);
                        }}
                        className={`rounded-full p-1 transition-colors ${
                          isSelected
                            ? "hover:bg-emerald-700 text-emerald-200 hover:text-white"
                            : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                        title={`Xóa lớp ${cls}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TWO COLUMN WORKSPACE: LEFT DIRECTORY, RIGHT SEARCH/REPORT CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
            {/* Left Column: Student List in Selected Class */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-emerald-50 shadow-sm flex flex-col h-[520px]">
              <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
                <h4 className="font-sans text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>Danh sách: {selectedLookupClass === "Tất cả" ? "Tất cả học sinh" : `Lớp ${selectedLookupClass}`}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Có {filteredStudents.length} học sinh hiển thị bên dưới
                </p>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[420px] scrollbar-thin">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((stu) => {
                    const isStudentSelected = searchedStudent?.id === stu.id;
                    return (
                      <div
                        key={stu.id}
                        onClick={() => setSearchedStudent(stu)}
                        className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer group ${
                          isStudentSelected
                            ? "bg-emerald-50/80 border-emerald-200 text-emerald-950 ring-1 ring-emerald-500/20"
                            : "bg-slate-50/40 hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={stu.avatar}
                            alt={stu.name}
                            loading="lazy"
                            decoding="async"
                            className="h-9 w-9 rounded-full object-cover border border-slate-200"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{stu.name}</h5>
                            <span className="text-[10px] text-slate-400 block font-medium">Lớp {stu.className} • {stu.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          {isAdminMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(stu.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Xóa học sinh này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                            {stu.rank === "Hoàn thành xuất sắc" ? "Xuất sắc" : "Tốt"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Chưa có học sinh nào trong lớp này.</p>
                    {isAdminMode && (
                      <button
                        type="button"
                        onClick={handleOpenAddStudent}
                        className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center justify-center space-x-1 mx-auto"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Thêm học sinh thủ công</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Search bar & Detailed Score Sheet */}
            <div className="lg:col-span-8 space-y-6">
              {/* Search box & Add Student block */}
              <div className="bg-white rounded-3xl p-6 border border-emerald-50 shadow-sm space-y-4 relative animate-in fade-in duration-300">
                {isAdminMode && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleOpenAddStudent}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm thủ công</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVnEduModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Nhập từ vnEdu</span>
                    </button>
                  </div>
                )}

                <h3 className="text-base font-bold text-emerald-950 text-left pt-2 lg:pt-0">
                  Tra cứu Kết quả Học tập & Rèn luyện
                </h3>
                <p className="text-xs text-emerald-900/60 text-left">
                  Nhập mã định danh học sinh hoặc họ tên học sinh của trường Lê Văn Tám để tra cứu nhanh.
                </p>

                <form onSubmit={handleSearchGrades} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-900/40" />
                    <input
                      type="text"
                      placeholder="Ví dụ: LVT-2026-01 hoặc Nguyễn Minh Anh..."
                      value={studentSearchId}
                      onChange={(e) => setStudentSearchId(e.target.value)}
                      className="w-full rounded-xl border border-emerald-100 bg-emerald-50/20 py-3 pl-10 pr-4 text-xs font-semibold placeholder-emerald-900/40 text-emerald-950 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Tra cứu
                  </button>
                </form>

                {searchGradesError && (
                  <p className="text-xs text-red-500 font-semibold text-center bg-red-50 py-2 rounded-lg border border-red-100 animate-pulse">
                    {searchGradesError}
                  </p>
                )}
              </div>

              {/* Search Results / Detailed Score Sheet Display */}
              {searchedStudent ? (
                <div className="bg-white rounded-3xl border border-emerald-50 shadow-md p-6 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300 relative group">
                  
                  {/* CMS control for Student */}
                  {isAdminMode && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStudent(searchedStudent)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500 text-emerald-950 rounded-xl text-[10px] font-bold hover:bg-amber-400 transition-all shadow-md"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Sửa điểm / lý lịch</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(searchedStudent.id)}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-all"
                        title="Xóa học sinh này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Student basic profile */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:border-b sm:border-emerald-50 sm:pb-6">
                    <img
                      src={searchedStudent.avatar}
                      alt={searchedStudent.name}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 rounded-full object-cover border-2 border-emerald-100 shadow-sm shrink-0"
                    />
                    <div className="text-center sm:text-left space-y-1">
                      <span className="inline-block rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-0.5 text-[10px] font-bold">
                        Mã số: {searchedStudent.id}
                      </span>
                      <h4 className="text-lg font-extrabold text-emerald-950">{searchedStudent.name}</h4>
                      <div className="flex justify-center sm:justify-start gap-4 text-xs font-semibold text-emerald-900/50">
                        <span>Lớp: {searchedStudent.className}</span>
                        <span>•</span>
                        <span>Ngày sinh: {searchedStudent.birthDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grades Detail */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-900/60">Bảng điểm định kỳ năm học</h5>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 font-medium">
                      <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50 text-center">
                        <span className="block text-xs font-semibold text-emerald-900/50">Toán học</span>
                        <span className="block text-xl font-extrabold text-emerald-950 mt-1">{searchedStudent.grades.math}</span>
                      </div>
                      <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50 text-center">
                        <span className="block text-xs font-semibold text-emerald-900/50">Tiếng Việt</span>
                        <span className="block text-xl font-extrabold text-emerald-950 mt-1">{searchedStudent.grades.vietnamese}</span>
                      </div>
                      <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50 text-center">
                        <span className="block text-xs font-semibold text-emerald-900/50">Khoa học</span>
                        <span className="block text-xl font-extrabold text-emerald-950 mt-1">{searchedStudent.grades.science}</span>
                      </div>
                      <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50 text-center">
                        <span className="block text-xs font-semibold text-emerald-900/50">Tiếng Anh</span>
                        <span className="block text-xl font-extrabold text-emerald-950 mt-1">{searchedStudent.grades.english}</span>
                      </div>
                      <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50 text-center">
                        <span className="block text-xs font-semibold text-emerald-900/50">Lịch sử & Địa lý</span>
                        <span className="block text-xl font-extrabold text-emerald-950 mt-1">{searchedStudent.grades.historyGeo}</span>
                      </div>
                      <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50 text-center">
                        <span className="block text-xs font-semibold text-emerald-900/50">Tin học</span>
                        <span className="block text-xl font-extrabold text-emerald-950 mt-1">{searchedStudent.grades.informatics}</span>
                      </div>
                    </div>
                  </div>

                  {/* Conduct & Evaluation comments */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-emerald-50">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-900/50">Hạnh kiểm & Phẩm chất</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-block rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs font-bold">
                          {searchedStudent.conduct}
                        </span>
                        <span className="inline-block rounded-lg bg-amber-500 text-emerald-950 px-3 py-1 text-xs font-bold">
                          {searchedStudent.rank}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-900/50">Nhận xét của Giáo viên chủ nhiệm</span>
                      <p className="text-xs text-emerald-950 leading-relaxed italic mt-1 font-medium bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/30 whitespace-pre-line">
                        &ldquo;{searchedStudent.comment}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 border border-emerald-50 shadow-sm text-center py-16 flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Chọn hoặc tìm kiếm học sinh</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Chọn học sinh từ danh sách bên trái hoặc sử dụng ô tìm kiếm để xem bảng điểm và nhận xét chi tiết.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ADD NEW LOOKUP CLASS MODAL */}
          {showAddLookupClassModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col animate-in zoom-in-95 duration-250">
                <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-emerald-50/30">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-sans text-base font-bold text-slate-950">
                      Thêm Lớp học mới (Tra cứu)
                    </h3>
                  </div>
                  <button type="button" onClick={() => setShowAddLookupClassModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddLookupClass} className="p-6 space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Tạo một lớp học mới cho hệ thống tra cứu. Sau khi tạo, bạn có thể thêm học sinh vào lớp học này.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tên lớp mới (ví dụ: 5B, 4C, 3A...):
                    </label>
                    <input
                      type="text"
                      required
                      value={newLookupClassName}
                      onChange={(e) => setNewLookupClassName(e.target.value)}
                      placeholder="Nhập tên lớp..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 bg-slate-50/30 -mx-6 -mb-6 p-4">
                    <button
                      type="button"
                      onClick={() => setShowAddLookupClassModal(false)}
                      className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
                    >
                      Tạo Lớp Học
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. CLASS SCHEDULE VIEW */}
      {activeSubTab === "schedule" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Class Select, Add Class & Teacher Management Control Center */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-50 shadow-sm max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-emerald-950">
                  Phân Hệ Quản Lý & Tra Cứu Thời Khóa Biểu
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Hiển thị lịch học 2 buổi Sáng & Chiều. {isAdminMode && "Quyền quản trị viên: Kéo thả các môn hoặc kéo từ kho môn học để sắp xếp nhanh."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isAdminMode && (
                  <>
                    <button
                      onClick={() => setShowNewClassModal(true)}
                      className="flex items-center space-x-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm lớp mới</span>
                    </button>
                    {selectedScheduleClass && (
                      <button
                        onClick={() => handleDeleteClass(selectedScheduleClass)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold border border-red-200 transition-all active:scale-95"
                        title="Xóa lớp học hiện tại"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Xóa lớp này</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowTeacherPanel(!showTeacherPanel)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        showTeacherPanel
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>{showTeacherPanel ? "Đóng QL Giáo Viên" : "Quản lý Giáo Viên"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Class Selector and Homeroom Teacher Assign */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-emerald-50/10 p-4 rounded-2xl border border-emerald-50/50">
              <div className="space-y-1.5">
                <label htmlFor="schedule-select" className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Chọn lớp học tra cứu / chỉnh sửa:
                </label>
                <select
                  id="schedule-select"
                  value={selectedScheduleClass}
                  onChange={(e) => setSelectedScheduleClass(e.target.value)}
                  className="rounded-xl border border-emerald-100 bg-white py-2.5 px-4 text-xs font-bold text-emerald-950 focus:border-emerald-500 focus:outline-none w-full shadow-sm"
                >
                  {schedules.map((item) => {
                    const displayClassName = getCleanClassName(item.className);
                    const { teacher } = parseClassAndTeacher(item.className);
                    return (
                      <option key={item.className} value={item.className}>
                        {displayClassName} (GVCN: {teacher})
                      </option>
                    );
                  })}
                </select>
              </div>

              {scheduleData && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Giáo viên chủ nhiệm phụ trách:
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                      Mã lớp: {getOnlyClassName(scheduleData.className)}
                    </span>
                  </div>
                  {isAdminMode ? (
                    <select
                      value={parseClassAndTeacher(scheduleData.className).teacher}
                      onChange={(e) => handleUpdateClassTeacher(scheduleData.className, e.target.value)}
                      className="rounded-xl border border-emerald-100 bg-white py-2.5 px-4 text-xs font-bold text-emerald-950 focus:border-emerald-500 focus:outline-none w-full shadow-sm"
                    >
                      {teachers.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="Chưa phân công">Chưa phân công</option>
                    </select>
                  ) : (
                    <div className="bg-white border border-emerald-50/50 rounded-xl py-2.5 px-4 text-xs font-bold text-emerald-950 flex items-center space-x-2 shadow-sm">
                      <User className="h-4 w-4 text-emerald-600" />
                      <span>{parseClassAndTeacher(scheduleData.className).teacher}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Teacher Management Sidebar/Dashboard Panel */}
            {isAdminMode && showTeacherPanel && (
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-emerald-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
                      Bảng Điều Phối Danh Sách Giáo Viên Toàn Trường
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-800/30">
                    Sĩ số: {teachers.length} giáo viên
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left: Add teacher form */}
                  <form onSubmit={handleAddTeacher} className="md:col-span-4 space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Thêm giáo viên mới:
                      </label>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="VD: Cô Lê Thị Mai..."
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm giáo viên</span>
                    </button>
                  </form>

                  {/* Right: Teacher list */}
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Danh sách giáo viên trường Lê Văn Tám:
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1.5 bg-slate-950/40 rounded-xl border border-slate-800">
                      {teachers.map((tName) => (
                        <div
                          key={tName}
                          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg pl-3 pr-1.5 py-1 flex items-center space-x-2 text-xs transition-colors"
                        >
                          <span className="font-semibold">{tName}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(tName)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700/50 transition-all"
                            title="Xóa giáo viên"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      * Các giáo viên trong danh sách này sẽ xuất hiện làm lựa chọn khi phân công Giáo Viên Chủ Nhiệm (GVCN) cho lớp học.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timetable main Board - High end Tabular Weekly Grid with Morning & Afternoon */}
          {scheduleData && (
            <div className="bg-white rounded-3xl border border-emerald-50 shadow-md p-6 sm:p-8 max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-50 pb-5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase">
                      {getCleanClassName(scheduleData.className).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      GVCN: {parseClassAndTeacher(scheduleData.className).teacher}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Lịch học chính khóa 2 buổi/ngày • Trường Tiểu Học Lê Văn Tám</p>
                </div>

                {isAdminMode && (
                  <div className="flex items-center space-x-1 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200/50 text-[11px] font-bold">
                    <Move className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-pulse" />
                    <span>Kéo thả các môn để swap, kéo môn mới từ kho, hoặc click đúp vào ô để sửa!</span>
                  </div>
                )}
              </div>

              {/* Redesigned Tabular Grid (Rows: Periods 1 to 8, Cols: Days Thứ 2 to Thứ 6) */}
              <div className="overflow-x-auto rounded-2xl border border-emerald-100 shadow-sm bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/40 text-emerald-950 font-bold border-b border-emerald-100 text-[11px]">
                      <th className="py-3.5 px-4 text-center font-bold uppercase w-16">Buổi</th>
                      <th className="py-3.5 px-3 text-center font-bold uppercase w-16">Tiết</th>
                      {scheduleData.days.map((d) => (
                        <th key={d.day} className="py-3.5 px-4 text-center font-bold uppercase min-w-[120px]">
                          {d.day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Buổi Sáng: Tiết 1, 2, 3, 4 */}
                    {[0, 1, 2, 3].map((sIdx) => (
                      <tr key={sIdx} className="border-b border-emerald-50/50 hover:bg-emerald-50/10 transition-colors">
                        {sIdx === 0 && (
                          <td rowSpan={4} className="py-4 px-3 text-center font-extrabold text-emerald-900 border-r border-emerald-50/50 bg-emerald-50/20 w-16 text-xs select-none">
                            <span className="writing-mode-vertical-lr uppercase tracking-widest text-[10px] text-emerald-800 block">Sáng</span>
                          </td>
                        )}
                        <td className="py-4 px-3 text-center font-bold text-slate-400 border-r border-emerald-50/50 w-16 bg-slate-50/20">
                          Tiết {sIdx + 1}
                        </td>
                        {scheduleData.days.map((dayObj, dayIdx) => {
                          const subject = dayObj.subjects[sIdx] || "Nghỉ";
                          const isEditing = inlineEditingCell?.dayIdx === dayIdx && inlineEditingCell?.subIdx === sIdx;
                          return (
                            <td
                              key={dayIdx}
                              className="p-1 border-r border-emerald-50/50 text-center relative group"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, dayIdx, sIdx)}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={inlineEditingValue}
                                  onChange={(e) => setInlineEditingValue(e.target.value)}
                                  onBlur={() => handleInlineEditCell(dayIdx, sIdx, inlineEditingValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleInlineEditCell(dayIdx, sIdx, inlineEditingValue);
                                    if (e.key === "Escape") setInlineEditingCell(null);
                                  }}
                                  className="w-full rounded-lg border-2 border-emerald-500 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  draggable={isAdminMode}
                                  onDragStart={(e) => handleDragStart(e, dayIdx, sIdx)}
                                  className={`relative rounded-xl px-3 py-2.5 h-full text-xs font-bold shadow-sm select-none transition-all flex flex-col justify-center items-center group/cell ${
                                    isAdminMode
                                      ? "cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:border-amber-400 hover:ring-2 hover:ring-amber-300/30"
                                      : ""
                                  } ${
                                    subject === "Nghỉ" || subject === "Trống"
                                      ? "bg-slate-50 text-slate-400 border border-slate-100"
                                      : subject === "Chào cờ" || subject === "Sinh hoạt lớp"
                                      ? "bg-indigo-50 border border-indigo-100 text-indigo-900"
                                      : subject === "Toán"
                                      ? "bg-blue-50 border border-blue-100 text-blue-900"
                                      : subject === "Tiếng Việt"
                                      ? "bg-emerald-50 border border-emerald-100 text-emerald-900"
                                      : subject === "Tiếng Anh"
                                      ? "bg-pink-50 border border-pink-100 text-pink-900"
                                      : subject === "Khoa học" || subject === "Lịch sử & Địa lý"
                                      ? "bg-amber-50 border border-amber-100 text-amber-900"
                                      : "bg-teal-50 border border-teal-100 text-teal-900"
                                  }`}
                                >
                                  <span>{subject}</span>

                                  {/* Quick Action Overlay for Admin */}
                                  {isAdminMode && (
                                    <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 z-10">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setInlineEditingCell({ dayIdx, subIdx: sIdx });
                                          setInlineEditingValue(subject);
                                        }}
                                        className="p-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-md animate-in zoom-in-50 duration-100"
                                        title="Sửa môn học"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerConfirm(
                                            "Xóa tiết học",
                                            "Bạn có chắc muốn xóa/mở trống tiết học này?",
                                            () => handleInlineEditCell(dayIdx, sIdx, "Nghỉ"),
                                            "warning",
                                            "Xóa tiết"
                                          );
                                        }}
                                        className="p-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-md animate-in zoom-in-50 duration-100"
                                        title="Xóa tiết học"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {isAdminMode && (
                                    <span className="text-[8px] text-slate-400 group-hover/cell:opacity-0 transition-opacity mt-0.5 pointer-events-none">
                                      Kéo hoặc hover để chỉnh sửa
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Giữa buổi divider */}
                    <tr className="bg-slate-100/40">
                      <td colSpan={7} className="py-2 px-4 text-center font-bold text-slate-500 uppercase tracking-widest text-[9px] border-y border-emerald-50/50">
                        ☕ NGHỈ TRƯA VÀ SINH HOẠT BÁN TRÚ
                      </td>
                    </tr>

                    {/* Buổi Chiều: Tiết 5, 6, 7, 8 */}
                    {[4, 5, 6, 7].map((sIdx) => (
                      <tr key={sIdx} className="border-b border-emerald-50/50 hover:bg-emerald-50/10 transition-colors">
                        {sIdx === 4 && (
                          <td rowSpan={4} className="py-4 px-3 text-center font-extrabold text-amber-900 border-r border-emerald-50/50 bg-amber-50/10 w-16 text-xs select-none">
                            <span className="writing-mode-vertical-lr uppercase tracking-widest text-[10px] text-amber-800 block">Chiều</span>
                          </td>
                        )}
                        <td className="py-4 px-3 text-center font-bold text-slate-400 border-r border-emerald-50/50 w-16 bg-slate-50/20">
                          Tiết {sIdx + 1 - 4} (Chiều)
                        </td>
                        {scheduleData.days.map((dayObj, dayIdx) => {
                          const subject = dayObj.subjects[sIdx] || "Nghỉ";
                          const isEditing = inlineEditingCell?.dayIdx === dayIdx && inlineEditingCell?.subIdx === sIdx;
                          return (
                            <td
                              key={dayIdx}
                              className="p-1 border-r border-emerald-50/50 text-center relative group"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, dayIdx, sIdx)}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={inlineEditingValue}
                                  onChange={(e) => setInlineEditingValue(e.target.value)}
                                  onBlur={() => handleInlineEditCell(dayIdx, sIdx, inlineEditingValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleInlineEditCell(dayIdx, sIdx, inlineEditingValue);
                                    if (e.key === "Escape") setInlineEditingCell(null);
                                  }}
                                  className="w-full rounded-lg border-2 border-emerald-500 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  draggable={isAdminMode}
                                  onDragStart={(e) => handleDragStart(e, dayIdx, sIdx)}
                                  className={`relative rounded-xl px-3 py-2.5 h-full text-xs font-bold shadow-sm select-none transition-all flex flex-col justify-center items-center group/cell ${
                                    isAdminMode
                                      ? "cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:border-amber-400 hover:ring-2 hover:ring-amber-300/30"
                                      : ""
                                  } ${
                                    subject === "Nghỉ" || subject === "Trống"
                                      ? "bg-slate-50 text-slate-400 border border-slate-100"
                                      : subject === "Chào cờ" || subject === "Sinh hoạt lớp"
                                      ? "bg-indigo-50 border border-indigo-100 text-indigo-900"
                                      : subject === "Toán"
                                      ? "bg-blue-50 border border-blue-100 text-blue-900"
                                      : subject === "Tiếng Việt"
                                      ? "bg-emerald-50 border border-emerald-100 text-emerald-900"
                                      : subject === "Tiếng Anh"
                                      ? "bg-pink-50 border border-pink-100 text-pink-900"
                                      : subject === "Khoa học" || subject === "Lịch sử & Địa lý"
                                      ? "bg-amber-50 border border-amber-100 text-amber-900"
                                      : "bg-teal-50 border border-teal-100 text-teal-900"
                                  }`}
                                >
                                  <span>{subject}</span>

                                  {/* Quick Action Overlay for Admin */}
                                  {isAdminMode && (
                                    <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 z-10">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setInlineEditingCell({ dayIdx, subIdx: sIdx });
                                          setInlineEditingValue(subject);
                                        }}
                                        className="p-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-md animate-in zoom-in-50 duration-100"
                                        title="Sửa môn học"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerConfirm(
                                            "Xóa tiết học",
                                            "Bạn có chắc muốn xóa/mở trống tiết học này?",
                                            () => handleInlineEditCell(dayIdx, sIdx, "Nghỉ"),
                                            "warning",
                                            "Xóa tiết"
                                          );
                                        }}
                                        className="p-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-md animate-in zoom-in-50 duration-100"
                                        title="Xóa tiết học"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {isAdminMode && (
                                    <span className="text-[8px] text-slate-400 group-hover/cell:opacity-0 transition-opacity mt-0.5 pointer-events-none">
                                      Kéo hoặc hover để chỉnh sửa
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Subject Bank (Kho môn học) for easy drag-to-assign */}
              {isAdminMode && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-emerald-100/50 space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center space-x-2 border-b border-emerald-100/30 pb-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Kho Môn Học Sẵn Có (Dành riêng cho Giáo Viên sắp xếp nhanh)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    💡 Kéo môn học mong muốn từ kho bên dưới và <strong>thả trực tiếp</strong> vào ô thời khóa biểu ở bảng phía trên để gán lịch ngay lập tức!
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {["Toán", "Tiếng Việt", "Khoa học", "Lịch sử & Địa lý", "Tiếng Anh", "Tin học", "Công nghệ", "Đạo đức", "Mỹ thuật", "Âm nhạc", "Thể dục", "Hoạt động TN", "Tự học", "Sinh hoạt lớp", "Nghỉ"].map((sub) => (
                      <div
                        key={sub}
                        draggable
                        onDragStart={(e) => handleBankDragStart(e, sub)}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg shadow-sm cursor-grab active:cursor-grabbing border hover:scale-105 active:scale-95 transition-all select-none ${
                          sub === "Nghỉ"
                            ? "bg-slate-50 border-slate-200 text-slate-500"
                            : sub === "Toán"
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : sub === "Tiếng Việt"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : sub === "Tiếng Anh"
                            ? "bg-pink-50 border-pink-200 text-pink-800"
                            : "bg-teal-50 border-teal-200 text-teal-800"
                        }`}
                      >
                        {sub}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. ADMISSION REGISTRATION VIEW */}
      {activeSubTab === "clubs" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <section className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Phòng tuyển sinh trực tuyến</span>
            <h3 className="font-serif text-3xl font-black text-slate-950">Tuyển Sinh Lớp 1 Trực Tuyến</h3>
            <p className="text-sm text-slate-500">
              Giúp phụ huynh dễ dàng nộp đơn xét tuyển vào lớp 1 cho con nhanh chóng, tiện lợi.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 max-w-6xl mx-auto">
            <div className="lg:col-span-4 space-y-5">
              <div className="rounded-3xl bg-emerald-950 p-6 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-serif text-lg font-black text-yellow-300 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Hướng Dẫn Nộp Hồ Sơ</span>
                  </h4>
                  {isAdminMode && !isEditingAdmissionInstructions && (
                    <button
                      type="button"
                      onClick={() => {
                        setInstructionDraft(admissionInstructions);
                        setIsEditingAdmissionInstructions(true);
                      }}
                      className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                      title="Sửa hướng dẫn"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isEditingAdmissionInstructions ? (
                  <div className="space-y-3">
                    <textarea
                      value={instructionDraft}
                      onChange={(e) => setInstructionDraft(e.target.value)}
                      rows={10}
                      className="w-full rounded-2xl border border-white/20 bg-white/95 p-3 text-xs font-semibold leading-relaxed text-emerald-950 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAdmissionInstructions(false)}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAdmissionInstructions}
                        className="rounded-xl bg-yellow-300 px-4 py-2 text-xs font-black text-emerald-950 hover:bg-yellow-200"
                      >
                        Lưu hướng dẫn
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs font-bold leading-relaxed text-emerald-50">
                    {admissionInstructions.split("\n").filter(Boolean).map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-emerald-50 shadow-md space-y-5 h-fit">
              <div className="space-y-1 border-b border-slate-100 pb-4">
                <h4 className="font-serif text-lg font-black text-slate-950 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>Mẫu Đăng Ký Tuyển Sinh Trực Tuyến Lớp 1</span>
                </h4>
              </div>

              {registrationSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center text-xs text-emerald-800 font-bold flex items-center justify-center space-x-2 animate-bounce">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Nộp đơn tuyển sinh trực tuyến thành công!</span>
                </div>
              )}

              <form onSubmit={handleClubRegisterSubmit} className="space-y-3">
                <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-800 inline-flex">
                  I. Thông tin cha / mẹ / người giám hộ
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="parent-name" className="text-[10px] font-bold text-slate-700 block">Họ và Tên Phụ huynh (*):</label>
                    <input
                      id="parent-name"
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Văn Hùng"
                      value={registrationForm.parentName}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, parentName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold placeholder-slate-400 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="parent-phone" className="text-[10px] font-bold text-slate-700 block">Số điện thoại liên hệ (*):</label>
                    <input
                      id="parent-phone"
                      type="tel"
                      required
                      placeholder="Ví dụ: 0912345678"
                      value={registrationForm.parentPhone}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, parentPhone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold placeholder-slate-400 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-800 inline-flex">
                  II. Thông tin bé đăng ký học lớp 1
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="student-name" className="text-[10px] font-bold text-slate-700 block">Họ và Tên Học sinh (*):</label>
                    <input
                      id="student-name"
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Minh Khôi (nhập chữ in hoa có dấu)"
                      value={registrationForm.studentName}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, studentName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold placeholder-slate-400 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="student-birth" className="text-[10px] font-bold text-slate-700 block">Ngày sinh của bé (*):</label>
                    <input
                      id="student-birth"
                      type="date"
                      required
                      value={registrationForm.birthDate}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, birthDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="student-gender" className="text-[10px] font-bold text-slate-700 block">Giới tính (*):</label>
                    <select
                      id="student-gender"
                      value={registrationForm.gender}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, gender: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    >
                      <option>Nam</option>
                      <option>Nữ</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="student-address" className="text-[10px] font-bold text-slate-700 block">Địa chỉ thường trú / tạm trú (*):</label>
                    <input
                      id="student-address"
                      type="text"
                      required
                      placeholder="Ví dụ: Thôn 2, xã Pơng Drang, Krông Búk"
                      value={registrationForm.address}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold placeholder-slate-400 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-notes" className="text-[10px] font-bold text-slate-700 block">Nguyện vọng / Ghi chú khác (Không bắt buộc):</label>
                  <textarea
                    id="reg-notes"
                    rows={3}
                    placeholder="Ví dụ: Mong muốn đăng ký lớp bán trú, bé có năng khiếu vẽ hoặc cần chế độ dinh dưỡng đặc thù..."
                    value={registrationForm.notes}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, notes: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 px-3 text-xs font-semibold placeholder-slate-400 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-700 py-4 text-sm font-black text-white hover:bg-emerald-800 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Nộp Đơn Tuyển Sinh Trực Tuyến</span>
                </button>
              </form>
            </div>
          </div>

          {/* Admission registrations log table */}
          {(isAdminMode || registrations.length > 0) && (
            <div className="bg-white rounded-3xl border border-emerald-50 p-6 shadow-sm max-w-5xl mx-auto space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-emerald-950">Danh Sách Đăng Ký Tuyển Sinh</h4>
                {isAdminMode && (
                  <button
                    type="button"
                    onClick={handleDownloadAdmissionRegistrations}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải danh sách CSV</span>
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-50 text-emerald-900/60 font-bold">
                      <th className="py-2 px-4">Học Sinh</th>
                      <th className="py-2 px-4">Ngày Sinh</th>
                      <th className="py-2 px-4">Địa Chỉ</th>
                      <th className="py-2 px-4">Phụ Huynh</th>
                      <th className="py-2 px-4">Trạng Thái</th>
                      <th className="py-2 px-4">Thời Gian Đăng Ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.length > 0 ? registrations.map((reg, idx) => (
                      <tr key={idx} className="border-b border-emerald-50/50 hover:bg-emerald-50/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-emerald-950">{reg.studentName}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-900">{reg.birthDate}</td>
                        <td className="py-3 px-4 text-emerald-900/70">{reg.address}</td>
                        <td className="py-3 px-4 text-emerald-900/70">{reg.parentName} ({reg.parentPhone})</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                            {reg.status || "Đã tiếp nhận"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-900/50">{reg.registeredAt}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                          Chưa có hồ sơ đăng ký tuyển sinh.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Floating realtime Q&A */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {isAdminMode && qaAdminNotice && !isQaOpen && (
          <button
            type="button"
            onClick={() => setIsQaOpen(true)}
            className="max-w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left shadow-xl shadow-amber-900/10"
            title="Mở câu hỏi mới từ phụ huynh"
          >
            <div className="text-[10px] font-black uppercase text-amber-700">
              Câu hỏi mới từ phụ huynh
            </div>
            <div className="mt-1 line-clamp-2 text-xs font-semibold text-amber-950">
              {qaAdminNotice.content}
            </div>
          </button>
        )}

        {isQaOpen && (
          <div className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl animate-in slide-in-from-bottom-3 fade-in duration-200">
            <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <div>
                  <h4 className="text-sm font-black">Hỏi đáp với nhà trường</h4>
                  <p className="text-[10px] font-semibold text-emerald-50">
                    {isAdminMode ? "Chế độ phản hồi quản trị" : "Phụ huynh gửi câu hỏi trực tiếp"}
                  </p>
                  {isAdminMode && unreadParentQaCount > 0 && (
                    <p className="mt-0.5 text-[10px] font-black text-amber-200">
                      {unreadParentQaCount} câu hỏi phụ huynh chưa đọc
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQaOpen(false)}
                className="rounded-lg p-1 text-emerald-50 hover:bg-white/10"
                title="Đóng hỏi đáp"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {qaMessages.map((message, idx) => {
                const isSchool = message.role === "school";
                return (
                  <div key={idx} className={`flex ${isSchool ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                      isSchool
                        ? "bg-white text-slate-700 border border-slate-100"
                        : "bg-emerald-600 text-white"
                    }`}>
                      <div className={`mb-1 text-[9px] font-black uppercase ${isSchool ? "text-emerald-700" : "text-emerald-50"}`}>
                        {isSchool ? "Nhà trường" : "Phụ huynh"} · {message.time}
                      </div>
                      <p className="leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={qaMessagesEndRef} />
            </div>

            <form onSubmit={handleSendQaMessage} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
              <input
                type="text"
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                placeholder={isAdminMode ? "Nhập phản hồi của nhà trường..." : "Nhập câu hỏi của phụ huynh..."}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                title="Gửi tin nhắn"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsQaOpen(prev => !prev)}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-800 active:scale-95"
          title="Hỏi đáp với nhà trường"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadParentQaCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-black leading-none text-white">
              {unreadParentQaCount > 9 ? "9+" : unreadParentQaCount}
            </span>
          )}
        </button>
      </div>

      {/* --- STUDENT MODAL (ADD / EDIT) --- */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {editingStudentId ? "✏️ Chỉnh Sửa Học Sinh" : "➕ Thêm Học Sinh Mới"}
              </h3>
              <button onClick={() => setShowStudentModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mã Học Sinh</label>
                  <input
                    type="text"
                    value={studentForm.id}
                    onChange={(e) => setStudentForm({ ...studentForm, id: e.target.value })}
                    placeholder="VD: LVT-2026-05"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    disabled={!!editingStudentId}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Họ và Tên</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    placeholder="Nhập tên học sinh..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lớp</label>
                  <select
                    value={studentForm.className}
                    onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  >
                    {lookupClasses.filter(c => c !== "Tất cả").map(c => (
                      <option key={c} value={c}>Lớp {c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ngày sinh</label>
                  <input
                    type="text"
                    value={studentForm.birthDate}
                    onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
                    placeholder="VD: 15/04/2016"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <ImageUploadField
                label="Ảnh học sinh"
                value={studentForm.avatar}
                fallback={sampleImages.studentDefault}
                aspect="square"
                outputWidth={500}
                outputHeight={500}
                onChange={(avatar) => setStudentForm({ ...studentForm, avatar })}
              />

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">Bảng điểm thi học kỳ</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Toán học</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={studentForm.math}
                      onChange={(e) => setStudentForm({ ...studentForm, math: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tiếng Việt</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={studentForm.vietnamese}
                      onChange={(e) => setStudentForm({ ...studentForm, vietnamese: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Khoa học</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={studentForm.science}
                      onChange={(e) => setStudentForm({ ...studentForm, science: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tiếng Anh</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={studentForm.english}
                      onChange={(e) => setStudentForm({ ...studentForm, english: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Sử & Địa</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={studentForm.historyGeo}
                      onChange={(e) => setStudentForm({ ...studentForm, historyGeo: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tin học</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={studentForm.informatics}
                      onChange={(e) => setStudentForm({ ...studentForm, informatics: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hạnh kiểm</label>
                  <select
                    value={studentForm.conduct}
                    onChange={(e) => setStudentForm({ ...studentForm, conduct: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Tốt">Tốt</option>
                    <option value="Khá">Khá</option>
                    <option value="Đạt">Đạt</option>
                    <option value="Cần cố gắng">Cần cố gắng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Xếp loại danh hiệu</label>
                  <input
                    type="text"
                    value={studentForm.rank}
                    onChange={(e) => setStudentForm({ ...studentForm, rank: e.target.value })}
                    placeholder="VD: Hoàn thành xuất sắc"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nhận xét chi tiết của GVCN</label>
                <textarea
                  value={studentForm.comment}
                  onChange={(e) => setStudentForm({ ...studentForm, comment: e.target.value })}
                  rows={3}
                  placeholder="Nhập nhận xét về tinh thần học tập, phong trào..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setShowStudentModal(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md">
                  Lưu học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CLUB MODAL (ADD / EDIT) --- */}
      {showClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {editingClubId ? "✏️ Chỉnh Sửa Câu Lạc Bộ" : "➕ Thêm Câu Lạc Bộ Mới"}
              </h3>
              <button onClick={() => setShowClubModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClub} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên Câu Lạc Bộ</label>
                <input
                  type="text"
                  value={clubForm.name}
                  onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                  placeholder="VD: CLB Tiếng Anh Sáng Tạo"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô tả ngắn</label>
                <textarea
                  value={clubForm.description}
                  onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                  placeholder="Giới thiệu mục tiêu, lợi ích khi tham gia CLB..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lịch sinh hoạt</label>
                  <input
                    type="text"
                    value={clubForm.schedule}
                    onChange={(e) => setClubForm({ ...clubForm, schedule: e.target.value })}
                    placeholder="VD: Chiều Thứ Ba (15h30 - 17h00)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Giáo viên phụ trách</label>
                  <input
                    type="text"
                    value={clubForm.teacher}
                    onChange={(e) => setClubForm({ ...clubForm, teacher: e.target.value })}
                    placeholder="Tên giáo viên hoặc nghệ nhân..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Biểu tượng</label>
                  <select
                    value={clubForm.iconName}
                    onChange={(e) => setClubForm({ ...clubForm, iconName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Music">Music (Âm nhạc/Chiêng)</option>
                    <option value="Palette">Palette (Mỹ thuật/Khéo tay)</option>
                    <option value="Award">Award (Cờ vua/Giải thưởng)</option>
                    <option value="Globe">Globe (Tiếng Anh/Toàn cầu)</option>
                    <option value="Dribbble">Dribbble (Bóng đá/Thể thao)</option>
                    <option value="BookOpen">BookOpen (Học tập)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Dải màu (Tailwind Class)</label>
                  <select
                    value={clubForm.color}
                    onChange={(e) => setClubForm({ ...clubForm, color: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="from-amber-500 to-red-600">Đỏ Cam (Chiêng)</option>
                    <option value="from-pink-500 to-purple-600">Hồng Tím (Mỹ thuật)</option>
                    <option value="from-blue-500 to-indigo-600">Xanh Dương (Cờ vua)</option>
                    <option value="from-emerald-500 to-teal-600">Xanh Ngọc (Tiếng Anh)</option>
                    <option value="from-green-500 to-emerald-700">Xanh Lá (Thể thao)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setShowClubModal(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md">
                  Lưu Câu Lạc Bộ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SCHEDULE MODAL (EDIT) --- */}
      {showScheduleModal && scheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <h3 className="font-sans text-base font-bold text-slate-900">
                ✏️ Sửa Thời Khóa Biểu: {editingScheduleClass}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="flex-1 overflow-y-auto p-5 space-y-6">
              <p className="text-xs text-slate-500 leading-normal">Thay đổi các môn học tương ứng từ Thứ 2 đến Thứ 6. Mỗi ngày học gồm 4 Tiết học chính khóa.</p>
              
              <div className="space-y-4">
                {scheduleForm.days.map((d, dIdx) => (
                  <div key={dIdx} className="rounded-2xl border border-emerald-50 bg-emerald-50/10 p-4 space-y-3">
                    <span className="inline-block text-xs font-extrabold text-emerald-950 px-2.5 py-1 bg-emerald-100 rounded-lg">
                      {d.day}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {d.subjects.map((sub, sIdx) => (
                        <div key={sIdx}>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tiết {sIdx + 1}</label>
                          <input
                            type="text"
                            value={sub}
                            onChange={(e) => handleSubjectChange(dIdx, sIdx, e.target.value)}
                            placeholder="Môn học"
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md">
                  Cập nhật thời khóa biểu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VNEDU GRADE SHEET BULK IMPORT MODAL --- */}
      {showVnEduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-emerald-50/30">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                <h3 className="font-sans text-base font-bold text-slate-950">
                  Nhập danh sách học sinh & điểm số hàng loạt từ vnEdu
                </h3>
              </div>
              <button onClick={() => setShowVnEduModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Instructions and Format Spec */}
              <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl text-xs space-y-2 text-emerald-950">
                <div className="font-bold flex items-center space-x-1">
                  <HelpCircle className="h-4 w-4 text-emerald-700" />
                  <span>Hướng dẫn định dạng file Excel vnEdu:</span>
                </div>
                <p className="leading-relaxed">
                  Hệ thống chỉ hỗ trợ tải file <strong>Excel .xlsx</strong> kết xuất từ <strong>vnEdu</strong>. Sheet đầu tiên cần có dữ liệu học sinh, gồm <strong>Họ tên</strong>, <strong>Ngày sinh (DD/MM/YYYY)</strong> và <strong>Dãy điểm số định kỳ</strong>.
                </p>
                <div className="bg-white/80 p-2.5 rounded-xl font-mono text-[10px] text-emerald-900 border border-emerald-100 mt-1">
                  Ví dụ dòng mẫu:<br />
                  1 Nguyễn Minh Anh 12/05/2016 ✓ Nữ 9.5 9 10 9 8 9.5 Hoàn thành tốt<br />
                  2 Lê Hoàng Nam 04/09/2016 ✓ Nam 8.5 8 9 9 9 10 Hoàn thành tốt
                </div>
              </div>

              {/* Input Choice Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Class Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nhập vào lớp học đích:
                  </label>
                  <select
                    value={vnEduTargetClass}
                    onChange={(e) => setVnEduTargetClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {schedules.map((s) => {
                      const { className } = parseClassAndTeacher(s.className);
                      return (
                        <option key={className} value={className}>
                          Lớp {className}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Upload File Section */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Chọn File Excel từ máy tính (.xlsx):
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-3 text-center transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleVnEduFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold">Tải lên hoặc kéo thả file Excel</span>
                    </div>
                  </div>
                </div>
              </div>

              {vnEduInputText && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nội dung Excel đã đọc
                  </div>
                  <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                    {vnEduInputText}
                  </pre>
                </div>
              )}

              {/* Parse Results Preview List */}
              {parsedStudents.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Xem trước kết quả phân tích ({parsedStudents.length} học sinh)
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      Sẵn sàng nhập
                    </span>
                  </div>

                  <div className="max-h-[180px] overflow-y-auto border border-slate-150 rounded-xl divide-y divide-slate-100">
                    {parsedStudents.map((stu, sIdx) => (
                      <div key={sIdx} className="p-3 hover:bg-slate-50/50 flex items-center justify-between text-xs transition-colors">
                        <div className="flex items-center space-x-2.5">
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg h-6 w-6 flex items-center justify-center font-bold text-[10px]">
                            {sIdx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{stu.name}</span>
                            <span className="text-[10px] text-slate-400 block">Ngày sinh: {stu.birthDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-500">
                          <div>Lớp: <span className="text-emerald-700">{stu.className}</span></div>
                          <div className="flex gap-2">
                            <span>Toán: <span className="text-slate-800">{stu.grades.math}</span></span>
                            <span>Văn: <span className="text-slate-800">{stu.grades.vietnamese}</span></span>
                            <span>Anh: <span className="text-slate-800">{stu.grades.english}</span></span>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                            {stu.rank}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status and Errors */}
              {importError && (
                <p className="text-xs text-red-500 font-bold bg-red-50 border border-red-100 py-2.5 px-4 rounded-xl text-center">
                  ⚠️ {importError}
                </p>
              )}

              {importSuccess && (
                <p className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 py-2.5 px-4 rounded-xl text-center flex items-center justify-center space-x-1.5">
                  <Check className="h-4 w-4" />
                  <span>{importSuccess}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowVnEduModal(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleImportConfirm}
                disabled={parsedStudents.length === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
              >
                Xác nhận nhập cập nhật hàng loạt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD NEW CLASS MODAL --- */}
      {showNewClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-emerald-50/30">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                <h3 className="font-sans text-base font-bold text-slate-950">
                  Thêm Lớp học mới & Thời khóa biểu
                </h3>
              </div>
              <button onClick={() => setShowNewClassModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewClass} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-normal">
                Tạo một lớp học mới kèm theo thời khóa biểu mặc định để quản trị viên dễ dàng sắp xếp lịch biểu.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tên lớp mới (ví dụ: 5C, 4D...):
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Nhập tên lớp..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Phân công Giáo Viên Chủ Nhiệm (GVCN):
                </label>
                <select
                  value={newClassTeacher}
                  onChange={(e) => setNewClassTeacher(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                >
                  {teachers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Chưa phân công">Chưa phân công</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 bg-slate-50/30 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowNewClassModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
                >
                  Tạo lớp & Thời khóa biểu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM DIALOG MODAL --- */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 z-10">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl ${
                  confirmDialog.type === "danger" 
                    ? "bg-red-50 text-red-600 border border-red-100" 
                    : confirmDialog.type === "warning"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}>
                  {confirmDialog.type === "danger" ? (
                    <Trash2 className="h-5 w-5" />
                  ) : confirmDialog.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <HelpCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-sans text-base font-bold text-slate-950">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {confirmDialog.cancelText || "Hủy bỏ"}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors ${
                  confirmDialog.type === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmDialog.type === "warning"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmDialog.confirmText || "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM ALERT DIALOG MODAL --- */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setAlertDialog(null)}
          />
          <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 z-10">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl ${
                  alertDialog.type === "success" 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                    : alertDialog.type === "error"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : alertDialog.type === "warning"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}>
                  {alertDialog.type === "success" ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : alertDialog.type === "error" ? (
                    <X className="h-5 w-5" />
                  ) : alertDialog.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Info className="h-5 w-5" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-sans text-base font-bold text-slate-950">
                    {alertDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {alertDialog.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setAlertDialog(null)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
