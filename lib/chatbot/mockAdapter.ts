import type { ChatEvent, SendMessageArgs } from "@/lib/shared/chat-types";

const answers = {
  vi: "Đây là **câu trả lời minh họa** từ chế độ MOCK_CHATBOT, chưa kết nối FPT AI EOS.\n\nĐể có thông tin chính xác, bạn có thể:\n\n1. Truy cập [dav.edu.vn](https://dav.edu.vn) và chọn chuyên mục phù hợp.\n2. Xem các thông báo tuyển sinh mới nhất.\n3. Liên hệ Học viện để xác nhận trước khi quyết định.",
  en: "This is a **sample answer** from MOCK_CHATBOT mode; FPT AI EOS is not connected.\n\nFor accurate information you can:\n\n1. Visit [dav.edu.vn](https://dav.edu.vn) and pick the relevant section.\n2. Check the latest admissions announcements.\n3. Contact the Academy to confirm before deciding.",
};

const suggestions = {
  vi: ["Học phí năm 2026 là bao nhiêu?", "Có những học bổng nào?"],
  en: ["What is the 2026 tuition fee?", "Which scholarships are available?"],
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });

export async function* sendMessage({ lang, signal }: SendMessageArgs): AsyncGenerator<ChatEvent> {
  const words = answers[lang].match(/\S+\s*/g) ?? [];
  for (const word of words) {
    await wait(35, signal);
    if (signal.aborted) return;
    yield { type: "delta", text: word };
  }
  yield {
    type: "sources",
    sources: [{ title: lang === "vi" ? "Cổng thông tin DAV" : "DAV information portal", url: "https://dav.edu.vn" }],
  };
  yield { type: "suggestions", suggestions: suggestions[lang] };
  yield { type: "done" };
}
