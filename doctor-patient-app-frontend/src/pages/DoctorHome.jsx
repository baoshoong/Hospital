// src/pages/DoctorHome.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./doctor.css";
import { FaSearch, FaSignOutAlt, FaSyncAlt, FaFilter, FaHistory, } from "react-icons/fa";
import DoctorSchedule from "./DoctorSchedule";
import MedicalExam from "./MedicalExam";
//import Chat from "./chat";
import { useRef } from "react";
import ChatApp from "./ChatApp";

// Auto retry component

const AutoRetry = ({ onRetry }) => {
  const [countdown, setCountdown] = useState(10);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onRetry();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [onRetry]);
  
  return (
    <div className="auto-retry-countdown">
      Tự động kết nối lại sau {countdown} giây...
    </div>
  );
};

function DoctorHome() {
  //const [activeTab, setActiveTab] = useState("Dashboard");
const [chatInfo, setChatInfo] = useState(null); // { chatID, otherID }
  const chatAppRef = useRef();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");  
  const [activeTab, setActiveTab] = useState("Hồ Sơ");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [searchType, setSearchType] = useState("name"); // name, phone, id
  const [filterActive, setFilterActive] = useState(false);
  const [patientCount, setPatientCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [serverStatus, setServerStatus] = useState('unknown'); // 'unknown', 'online', 'offline'

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const form = e.target;
    const updatedDoctor = {
      name: form.name.value,
      birthDate: form.birthDate.value,
      CCCD: form.CCCD.value,
      specialty: form.specialty.value,
      phone: form.phone.value,
      address: form.address.value,
      experience: form.experience.value,
      note: form.note.value,
      img: form.imgLink.value || doctor.img,
    };

    try {
      const email = doctor.email;
      const res = await fetch(`http://localhost:5000/api/doctor/update/${email}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDoctor),
      });
      const data = await res.json();
      alert("Cập nhật thành công!");

      const newDoctor = { ...doctor, ...updatedDoctor };
      setDoctor(newDoctor);
      localStorage.setItem("user", JSON.stringify(newDoctor));
      setEditing(false);
    } catch (err) {
      alert("Cập nhật thất bại!");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result;
        setDoctor((prev) => ({ ...prev, img: base64Image }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const password = e.target.oldPassword.value;
    const newPassword = e.target.newPassword.value;

    try {
      const res = await fetch("http://localhost:5000/api/doctor/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: doctor.email, password, newPassword }),
      });

      if (res.ok) {
        alert("Đổi mật khẩu thành công!");
        e.target.reset();
      } else {
        const error = await res.json();
        alert(error.message || "Đổi mật khẩu thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi server khi đổi mật khẩu.");
    }
  };

  useEffect(() => {
    // Lấy thông tin doctor từ localStorage
    const userInfo = JSON.parse(localStorage.getItem("user"));
    if (userInfo && userInfo.role === "doctor") {
      setDoctor(userInfo);
      fetchPatients();
    } else {
      // Redirect nếu không phải doctor
      window.location.href = "/";
    }

    // Cleanup function to prevent memory leaks
    return () => {
      // Cleanup code if needed
    };
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if server is available
      const checkServerStatus = async () => {
        try {
          const response = await fetch('http://localhost:5000/', {
            method: 'GET',
            // signal: AbortSignal.timeout(3000) // 3s timeout for server status check
          });
          if (response.ok) {
            setServerStatus('online');
            return true;
          }
          return false;
        } catch (e) {
          console.error("Server status check failed:", e);
          setServerStatus('offline');
          return false;
        }
      };
      
      // Check server status first
      const isServerOnline = await checkServerStatus();
      if (!isServerOnline) {
        throw new Error("Server không hoạt động");
      }
      
      //const token = localStorage.getItem("token");
     // console.log("Token từ localStorage:", token);

      // Sử dụng API đúng từ patient.js để lấy tất cả bệnh nhân
      const res = await fetch(`http://localhost:5000/api/patient/list/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${token}`
        },
       // signal: AbortSignal.timeout(10000) // 10 giây timeout
      });
      
      if (!res.ok) {
        throw new Error(`Lỗi khi lấy danh sách bệnh nhân: ${res.status}`);
      }
     // console.log("Token từ localStorage:", token);
      
      const data = await res.json();
        if (data.success && Array.isArray(data.patients)) {
        setPatients(data.patients);
        setPatientCount(data.patients.length);
        setRetryCount(0); // Reset retry count on success
      } else {
        setPatients([]);
        setPatientCount(0);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      
      // Thêm thông báo lỗi chi tiết hơn
      if (error.name === "AbortError") {
        setError("Không thể kết nối đến server: Yêu cầu đã hết thời gian chờ");
      } else if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        setError("Không thể kết nối đến server: Vui lòng kiểm tra kết nối mạng hoặc xác nhận server đang hoạt động");
      } else {
        setError(`Không thể lấy danh sách bệnh nhân: ${error.message}`);
      }
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }  };

  // Tìm kiếm bệnh nhân
  const searchPatients = async (query) => {
    if (!query || query.trim() === "") {
      fetchPatients();
      return;
    }
    
    setLoading(true);
    
    try {
      // Lọc trực tiếp từ danh sách patients đã lấy về
      const filteredResults = patients.filter(patient => {
        const searchLower = query.toLowerCase();
        
        // Tìm trong thông tin patientInfo nếu có
        const name = patient.patientInfo?.name || patient.name || "";
        const phone = patient.patientInfo?.phone || patient.phone || "";
        const email = patient.email || "";
        
        switch (searchType) {
          case "name":
            return name.toLowerCase().includes(searchLower);
          case "phone":
            return phone.includes(query);
          case "id":
            return patient.id.toLowerCase().includes(searchLower);
          default:
            return (
              name.toLowerCase().includes(searchLower) ||
              phone.includes(query) ||
              email.toLowerCase().includes(searchLower) ||
              patient.id.toLowerCase().includes(searchLower)
            );
        }
      });
      
      setPatients(filteredResults);
    } catch (error) {
      console.error("Error searching patients:", error);
      setError("Lỗi khi tìm kiếm bệnh nhân");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debouncing search - chờ người dùng ngừng gõ 500ms
    const debounceTimer = setTimeout(() => {
      if (value.trim().length >= 2) {
        searchPatients(value);
      } else if (value.trim() === "") {
        fetchPatients();
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  };
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };
  const handleStartChat = async (patientId) => {
  const user = JSON.parse(localStorage.getItem("user"));
  try {
    const res = await fetch("http://localhost:5000/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participants: [user.id, patientId] }),
    });

    const data = await res.json();
    if (data.chatID) {
      // chuyển tab và truyền dữ liệu vào ChatApp
      setChatInfo({ chatID: data.chatID, otherID: patientId });
      setActiveTab("Chat");
    }
  } catch (err) {
    console.error("Lỗi khi tạo hoặc vào trò chuyện:", err);
  }
};



  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    switch (searchType) {
      case "name":
        return patient.name?.toLowerCase().includes(searchLower);
      case "phone":
        return patient.phone?.includes(searchTerm);
      case "id":
        return patient.id?.toLowerCase().includes(searchLower);
      default:
        return (
          patient.name?.toLowerCase().includes(searchLower) ||
          patient.id?.toLowerCase().includes(searchLower) ||
          patient.phone?.includes(searchTerm)
        );
    }
  });

  const toggleFilterMenu = () => {
    setFilterActive(!filterActive);
  };

  if (!doctor) {
    return <div className="loading">Đang tải thông tin bác sĩ...</div>;
  }

  return (
    <div className="doctor-home-container">
      <div className="doctor-topbar">
        <span>Hello, Dr.{doctor?.name || "Doctor"}</span>
        <img
          src={doctor?.img || "/images/avatar.png"}
          alt="Avatar"
          className="doctor-avatar"
        />
      </div>

      <header className="doctor-header">
        <div className="logo-section">
          <img src="/images/logo.png" alt="Logo" className="doctor-logo" />
          <span className="hospital-name">HOA BINH HOSPITAL</span>
        </div>
        <nav className="doctor-nav">
          <ul>
            <li onClick={() => navigate('/')}>HOME</li>
            <li onClick={() => navigate('/about')}>ABOUT</li>
            <li onClick={() => navigate('/services')}>SERVICES</li>
            <li onClick={() => navigate('/contact')}>CONTACT</li>
            <li className="active">DASHBOARD</li>
          </ul>
        </nav>
      </header>

      <div className="doctor-main">
        <aside className="doctor-sidebar">
          <h3>Chức Năng</h3>
          <ul>
            <li
              className={activeTab === "Hồ Sơ" ? "active" : ""}
              onClick={() => setActiveTab("Hồ Sơ")}
            >
              Hồ Sơ
            </li>
            <li
              className={activeTab === "Lịch" ? "active" : ""}
              onClick={() => setActiveTab("Lịch")}
            >
              Lịch Khám Bệnh
            </li>
            <li
              className={activeTab === "Khám Bệnh" ? "active" : ""}
              onClick={() => setActiveTab("Khám Bệnh")}
            >
              Khám Bệnh
            </li>
            <li
              className={activeTab === "Chat" ? "active" : ""}
              onClick={() => setActiveTab("Chat")}
            >
              Chat với Bệnh Nhân
            </li>
            <li
              className={activeTab === "Thông tin" ? "active" : ""}
              onClick={() => setActiveTab("Thông tin")}
            >
              Thông tin cá nhân
            </li>
          </ul>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Đăng xuất
          </button>
        </aside>

        <main className="doctor-content">
          {activeTab === "Hồ Sơ" && (
            <>
              <div className="content-header">
                <div className="content-header-left">
                  <h2>Hồ Sơ Bệnh Nhân <span className="patient-count">({patientCount})</span></h2>
                </div>
                
                <div className="search-filter-container">
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder={`Tìm theo ${
                        searchType === "name" ? "tên" : 
                        searchType === "phone" ? "số điện thoại" : "mã bệnh nhân"
                      }`}
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                    <FaSearch className="search-icon" />
                  </div>
                </div>
                
                {filterActive && (
                  <div className="filter-dropdown">
                    <div className="filter-options">
                      <p>Tìm kiếm theo:</p>
                      <div className="filter-option">
                        <input 
                          type="radio" 
                          id="name" 
                          name="searchType" 
                          checked={searchType === "name"} 
                          onChange={() => setSearchType("name")}
                        />
                        <label htmlFor="name">Tên</label>
                      </div>
                      <div className="filter-option">
                        <input 
                          type="radio" 
                          id="phone" 
                          name="searchType" 
                          checked={searchType === "phone"} 
                          onChange={() => setSearchType("phone")}
                        />
                        <label htmlFor="phone">Số điện thoại</label>
                      </div>
                      <div className="filter-option">
                        <input 
                          type="radio" 
                          id="id" 
                          name="searchType" 
                          checked={searchType === "id"} 
                          onChange={() => setSearchType("id")}
                        />
                        <label htmlFor="id">Mã bệnh nhân</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>Đang tải danh sách bệnh nhân...</p>
                </div>
              ) : error ? (
                <div className="error-message">
                  <p>{error}</p>
                  <div className="server-status">
                    {serverStatus === 'offline' && (
                      <div className="server-offline-message">
                        <p>Server hiện không hoạt động. Kiểm tra xem máy chủ đã được khởi động chưa.</p>
                        <ul className="server-tips">
                          <li>Đảm bảo server đã được khởi động với lệnh <code>npm start</code> hoặc <code>node server.js</code></li>
                          <li>Kiểm tra xem server có đang chạy trên port 5000 không</li>
                          <li>Đảm bảo không có tường lửa đang chặn kết nối</li>
                        </ul>
                      </div>
                    )}
                    <div className="retry-actions">
                      <button 
                        onClick={() => fetchPatients()}
                        className="retry-button"
                      >
                        <FaSyncAlt /> Thử lại ngay ({retryCount})
                      </button>
                      
                      {/* Auto retry countdown */}
                      {retryCount > 0 && retryCount <= 3 && (
                        <AutoRetry onRetry={fetchPatients} />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="patient-cards">                    {filteredPatients.length > 0 ? (
                      filteredPatients.map(patient => (
                        <div className="patient-card" key={patient.id}>
                          <div className="card-header">
                            <img 
                              src={patient.profileImage || "/images/avatar.png"} 
                              alt={patient.patientInfo?.name || patient.name || "Patient"} 
                              className="patient-image"
                            />
                            <div className="patient-info">                              
                              <h3 className="patient-name">
                                {patient.ProfileNormal?.[0]
                                  || patient.patientInfo?.name
                                  || patient.name
                                  || "Không xác định"}
                              </h3>                              <p className="patient-id">
                                <strong>Mã hồ sơ:</strong> 
                                <span>{patient.id ? `${patient.id.substring(0, 6)}...` : "N/A"}</span>
                              </p>
                              <p>
                                <strong>Giới tính:</strong> 
                                <span>
                                  {patient.ProfileNormal && Array.isArray(patient.ProfileNormal) && patient.ProfileNormal.length > 3
                                    ? patient.ProfileNormal[3] 
                                    : (patient.patientInfo?.gender || "Không xác định")}
                                </span>
                              </p>
                              <p>
                                <strong>Ngày sinh:</strong> 
                                <span>
                                  {patient.ProfileNormal && Array.isArray(patient.ProfileNormal) && patient.ProfileNormal.length > 1
                                    ? patient.ProfileNormal[1] 
                                    : (patient.patientInfo?.birthDate || "Không xác định")}
                                </span>
                              </p>
                              <p>
                                <strong>SĐT:</strong> 
                                <span>
                                  {patient.ProfileNormal && Array.isArray(patient.ProfileNormal) && patient.ProfileNormal.length > 2
                                    ? patient.ProfileNormal[2] 
                                    : (patient.patientInfo?.phone || patient.phone || "Không xác định")}
                                </span>
                              </p>
                            </div>
                          </div>                          <div className="card-actions">
                            <button
                              className="history-button tertiary"
                              onClick={() => navigate(`/examination-history/${patient.id}`)}
                              title="Xem lịch sử khám bệnh"
                            >
                              <FaHistory /> Lịch Sử Khám
                            </button>
                             <button
     className="history-button tertiary"
    onClick={() => handleStartChat(patient.id)}
    title="Trò chuyện với bệnh nhân"
  >
    💬 Trò chuyện
  </button>

                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        <p>Không tìm thấy bệnh nhân nào</p>
                        {searchTerm && (
                          <button onClick={() => {
                            setSearchTerm("");
                            fetchPatients();
                          }}>Xem tất cả bệnh nhân</button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "Lịch" && (
            <DoctorSchedule />
          )}

          {activeTab === "Khám Bệnh" && (
            <MedicalExam />
          )}

          {activeTab === "Chat" && (
            <ChatApp
              initialChatID={chatInfo?.chatID}
              initialOtherID={chatInfo?.otherID}
            />
          )}

          {activeTab === "Thông tin" && (
            <>
              <div className="content-header">
                <h2>Thông Tin Cá Nhân</h2>
                {!editing && (
                  <button className="edit-button" onClick={() => setEditing(true)}>
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {editing ? (
                <div className="profile-edit-container">
                  <form className="doctor-profile-form" onSubmit={handleProfileUpdate}>
                    <div className="form-group image-upload">
                      <div className="current-image">
                        <img src={doctor.img || "/images/avatar.png"} alt="Doctor" />
                      </div>
                      <label htmlFor="profile-image" className="custom-file-upload">
                        Thay đổi ảnh
                      </label>
                      <input
                        type="file"
                        id="profile-image"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      <input 
                        type="text" 
                        name="imgLink" 
                        placeholder="Hoặc nhập URL ảnh" 
                        className="image-url-input" 
                        defaultValue={doctor.img || ""}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Họ và tên</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={doctor.name || ""}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Ngày sinh</label>
                        <input
                          type="date"
                          name="birthDate"
                          defaultValue={doctor.birthDate || ""}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>CMND/CCCD</label>
                        <input
                          type="text"
                          name="CCCD"
                          defaultValue={doctor.CCCD || ""}
                        />
                      </div>
                      <div className="form-group">
                        <label>Chuyên khoa</label>
                        <input
                          type="text"
                          name="specialty"
                          defaultValue={doctor.specialty || ""}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Số điện thoại</label>
                        <input
                          type="tel"
                          name="phone"
                          defaultValue={doctor.phone || ""}
                        />
                      </div>
                      <div className="form-group">
                        <label>Địa chỉ</label>
                        <input
                          type="text"
                          name="address"
                          defaultValue={doctor.address || ""}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Kinh nghiệm (năm)</label>
                        <input
                          type="number"
                          name="experience"
                          min="0"
                          defaultValue={doctor.experience || 0}
                        />
                      </div>
                      <div className="form-group">
                        <label>Ghi chú</label>
                        <textarea
                          name="note"
                          defaultValue={doctor.note || ""}
                        ></textarea>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="save-button">
                        Lưu thay đổi
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setEditing(false)}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="profile-view-container">
                  <div className="profile-view">
                    <div className="profile-image">
                      <img src={doctor.img || "/images/avatar.png"} alt="Doctor profile" />
                    </div>
                    
                    <div className="profile-data">
                      <div className="data-section">
                        <h3>Thông tin cơ bản</h3>
                        <p><strong>Họ và tên:</strong> {doctor.name || "Chưa cập nhật"}</p>
                        <p><strong>Email:</strong> {doctor.email || "Chưa cập nhật"}</p>
                        <p><strong>Ngày sinh:</strong> {doctor.birthDate || "Chưa cập nhật"}</p>
                        <p><strong>CMND/CCCD:</strong> {doctor.CCCD || "Chưa cập nhật"}</p>
                      </div>
                      
                      <div className="data-section">
                        <h3>Thông tin chuyên môn</h3>
                        <p><strong>Chuyên khoa:</strong> {doctor.specialty || "Chưa cập nhật"}</p>
                        <p><strong>Kinh nghiệm:</strong> {doctor.experience ? `${doctor.experience} năm` : "Chưa cập nhật"}</p>
                      </div>
                      
                      <div className="data-section">
                        <h3>Thông tin liên hệ</h3>
                        <p><strong>Số điện thoại:</strong> {doctor.phone || "Chưa cập nhật"}</p>
                        <p><strong>Địa chỉ:</strong> {doctor.address || "Chưa cập nhật"}</p>
                      </div>

                      {doctor.note && (
                        <div className="data-section">
                          <h3>Ghi chú</h3>
                          <p>{doctor.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="password-change-section">
                    <h3>Đổi mật khẩu</h3>
                    <form onSubmit={handleChangePassword}>
                      <div className="form-group">
                        <label>Mật khẩu hiện tại</label>
                        <input type="password" name="oldPassword" required />
                      </div>
                      <div className="form-group">
                        <label>Mật khẩu mới</label>
                        <input type="password" name="newPassword" required />
                      </div>
                      <div className="form-group">
                        <label>Xác nhận mật khẩu mới</label>
                        <input type="password" name="confirmPassword" required />
                      </div>
                      <button type="submit" className="change-password-button">
                        Đổi mật khẩu
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default DoctorHome;