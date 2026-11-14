# DAV Assistant

**DAV Assistant** là trợ lý AI hỏi đáp song ngữ (Việt/Anh) về Học viện Ngoại giao, do **CLB AI & Công nghệ Học viện Ngoại giao – DAiTech** phát triển.

English: **AI & Technology Club, Diplomatic Academy of Vietnam – DAiTech**.

DAV Assistant do CLB DAiTech phát triển. Câu trả lời có thể chưa đầy đủ, vui lòng đối chiếu tại dav.edu.vn.

## Giao diện v6

- Next.js App Router, Inter Variable và Plus Jakarta Sans Variable với bộ ký tự tiếng Việt.
- Giao diện sáng mặc định; lựa chọn Sáng/Tối/Hệ thống và VI/EN được giữ lại.
- Đổi `data-ombre="blue-white"` thành `data-ombre="blue-red"` trên phần tử gốc để đổi viền màu.
- Token: `app/design-tokens.css`; bố cục: `app/dav.css`; lớp trình bày v6: `app/ombre.css`.
- Nội dung song ngữ: `lib/frontend/i18n.ts`; chủ đề: `lib/frontend/suggestions.ts`; sản phẩm: `lib/frontend/ecosystem.ts`.
- DAV Club Match: https://dav-club-match.vercel.app/ — liên kết trực tiếp từ thanh chủ đề, thẻ hệ sinh thái và thẻ khám phá 05.
- Câu trả lời truyền theo luồng và lịch sử phía máy chủ sử dụng các bộ chuyển đổi hiện có. Phiên bản v6 không thay đổi API, cơ sở dữ liệu hoặc cấu hình nhà cung cấp.
- Đính kèm hiện chỉ hiển thị tên tệp; nhận dạng giọng nói chưa khả dụng. Các điều khiển vẫn có thông báo rõ ràng.

Hotline: 0943.482.840 / 0936.018.433. Vui lòng không chia sẻ thông tin cá nhân.

© 2026 CLB AI & Công nghệ Học viện Ngoại giao – DAiTech
