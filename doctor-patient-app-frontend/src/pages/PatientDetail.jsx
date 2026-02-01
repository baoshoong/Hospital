import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaFileMedical, FaUserMd, FaCalendarAlt } from "react-icons/fa";
// import "./patientDetail.css";

function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    // Kiểm tra xem người dùng có là doctor không
    const userInfo = JSON.parse(localStorage.getItem("user"));
    if (!userInfo || userInfo.role !== "doctor") {
      navigate("/login");
      return;
    }

    // Lấy thông tin bệnh nhân
    fetchPatientDetails(patientId);
  }, [patientId, navigate]);

  const fetchPatientDetails = async (id) => {
    try {
      setLoading(true);
      
      // Gọi API thực tế để lấy thông tin bệnh nhân
      const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/';
      const response = await fetch(`${API_URL}/api/patient/${id}`);
      const data = await response.json();
      
      if (data.success) {
        // Xử lý dữ liệu từ API để phù hợp với cấu trúc hiển thị
        const patientData = data.patient;
        
        // Kiểm tra và xử lý cấu trúc mới (ProfileNormal và HealthProfile là mảng)
        let name = "Không có tên";
        let birthDate = "Không xác định";
        let gender = "Không xác định";        let address = "Chưa cập nhật";
        let phone = "Chưa cập nhật";
        let cccd = "";
        
        // Xử lý ProfileNormal nếu là mảng theo cấu trúc mới
        // PatientNormal array structure: [Name, DoB, Phone, Gender, CCCD, Address]
        if (patientData.ProfileNormal && Array.isArray(patientData.ProfileNormal)) {
          name = patientData.ProfileNormal[0] || name;
          birthDate = patientData.ProfileNormal[1] || birthDate;
          phone = patientData.ProfileNormal[2] || phone;
          gender = patientData.ProfileNormal[3] || gender;
          cccd = patientData.ProfileNormal[4] || cccd;
          address = patientData.ProfileNormal[5] || address;
        } else {
          // Fallback cho cấu trúc cũ
          name = patientData.name || name;
          birthDate = patientData.birthDate || birthDate;
          gender = patientData.gender || gender;
          address = patientData.address || address;
          phone = patientData.phone || phone;
          cccd = patientData.cccd || cccd;
        }
        
        // Xử lý HealthProfile nếu là mảng theo cấu trúc mới
        // HealthProfile array structure: [HeartRate, Height, Eye, Weight, medicalHistory]
        let heartRate = "N/A";
        let height = "N/A";
        let Eye = "N/A";
        let weight = "N/A";
        let medicalHistoryText = "";
          if (patientData.HealthProfile && Array.isArray(patientData.HealthProfile)) {
          heartRate = patientData.HealthProfile[0] || heartRate;
          height = patientData.HealthProfile[1] || height;
          Eye = patientData.HealthProfile[2] || Eye;
          // rightEye = patientData.HealthProfile[3] || rightEye;
          weight = patientData.HealthProfile[3] || weight;
          medicalHistoryText = patientData.HealthProfile[4] || medicalHistoryText;
        } 

        // Chuẩn bị dữ liệu để phù hợp với component
        const formattedPatient = {
          id: patientData.id,
          name: name,
          birthDate: birthDate,
          gender: gender,
          address: address,
          phone: phone,
          cccd: cccd,
          email: patientData.email || "Chưa cập nhật",
          image: "/images/avatar.png", // Hình mặc định
          
          // Thông số sinh tồn
          vitalSigns: {
            heartRate: heartRate,
            height: height,
            weight: weight,
            bmi: patientData.vitalSigns?.bmi || "N/A",
            bloodPressure: "N/A", // API chưa có thông tin này
            temperature: "N/A", // API chưa có thông tin này
            respiratoryRate: "N/A", // API chưa có thông tin này
            bloodType: "N/A", // API chưa có thông tin này
            Eye: Eye,
            // rightEye: rightEye,
            medicalHistoryText: medicalHistoryText
          },
          
          // Dị ứng (nếu có)
          allergies: patientData.allergies || [],
          
          // Lịch sử y tế
          medicalHistory: patientData.examinations?.map(exam => ({
            date: exam.date,
            diagnosis: exam.diagnosis,
            doctor: exam.doctor,
            prescription: exam.prescription?.map(p => 
              `${p.medicine} (${p.dosage}, ${p.usage})`
            ).join(", ") || "Không có đơn thuốc",
            notes: exam.notes || "Không có ghi chú"
          })) || [],
          
          // Lịch hẹn sắp tới
          upcomingAppointments: patientData.upcomingAppointments?.map(apt => ({
            date: apt.date,
            time: apt.time,
            doctor: apt.doctor,
            department: apt.department,
            status: apt.status
          })) || [],
          
          // Kết quả xét nghiệm (nếu có)
          labResults: patientData.labResults || []
        };
        
        setPatient(formattedPatient);
      } else {
        console.error("Không thể lấy thông tin bệnh nhân:", data.error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching patient details:", error);
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate(-1); // Quay lại trang trước đó
  };

  if (loading) {
    return <div className="loading">Đang tải thông tin bệnh nhân...</div>;
  }

  if (!patient) {
    return <div className="error">Không tìm thấy thông tin bệnh nhân</div>;
  }

  return (
    <div className="patient-detail-container">
      {/* Thanh Hello Doctor riêng - giống DoctorHome */}
      <div className="doctor-topbar">
        <span>Hello, Dr.{JSON.parse(localStorage.getItem("user")).name || "Doctor"}</span>
        <img src="/images/avatar.png" alt="Avatar" className="doctor-avatar" />
      </div>

      {/* Header chứa logo + menu */}
      <header className="doctor-header">
        <div className="logo-section">
          <img src="/images/logo.png" alt="Logo" className="doctor-logo" />
          <span className="hospital-name">HOA BINH HOSPITAL</span>
        </div>
        <nav className="doctor-nav">
          <ul>
            <li>HOME</li>
            <li>ABOUT</li>
            <li>SERVICES</li>
            <li>CONTACT</li>
            <li className="active">DASHBOARD</li>
          </ul>
        </nav>
      </header>

      <div className="patient-detail-content">
        <div className="back-button" onClick={goBack}>
          <FaArrowLeft /> Quay lại danh sách
        </div>

        {/* Patient Header */}
        <div className="patient-header">
          <div className="patient-header-left">
            <img src={patient.image} alt={patient.name} className="patient-detail-avatar" />
            <div className="patient-main-info">
              <h1>{patient.name}</h1>
              <p>Mã hồ sơ: <strong>{patient.id}</strong></p>
              <div className="patient-badges">
                <span className="badge">
                  {patient.gender}
                </span>
                <span className="badge">
                  {patient.birthDate} ({new Date().getFullYear() - parseInt(patient.birthDate.split('/')[2])} tuổi)
                </span>
                <span className="badge status-badge">
                  Bệnh nhân thường xuyên
                </span>
              </div>
            </div>
          </div>
          <div className="patient-header-right">
            <div className="patient-contact-info">
              <p><strong>SĐT:</strong> {patient.phone}</p>
              <p><strong>Email:</strong> {patient.email}</p>
              <p><strong>Địa chỉ:</strong> {patient.address}</p>
            </div>
          </div>
        </div>

        {/* Patient Tabs */}
        <div className="patient-tabs">
          <div 
            className={`tab ${activeTab === "info" ? "active" : ""}`} 
            onClick={() => setActiveTab("info")}
          >
            <FaUserMd /> Thông tin chung
          </div>
          <div 
            className={`tab ${activeTab === "medical" ? "active" : ""}`} 
            onClick={() => setActiveTab("medical")}
          >
            <FaFileMedical /> Lịch sử y tế
          </div>
          <div 
            className={`tab ${activeTab === "appointments" ? "active" : ""}`} 
            onClick={() => setActiveTab("appointments")}
          >
            <FaCalendarAlt /> Lịch hẹn
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "info" && (
            <div className="tab-pane">
              <div className="info-section vital-signs">
                <h3>Thông số sinh tồn</h3>
                <div className="vital-signs-grid">
                  <div className="vital-item">
                    <h4>Huyết áp</h4>
                    <p>{patient.vitalSigns.bloodPressure}</p>
                  </div>
                  <div className="vital-item">
                    <h4>Nhịp tim</h4>
                    <p>{patient.vitalSigns.heartRate}</p>
                  </div>
                  <div className="vital-item">
                    <h4>Nhiệt độ</h4>
                    <p>{patient.vitalSigns.temperature}</p>
                  </div>
                  <div className="vital-item">
                    <h4>Nhịp thở</h4>
                    <p>{patient.vitalSigns.respiratoryRate}</p>
                  </div>
                  <div className="vital-item">
                    <h4>Chiều cao</h4>
                    <p>{patient.vitalSigns.height}</p>
                  </div>
                  <div className="vital-item">
                    <h4>Cân nặng</h4>
                    <p>{patient.vitalSigns.weight}</p>
                  </div>
                  <div className="vital-item">
                    <h4>BMI</h4>
                    <p>{patient.vitalSigns.bmi}</p>
                  </div>
                  <div className="vital-item">
                    <h4>Nhóm máu</h4>
                    <p>{patient.vitalSigns.bloodType}</p>
                  </div>
                </div>
              </div>

              <div className="info-section allergies">
                <h3>Dị ứng</h3>
                <div className="allergies-list">
                  {patient.allergies.length > 0 ? (
                    patient.allergies.map((allergy, index) => (
                      <div key={index} className="allergy-item">{allergy}</div>
                    ))
                  ) : (
                    <p>Không có dị ứng</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "medical" && (
            <div className="tab-pane">
              <div className="info-section">
                <h3>Lịch sử khám bệnh</h3>
                {patient.medicalHistory.map((record, index) => (
                  <div key={index} className="medical-record">
                    <div className="medical-record-header">
                      <div className="medical-record-date">
                        <strong>Ngày khám:</strong> {record.date}
                      </div>
                      <div className="medical-record-diagnosis">
                        <strong>Chẩn đoán:</strong> {record.diagnosis}
                      </div>
                    </div>
                    <div className="medical-record-details">
                      <p><strong>Bác sĩ:</strong> {record.doctor}</p>
                      <p><strong>Đơn thuốc:</strong> {record.prescription}</p>
                      <p><strong>Ghi chú:</strong> {record.notes}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="info-section">
                <h3>Kết quả xét nghiệm</h3>
                <table className="lab-results-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Xét nghiệm</th>
                      <th>Kết quả</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.labResults.map((lab, index) => (
                      <tr key={index}>
                        <td>{lab.date}</td>
                        <td>{lab.testName}</td>
                        <td>{lab.result}</td>
                        <td>{lab.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="tab-pane">
              <div className="info-section">
                <h3>Lịch hẹn sắp tới</h3>
                {patient.upcomingAppointments.length > 0 ? (
                  <div className="appointments-list">
                    {patient.upcomingAppointments.map((appointment, index) => (
                      <div key={index} className="appointment-item">
                        <div className="appointment-date">
                          <div className="appointment-day">{appointment.date.split('/')[0]}</div>
                          <div className="appointment-month">{appointment.date.split('/')[1]}</div>
                        </div>
                        <div className="appointment-details">
                          <h4>{appointment.time} - {appointment.department}</h4>
                          <p>Bác sĩ: {appointment.doctor}</p>
                          <p className="appointment-status">{appointment.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">Không có lịch hẹn sắp tới</p>
                )}
              </div>

              <div className="appointment-actions">
                <button className="action-button primary">Đặt lịch hẹn mới</button>
                <button className="action-button secondary">Xem lịch hẹn trước đây</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDetail;