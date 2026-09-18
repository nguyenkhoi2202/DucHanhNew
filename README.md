# 🦷 Nha Khoa Đức Hạnh Bình Thuận (Phiên Bản Nâng Cấp MongoDB)

Ứng dụng quản lý hồ sơ bệnh án nha khoa chuyên nghiệp, hiện đại, hỗ trợ lưu trữ dữ liệu tập trung với **MongoDB**, quản lý lịch hẹn, theo dõi công nợ điều trị, xuất báo cáo tài chính và tạo mã **VietQR** thanh toán tự động qua MBBank.

---

## 🌟 Các Tính Năng & Nâng Cấp Nổi Bật

- **Thay thế hoàn toàn Google Drive / Google Apps Script bằng MongoDB 7.0**:
  - Dữ liệu lưu trữ tập trung, an toàn, truy vấn nhanh chóng tức thì.
  - Tự động lưu và đồng bộ hai chiều (MongoDB + Bộ nhớ đệm cục bộ LocalStorage phòng khi mất mạng).
- **Hỗ trợ chạy Docker cục bộ**:
  - Tích hợp sẵn `docker-compose.yml` gồm **MongoDB** và **Mongo Express** (giao diện đồ họa xem database trên web tại `http://localhost:8081`).
- **Có sẵn công cụ nạp tự động 931 hồ sơ bệnh nhân**:
  - Đã đóng gói sẵn toàn bộ dữ liệu từ file `DucHanh-27-08-2024.txt`. Nạp vào MongoDB chỉ với 1 lệnh `npm run seed` hoặc 1 click từ giao diện web.
- **Sẵn sàng triển khai lên Vercel (Production Ready)**:
  - Hỗ trợ kiến trúc Serverless Functions (`api/index.ts` + `vercel.json`).
  - Kết nối mượt mà với **MongoDB Atlas** (gói miễn phí trọn đời).
- **Tính năng nghiệp vụ đầy đủ**:
  - Thêm, sửa, xóa hồ sơ bệnh nhân và các đợt điều trị (răng, chi phí, đã trả, còn lại, bác sĩ).
  - Tìm kiếm thông minh theo tên, số điện thoại, ngày khám, ngày hẹn tái khám.
  - Bộ lọc nhanh: Bệnh nhân còn nợ tiền, bệnh nhân làm răng sứ.
  - Thống kê doanh thu tháng này, thống kê theo file backup.
  - Kết sổ cuối tháng ra file JSON, sao lưu toàn bộ ra file TXT.
  - Tạo mã VietQR thanh toán chuẩn ngân hàng MBBank.

---

## 📁 Cấu Trúc Dự Án

```text
DucHanh-MongoDB/
├── api/
│   └── index.ts                 # Serverless Handler cho Vercel
├── data/
│   └── DucHanh-27-08-2024.txt   # File dữ liệu 931 hồ sơ bệnh nhân ban đầu
├── server/
│   ├── app.ts                   # Express Backend API (/api/records, /api/health, ...)
│   ├── db.ts                    # Module kết nối MongoDB (Connection Pool tối ưu cho Serverless)
│   ├── index.ts                 # Server API cục bộ (Port 5001)
│   └── seed.ts                  # Script nạp 931 hồ sơ từ file data vào MongoDB
├── src/
│   ├── components/              # Các component React (Form, Table, VietQR, Dialog, Login)
│   ├── utils/                   # Hàm tiện ích crypto, format ngày tháng
│   ├── App.tsx                  # Giao diện chính đã tích hợp MongoDB API
│   ├── types.ts                 # Định nghĩa kiểu dữ liệu TypeScript
│   └── main.tsx
├── docker-compose.yml           # Docker Compose cho MongoDB & Mongo-Express
├── Dockerfile                   # Dockerfile build full-stack ứng dụng
├── vercel.json                  # Cấu hình định tuyến cho Vercel
├── .env.example                 # Mẫu cấu hình biến môi trường
└── package.json
```

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Với Docker)

### 1. Khởi động MongoDB bằng Docker

Mở terminal trong thư mục `DucHanh-MongoDB` và chạy:

```bash
# Khởi động MongoDB (port 27017) và Mongo-Express (port 8081)
npm run docker:mongo

# Hoặc dùng lệnh docker compose trực tiếp:
docker compose up mongo mongo-express -d
```

- **MongoDB** sẽ chạy tại: `mongodb://localhost:27017`
- **Mongo-Express (Giao diện web quản lý DB)**: truy cập tại [http://localhost:8081](http://localhost:8081)

### 2. Nạp dữ liệu 931 bệnh nhân ban đầu vào MongoDB

Chỉ cần chạy lệnh sau:

```bash
npm run seed
```

*Hệ thống sẽ đọc toàn bộ 931 hồ sơ từ `data/DucHanh-27-08-2024.txt` và nạp vào MongoDB.*

### 3. Khởi chạy ứng dụng (Frontend + Backend API)

```bash
npm run dev
```

Lệnh trên sẽ đồng thời khởi chạy:
- **Vite Frontend**: [http://localhost:3000](http://localhost:3000)
- **Express Backend API**: [http://localhost:5001](http://localhost:5001)

Mở trình duyệt vào [http://localhost:3000](http://localhost:3000), đăng nhập với:
- **Tên đăng nhập**: `duchanh`
- **Mật khẩu**: `123`

*(Ngay trên thanh tiêu đề bạn sẽ thấy badge màu xanh: `MongoDB: Đã kết nối (931 hồ sơ)`)*.

---

## 🐳 Cách Chạy Full-Stack Hoàn Toàn Trong Docker

Nếu bạn muốn đóng gói và chạy cả Web lẫn MongoDB trong Docker:

```bash
docker compose up -d
```

Ứng dụng sẽ tự động build và chạy tại [http://localhost:3000](http://localhost:3000).

---

## 🌐 Hướng Dẫn Triển Khai Lên Vercel (Push & Deploy)

Vercel là nền tảng máy chủ đám mây (Serverless), vì vậy Vercel không thể kết nối tới `localhost` của máy bạn. Chúng ta sẽ kết nối Vercel với **MongoDB Atlas** (dịch vụ MongoDB trên mây chính thức, có gói Free vĩnh viễn 512MB).

### Bước 1: Tạo Database MongoDB Atlas Miễn Phí (2 phút)

1. Truy cập [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) và đăng ký tài khoản miễn phí.
2. Tạo 1 Cluster mới:
   - Chọn gói **M0 Free (Shared)** (Miễn phí 100%).
   - Chọn Region gần Việt Nam nhất (ví dụ: **Singapore** - `ap-southeast-1`).
3. Tạo tài khoản truy cập Database (**Database User**):
   - Vào mục **Security** -> **Database Access** -> **Add New Database User**.
   - Tạo `Username` (vd: `duchanh_admin`) và `Password` (vd: `MatKhauBaoMat123`).
4. Cho phép IP kết nối (**Network Access**):
   - Vào mục **Security** -> **Network Access** -> **Add IP Address**.
   - Chọn **Allow Access from Anywhere (`0.0.0.0/0`)** (cần thiết để các Serverless Functions của Vercel truy cập được).
5. Lấy chuỗi kết nối (**Connection String**):
   - Bấm nút **Connect** ở Cluster -> chọn **Drivers** -> **Node.js**.
   - Copy chuỗi kết nối dạng:
     ```text
     mongodb+srv://duchanh_admin:<password>@cluster0.xxxxx.mongodb.net/duchanh?retryWrites=true&w=majority
     ```
   *(Thay `<password>` bằng mật khẩu bạn đã tạo ở bước 3)*.

---

### Bước 2: Đẩy Code lên GitHub

Mở terminal tại thư mục `DucHanh-MongoDB`:

```bash
# 1. Khởi tạo repository Git (nếu tạo repo mới trên GitHub của bạn):
git init
git add .
git commit -m "Nâng cấp Nha Khoa Đức Hạnh lên MongoDB & Vercel"

# 2. Tạo repository mới trên GitHub (ví dụ: DucHanh-MongoDB) rồi liên kết remote:
git branch -M main
git remote set-url origin https://github.com/<tai-khoan-cua-ban>/DucHanh-MongoDB.git
git push -u origin main
```

---

### Bước 3: Deploy lên Vercel

1. Đăng nhập vào [https://vercel.com](https://vercel.com).
2. Bấm **Add New...** -> **Project**.
3. Chọn kho mã nguồn **DucHanh-MongoDB** từ GitHub của bạn.
4. Tại phần **Environment Variables**, thêm biến môi trường:
   - **Key**: `MONGODB_URI`
   - **Value**: Chuỗi kết nối MongoDB Atlas bạn vừa lấy ở Bước 1.
     *(Ví dụ: `mongodb+srv://duchanh_admin:MatKhau123@cluster0.abcde.mongodb.net/duchanh?retryWrites=true&w=majority`)*
5. Thêm biến môi trường (tùy chọn):
   - **Key**: `MONGODB_DB_NAME`
   - **Value**: `duchanh`
6. Bấm **Deploy**! Vercel sẽ tự động build và cung cấp cho bạn một tên miền miễn phí dạng `https://duchanh-mongodb.vercel.app`.

---

### Bước 4: Nạp 931 hồ sơ bệnh nhân ban đầu lên MongoDB Atlas

Bạn có thể nạp dữ liệu bằng **1 trong 2 cách cực kỳ đơn giản**:

- **Cách 1 (Từ giao diện web sau khi deploy)**:
  - Mở trang web Vercel vừa deploy thành công, đăng nhập (`duchanh` / `123`).
  - Cuộn xuống phần cuối trang: **Công cụ quản trị cơ sở dữ liệu MongoDB & Dự phòng**.
  - Bấm nút màu xanh: **"Nạp dữ liệu gốc (931 hồ sơ)"**. Toàn bộ dữ liệu từ file `DucHanh-27-08-2024.txt` sẽ được nạp trực tiếp vào MongoDB Atlas!

- **Cách 2 (Chạy script từ máy tính)**:
  - Trên máy tính của bạn, mở file `.env` và dán chuỗi kết nối MongoDB Atlas:
    ```env
    MONGODB_URI=mongodb+srv://duchanh_admin:MatKhau123@cluster0.abcde.mongodb.net/duchanh?retryWrites=true&w=majority
    ```
  - Chạy lệnh:
    ```bash
    npm run seed
    ```
  - Toàn bộ 931 hồ sơ sẽ được nạp ngay lập tức lên Atlas!

---

## 🔒 Thông Tin Đăng Nhập & Bảo Mật

- **Tài khoản đăng nhập hệ thống**:
  - Tên đăng nhập: `duchanh`
  - Mật khẩu: `123`
- **Mật khẩu đồng bộ thủ công**: `123`

---

## 📞 Hỗ Trợ & Bản Quyền

- Dự án: **Nha Khoa Đức Hạnh Bình Thuận**
- Hotline: **0947 137 139 (Đức Hạnh)** | **0888 974 974 (Hà My)**
- Bản quyền thuộc về **KhoiTN** ([Profile](https://facebook.com/nguyenkhoi2202))
