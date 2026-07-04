import { NewsItem, SchoolClub, StudentScore } from "./types";
import { editableImages } from "./editableAssets";

export const sampleNews: NewsItem[] = [
  {
    id: "news-1",
    title: "Trường Tiểu học Lê Văn Tám rộn ràng Khai mạc Hội khỏe Phù Đổng năm học mới",
    category: "Hoạt động",
    date: "15/10/2025",
    excerpt: "Sáng nay, trong không khí tưng bừng, thầy và trò Trường Tiểu học Lê Văn Tám (xã Pơng Drang) đã long trọng tổ chức lễ khai mạc Hội khỏe Phù Đổng cấp trường.",
    content: "Hội khỏe Phù Đổng năm nay quy tụ hơn 400 vận động viên nhí từ các khối lớp tham gia tranh tài ở các bộ môn: Điền kinh, Cờ vua, Bóng đá mini, Bơi lội và Kéo co. Đây là ngày hội thể thao lớn giúp các em học sinh rèn luyện thể chất, nâng cao sức khỏe theo gương Bác Hồ vĩ đại, đồng thời tuyển chọn các tài năng tham dự Hội khỏe Phù Đổng cấp Tỉnh sắp tới.",
    image: editableImages.news1,
    author: "Thầy Nguyễn Văn Hùng"
  },
  {
    id: "news-2",
    title: "Chương trình trao tặng mũ bảo hiểm 'Giữ trọn ước mơ' cho học sinh lớp 1",
    category: "Tin tức",
    date: "08/09/2025",
    excerpt: "Nhà trường phối hợp cùng Ban An toàn giao thông xã Pơng Drang trao tặng hơn 150 chiếc mũ bảo hiểm đạt chuẩn cho các em học sinh vừa bước vào lớp 1.",
    content: "Nhằm giáo dục ý thức chấp hành luật lệ giao thông ngay từ khi còn nhỏ, Ban Giám hiệu trường Tiểu học Lê Văn Tám đã tổ chức chương trình truyền thông kỹ năng tham gia giao thông an toàn và tặng mũ bảo hiểm cho toàn thể học sinh lớp 1. Hoạt động nhận được sự hưởng ứng nhiệt tình từ quý bậc phụ huynh, góp phần xây dựng cổng trường an toàn, văn minh.",
    image: editableImages.news2,
    author: "Cô H'Nghia Niê"
  },
  {
    id: "news-3",
    title: "Thông báo tuyển sinh lớp 1 năm học 2026 - 2027 tại địa bàn xã Pơng Drang",
    category: "Thông báo",
    date: "01/06/2026",
    excerpt: "Trường Tiểu học Lê Văn Tám thông báo kế hoạch và hồ sơ đăng ký tuyển sinh đối với học sinh sinh năm 2020 cư trú tại xã Pơng Drang.",
    content: "Thực hiện kế hoạch của Sở Giáo dục và Đào tạo Tỉnh Đắk Lắk, Trường Tiểu học Lê Văn Tám thông báo nhận hồ sơ tuyển sinh lớp 1 từ ngày 15/06/2026 đến hết ngày 15/07/2026. Chỉ tiêu tuyển sinh là 160 học sinh được chia thành 4 lớp. Hồ sơ bao gồm: Đơn xin học (theo mẫu), bản sao giấy khai sinh hợp lệ, bản phô-tô sổ hộ khẩu hoặc giấy xác nhận cư trú. Phụ huynh có thể nộp trực tiếp tại Văn phòng nhà trường hoặc đăng ký trực tuyến trên cổng thông tin này.",
    image: editableImages.news3,
    author: "Văn phòng Tuyển sinh"
  },
  {
    id: "news-4",
    title: "Hoạt động trải nghiệm 'Tìm hiểu văn hóa Cồng chiêng Tây Nguyên' đầy sắc màu",
    category: "Hoạt động",
    date: "20/11/2025",
    excerpt: "Chào mừng ngày Nhà giáo Việt Nam 20/11, nhà trường đã tổ chức buổi ngoại khóa giúp các em trải nghiệm nhịp xoang, tiếng chiêng và nét đẹp truyền thống địa phương.",
    content: "Đắk Lắk là cái nôi của Không gian văn hóa Cồng chiêng Tây Nguyên. Để giúp các em học sinh gìn giữ cội nguồn văn hóa, trường Tiểu học Lê Văn Tám đã mời các nghệ nhân buôn làng đến giao lưu, hướng dẫn học sinh cách gõ chiêng tre, múa xoang truyền thống. Buổi trải nghiệm vô cùng sôi nổi, khơi gợi tình yêu quê hương đất nước trong tâm hồn các em nhỏ.",
    image: editableImages.news4,
    author: "Cô Lê Thị Mai"
  },
  {
    id: "news-5",
    title: "Lễ kỷ niệm ngày Nhà giáo Việt Nam 20/11 và trao thưởng phong trào thi đua dạy tốt học tốt",
    category: "Tin tức",
    date: "20/11/2025",
    excerpt: "Lễ kỷ niệm tràn ngập hoa, điểm 10 dâng tặng thầy cô cùng những tiết mục văn nghệ đặc sắc từ các chi đội.",
    content: "Trong đợt thi đua chào mừng ngày 20/11, liên đội trường đã gặt hái được hàng nghìn điểm 10 xuất sắc và nhiều giờ học tốt. Nhà trường đã vinh danh, trao thưởng cho các tập thể lớp xuất sắc và các thầy cô giáo có thành tích vượt trội trong hội giảng cấp Tỉnh. Sự kiện thắt chặt tình thầy trò ấm áp dưới mái trường.",
    image: editableImages.news5,
    author: "Ban Thi Đua"
  }
];

export const sampleClubs: SchoolClub[] = [
  {
    id: "club-gong",
    name: "CLB Đội Chiêng Nhí & Múa Xoang",
    description: "Nơi các em học sinh học cách diễn tấu cồng chiêng tre, gõ nhạc cụ dân tộc và học các điệu múa xoang truyền thống Tây Nguyên.",
    schedule: "Chiều Thứ Tư (15h30 - 17h00)",
    teacher: "Nghệ nhân Y Kông Niê & Cô H'Nghia",
    iconName: "Music",
    color: "from-amber-500 to-red-600"
  },
  {
    id: "club-art",
    name: "CLB Mỹ Thuật & Khéo Tay",
    description: "Khơi nguồn sáng tạo qua hội họa, nặn đất sét, làm đồ tái chế thân thiện với môi trường và vẽ tranh phong cảnh quê hương Đắk Lắk.",
    schedule: "Chiều Thứ Ba (15h30 - 17h00)",
    teacher: "Cô Lê Thị Mai",
    iconName: "Palette",
    color: "from-pink-500 to-purple-600"
  },
  {
    id: "club-chess",
    name: "CLB Cờ Vua Trí Tuệ",
    description: "Rèn luyện tư duy logic, tính kiên nhẫn và chiến thuật thông qua những ván cờ đầy kịch tính.",
    schedule: "Sáng Thứ Bảy (8h00 - 10h00)",
    teacher: "Thầy Nguyễn Văn Hùng",
    iconName: "Award",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "club-english",
    name: "CLB Tiếng Anh Giao Tiếp Vui Nhộn",
    description: "Học Tiếng Anh qua các trò chơi tương tác, bài hát sôi động, đóng kịch và rèn luyện kỹ năng tự tin thuyết trình trước đám đông.",
    schedule: "Chiều Thứ Năm (15h30 - 17h00)",
    teacher: "Cô Trịnh Thị Oanh",
    iconName: "Globe",
    color: "from-emerald-500 to-teal-600"
  },
  {
    id: "club-sport",
    name: "CLB Bóng Đá Nhí Lê Văn Tám",
    description: "Sân chơi thể chất năng động, dạy các kỹ thuật bóng đá cơ bản và tinh thần đồng đội tuyệt vời trên sân cỏ.",
    schedule: "Sáng Thứ Bảy (8h00 - 10h00)",
    teacher: "Thầy Lê Anh Tuấn",
    iconName: "Dribbble",
    color: "from-green-500 to-emerald-700"
  }
];

export const sampleStudents: StudentScore[] = [
  {
    id: "LVT-2026-01",
    name: "Nguyễn Minh Anh",
    className: "4A",
    birthDate: "12/04/2016",
    avatar: editableImages.studentGirl,
    grades: {
      math: 9.5,
      vietnamese: 9.0,
      science: 10,
      english: 9.5,
      historyGeo: 9.0,
      informatics: 10
    },
    conduct: "Tốt",
    comment: "Em Minh Anh học tập rất chăm chỉ, thông minh và gương mẫu. Tích cực phát biểu xây dựng bài và giúp đỡ các bạn trong lớp học.",
    rank: "Hoàn thành xuất sắc"
  },
  {
    id: "LVT-2026-02",
    name: "H'Riêk Niê",
    className: "4A",
    birthDate: "23/08/2016",
    avatar: editableImages.studentGirl,
    grades: {
      math: 8.5,
      vietnamese: 9.5,
      science: 9.0,
      english: 9.0,
      historyGeo: 10,
      informatics: 9.5
    },
    conduct: "Tốt",
    comment: "Em H'Riêk có năng khiếu đặc biệt môn Lịch sử & Địa lý và rất chăm chỉ. Đọc Tiếng Việt diễn cảm và có giọng hát rất hay trong CLB Đội chiêng.",
    rank: "Hoàn thành xuất sắc"
  },
  {
    id: "LVT-2026-03",
    name: "Trần Hoàng Nam",
    className: "4B",
    birthDate: "05/11/2016",
    avatar: editableImages.studentBoy,
    grades: {
      math: 8.0,
      vietnamese: 7.5,
      science: 8.5,
      english: 7.0,
      historyGeo: 8.0,
      informatics: 8.5
    },
    conduct: "Tốt",
    comment: "Em Nam ngoan ngoãn, hăng hái tham gia hoạt động thể thao của trường. Cần rèn luyện thêm kỹ năng viết chính tả Tiếng Việt và tự tin nói Tiếng Anh hơn.",
    rank: "Hoàn thành tốt"
  },
  {
    id: "LVT-2026-04",
    name: "Y Blôk Êban",
    className: "5C",
    birthDate: "14/01/2015",
    avatar: editableImages.studentBoy,
    grades: {
      math: 9.0,
      vietnamese: 8.5,
      science: 9.5,
      english: 8.0,
      historyGeo: 9.5,
      informatics: 9.0
    },
    conduct: "Tốt",
    comment: "Y Blôk có tư duy Toán học rất nhanh nhạy, tính cách năng nổ, là Chi đội trưởng gương mẫu, luôn hoàn thành xuất sắc các hoạt động Sao nhi đồng.",
    rank: "Hoàn thành xuất sắc"
  }
];

export const classSchedules = [
  {
    className: "Lớp 1A - GVCN: Cô Nguyễn Thị Hà",
    days: [
      { day: "Thứ 2", subjects: ["Chào cờ", "Tiếng Việt", "Tiếng Việt", "Toán"] },
      { day: "Thứ 3", subjects: ["Đạo đức", "Tiếng Việt", "Toán", "Mỹ thuật"] },
      { day: "Thứ 4", subjects: ["Tiếng Việt", "Tiếng Việt", "Tự nhiên Xã hội", "Thể dục"] },
      { day: "Thứ 5", subjects: ["Toán", "Tiếng Việt", "Âm nhạc", "Tiếng Anh"] },
      { day: "Thứ 6", subjects: ["Tiếng Việt", "Hoạt động trải nghiệm", "Thể dục", "Sinh hoạt lớp"] }
    ]
  },
  {
    className: "Lớp 4A - GVCN: Cô H'Nghia Niê",
    days: [
      { day: "Thứ 2", subjects: ["Chào cờ", "Toán", "Tiếng Việt", "Lịch sử & Địa lý"] },
      { day: "Thứ 3", subjects: ["Tiếng Việt", "Tiếng Việt", "Khoa học", "Tiếng Anh"] },
      { day: "Thứ 4", subjects: ["Toán", "Đạo đức", "Tin học", "Thể dục"] },
      { day: "Thứ 5", subjects: ["Tiếng Việt", "Toán", "Công nghệ", "Tiếng Anh"] },
      { day: "Thứ 6", subjects: ["Khoa học", "Mỹ thuật", "Âm nhạc", "Sinh hoạt lớp"] }
    ]
  },
  {
    className: "Lớp 5A - GVCN: Thầy Lê Anh Tuấn",
    days: [
      { day: "Thứ 2", subjects: ["Chào cờ", "Toán", "Tiếng Việt", "Lịch sử & Địa lý"] },
      { day: "Thứ 3", subjects: ["Tiếng Việt", "Toán", "Khoa học", "Tiếng Anh"] },
      { day: "Thứ 4", subjects: ["Toán", "Tiếng Việt", "Tin học", "Thể dục"] },
      { day: "Thứ 5", subjects: ["Tiếng Việt", "Toán", "Kỹ thuật", "Tiếng Anh"] },
      { day: "Thứ 6", subjects: ["Lịch sử & Địa lý", "Mỹ thuật", "Âm nhạc", "Sinh hoạt lớp"] }
    ]
  }
];
