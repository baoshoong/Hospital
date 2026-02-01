// routes/patientProfile.js
const express = require('express');
const router = express.Router();
const { db } = require("../firebase");

// API endpoint to get a patient's complete profile by patient ID
// router.get('/patient-profile/:patientId', async (req, res) => {
//   try {
//     const { patientId } = req.params;

//     console.log('---[DEBUG]--- Bắt đầu lấy hồ sơ cho patientId:', patientId);

//     if (!patientId) {
//       console.error('---[DEBUG]--- patientId không được cung cấp');
//       return res.status(400).json({
//         success: false,
//         error: 'ID bệnh nhân không được cung cấp'
//       });
//     }

//     // Truy vấn trực tiếp document theo patientId
//     const userDoc = await db.collection('users').doc(patientId).get();

//     if (!userDoc.exists) {
//       console.error('---[DEBUG]--- Không tìm thấy user với ID:', patientId);
//       return res.status(404).json({
//         success: false,
//         error: 'Không tìm thấy người dùng với ID đã cung cấp'
//       });
//     }
    
//     const userData = userDoc.data();
    
//     // Kiểm tra role của user (tùy chọn)
//     if (userData.Role !== 'patient' && userData.Role !== 'Patient') {
//       console.log('---[DEBUG]--- User không phải là bệnh nhân, Role =', userData.Role);
//       // Đã tìm thấy user nhưng vẫn tiếp tục xử lý bình thường
//     }
//       console.log('---[DEBUG]--- User data:', userData);    // Get health profile and normal profile directly from user document
//     // Based on the new Firebase structure where HealthProfile and ProfileNormal are arrays in the user document
//     const healthProfile = userData.HealthProfile || null;
//     const normalProfile = userData.ProfileNormal || null;
    
//     console.log('---[DEBUG]--- HealthProfile exists:', !!healthProfile, healthProfile);
//     console.log('---[DEBUG]--- ProfileNormal exists:', !!normalProfile, normalProfile);// Get medical history records if any - try both patientId and parentId fields
//     let medicalHistorySnapshot;
//     try {
//       medicalHistorySnapshot = await db.collection('examinations')
//         .where('patientId', '==', patientId)
//         .orderBy('examinationDate', 'desc')
//         .get();
//     } catch (indexError) {
//       console.log(`---[DEBUG]--- Lỗi khi truy vấn với index: ${indexError.message}`);
//       console.log('---[DEBUG]--- Đang sử dụng phương thức thay thế...');
      
//       // Nếu không có index, lấy tất cả bản ghi mà không sắp xếp
//       medicalHistorySnapshot = await db.collection('examinations')
//         .where('patientId', '==', patientId)
//         .get();
//     }      // If no results with patientId, try with parentId
//       if (medicalHistorySnapshot.empty) {
//         console.log('---[DEBUG]--- Không có record với patientId, thử với parentId');
//         try {
//           medicalHistorySnapshot = await db.collection('examinations')
//             .where('parentId', '==', patientId)
//             .orderBy('examinationDate', 'desc')
//             .get();
//         } catch (indexError) {
//           console.log(`---[DEBUG]--- Lỗi khi truy vấn với index (parentId): ${indexError.message}`);
//           medicalHistorySnapshot = await db.collection('examinations')
//             .where('parentId', '==', patientId)
//             .get();
//         }        // If still no results, try checking if patientId is stored differently
//         if (medicalHistorySnapshot.empty) {
//           console.log('---[DEBUG]--- Không có record với parentId, thử với userId');
//           try {
//             medicalHistorySnapshot = await db.collection('examinations')
//               .where('userId', '==', patientId)
//               .orderBy('examinationDate', 'desc')
//               .get();
//           } catch (indexError) {
//             console.log(`---[DEBUG]--- Lỗi khi truy vấn với index (userId): ${indexError.message}`);
//             medicalHistorySnapshot = await db.collection('examinations')
//               .where('userId', '==', patientId)
//               .get();
//           }
//         }
//     }    console.log('---[DEBUG]--- Số lượng medicalHistory:', medicalHistorySnapshot.size);

//     const medicalHistory = [];
//     medicalHistorySnapshot.forEach(doc => {
//       const data = doc.data();
//       medicalHistory.push({
//         id: doc.id,
//         diagnosis: data.diagnosis || '',
//         symptoms: data.symptoms || '',
//         examinationDate: data.examinationDate ? data.examinationDate.toDate() : null,
//         doctorId: data.doctorId || '',
//         notes: data.notes || '',
//         reExamDate: data.reExamDate ? data.reExamDate.toDate() : null
//       });
//     });
    
//     // Sắp xếp theo ngày khám trong trường hợp không dùng orderBy trong truy vấn
//     medicalHistory.sort((a, b) => {
//       const dateA = a.examinationDate ? new Date(a.examinationDate) : new Date(0);
//       const dateB = b.examinationDate ? new Date(b.examinationDate) : new Date(0);
//       return dateB - dateA; // Sắp xếp giảm dần (mới nhất lên đầu)
//     });

//     // Get prescriptions for each examination
//     for (const record of medicalHistory) {
//       try {
//         const prescriptionsSnapshot = await db.collection('examinations')
//           .doc(record.id)
//           .collection('prescription')
//           .get();

//         const prescriptions = [];
//         prescriptionsSnapshot.forEach(doc => {
//           const data = doc.data();
//           prescriptions.push({
//             id: doc.id,
//             medicineName: data.idMedicine || '',
//             dosage: data.quality || '',
//             frequency: data.usage || '',
//             notes: data.notes || ''
//           });
//         });

//         record.prescriptions = prescriptions;
        
//         // Lấy thông tin bác sĩ nếu có doctorId
//         if (record.doctorId) {
//           try {
//             const doctorDoc = await db.collection('users').doc(record.doctorId).get();
//             if (doctorDoc.exists) {
//               const doctorData = doctorDoc.data();
//               record.doctorName = doctorData.displayName || doctorData.name || doctorData.fullName || 'Không có tên';
//               record.doctorSpecialty = doctorData.specialty || '';
//             } else {
//               record.doctorName = 'Không xác định';
//             }
//           } catch (doctorError) {
//             console.error(`---[DEBUG]--- Lỗi lấy thông tin bác sĩ cho record ${record.id}:`, doctorError);
//             record.doctorName = 'Không xác định';
//           }
//         } else {
//           record.doctorName = 'Không xác định';
//         }
//       } catch (err) {
//         console.error(`---[DEBUG]--- Lỗi lấy prescription cho record ${record.id}:`, err);
//         record.prescriptions = [];
//       }
//     }    const responseData = {
//       success: true,
//       patientId,
//       profile: {
//         // ProfileNormal array structure: [Name, DoB, Phone, Gender, CCCD, Address]
//         // HealthProfile array structure: [HeartRate, Height, Eye, Weight, medicalHistory]
//         healthProfile,
//         normalProfile,
//         medicalHistory
//       }
//     };

//     console.log('---[DEBUG]--- Trả về response:', JSON.stringify(responseData, null, 2));

//     res.json(responseData);
//   } catch (error) {
//     console.error('---[DEBUG]--- Lỗi khi lấy hồ sơ bệnh nhân:', error);
//     console.error('---[DEBUG]--- Error stack:', error.stack);

//     let errorMessage = 'Lỗi khi lấy thông tin hồ sơ bệnh nhân';

//     // Xác định loại lỗi cụ thể để trả về thông báo phù hợp
//     if (error.code === 'permission-denied') {
//       errorMessage = 'Không có quyền truy cập hồ sơ bệnh nhân';
//     } else if (error.code === 'not-found') {
//       errorMessage = 'Không tìm thấy hồ sơ bệnh nhân';
//     }

//     res.status(500).json({
//       success: false,
//       error: errorMessage + ': ' + error.message,
//       patientId: req.params.patientId
//     });
//   }
// });

module.exports = router;
