import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaFilter, FaSearch, FaCalendarAlt, FaPrint, FaDownload, FaInfoCircle, FaTimes, FaArrowUp, FaPills, FaClipboardList } from 'react-icons/fa';
import './patientExaminationHistory.css';

const PatientExaminationHistory = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(null);
  const [examinations, setExaminations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); const [sortOrder, setSortOrder] = useState('desc'); // desc: mới nhất trước, asc: cũ nhất trước
  const [selectedExam, setSelectedExam] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [actionType, setActionType] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState('examinations'); // 'examinations' or 'prescriptions'
  const [showMedicationsForExam, setShowMedicationsForExam] = useState(null); // Store examination ID for which medications should be shown

  // Xử lý hiển thị nút scroll to top
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  const remindSchedule = async (exam) => {
    try {
      //const html = createExamHtml(exam, patient);
      const res = await fetch('http://localhost:5000/doctor/send-reminder-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientID: patientId,
          reExamDate: exam.reExamDate,
          name: patient.name,
          email: patient.email, // giả sử bạn có patient.email
          //    html, // Chuyển đổi HTML thành chuỗi

        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Đã gửi nhắc lịch thành công!');
      } else {
        alert('Không thể gửi nhắc lịch');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi gửi nhắc lịch');
    }
  };


  // Check URL parameters for view mode
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const view = searchParams.get('view');
    if (view === 'prescriptions') {
      setViewMode('prescriptions');
    } else {
      setViewMode('examinations');
    }
  }, [location.search]);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);

        // Fetch patient info
        const patientRes = await fetch(`http://localhost:5000/api/patient/${patientId}`);
        if (!patientRes.ok) {
          throw new Error('Không thể lấy thông tin bệnh nhân');
        }
        const patientData = await patientRes.json();

        if (!patientData.success) {
          throw new Error(patientData.error || 'Không tìm thấy bệnh nhân');
        }

        setPatient(patientData.patient);

        // Fetch examination history
        const examinationsRes = await fetch(`http://localhost:5000/api/medicalExam/examination-history/${patientId}`);
        if (!examinationsRes.ok) {
          throw new Error('Không thể lấy lịch sử khám bệnh');
        }

        const examinationData = await examinationsRes.json();
        if (examinationData.success) {
          // Sắp xếp theo thời gian mới nhất
          const sortedExams = examinationData.examinations.sort((a, b) => {
            return new Date(b.examinationDate) - new Date(a.examinationDate);
          });

          setExaminations(sortedExams);
        } else {
          setExaminations([]);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);
  // Toggle view mode function
  const toggleViewMode = (mode) => {
    setViewMode(mode);
    // Update URL without reloading the page
    const searchParams = new URLSearchParams(location.search);
    if (mode === 'prescriptions') {
      searchParams.set('view', 'prescriptions');
    } else {
      searchParams.delete('view');
    }
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    }, { replace: true });
  };

  // Phân loại loại khám bệnh
  const getExaminationType = (examination) => {
    if (!examination) return { type: 'general', label: 'Khám thường' };

    const diagnosisLower = (examination.diagnosis || '').toLowerCase();
    const symptomsLower = (examination.symptoms || '').toLowerCase();
    const notesLower = (examination.notes || '').toLowerCase();

    // Kiểm tra các trường hợp cấp cứu
    if (
      diagnosisLower.includes('cấp cứu') ||
      symptomsLower.includes('cấp cứu') ||
      diagnosisLower.includes('khẩn cấp') ||
      diagnosisLower.includes('emergency') ||
      notesLower.includes('cấp cứu')
    ) {
      return { type: 'emergency', label: 'Cấp cứu' };
    }

    // Kiểm tra khám chuyên khoa
    if (examination.doctorSpecialty && examination.doctorSpecialty.trim() !== '') {
      return { type: 'specialist', label: `Chuyên khoa ${examination.doctorSpecialty}` };
    }

    // Kiểm tra tái khám
    if (
      diagnosisLower.includes('tái khám') ||
      symptomsLower.includes('tái khám') ||
      notesLower.includes('tái khám') ||
      notesLower.includes('theo dõi tiếp')
    ) {
      return { type: 'follow-up', label: 'Tái khám' };
    }

    // Mặc định là khám thường
    return { type: 'general', label: 'Khám thường' };
  };

  // Định dạng ngày tháng
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Định dạng ngày tháng với giờ
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Lọc danh sách khám bệnh
  const filteredExaminations = examinations.filter(exam => {
    // Lọc theo loại
    const examType = getExaminationType(exam).type;
    const typeMatches = filterType === 'all' || examType === filterType;

    // Lọc theo từ khóa tìm kiếm
    const searchLower = searchTerm.toLowerCase();
    const searchMatches = searchTerm === '' ||
      (exam.diagnosis && exam.diagnosis.toLowerCase().includes(searchLower)) ||
      (exam.symptoms && exam.symptoms.toLowerCase().includes(searchLower)) ||
      (exam.notes && exam.notes.toLowerCase().includes(searchLower)) ||
      (exam.doctorName && exam.doctorName.toLowerCase().includes(searchLower));

    return typeMatches && searchMatches;
  }).sort((a, b) => {
    const dateA = new Date(a.examinationDate);
    const dateB = new Date(b.examinationDate);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Nhóm các lần khám theo tháng, năm
  const groupedExaminations = () => {
    const groups = {};

    filteredExaminations.forEach(exam => {
      const date = new Date(exam.examinationDate);
      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;

      if (!groups[monthYear]) {
        groups[monthYear] = {
          label: new Date(date.getFullYear(), date.getMonth(), 1)
            .toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
          exams: []
        };
      }

      groups[monthYear].exams.push(exam);
    });

    // Chuyển đổi thành mảng và sắp xếp theo thời gian
    return Object.entries(groups)
      .map(([key, value]) => ({ ...value, key }))
      .sort((a, b) => {
        const [monthA, yearA] = a.key.split('-').map(Number);
        const [monthB, yearB] = b.key.split('-').map(Number);

        if (yearA !== yearB) return sortOrder === 'desc' ? yearB - yearA : yearA - yearB;
        return sortOrder === 'desc' ? monthB - monthA : monthA - monthB;
      });
  };
  // const htmlContent = crea  teExamHtml(exam, patient);

  // Tạo HTML cho phiếu khám
  const createExamHtml = (exam, patient) => {
    const formattedDate = new Date().toLocaleDateString('vi-VN');
    return `
  <html>
    <head>
      <title>Toa Thuốc - ${patient?.name || 'Bệnh nhân'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .clinic-info { font-size: 14px; }
        .section-title { font-weight: bold; font-size: 18px; margin-top: 30px; }
        .info, .diagnosis, .notes, .footer { font-size: 16px; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table, th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; }
        .footer { margin-top: 40px; font-style: italic; text-align: center; }
      </style>
    </head>

    <body>
    
      <div class="header">
      
       
        <div class="clinic-info">
          HÒA BÌNH HOSPITAL - Nguyen Van Troi<br/>
          135A Nguyen Van Troi, Phu Nhuan District, HCM City<br/>
          Tel: (078) 747 7687 | Email: HoaBinhHospital@hospital.com.vn
        </div>
      </div>
       <div class="title">TOA THUỐC (PRESCRIPTION)</div>

      <div class="section-title">Thông Tin Bệnh Nhân / Patient Info</div>
      <div class="info">
        <p><strong>Họ tên / Name:</strong> ${patient?.name || 'Không có'}</p>
        <p><strong>Ngày sinh / Birthday:</strong> ${patient?.birthDate || 'Không có'}</p>
        <p><strong>Giới tính / Gender:</strong> ${patient?.gender || 'Không có'}</p>
        <p><strong>CCCD / ID No.:</strong> ${patient?.cccd || 'Không có'}</p>
        <p><strong>Địa chỉ / Address:</strong> ${patient?.address || 'Không có'}</p>
        <p><strong>Điện thoại / Phone:</strong> ${patient?.phone || 'Không có'}</p>
      </div>

      <div class="section-title">Chẩn Đoán / Diagnosis</div>
      <div class="diagnosis">${exam.diagnosis || 'Không ghi nhận'}</div>

      <div class="section-title">Đơn Thuốc / Prescription</div>
      ${exam.medications && exam.medications.length > 0 ? `
      <table>
        <tr>
          <th>Tên thuốc</th>
          <th>Liều dùng</th>
          <th>Cách sử dụng</th>
          <th>Số lượng</th>
          <th>Ghi chú</th>
        </tr>
        ${exam.medications.map(med => `
          <tr>
            <td>${med.medicineName || ''}</td>
            <td>${med.dosage || ''}</td>
            <td>${med.frequency || ''}</td>
            <td>${med.quantity || ''}</td>
            <td>${med.usageNotes || ''}</td>
          </tr>
        `).join('')}
      </table>` : `<p>Không có đơn thuốc.</p>`}

      <div class="section-title">Lời Dặn / Advice</div>
      <div class="notes">${exam.notes || 'Không có lời dặn.'}</div>

      ${exam.reExamDate ? `
        <div class="section-title">Ngày Tái Khám / Appointment Date</div>
        <div class="info">${formatDate(exam.reExamDate)}</div>
      ` : ''}

      <div class="footer">
        Ngày in: ${formattedDate}<br/>
        Bác sĩ: ${exam.doctorName || '---'}
      </div>
    </body>
  </html>
  `;
  };

  const handlePrintExamination = (exam) => {
    // Tạo nội dung HTML cho phiếu khám
    setProcessingAction(true);
    setActionType('print');

    const printContent = createExamHtml(exam, patient);

    // Tạo window mới để in
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    // In sau khi đã load xong nội dung
    printWindow.onload = function () {
      printWindow.print();
      setTimeout(() => {
        setProcessingAction(false);
      }, 500);
    };
  };

  // Hàm xuất PDF
  const handleSendPDFByEmail = async (exam) => {
    setProcessingAction(true);
    setActionType('export');

    try {
      const html = createExamHtml(exam, patient);

      const res = await fetch('http://localhost:5000/doctor/send-pdf-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patient.name,
          email: patient.email,
          //reExamDate: exam.reExamDate,
          html,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Đã gửi file PDF qua email cho bệnh nhân!');
      } else {
        alert('Không thể gửi mail!');
      }
    } catch (error) {
      console.error('Lỗi khi gửi email:', error);
      alert('Lỗi khi gửi email!');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBackNavigation = () => {
    // Kiểm tra nếu người dùng đã thực hiện tìm kiếm hoặc lọc
    if (searchTerm || filterType !== 'all' || sortOrder !== 'desc') {
      if (window.confirm('Bạn có muốn quay lại trang trước? Các bộ lọc hiện tại sẽ bị mất.')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // Xử lý khi click vào bản ghi
  const handleExamClick = (exam) => {
    setSelectedExam(selectedExam?.id === exam.id ? null : exam);
  };

  // Handle showing medications for an examination
  const handleShowMedications = (examId) => {
    setShowMedicationsForExam(showMedicationsForExam === examId ? null : examId);
  };

  return (<div className="patient-examination-history">      <div className="history-header">
    <button className="back-button" onClick={handleBackNavigation}>
      <FaArrowLeft /> Quay lại
    </button>        <div className="header-content">
      <h1>Lịch Sử Khám Bệnh</h1>
    </div>
  </div>

    {loading ? (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    ) : error ? (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    ) : (
      <div className="history-content">          
      <div className="patient-info-section">
        <div className="patient-avatar">
          <img src={patient?.profileImage || "/images/avatar.png"} alt="Patient" />
        </div>
        <div className="patient-details">
          <h2>{patient?.name || 'Không có tên'}</h2>
          <p><strong>Mã bệnh nhân:</strong> {patient?.id}</p>
          <p><strong>Ngày sinh:</strong> {patient?.birthDate}</p>
          <p><strong>Giới tính:</strong> {patient?.gender || 'Không xác định'}</p>
          <p><strong>CCCD:</strong> {patient?.cccd || 'Không có'}</p>
          <p><strong>Số điện thoại:</strong> {patient?.phone || 'Không có'}</p>
          <p><strong>Địa chỉ:</strong> {patient?.address || 'Không có'}</p>
        </div>
      </div>

        <div className="examination-controls">
          <div className="search-bar">
            <FaSearch className="search-icon" />              <input
              type="text"
              placeholder="Tìm kiếm trong lịch sử khám bệnh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>              <div className="filter-controls">
            <div className="filter-group">
              <label>Loại khám:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="general">Khám thường</option>
                <option value="specialist">Khám chuyên khoa</option>
                <option value="emergency">Cấp cứu</option>
                <option value="follow-up">Tái khám</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sắp xếp:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Mới nhất trước</option>
                <option value="asc">Cũ nhất trước</option>
              </select>
            </div>
          </div>
        </div>

        {examinations.length === 0 ? (
          <div className="no-examinations">
            <p>Bệnh nhân chưa có lịch sử khám bệnh</p>
          </div>
        ) : filteredExaminations.length === 0 ? (
          <div className="no-examinations">
            <p>Không tìm thấy kết quả phù hợp</p>
            <button className="reset-filter" onClick={() => {
              setSearchTerm('');
              setFilterType('all');
            }}>Xóa bộ lọc</button>
          </div>
        ) : (<div className="examination-history-list">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-value">{examinations.length}</span>
              <span className="stat-label">Tổng số lần khám</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {examinations.filter(exam => getExaminationType(exam).type === 'specialist').length}
              </span>
              <span className="stat-label">Khám chuyên khoa</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {examinations.filter(exam => getExaminationType(exam).type === 'emergency').length}
              </span>
              <span className="stat-label">Cấp cứu</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {examinations.filter(exam => getExaminationType(exam).type === 'follow-up').length}
              </span>
              <span className="stat-label">Tái khám</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {examinations.filter(exam => exam.reExamDate).length}
              </span>
              <span className="stat-label">Có hẹn tái khám</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {examinations.filter(exam => exam.medications && exam.medications.length > 0).length}
              </span>
              <span className="stat-label">Lần khám có đơn thuốc</span>
            </div>
          </div>

          {groupedExaminations().map(group => (
            <div key={group.key} className="month-group">
              <div className="month-header">
                <FaCalendarAlt /> {group.label} <span className="exam-count">({group.exams.length})</span>
              </div>

              <div className="examinations-list">                    {group.exams.map((exam, index) => {
                const examType = getExaminationType(exam);
                const isNewest = sortOrder === 'desc' &&
                  index === 0 &&
                  group === groupedExaminations()[0];
                return (
                  <div
                    key={exam.id}
                    className={`examination-card ${examType.type} ${selectedExam?.id === exam.id ? 'selected' : ''} ${isNewest ? 'newest' : ''}`}
                    onClick={() => handleExamClick(exam)}
                  >                          <div className="exam-header">
                      <div className="exam-date">
                        <span className="date-value">{formatDateTime(exam.examinationDate)}</span>
                        <span className={`exam-type ${examType.type}`}>{examType.label}</span>
                      </div>
                      <div className="doctor-info-container">
                        <div className="doctor-info">
                          Bác sĩ: {exam.doctorName || 'Không có thông tin'}
                          {exam.doctorSpecialty && ` (${exam.doctorSpecialty})`}
                        </div>
                        {exam.medications && exam.medications.length > 0 && (
                          <button
                            className="prescription-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowMedications(exam.id);
                            }}
                          >
                            <FaPills /> Đơn thuốc
                          </button>

                        )}
                      </div>
                    </div>

                    <div className="exam-body">
                      <div className="exam-detail">
                        <span className="label">Triệu chứng:</span>
                        <span className="value">{exam.symptoms || 'Không ghi nhận'}</span>
                      </div>
                      <div className="exam-detail">
                        <span className="label">Chẩn đoán:</span>
                        <span className="value">{exam.diagnosis || 'Không ghi nhận'}</span>
                      </div>
                      <div className="exam-detail">
                        <span className="label">Ghi chú:</span>
                        <span className="value">{exam.notes || 'Không có'}</span>
                      </div>
                      {showMedicationsForExam === exam.id && exam.medications && exam.medications.length > 0 && (
                        <div className="medications">
                          <div className="medications-header">Đơn thuốc:</div>
                          <ul className="medications-list">
                            {exam.medications.map((med, idx) => (
                              <li key={idx} className="medication-item">
                                <div className="med-name">{med.medicineName}</div>
                                {med.dosage && <div className="med-dosage">Liều dùng: {med.dosage}</div>}
                                {med.frequency && <div className="med-frequency">Tần suất: {med.frequency}</div>}
                                {med.quantity && <div className="med-quantity">Số lượng: {med.quantity}</div>}
                                {med.usageNotes && <div className="med-notes">Ghi chú: {med.usageNotes}</div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {exam.reExamDate && (
                        <div className="reexam-date">
                          <span className="label">Ngày tái khám:</span>

                          <span className="value highlight">{formatDate(exam.reExamDate) || "KHông yêu cầu tái khám "}</span>
                          <button
                            className="prescription-button"
                            onClick={(e) => {

                              remindSchedule(exam);
                            }}
                          >
                            Nhắc lịch
                          </button>
                        </div>

                      )}






                    </div>                          <div className="exam-actions">
                      <button
                        className={`action-button print-button ${processingAction && actionType === 'print' ? 'loading' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!processingAction) handlePrintExamination(exam);
                        }}
                        disabled={processingAction}
                      >
                        {processingAction && actionType === 'print' ? (
                          <span className="button-loader"></span>
                        ) : <FaPrint />} {processingAction && actionType === 'print' ? 'Đang xử lý...' : 'In phiếu khám'}
                      </button>

                      <button
                        className={`action-button export-button ${processingAction && actionType === 'export' ? 'loading' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!processingAction) handleSendPDFByEmail(exam);
                        }}
                        disabled={processingAction}
                      >
                        {processingAction && actionType === 'export' ? (
                          <span className="button-loader"></span>
                        ) : <FaEnvelope />} {processingAction && actionType === 'export' ? 'Đang gửi...' : 'GỬi file PDF'}
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>)}
    {/* Floating Help Button */}
    <div className="help-button" onClick={() => setShowHelp(true)}>
      <FaInfoCircle />
    </div>

    {/* Scroll to Top Button */}
    {showScrollTop && (
      <div className="scroll-top-button" onClick={scrollToTop}>
        <FaArrowUp />
      </div>
    )}

    {/* Help Overlay */}
    {showHelp && (
      <div className="help-overlay">
        <div className="help-content">
          <div className="help-header">
            <h2>Hướng dẫn sử dụng</h2>
            <button className="close-help" onClick={() => setShowHelp(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="help-body">
            <h3>Lịch sử khám bệnh</h3>
            <p>Trang này hiển thị toàn bộ lịch sử khám bệnh của bệnh nhân, bao gồm các thông tin về lần khám, chẩn đoán, đơn thuốc và lịch tái khám.</p>

            <h3>Tìm kiếm và lọc</h3>
            <ul>
              <li><strong>Tìm kiếm:</strong> Nhập từ khóa để tìm kiếm trong chẩn đoán, triệu chứng hoặc ghi chú</li>
              <li><strong>Lọc theo loại khám:</strong> Chọn loại khám bệnh cụ thể để hiển thị</li>
              <li><strong>Sắp xếp:</strong> Chọn hiển thị theo thứ tự thời gian từ mới nhất hoặc cũ nhất</li>
            </ul>

            <h3>Xem chi tiết</h3>
            <p>Nhấp vào một bản ghi khám bệnh để xem thông tin chi tiết.</p>

            <h3>In và xuất</h3>
            <ul>
              <li><strong>In phiếu khám:</strong> Tạo bản in của phiếu khám để in trực tiếp</li>
              <li><strong>Gửi PDF:</strong> Lưu phiếu khám dưới dạng tệp PDF để gửi cho bệnh nhân</li>
            </ul>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default PatientExaminationHistory;
