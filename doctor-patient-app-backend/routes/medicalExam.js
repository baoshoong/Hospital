// routes/medicalExam.js - Đã cập nhật logic để sử dụng UTC+7 cho xử lý ngày giờ
// VÀ LOẠI BỎ HOÀN TOÀN TẤT CẢ CÁC TRUY VẤN SUBCOLLECTION PROFILE/NORMALPROFILE VÀ PROFILE/HEALTHPROFILE

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { Timestamp } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Offset cho UTC+7 (7 giờ * 60 phút/giờ * 60 giây/phút * 1000 mili giây/giây)
const UTC_PLUS_7_OFFSET_MS = 7 * 60 * 60 * 1000;

// Hàm trợ giúp để lấy thông tin patient profile
// CHỈ ĐỌC TỪ TÀI LIỆU USERS CHÍNH, KHÔNG DÙNG SUBCOLLECTIONS NÀO
async function getPatientProfileData(patientId) {
  let patientData = {
    fullName: '',
    DoB: '',
    gender: '',
    address: '',
    CCCD: '',
    phone: ''
  };
  let healthProfileData = {
    heartRate: '',
    height: '',
    Eye: '', // Đã thống nhất dùng 'Eye' cho thị lực
    weight: '',
    medicalHistory: ''
  };

  try {
    const userDoc = await db.collection('users').doc(patientId).get();
    if (!userDoc.exists) {
      console.log(`User document not found for patient ${patientId}`);
      return { patientData, healthProfileData };
    }

    const userData = userDoc.data();

    // 1. Ưu tiên lấy thông tin cơ bản từ mảng ProfileNormal trong document user chính
    // ProfileNormal: [Name, DoB, Phone, Gender, CCCD, Address]
    if (userData.ProfileNormal && Array.isArray(userData.ProfileNormal) && userData.ProfileNormal.length >= 6) {
      const pn = userData.ProfileNormal;
      patientData.fullName = pn[0] || patientData.fullName;
      patientData.DoB = pn[1] || patientData.DoB;
      patientData.phone = pn[2] || patientData.phone;
      patientData.gender = pn[3] || patientData.gender;
      patientData.CCCD = pn[4] || patientData.CCCD;
      patientData.address = pn[5] || patientData.address;
      console.log(`[getPatientProfileData] Loaded ProfileNormal from array for ${patientId}`);
    } else {
      console.log(`[getPatientProfileData] ProfileNormal array not found or incomplete for ${patientId}, falling back to direct fields.`);
      // 2. Fallback: Lấy từ các trường trực tiếp trong document users nếu mảng không có
      patientData.fullName = userData.displayName || userData.name || userData.fullName || patientData.fullName;
      patientData.DoB = userData.DoB || patientData.DoB;
      patientData.gender = userData.gender || patientData.gender;
      patientData.address = userData.address || patientData.address;
      patientData.CCCD = userData.CCCD || patientData.CCCD;
      patientData.phone = userData.phoneNumber || userData.phone || patientData.phone;
    }

    // 1. Ưu tiên lấy thông tin sức khỏe từ mảng HealthProfile trong document user chính
    // HealthProfile: [HeartRate, Height, Eye, Weight, medicalHistory]
    if (userData.HealthProfile && Array.isArray(userData.HealthProfile) && userData.HealthProfile.length >= 5) {
      const hp = userData.HealthProfile;
      healthProfileData.heartRate = hp[0] || healthProfileData.heartRate;
      healthProfileData.height = hp[1] || healthProfileData.height;
      healthProfileData.Eye = hp[2] || healthProfileData.Eye; // Thị lực
      healthProfileData.weight = hp[3] || healthProfileData.weight;
      healthProfileData.medicalHistory = hp[4] || healthProfileData.medicalHistory;
      console.log(`[getPatientProfileData] Loaded HealthProfile from array for ${patientId}`);
    } else {
      console.log(`[getPatientProfileData] HealthProfile array not found or incomplete for ${patientId}, using direct healthProfile object or empty.`);
      // 2. Fallback: Lấy từ đối tượng healthProfile trực tiếp trong document users (cấu trúc cũ hơn)
      if (userData.healthProfile && typeof userData.healthProfile === 'object') {
        healthProfileData.heartRate = userData.healthProfile.heartRate || healthProfileData.heartRate;
        healthProfileData.height = userData.healthProfile.height || healthProfileData.height;
        healthProfileData.Eye = userData.healthProfile.Eye || userData.healthProfile.leftEye || healthProfileData.Eye;
        healthProfileData.weight = userData.healthProfile.weight || healthProfileData.weight;
        healthProfileData.medicalHistory = userData.healthProfile.medicalHistory || healthProfileData.medicalHistory;
      } else {
        console.log(`[getPatientProfileData] No HealthProfile data found for ${patientId}.`);
      }
    }

  } catch (error) {
    console.error(`[getPatientProfileData] Error processing patient data for ${patientId}:`, error);
    // Dữ liệu đã được khởi tạo ở đầu hàm, nên chỉ cần log lỗi.
  }

  return { patientData, healthProfileData };
}

// Hàm trợ giúp để lấy ngày hiện tại ở UTC+7
const getNowInUTCPlus7 = () => {
  const now = new Date();
  // Lấy thời gian UTC
  const utcTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  // Thêm offset của UTC+7
  return new Date(utcTime + UTC_PLUS_7_OFFSET_MS);
};




// GET - Lấy danh sách bệnh nhân đang chờ trong ngày với timeSlot và examinationDate
router.get('/waiting-patients', async (req, res) => {
  try {
    const { doctorId, date } = req.query; // date sẽ là "YYYY-MM-DD"

    if (!doctorId) {
      return res.status(400).json({ success: false, error: "Missing doctor ID." });
    }

    // Lấy danh sách bệnh nhân đang chờ
    const snapshot = await db.collection('HisSchedule')
      .where('doctorID', '==', doctorId)
      .where('status', '==', 'wait')
      // Không sắp xếp examinationDate ở đây để có thể lấy tất cả các lịch chờ
      .get();

    // Xử lý danh sách bệnh nhân
    const waitingPatientsPromises = snapshot.docs.map(async (doc) => {
      const appointment = {
        id: doc.id,
        ...doc.data()
      };

      // Xử lý timeSlot từ chuỗi hoặc từ examinationDate
      let timeSlot = "00:00"; // Giá trị mặc định
      
      // 1. Ưu tiên lấy từ trường timeSlot nếu đã được lưu dưới dạng chuỗi
      if (typeof appointment.timeSlot === 'string' && appointment.timeSlot.match(/^\d{1,2}:\d{2}$/)) {
        timeSlot = appointment.timeSlot;
      } 
      // 2. Nếu timeSlot là số, chuyển đổi thành chuỗi giờ:phút
      else if (typeof appointment.timeSlot === 'number') {
        const hours = Math.floor(appointment.timeSlot / 60);
        const minutes = appointment.timeSlot % 60;
        timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      // 3. Nếu không có timeSlot, sử dụng examinationDate
      else if (appointment.examinationDate) {
        let appointmentDate = new Date();
        if (appointment.examinationDate.toDate && typeof appointment.examinationDate.toDate === 'function') {
          appointmentDate = appointment.examinationDate.toDate();
        } else if (typeof appointment.examinationDate === 'number') {
          appointmentDate = new Date(appointment.examinationDate);
        } else if (appointment.examinationDate instanceof Date) {
          appointmentDate = appointment.examinationDate;
        }

        // Lấy giờ và phút từ timestamp và chuyển thành chuỗi "HH:MM"
        const hours = appointmentDate.getHours();
        const minutes = appointmentDate.getMinutes();
        timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      // Lưu timeSlot vào appointment để sử dụng cho sắp xếp
      appointment.appointmentTimeSlot = timeSlot;

      // Lấy thông tin của bệnh nhân
      const patientId = appointment.parentId || appointment.patientID;
      if (patientId) {
        appointment.patientId = patientId;
        const { patientData, healthProfileData } = await getPatientProfileData(patientId);

        appointment.patientName = patientData.fullName || "Không có tên";
        appointment.patientDoB = patientData.DoB || "N/A";
        appointment.patientGender = patientData.gender || "N/A";
        appointment.patientAddress = patientData.address || "N/A";
        appointment.patientCCCD = patientData.CCCD || "N/A";
        appointment.patientPhone = patientData.phone || "N/A";

        appointment.patient = {
          id: patientId,
          ...patientData,
          healthProfile: healthProfileData
        };
      } else {
        console.warn(`Appointment ${appointment.id} has no patientId/parentId.`);
        appointment.patientName = "Không có ID bệnh nhân";
        appointment.patient = { healthProfile: {} };
      }

      appointment.symptomsInitial = appointment.symptom || "";

      return appointment;
    });

    const waitingPatients = await Promise.all(waitingPatientsPromises);
    const validWaitingPatients = waitingPatients.filter(p => p.patientId && p.patientName !== "Không có ID bệnh nhân");

    // Sắp xếp theo timeSlot - Chuyển các chuỗi thời gian thành số phút kể từ nửa đêm để so sánh
    validWaitingPatients.sort((a, b) => {
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const minutesA = timeToMinutes(a.appointmentTimeSlot || '00:00');
      const minutesB = timeToMinutes(b.appointmentTimeSlot || '00:00');
      
      return minutesA - minutesB;
    });

    const responseDate = date || getNowInUTCPlus7().toISOString().split('T')[0].substring(0, 10);

    res.json({
      success: true,
      date: responseDate,
      waitingPatients: validWaitingPatients
    });
  } catch (error) {
    console.error("Error fetching waiting patients:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Server error when fetching waiting patients: " + error.message
      });
    }
  }
});

// POST - Lưu thông tin khám bệnh và đơn thuốc
router.post('/', async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      diagnosis,
      symptoms,
      notes,
      reExamDate,
      medications
    } = req.body;

    if (!doctorId || !diagnosis) {
      return res.status(400).json({
        success: false,
        error: "Thiếu thông tin bác sĩ hoặc chẩn đoán."
      });
    }

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cần có ít nhất một loại thuốc."
      });
    }

    const validMedications = medications.filter(med => med.medicineName && med.medicineName.trim() !== "");
    if (validMedications.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Không có thuốc nào có tên hợp lệ."
      });
    }

    // Tạo Timestamp cho reExamDate dựa trên UTC+7
    let reExamTimestamp = null;
    if (reExamDate) {
      const [year, month, day] = reExamDate.split('-').map(Number);
      const reExamDateUTC7 = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const adjustedReExamDate = new Date(reExamDateUTC7.getTime() - UTC_PLUS_7_OFFSET_MS);
      reExamTimestamp = Timestamp.fromDate(adjustedReExamDate);
    }

    const examinationRef = db.collection('examinations').doc();
    const examinationData = {
      appointmentId: appointmentId || null,
      patientId: patientId,
      doctorId: doctorId,
      diagnosis: diagnosis,
      symptoms: symptoms || "",
      notes: notes || "",
      examinationDate: Timestamp.now(), // Firestore Timestamp.now() là UTC, tốt cho việc lưu trữ
      reExamDate: reExamTimestamp,
      medications: medications
    };

    await examinationRef.set(examinationData);

    if (appointmentId) {
      const appointmentRef = db.collection('HisSchedule').doc(appointmentId);
      await appointmentRef.update({ status: 'completed' });
    }

    res.status(201).json({
      success: true,
      message: "Đã lưu kết quả khám và đơn thuốc thành công.",
      examinationId: examinationRef.id
    });

  } catch (error) {
    console.error("Lỗi khi lưu kết quả khám:", error);
    return res.status(500).json({
      success: false,
      error: "Lỗi server khi lưu kết quả khám: " + error.message
    });
  }
});

// GET - Lấy thông tin khám bệnh theo ID
router.get('/:examinationId', async (req, res) => {
  try {
    const { examinationId } = req.params;

    const examinationRef = db.collection('examinations').doc(examinationId);
    const examinationDoc = await examinationRef.get();

    if (!examinationDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy bản ghi khám bệnh"
      });
    }

    const examination = examinationDoc.data();

    examination.medications = Array.isArray(examination.medications) ? examination.medications : [];

    if (examination.doctorId) {
      try {
        const doctorDoc = await db.collection('users').doc(examination.doctorId).get();
        if (doctorDoc.exists) {
          const doctorData = doctorDoc.data();
          examination.doctorName = doctorData.displayName || doctorData.name || 'Không xác định';
          examination.doctorSpecialty = doctorData.specialty || '';
        } else {
          examination.doctorName = 'Bác sĩ không tồn tại';
          examination.doctorSpecialty = '';
        }
      } catch (error) {
        console.error(`Error fetching doctor info for examination ${examinationId}:`, error);
        examination.doctorName = 'Lỗi truy vấn thông tin BS';
        examination.doctorSpecialty = '';
      }
    } else {
      examination.doctorName = 'Không có thông tin bác sĩ';
      examination.doctorSpecialty = '';
    }

    res.json({
      success: true,
      examination: {
        id: examinationDoc.id,
        ...examination
      }
    });

  } catch (error) {
    console.error("Lỗi khi lấy thông tin khám bệnh:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi server khi lấy thông tin khám bệnh: " + error.message
    });
  }
});

// GET - Danh sách các lần khám của một bệnh nhân (lịch sử khám)
router.get('/examination-history/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: "ID bệnh nhân không được cung cấp"
      });
    }

    console.log(`Fetching examination history for patient ID: ${patientId}`);

    const examinationsSnapshot = await db.collection('examinations')
      .where('patientId', '==', patientId)
      .orderBy('examinationDate', 'desc')
      .get();

    const examinationsPromises = examinationsSnapshot.docs.map(async (doc) => {
      const examination = {
        id: doc.id,
        ...doc.data()
      };

      // Khi đọc từ Firestore, Timestamp.toDate() sẽ trả về Date object theo múi giờ cục bộ của server.
      // Để hiển thị theo UTC+7, chúng ta sẽ điều chỉnh nó.
      if (examination.examinationDate && examination.examinationDate.toDate) {
        const dateFromFirestore = examination.examinationDate.toDate();
        const utcTime = Date.UTC(dateFromFirestore.getUTCFullYear(), dateFromFirestore.getUTCMonth(), dateFromFirestore.getUTCDate(),
          dateFromFirestore.getUTCHours(), dateFromFirestore.getUTCMinutes(), dateFromFirestore.getUTCSeconds(), dateFromFirestore.getUTCMilliseconds());
        examination.examinationDate = new Date(utcTime + UTC_PLUS_7_OFFSET_MS); // Đây là Date object đại diện cho thời điểm ở UTC+7
      }

      if (examination.reExamDate && examination.reExamDate.toDate) {
        const dateFromFirestore = examination.reExamDate.toDate();
        const utcTime = Date.UTC(dateFromFirestore.getUTCFullYear(), dateFromFirestore.getUTCMonth(), dateFromFirestore.getUTCDate(),
          dateFromFirestore.getUTCHours(), dateFromFirestore.getUTCMinutes(), dateFromFirestore.getUTCSeconds(), dateFromFirestore.getUTCMilliseconds());
        examination.reExamDate = new Date(utcTime + UTC_PLUS_7_OFFSET_MS); // Đây là Date object đại diện cho thời điểm ở UTC+7
      }

      if (examination.doctorId) {
        try {
          const doctorDoc = await db.collection('users').doc(examination.doctorId).get();
          if (doctorDoc.exists) {
            const doctorData = doctorDoc.data();
            examination.doctorName = doctorData.displayName || doctorData.name || 'Không xác định';
            examination.doctorSpecialty = doctorData.specialty || '';
          } else {
            examination.doctorName = 'Bác sĩ không tồn tại';
            examination.doctorSpecialty = '';
            console.warn(`Examination history: Doctor with ID ${examination.doctorId} not found in 'users' collection.`);
          }
        } catch (error) {
          console.error(`Error fetching doctor information for examination ID ${examination.id}:`, error);
          examination.doctorName = 'Error fetching doctor info';
          examination.doctorSpecialty = '';
        }
      } else {
        examination.doctorName = 'No doctor information';
        examination.doctorSpecialty = '';
        console.warn(`Examination history: Missing doctorId for examination record ID ${examination.id}.`);
      }

      examination.medications = Array.isArray(examination.medications) ? examination.medications : [];

      return examination;
    });

    const examinations = await Promise.all(examinationsPromises);

    console.log("---------- EXAMINATION HISTORY - RESPONSE DATA ----------");
    console.log(`Number of examinations found: ${examinations.length}`);
    if (examinations.length > 0) {
      console.log("First examination:", {
        id: examinations[0].id,
        // Trả về ISO string để đảm bảo múi giờ rõ ràng (UTC+7)
        examinationDate: examinations[0].examinationDate ? examinations[0].examinationDate.toISOString() : null,
        reExamDate: examinations[0].reExamDate ? examinations[0].reExamDate.toISOString() : null,
        diagnosis: examinations[0].diagnosis,
        doctorName: examinations[0].doctorName,
        medicationsCount: examinations[0].medications.length
      });
    }

    res.json({
      success: true,
      examinations
    });

  } catch (error) {
    console.error(`Lỗi khi lấy lịch sử khám: ${error}`);
    res.status(500).json({
      success: false,
      error: `Server error fetching examination history: ${error.message}`
    });
  }
});

// GET - Kiểm tra cấu trúc dữ liệu bệnh nhân cho mục đích debug (đã loại bỏ kiểm tra subcollections)
router.get('/check-patient-structure/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: "Missing patient ID"
      });
    }

    const patientDoc = await db.collection('users').doc(patientId).get();

    if (!patientDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Patient not found"
      });
    }

    const patientData = patientDoc.data();

    const hasProfileNormalArray = Array.isArray(patientData.ProfileNormal);
    const hasHealthProfileArray = Array.isArray(patientData.HealthProfile);

    res.json({
      success: true,
      patientId,
      dataStructure: {
        mainDocument: {
          hasProfileNormalArray,
          profileNormalValue: patientData.ProfileNormal || null,
          hasHealthProfileArray,
          healthProfileValue: patientData.HealthProfile || null,
          role: patientData.Role || null,
          displayName: patientData.displayName || null,
          name: patientData.name || null,
          fullName: patientData.fullName || null,
          DoB: patientData.DoB || null,
          gender: patientData.gender || null,
          address: patientData.address || null,
          CCCD: patientData.CCCD || null,
          phone: patientData.phone || null,
          healthProfileObject: patientData.healthProfile || null
        },
      }
    });

  } catch (error) {
    console.error("Lỗi khi kiểm tra cấu trúc dữ liệu bệnh nhân:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message
    });
  }
});


module.exports = router;