export interface StudentScore {
  id: string;
  name: string;
  className: string;
  birthDate: string;
  avatar: string;
  grades: {
    math: number;
    vietnamese: number;
    science: number;
    english: number;
    historyGeo: number;
    informatics: number;
  };
  conduct: "Tốt" | "Khá" | "Đạt" | "Cần cố gắng";
  comment: string;
  rank: string;
}

export interface SchoolClub {
  id: string;
  name: string;
  description: string;
  schedule: string;
  teacher: string;
  iconName: string;
  color: string;
}

export interface NewsItem {
  id: string;
  title: string;
  category: "Tin tức" | "Hoạt động" | "Thông báo";
  date: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClubRegistration {
  studentName: string;
  studentClass: string;
  parentName: string;
  parentPhone: string;
  clubId: string;
  notes: string;
  registeredAt: string;
}

export interface ScheduleDay {
  day: string;
  subjects: string[];
}

export interface ClassSchedule {
  className: string;
  days: ScheduleDay[];
}

