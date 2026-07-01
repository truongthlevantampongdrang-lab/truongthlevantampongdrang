import { Award, BookOpen, GraduationCap, Heart, Milestone, Users, Edit, Plus, Trash2, X, Upload, Sparkles, CheckCircle, AlertCircle, Loader2, Check, FileText, FileSpreadsheet } from "lucide-react";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

interface AboutProps {
  isAdminMode: boolean;
}

export default function About({ isAdminMode }: AboutProps) {
  // Load / Save Milestones locally
  const [milestones, setMilestones] = useState(() => {
    const saved = localStorage.getItem("lvt_about_milestones");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        year: "2010",
        title: "Thành Lập Trường",
        description: "Trường Tiểu học Lê Văn Tám chính thức được thành lập nhằm đáp ứng nhu cầu học tập ngày càng tăng của con em nhân dân trên địa bàn xã Pơng Drang, Tỉnh Đắk Lắk."
      },
      {
        year: "2015",
        title: "Xây Dựng Cơ Sở Vật Chất Mới",
        description: "Được sự quan tâm của chính quyền các cấp, trường hoàn thành dãy nhà 2 tầng khang trang với 12 phòng học lý thuyết và phòng chức năng hiện đại."
      },
      {
        year: "2020",
        title: "Đạt Chuẩn Quốc Gia Mức Độ I",
        description: "Nhà trường tự hào đón Bằng công nhận Trường đạt chuẩn Quốc gia mức độ I của UBND tỉnh Đắk Lắk, ghi nhận nỗ lực vượt bậc của tập thể cán bộ giáo viên."
      },
      {
        year: "2025",
        title: "Chuyển Đổi Số Giáo Dục",
        description: "Tiên phong ứng dụng công nghệ giáo dục số, phòng tin học hiện đại hóa và trang bị học cụ tương tác thông minh cho 100% các lớp học."
      }
    ];
  });

  // Load / Save Leaders locally
  const [leaders, setLeaders] = useState(() => {
    const saved = localStorage.getItem("lvt_about_leaders");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "principal",
        name: "Cô Nguyễn Thị Xuân",
        title: "Hiệu trưởng",
        avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200",
        desc: "Chịu trách nhiệm chung, định hướng chiến lược và xây dựng văn hóa trường học hạnh phúc."
      },
      {
        id: "vice_principal",
        name: "Thầy Y Ring Niê",
        title: "Phó Hiệu trưởng",
        avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200",
        desc: "Phụ trách công tác chuyên môn, kiểm định chất lượng dạy học và phong trào thi đua."
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("lvt_about_milestones", JSON.stringify(milestones));
  }, [milestones]);

  useEffect(() => {
    localStorage.setItem("lvt_about_leaders", JSON.stringify(leaders));
  }, [leaders]);

  // Editing state
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ year: "", title: "", description: "" });

  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [leaderForm, setLeaderForm] = useState({ id: "", name: "", title: "", avatar: "", desc: "" });

  // Leaders bulk import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedList, setImportedList] = useState<{ name: string; title: string; selected: boolean }[]>([]);
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Milestone actions
  const handleOpenAddMilestone = () => {
    setEditingMilestoneIndex(null);
    setMilestoneForm({ year: "", title: "", description: "" });
    setShowMilestoneModal(true);
  };

  const handleOpenEditMilestone = (index: number) => {
    setEditingMilestoneIndex(index);
    setMilestoneForm({ ...milestones[index] });
    setShowMilestoneModal(true);
  };

  const handleSaveMilestone = (e: FormEvent) => {
    e.preventDefault();
    if (editingMilestoneIndex !== null) {
      const updated = [...milestones];
      updated[editingMilestoneIndex] = milestoneForm;
      setMilestones(updated);
    } else {
      setMilestones([...milestones, milestoneForm]);
    }
    setShowMilestoneModal(false);
  };

  const handleDeleteMilestone = (index: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa mốc lịch sử này không?")) {
      const updated = milestones.filter((_: any, i: number) => i !== index);
      setMilestones(updated);
    }
  };

  // Leader actions
  const handleOpenAddLeader = () => {
    setEditingLeaderId(null);
    setLeaderForm({
      id: "leader_" + Date.now(),
      name: "",
      title: "",
      avatar: "",
      desc: ""
    });
    setShowLeaderModal(true);
  };

  const handleOpenEditLeader = (id: string) => {
    const leader = leaders.find((l: any) => l.id === id);
    if (leader) {
      setEditingLeaderId(id);
      setLeaderForm({ ...leader });
      setShowLeaderModal(true);
    }
  };

  const handleDeleteLeader = (id: string) => {
    const leader = leaders.find((l: any) => l.id === id);
    if (!leader) return;
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên Ban Giám Hiệu "${leader.name}" khỏi danh sách?`)) {
      const updated = leaders.filter((l: any) => l.id !== id);
      setLeaders(updated);
    }
  };

  const getAvatarByName = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.startsWith("cô") || lower.startsWith("bà") || lower.startsWith("chị") || lower.includes("thị")) {
      return "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"; // Female leader
    } else if (lower.startsWith("thầy") || lower.startsWith("ông") || lower.startsWith("anh")) {
      return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"; // Male leader
    }
    return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"; // Neutral leader
  };

  const handleSaveLeader = (e: FormEvent) => {
    e.preventDefault();
    
    // Auto default avatar if empty
    let avatar = leaderForm.avatar.trim();
    if (!avatar) {
      avatar = getAvatarByName(leaderForm.name);
    }
    
    const finalizedForm = { ...leaderForm, avatar };

    if (editingLeaderId) {
      const updated = leaders.map((l: any) => (l.id === editingLeaderId ? finalizedForm : l));
      setLeaders(updated);
    } else {
      setLeaders([...leaders, finalizedForm]);
    }
    setShowLeaderModal(false);
  };

  const handleGenerateSingleDescription = async () => {
    if (!leaderForm.name || !leaderForm.title) {
      alert("Vui lòng nhập Họ tên và Chức vụ trước khi soạn bằng AI!");
      return;
    }

    setIsGeneratingSingle(true);
    try {
      const response = await fetch("/api/generate-leader-descriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [{ name: leaderForm.name, title: leaderForm.title }]
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.leaders && data.leaders[0]) {
        setLeaderForm(prev => ({ ...prev, desc: data.leaders[0].desc }));
      } else {
        throw new Error(data.error || "Không thể tạo mô tả bằng AI.");
      }
    } catch (err: any) {
      alert("Lỗi AI: " + err.message);
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const parseWordText = (text: string): { name: string; title: string }[] => {
    const lines = text.split(/\r?\n/);
    const results: { name: string; title: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Ignore header text
      const lower = trimmed.toLowerCase();
      if (lower.startsWith("danh sách") || lower.startsWith("stt") || lower.startsWith("họ tên") || lower.startsWith("họ và tên")) {
        continue;
      }

      // Split by common separators
      const separators = [" - ", " – ", " — ", " : ", "-", "–", "—", ":", "|", "\t"];
      let parts: string[] = [];
      for (const sep of separators) {
        if (trimmed.includes(sep)) {
          parts = trimmed.split(sep).map(p => p.trim());
          break;
        }
      }

      if (parts.length >= 2) {
        const name = parts[0];
        const title = parts[1];
        if (name.length >= 3 && name.length <= 40 && title.length >= 2 && title.length <= 50) {
          results.push({ name, title });
        }
      }
    }
    return results;
  };

  const parseExcelData = (workbook: any): { name: string; title: string }[] => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    const results: { name: string; title: string }[] = [];

    for (const row of rows) {
      if (!row || !Array.isArray(row)) continue;
      // Get non-empty cells
      const cells = row.map(c => c !== null && c !== undefined ? String(c).trim() : "").filter(Boolean);
      if (cells.length >= 2) {
        const name = cells[0];
        const title = cells[1];

        // Ignore header rows
        const nameLower = name.toLowerCase();
        if (nameLower.includes("họ tên") || nameLower.includes("họ và tên") || nameLower.includes("danh sách") || nameLower.includes("stt")) {
          continue;
        }

        if (name.length >= 3 && name.length <= 40 && title.length >= 2 && title.length <= 50) {
          results.push({ name, title });
        }
      }
    }
    return results;
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);
    setImportedList([]);

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const results = parseExcelData(workbook);
          if (results.length === 0) {
            setImportError("Không tìm thấy danh sách giáo viên hợp lệ. Đảm bảo file Excel có ít nhất 2 cột (Cột 1 là Họ tên, Cột 2 là Chức vụ).");
          } else {
            setImportedList(results.map(r => ({ ...r, selected: true })));
          }
        } catch (err: any) {
          setImportError("Lỗi đọc file Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          mammoth.extractRawText({ arrayBuffer })
            .then((result) => {
              const text = result.value;
              const results = parseWordText(text);
              if (results.length === 0) {
                setImportError("Không thể nhận diện danh sách giáo viên trong file Word. Định dạng yêu cầu: mỗi dòng ghi Họ tên - Chức vụ.");
              } else {
                setImportedList(results.map(r => ({ ...r, selected: true })));
              }
            })
            .catch((err: any) => {
              setImportError("Lỗi giải nén nội dung Word: " + err.message);
            });
        } catch (err: any) {
          setImportError("Lỗi đọc file Word: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError("Định dạng file không được hỗ trợ. Vui lòng tải lên file Excel (.xlsx, .xls) hoặc Word (.docx).");
    }
  };

  const handleGenerateDescriptions = async () => {
    const selectedItems = importedList.filter(item => item.selected);
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một giáo viên để tạo mô tả!");
      return;
    }

    setIsGeneratingDescriptions(true);
    setImportError(null);

    try {
      const response = await fetch("/api/generate-leader-descriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: selectedItems.map(item => ({ name: item.name, title: item.title }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gặp sự cố khi kết nối đến máy chủ AI.");
      }

      if (data.success && data.leaders) {
        const newLeaders = data.leaders.map((leader: any, index: number) => ({
          id: "leader_bulk_" + Date.now() + "_" + index,
          name: leader.name,
          title: leader.title,
          desc: leader.desc,
          avatar: getAvatarByName(leader.name)
        }));

        setLeaders([...leaders, ...newLeaders]);
        setShowImportModal(false);
        setImportedList([]);
        setImportFile(null);
        alert(`Đã thêm thành công ${newLeaders.length} thành viên vào Ban Giám Hiệu bằng AI!`);
      } else {
        throw new Error("Không nhận được phản hồi hợp lệ từ máy chủ AI.");
      }
    } catch (err: any) {
      setImportError("Lỗi từ AI: " + err.message);
    } finally {
      setIsGeneratingDescriptions(false);
    }
  };

  const values = [
    {
      title: "Tận Tâm",
      description: "Mỗi thầy cô giáo là một tấm gương đạo đức, tự học và sáng tạo, luôn hết lòng yêu thương, dìu dắt từng thế hệ học sinh nhỏ.",
      icon: Heart,
      color: "bg-red-50 text-red-600 border-red-100"
    },
    {
      title: "Bản Sắc",
      description: "Không chỉ dạy chữ, nhà trường luôn chú trọng bảo tồn và lan tỏa các giá trị văn hóa Tây Nguyên thông qua các CLB Cồng chiêng và Dân vũ.",
      icon: Milestone,
      color: "bg-amber-50 text-amber-600 border-amber-100"
    },
    {
      title: "Đổi Mới",
      description: "Không ngừng cải tiến phương pháp giáo dục trực quan, phát huy tối đa tư duy sáng tạo chủ động và tinh thần tự học của học sinh tiểu học.",
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100"
    }
  ];

  return (
    <div className="space-y-16 py-6 font-sans relative">
      
      {/* Banner Giới Thiệu */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          Về Chúng Tôi
        </span>
        <h2 className="text-3xl font-extrabold text-emerald-950 sm:text-4xl">
          Mái Trường Thắp Sáng Ước Mơ Học Đường
        </h2>
        <p className="text-sm text-emerald-900/70 leading-relaxed">
          Nằm giữa vùng đất đỏ bazan Pơng Drang thơ mộng, Trường Tiểu học Lê Văn Tám tự hào là cái nôi nuôi dưỡng tâm hồn, ươm mầm tài năng và định hình nhân cách xuất sắc cho con em xã nhà Pơng Drang, Tỉnh Đắk Lắk.
        </p>
      </section>

      {/* Tầm Nhìn & Sứ Mệnh */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-white border border-emerald-50 p-8 shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-emerald-950">Sứ Mệnh</h3>
          <p className="text-sm text-emerald-900/70 leading-relaxed">
            Kiến tạo một môi trường giáo dục an toàn, thân thiện và giàu tình yêu thương. Nơi mỗi học sinh đều được tôn trọng sự khác biệt, được tạo điều kiện tốt nhất để rèn luyện nhân cách, phát triển năng lực cá nhân và khơi dậy khát vọng cống hiến cho xã hội.
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-emerald-50 p-8 shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-emerald-950">Tầm Nhìn</h3>
          <p className="text-sm text-emerald-900/70 leading-relaxed">
            Xây dựng Trường Tiểu học Lê Văn Tám trở thành một trong những điểm sáng giáo dục tiểu học tiêu biểu của Tỉnh Đắk Lắk. Định hướng trở thành một trường học thông minh, hạnh phúc, nơi gìn giữ trọn vẹn bản sắc văn hóa vùng cao Tây Nguyên.
          </p>
        </div>
      </section>

      {/* Giá trị cốt lõi */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-extrabold text-emerald-950">Giá Trị Cốt Lõi</h3>
          <p className="text-sm text-emerald-900/60 max-w-xl mx-auto">
            Kim chỉ nam định hướng cho mọi hoạt động giáo dục, rèn luyện của thầy và trò nhà trường.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 space-y-4 ${v.color} hover:scale-102 transition-transform duration-300`}
            >
              <div className="h-10 w-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                <v.icon className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-emerald-950">{v.title}</h4>
              <p className="text-xs text-emerald-900/80 leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lịch sử phát triển - Timeline */}
      <section className="space-y-12 bg-white rounded-3xl p-8 border border-emerald-50 relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-2 flex-1">
            <h3 className="text-2xl font-extrabold text-emerald-950">Hành Trình Phát Triển</h3>
            <p className="text-sm text-emerald-900/60 max-w-xl">
              Nhìn lại những cột mốc ý nghĩa đặt nền móng cho vinh quang học đường của trường.
            </p>
          </div>
          {isAdminMode && (
            <button
              onClick={handleOpenAddMilestone}
              className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-md shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm mốc lịch sử</span>
            </button>
          )}
        </div>

        <div className="relative border-l-2 border-emerald-100 ml-4 md:ml-32 space-y-8 py-4">
          {milestones.map((item: any, i: number) => (
            <div key={i} className="relative pl-6 md:pl-8 group">
              {/* Timeline Dot */}
              <span className="absolute -left-2.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-white"></span>
              </span>

              {/* Year label on the left for medium screens and larger */}
              <div className="md:absolute md:right-full md:mr-8 md:top-1 text-emerald-600 font-extrabold text-lg">
                Năm {item.year}
              </div>

              <div className="bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-5 border border-emerald-100/30 transition-all relative">
                {isAdminMode && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditMilestone(i)}
                      className="p-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg"
                      title="Chỉnh sửa"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMilestone(i)}
                      className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                
                <h4 className="text-base font-bold text-emerald-950 pr-16">{item.title}</h4>
                <p className="text-xs text-emerald-900/70 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cơ cấu ban giám hiệu & Hội đồng sư phạm */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-emerald-50 pb-4">
          <div className="text-center sm:text-left space-y-2 flex-1">
            <h3 className="text-2xl font-extrabold text-emerald-950">Ban Giám Hiệu Nhà Trường</h3>
            <p className="text-sm text-emerald-900/60 max-w-xl">
              Những người chèo lái tận tụy, giàu kinh nghiệm của mái trường Lê Văn Tám.
            </p>
          </div>
          {isAdminMode && (
            <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
              <button
                onClick={handleOpenAddLeader}
                className="flex items-center space-x-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-md shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm thành viên</span>
              </button>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportedList([]);
                  setImportError(null);
                  setShowImportModal(true);
                }}
                className="flex items-center space-x-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-md shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Nhập từ Word / Excel</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
          {leaders.map((leader: any) => (
            <div
              key={leader.id}
              className="bg-white rounded-2xl border border-emerald-50 p-6 flex flex-col items-center text-center space-y-3 relative group hover:shadow-md transition-shadow duration-300"
            >
              {isAdminMode && (
                <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleOpenEditLeader(leader.id)}
                    className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200/50"
                    title="Chỉnh sửa thông tin"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLeader(leader.id)}
                    className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200/50"
                    title="Xóa thành viên"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-emerald-200">
                <img
                  src={leader.avatar}
                  alt={leader.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">{leader.name}</h4>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">{leader.title}</p>
              </div>
              <p className="text-xs text-emerald-900/60 leading-relaxed">
                {leader.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {editingMilestoneIndex !== null ? "✏️ Chỉnh Sửa Mốc Lịch Sử" : "➕ Thêm Mốc Lịch Sử Mới"}
              </h3>
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Năm
                  </label>
                  <input
                    type="text"
                    value={milestoneForm.year}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, year: e.target.value })}
                    placeholder="VD: 2026"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tiêu Đề Mốc Lịch Sử
                  </label>
                  <input
                    type="text"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    placeholder="Nhập tiêu đề cột mốc"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mô tả chi tiết mốc lịch sử
                </label>
                <textarea
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="Nhập mô tả các thành tựu, sự kiện đạt được..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-md"
                >
                  Lưu mốc thời gian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leader Modal */}
      {showLeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {editingLeaderId ? "✏️ Chỉnh Sửa Thành Viên Ban Giám Hiệu" : "➕ Thêm Mới Thành Viên Ban Giám Hiệu"}
              </h3>
              <button
                onClick={() => setShowLeaderModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeader} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    value={leaderForm.name}
                    onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                    placeholder="Ví dụ: Cô Nguyễn Thị Mai"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chức vụ
                  </label>
                  <input
                    type="text"
                    value={leaderForm.title}
                    onChange={(e) => setLeaderForm({ ...leaderForm, title: e.target.value })}
                    placeholder="Ví dụ: Hiệu trưởng"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL Ảnh đại diện
                </label>
                <input
                  type="text"
                  value={leaderForm.avatar}
                  onChange={(e) => setLeaderForm({ ...leaderForm, avatar: e.target.value })}
                  placeholder="Để trống để tự động lấy avatar theo giới tính"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mô tả nhiệm vụ/giới thiệu ngắn
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSingleDescription}
                    disabled={isGeneratingSingle}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-indigo-50 hover:from-emerald-100 hover:to-indigo-100 border border-emerald-100/80 rounded-lg text-xs font-semibold text-emerald-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingSingle ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                        <span>Đang viết...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>🤖 Soạn bằng AI</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={leaderForm.desc}
                  onChange={(e) => setLeaderForm({ ...leaderForm, desc: e.target.value })}
                  placeholder="Nhập mô tả hoặc nhấp 'Soạn bằng AI' để tự động tạo mô tả dựa trên tên và chức vụ!"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaderModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-md"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-sans text-base font-bold text-slate-900 flex items-center space-x-2">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>Nhập danh sách từ File Word / Excel</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* File Upload Zone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 bg-slate-50/50 hover:bg-emerald-50/5 transition-colors relative flex flex-col items-center justify-center text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="p-3 bg-emerald-100/60 text-emerald-700 rounded-full mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {importFile ? importFile.name : "Kéo thả file Word/Excel hoặc nhấp vào đây"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Chấp nhận các định dạng file .docx, .xlsx, .xls
                </p>
              </div>

              {/* Guidance Box */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-950">
                <p className="font-bold flex items-center text-emerald-800">
                  <span className="mr-1">💡</span> Hướng dẫn định dạng file chuẩn:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-emerald-900/80">
                  <li><strong>File Excel (.xlsx, .xls):</strong> Cột 1 ghi Họ và tên, Cột 2 ghi Chức vụ. (Dòng tiêu đề sẽ tự động được lọc bỏ).</li>
                  <li><strong>File Word (.docx):</strong> Mỗi thầy cô viết trên 1 dòng có định dạng: <code className="bg-white/80 px-1 py-0.5 rounded border border-emerald-100/50">Họ tên - Chức vụ</code> (Ví dụ: Cô Nguyễn Thị Mai - Phó Hiệu trưởng).</li>
                  <li><strong>Tự viết mô tả AI:</strong> Hệ thống sử dụng mô hình trí tuệ nhân tạo Gemini để tự động biên soạn đoạn mô tả công tác chất lượng cao dựa trên tên và chức vụ đã nạp.</li>
                </ul>
              </div>

              {/* Error Box */}
              {importError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-800 text-xs flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview and Action Section */}
              {importedList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Danh sách phát hiện ({importedList.length} nhân sự)
                    </p>
                    <button
                      onClick={() => {
                        const allSelected = importedList.every(i => i.selected);
                        setImportedList(importedList.map(i => ({ ...i, selected: !allSelected })));
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      {importedList.every(i => i.selected) ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 p-1">
                    {importedList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => {
                              const updated = [...importedList];
                              updated[idx].selected = !updated[idx].selected;
                              setImportedList(updated);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-emerald-700 font-semibold">{item.title}</p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 italic">
                          Sẵn sàng viết mô tả
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions Button */}
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      disabled={isGeneratingDescriptions}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateDescriptions}
                      disabled={isGeneratingDescriptions || importedList.filter(i => i.selected).length === 0}
                      className="flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md"
                    >
                      {isGeneratingDescriptions ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI đang biên soạn mô tả...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>🤖 Viết mô tả & Thêm vào trường</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
