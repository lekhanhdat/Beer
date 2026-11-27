# Kho Bia

Công cụ quản lý nhập – xuất – tồn bia bằng tiếng Việt. **Mở `index.html` bằng Chrome, Edge hoặc Firefox để sử dụng ngay.** Không cần cài đặt, tài khoản, backend, database hay kết nối Internet.

## Website trực tuyến

Địa chỉ GitHub Pages: **https://lekhanhdat.github.io/Beer/**

Workflow [Deploy Kho Bia to GitHub Pages](https://github.com/lekhanhdat/Beer/actions/workflows/deploy-pages.yml) tự chạy khi push vào `main`, hoặc có thể chạy bằng **Run workflow** trong tab Actions. Workflow kiểm tra tính toán tồn kho trước khi triển khai, rồi chỉ phát hành `index.html`. Không cần cấu hình secret hay bước build ứng dụng.

Thiết lập GitHub Pages dùng **Settings → Pages → Build and deployment → Source: GitHub Actions**. Cấu hình nằm trong `.github/workflows/deploy-pages.yml`, theo [hướng dẫn GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

**Khi chuyển từ file trên máy sang website:** xuất JSON ở bản cũ, mở website rồi khôi phục JSON. LocalStorage của file cục bộ và website là hai vùng riêng biệt; dữ liệu không tự chuyển sang. Website công khai nhưng dữ liệu kho vẫn lưu riêng trên từng trình duyệt, không được gửi lên GitHub.

## Sử dụng nhanh

1. Vào **Danh mục bia → Thêm loại bia**. Nhập tên, số thùng có sẵn và ngày bắt đầu theo dõi. Nếu muốn bổ sung phiếu cũ, chọn ngày bắt đầu không muộn hơn phiếu cũ nhất.
2. Ở **Tổng quan**, chọn **Nhập kho** hoặc **Xuất kho**, nhập ngày, loại bia, số thùng và ghi chú nếu cần. Dùng **Thêm loại bia** trong phiếu để nhập nhiều dòng, rồi bấm **Lưu phiếu**.
3. Chọn **Xem tồn ngày** để xem tồn cuối một ngày cụ thể. Các ô Nhập/Xuất trong ngày cũng theo ngày đã chọn; bấm **Hôm nay** để quay lại ngày hiện tại.
4. Vào **Lịch sử nhập xuất** để lọc theo khoảng ngày, loại bia hoặc hình thức. Muốn lọc một ngày, đặt Từ ngày và Đến ngày giống nhau. Sửa hoặc xóa một dòng sẽ tác động đến **toàn bộ phiếu** có dòng đó.
5. Cuối ngày vào **Sao lưu dữ liệu → Tải bản sao JSON**. Để chuyển máy hoặc khôi phục, chọn file JSON và kiểm tra tóm tắt trước khi xác nhận thay thế dữ liệu.

## Quy tắc tính tồn

- Đơn vị: **thùng**, số nguyên; giao dịch phải lớn hơn 0, tồn đầu kỳ có thể bằng 0.
- Tồn cuối ngày = tồn đầu kỳ có hiệu lực + tổng nhập − tổng xuất đến hết ngày đó.
- Tồn đầu kỳ được tính từ **Ngày bắt đầu**, trước mọi phiếu cùng ngày, và không được tính vào số thùng nhập trong ngày.
- Phiếu không có giờ: cùng ngày, tất cả nhập được tính trước tất cả xuất. Đây là sổ theo ngày, không phải sổ theo giờ.
- Phiếu tương lai chỉ ảnh hưởng số tồn từ ngày đó. Ngày mặc định lấy theo ngày trên thiết bị.
- Khi thêm/sửa/xóa phiếu hoặc sửa tồn đầu kỳ, ứng dụng kiểm tra **toàn bộ lịch sử, kể cả phiếu tương lai**. Nếu có ngày bị tồn âm, thao tác bị từ chối và dữ liệu cũ giữ nguyên.
- Loại bia ngừng sử dụng không xuất hiện khi tạo phiếu mới, nhưng vẫn giữ số tồn và lịch sử. Có thể sửa phiếu cũ hoặc bật **Dùng lại**.

Ví dụ: Tiger nhập 10 ngày 12/11, xuất 5 ngày 13/11, nhập thêm 14 ngày 15/11 → còn **19 thùng**. Heineken phải có ít nhất 3 thùng đầu kỳ hoặc phiếu nhập trước khi xuất 3 thùng.

## Lưu trữ và sao lưu

- Dữ liệu lưu bằng LocalStorage, trên **trình duyệt và địa chỉ đang mở**. Tải lại trang hoặc đóng trình duyệt thông thường vẫn giữ dữ liệu đã lưu.
- Giữ file ở đường dẫn cố định, dùng cùng một trình duyệt. Nếu đổi đường dẫn, đổi trình duyệt, đổi địa chỉ web hoặc chuyển máy, hãy xuất JSON trước rồi nhập lại ở nơi mới. Dữ liệu không tự đồng bộ.
- Tránh chế độ ẩn danh. Xóa dữ liệu trình duyệt có thể xóa sổ kho. **Nên sao lưu JSON hằng ngày.**
- Khôi phục JSON thay thế toàn bộ kho, không gộp dữ liệu. Chỉ file đúng phiên bản và có lịch sử không âm tồn mới được chấp nhận. Giới hạn file nhập 20 MB; giới hạn thực tế lưu trữ phụ thuộc trình duyệt.
- CSV có UTF-8 BOM, giữ tiếng Việt và mở được bằng Excel. Nút **Xuất CSV** trong Lịch sử xuất các dòng theo bộ lọc; nút trong Sao lưu xuất toàn bộ lịch sử. Nếu Excel không tự tách cột, dùng **Data → From Text/CSV**, chọn UTF-8 và dấu phẩy. CSV không dùng để khôi phục kho.
- Nếu ghi thất bại do hết bộ nhớ/quyền truy cập, ứng dụng báo lỗi và giữ nội dung chưa lưu. Nếu dữ liệu gốc bị lỗi, ứng dụng khóa ghi, cho tải nguyên bản và khôi phục từ JSON hợp lệ.
- Các tab cùng địa chỉ nhận cập nhật qua sự kiện storage; phiếu đang nhập được giữ lại. Nên dùng một tab để thao tác. Công cụ này dành cho một người trên thiết bị, không phải hệ thống cộng tác nhiều người.

## Mã nguồn và kiểm tra

Toàn bộ ứng dụng nằm trong **`index.html`**, gồm CSS, logic tính kho và giao diện. Không dùng thư viện/CDN/font ngoài. Hai khối JavaScript tách logic tính toán và thao tác giao diện để dễ kiểm tra.

Chạy kiểm thử logic (chỉ dành cho phát triển, cần Node.js 18+):

```powershell
node --test tests/inventory.test.cjs
```

Kiểm thử trình duyệt dùng Playwright CLI và Python làm máy chủ xem trước tạm thời:

```powershell
# Cửa sổ 1, tại thư mục dự án
python -m http.server 8765 --bind 127.0.0.1

# Cửa sổ 2
New-Item -ItemType Directory -Force output/playwright
npx --yes --package @playwright/cli playwright-cli -s=beer open http://127.0.0.1:8765 --headed
npx --yes --package @playwright/cli playwright-cli -s=beer run-code --filename tests/browser-qa.js
npx --yes --package @playwright/cli playwright-cli -s=beer run-code --filename tests/browser-edge-qa.js
npx --yes --package @playwright/cli playwright-cli -s=beer close
```

**Các bài kiểm thử trình duyệt xóa dữ liệu tại `http://127.0.0.1:8765`. Chỉ chạy ở địa chỉ kiểm thử riêng, không dùng địa chỉ đang quản lý kho thật.** Ảnh màn hình và file kiểm thử được bỏ qua trong Git. Không cần chạy các lệnh trên để sử dụng ứng dụng.

Các mốc triển khai được commit và push lên nhánh `main` của [lekhanhdat/Beer](https://github.com/lekhanhdat/Beer).

Kết quả kiểm tra bản bàn giao: **13 kiểm thử logic và 55 kiểm tra trên Chromium đều đạt**. Đã kiểm tra bố cục 1440px, 390px, 320px; lưu sau tải lại; phiếu nhiều loại; tồn quá khứ/tương lai; sửa/xóa; CSV/JSON; lỗi bộ nhớ; dữ liệu hỏng và cập nhật giữa các tab. Giao diện tiếng Việt đã được kiểm tra bằng ảnh màn hình. Chưa kiểm thử trên thiết bị iOS/Android thật hoặc các trình duyệt khác.
