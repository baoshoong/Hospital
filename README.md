# 🏥 Hospital Management System

Hệ thống quản lý bệnh viện - Ứng dụng web kết nối Bác sĩ và Bệnh nhân.

![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-010101?style=flat-square&logo=socket.io)

## 📋 Giới thiệu

Đây là đồ án chuyên ngành - Hệ thống quản lý bệnh viện với các chức năng:

### 👨‍⚕️ Dành cho Bác sĩ
- Xem lịch khám bệnh
- Quản lý hồ sơ bệnh nhân
- Kê đơn thuốc và chẩn đoán
- Chat trực tuyến với bệnh nhân
- Xem lịch sử khám bệnh

### 👤 Dành cho Bệnh nhân
- Đặt lịch khám bệnh
- Xem hồ sơ sức khỏe cá nhân
- Chat với bác sĩ
- Xem lịch sử khám và đơn thuốc
- Nhận thông báo

### 👨‍💼 Dành cho Quản trị viên
- Quản lý tài khoản bác sĩ
- Quản lý lịch làm việc
- Thống kê và báo cáo

## 🛠️ Công nghệ sử dụng

| Frontend | Backend | Database | Realtime |
|----------|---------|----------|----------|
| React 18 | Node.js | Firebase Firestore | Socket.IO |
| React Router | Express 5 | | |
| Axios | | | |

## 📁 Cấu trúc thư mục

```
doctor_web/
├── doctor-patient-app-backend/     # Backend Server
│   ├── routes/                     # API Routes
│   │   ├── auth.js                 # Xác thực
│   │   ├── doctor.js               # API bác sĩ
│   │   ├── patient.js              # API bệnh nhân
│   │   ├── medicalExam.js          # API khám bệnh
│   │   ├── medicine.js             # API thuốc
│   │   ├── schedule.js             # API lịch khám
│   │   └── ...
│   ├── sockets/                    # Socket handlers
│   ├── firebase.js                 # Firebase config
│   └── server.js                   # Entry point
│
└── doctor-patient-app-frontend/    # Frontend React App
    ├── public/
    └── src/
        ├── components/             # React Components
        ├── pages/                  # Pages
        │   ├── HomePage.jsx        # Trang chủ
        │   ├── login.jsx           # Đăng nhập
        │   ├── DoctorHome.jsx      # Trang bác sĩ
        │   ├── MedicalExam.jsx     # Khám bệnh
        │   ├── ChatApp.jsx         # Chat
        │   └── ...
        └── App.js                  # Main App
```

## ⚙️ Cài đặt

### Yêu cầu hệ thống
- **Node.js** >= 16.x
- **npm** >= 8.x
- **Firebase** account với Firestore database

### Bước 1: Clone repository

```bash
git clone https://github.com/baoshoong/Hospital.git
cd Hospital
```

### Bước 2: Cấu hình Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com/)
2. Tạo Firestore Database
3. Tải file `serviceAccountKey.json` từ Project Settings > Service Accounts
4. Đặt file vào thư mục `doctor-patient-app-backend/`

### Bước 3: Cài đặt Backend

```bash
# Di chuyển vào thư mục backend
cd doctor-patient-app-backend

# Cài đặt dependencies
npm install

# Chạy server
node server.js
```

Server sẽ chạy tại: `http://localhost:5000`

### Bước 4: Cài đặt Frontend

```bash
# Mở terminal mới, di chuyển vào thư mục frontend
cd doctor-patient-app-frontend

# Cài đặt dependencies
npm install

# Chạy ứng dụng
npm start
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

## 🚀 Chạy ứng dụng

| Service | Lệnh | Port |
|---------|------|------|
| Backend | `node server.js` | 5000 |
| Frontend | `npm start` | 3000 |

> ⚠️ **Lưu ý:** Chạy Backend **trước**, sau đó mới chạy Frontend

## 📸 Screenshots

<!-- Thêm screenshots của ứng dụng tại đây -->

## 👥 Tác giả

- **baoshoong** - [GitHub](https://github.com/baoshoong)

## 📄 License

Dự án này được phát triển cho mục đích học tập - Đồ án chuyên ngành.

---

⭐ Nếu thấy hữu ích, hãy cho project một star nhé!
