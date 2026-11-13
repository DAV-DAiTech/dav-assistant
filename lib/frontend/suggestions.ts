import {
  GraduationCap,
  ChartNoAxesCombined,
  Wallet,
  BookOpen,
  Languages,
  Globe2,
  Award,
  Building2,
  Users,
  Newspaper,
} from "lucide-react";
import type { Bilingual, Language } from "./i18n";
export const suggestions: {
  id: string;
  icon: typeof GraduationCap;
  label: Bilingual;
  questions: Record<Language, string[]>;
}[] = [
  {
    id: "admissions",
    icon: GraduationCap,
    label: { vi: "Tuyển sinh 2026", en: "Admissions 2026" },
    questions: {
      vi: [
        "Học viện tuyển sinh năm 2026 theo những phương thức nào?",
        "Hồ sơ đăng ký xét tuyển gồm những gì?",
        "Chỉ tiêu tuyển sinh năm 2026 bao nhiêu?",
        "Thời gian đăng ký xét tuyển diễn ra khi nào?",
      ],
      en: [
        "What are DAV’s admission pathways for 2026?",
        "What documents do I need to apply?",
        "How many places are available in 2026?",
        "When does the application period start?",
      ],
    },
  },
  {
    id: "scores",
    icon: ChartNoAxesCombined,
    label: { vi: "Điểm chuẩn", en: "Entry scores" },
    questions: {
      vi: [
        "Điểm chuẩn các ngành năm gần nhất là bao nhiêu?",
        "Cách tính điểm xét tuyển như thế nào?",
        "Có cộng điểm chứng chỉ ngoại ngữ không?",
        "Tra cứu kết quả trúng tuyển ở đâu?",
      ],
      en: [
        "What were the most recent entry scores?",
        "How are admission scores calculated?",
        "Do language certificates earn extra points?",
        "Where can I check admission results?",
      ],
    },
  },
  {
    id: "fees",
    icon: Wallet,
    label: { vi: "Học phí", en: "Tuition" },
    questions: {
      vi: [
        "Học phí năm học mới được công bố ở đâu?",
        "Học phí được tính theo tín chỉ thế nào?",
        "Có chính sách miễn giảm học phí không?",
        "Những phương thức đóng học phí nào được chấp nhận?",
      ],
      en: [
        "Where are new tuition fees published?",
        "How is tuition calculated per credit?",
        "Are tuition waivers available?",
        "Which tuition payment methods are accepted?",
      ],
    },
  },
  {
    id: "programs",
    icon: BookOpen,
    label: { vi: "Ngành học", en: "Programs" },
    questions: {
      vi: [
        "Học viện Ngoại giao đào tạo những ngành nào?",
        "Ngành Quan hệ quốc tế học những gì?",
        "Sự khác biệt giữa các ngành kinh tế là gì?",
        "Sinh viên có thể học song ngành không?",
      ],
      en: [
        "What degree programs does DAV offer?",
        "What does International Relations cover?",
        "How do the economics programs differ?",
        "Can students pursue a double major?",
      ],
    },
  },
  {
    id: "english",
    icon: Languages,
    label: { vi: "Chương trình tiếng Anh", en: "English programs" },
    questions: {
      vi: [
        "Những chương trình nào giảng dạy bằng tiếng Anh?",
        "Yêu cầu tiếng Anh đầu vào là gì?",
        "Có lớp hỗ trợ ngoại ngữ không?",
        "Chuẩn ngoại ngữ tốt nghiệp như thế nào?",
      ],
      en: [
        "Which programs are taught in English?",
        "What are the English entry requirements?",
        "Is language support available?",
        "What is the graduation language requirement?",
      ],
    },
  },
  {
    id: "international",
    icon: Globe2,
    label: { vi: "Liên kết quốc tế", en: "International" },
    questions: {
      vi: [
        "DAV có những đối tác quốc tế nào?",
        "Làm thế nào để đăng ký trao đổi sinh viên?",
        "Có hỗ trợ chi phí trao đổi không?",
        "Thông tin chương trình liên kết được đăng ở đâu?",
      ],
      en: [
        "Who are DAV’s international partners?",
        "How do I apply for an exchange?",
        "Is exchange funding available?",
        "Where are joint programs announced?",
      ],
    },
  },
  {
    id: "scholarships",
    icon: Award,
    label: { vi: "Học bổng", en: "Scholarships" },
    questions: {
      vi: [
        "DAV có những loại học bổng nào?",
        "Điều kiện xét học bổng khuyến khích học tập là gì?",
        "Nộp hồ sơ học bổng ở đâu?",
        "Có học bổng dành cho tân sinh viên không?",
      ],
      en: [
        "What scholarships are available at DAV?",
        "What are merit scholarship requirements?",
        "Where can I submit a scholarship application?",
        "Are there scholarships for new students?",
      ],
    },
  },
  {
    id: "housing",
    icon: Building2,
    label: { vi: "Ký túc xá", en: "Housing" },
    questions: {
      vi: [
        "Sinh viên đăng ký ký túc xá như thế nào?",
        "Chi phí ký túc xá là bao nhiêu?",
        "Những đối tượng nào được ưu tiên?",
        "Có gợi ý nhà ở gần Học viện không?",
      ],
      en: [
        "How do students apply for housing?",
        "How much does student housing cost?",
        "Who receives housing priority?",
        "Where can I find nearby accommodation?",
      ],
    },
  },
  {
    id: "clubs",
    icon: Users,
    label: { vi: "CLB · Đoàn · Hội", en: "Clubs & societies" },
    questions: {
      vi: [
        "DAV có những câu lạc bộ nào?",
        "Làm thế nào để tham gia CLB DAItech?",
        "Hoạt động Đoàn và Hội có gì nổi bật?",
        "Tân sinh viên có thể tham gia hoạt động nào?",
      ],
      en: [
        "What clubs are available at DAV?",
        "How can I join DAItech Club?",
        "What do the student organizations offer?",
        "Which activities can new students join?",
      ],
    },
  },
  {
    id: "news",
    icon: Newspaper,
    label: { vi: "Tin tức", en: "News" },
    questions: {
      vi: [
        "Theo dõi thông báo mới nhất ở đâu?",
        "Học viện sắp có sự kiện gì?",
        "Có các hội thảo học thuật dành cho sinh viên không?",
        "Làm thế nào để đăng ký tham dự sự kiện?",
      ],
      en: [
        "Where can I find the latest announcements?",
        "What events are coming up at DAV?",
        "Are there academic seminars for students?",
        "How do I register for an event?",
      ],
    },
  },
];
