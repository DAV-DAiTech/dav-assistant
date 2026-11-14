import {
  Sparkles,
  GraduationCap,
  ContactRound,
  LibraryBig,
  Newspaper,
  Users,
  Award,
  Globe2,
} from "lucide-react";
import type { Bilingual } from "./i18n";
export const CLUB_MATCH_URL = "https://dav-club-match.vercel.app/";
export const ecosystem: {
  id: string;
  icon: typeof Sparkles;
  label: Bilingual;
  description: Bilingual;
  url: string | null;
  external?: boolean;
  status: "live" | "soon";
}[] = [
  {
    id: "assistant",
    icon: Sparkles,
    label: { vi: "DAV Assistant", en: "DAV Assistant" },
    description: {
      vi: "Người bạn đồng hành tri thức của bạn.",
      en: "Your companion for every question.",
    },
    url: "/",
    status: "live",
  },
  {
    id: "club-match",
    icon: Users,
    label: { vi: "DAV Club Match", en: "DAV Club Match" },
    description: {
      vi: "Kết nối CLB · Đoàn · Hội. Tìm cộng đồng phù hợp với bạn.",
      en: "Connecting clubs, Youth Union and associations. Find the community that fits you.",
    },
    url: CLUB_MATCH_URL,
    external: true,
    status: "live",
  },
  {
    id: "admissions",
    icon: GraduationCap,
    label: { vi: "Cổng tuyển sinh", en: "Admissions portal" },
    description: {
      vi: "Cánh cửa đầu tiên đến với DAV.",
      en: "Your first step towards DAV.",
    },
    url: null,
    status: "soon",
  },
  {
    id: "student",
    icon: ContactRound,
    label: { vi: "Cổng sinh viên", en: "Student portal" },
    description: {
      vi: "Học tập và dịch vụ, trong tầm tay.",
      en: "Learning and services, within reach.",
    },
    url: null,
    status: "soon",
  },
  {
    id: "library",
    icon: LibraryBig,
    label: { vi: "Thư viện", en: "Library" },
    description: {
      vi: "Mở trang sách. Mở rộng tầm nhìn.",
      en: "Open a book. Broaden your horizons.",
    },
    url: null,
    status: "soon",
  },
  {
    id: "news",
    icon: Newspaper,
    label: { vi: "Tin tức & Sự kiện", en: "News & events" },
    description: {
      vi: "Theo nhịp sống của Học viện.",
      en: "Stay in tune with the Academy.",
    },
    url: null,
    status: "soon",
  },
  {
    id: "alumni",
    icon: Award,
    label: { vi: "Cựu sinh viên", en: "Alumni" },
    description: {
      vi: "Kết nối hôm nay, đồng hành mai sau.",
      en: "Connections that last a lifetime.",
    },
    url: null,
    status: "soon",
  },
  {
    id: "international",
    icon: Globe2,
    label: { vi: "Hợp tác quốc tế", en: "International partnerships" },
    description: {
      vi: "Từ Ngoại giao, vươn ra thế giới.",
      en: "From DAV to the world.",
    },
    url: null,
    status: "soon",
  },
];
