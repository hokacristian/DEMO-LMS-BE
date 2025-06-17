// module.exports = {
//   openapi: "3.0.0",
//   info: {
//     title: "HOKAV2 - Learning Management System API",
//     version: "2.0.0",
//     description: "Comprehensive API documentation for HOKAV2 Learning Management System including Authentication, Classes, Assignments, Materials, and Notifications",
//     contact: {
//       name: "API Support",
//       email: "support@hokav2.com"
//     },
//     license: {
//       name: "MIT",
//       url: "https://opensource.org/licenses/MIT"
//     }
//   },
//   servers: [
//     {
//       url: "http://localhost:3000/api",
//       description: "Development server"
//     },
//     {
//       url: "demo-lms-seven.vercel.app/api",
//       description: "Production server"
//     }
//   ],
//   components: {
//     securitySchemes: {
//       bearerAuth: {
//         type: "http",
//         scheme: "bearer",
//         bearerFormat: "JWT",
//         description: "Enter JWT token"
//       }
//     },
//     schemas: {
//       User: {
//         type: "object",
//         properties: {
//           id: {
//             type: "integer",
//             example: 1
//           },
//           email: {
//             type: "string",
//             format: "email",
//             example: "user@example.com"
//           },
//           name: {
//             type: "string",
//             example: "John Doe"
//           },
//           role: {
//             type: "string",
//             enum: ["ADMIN", "TEACHER", "STUDENT"],
//             example: "STUDENT"
//           },
//           createdAt: {
//             type: "string",
//             format: "date-time",
//             example: "2025-01-15T10:30:00.000Z"
//           },
//           updatedAt: {
//             type: "string",
//             format: "date-time",
//             example: "2025-01-15T10:30:00.000Z"
//           }
//         }
//       },
//       Class: {
//         type: "object",
//         properties: {
//           id: {
//             type: "integer",
//             example: 1
//           },
//           name: {
//             type: "string",
//             example: "Matematika 12 IPA 1"
//           },
//           description: {
//             type: "string",
//             example: "Kelas matematika untuk siswa IPA kelas 12"
//           },
//           enrollCode: {
//             type: "string",
//             example: "MTK001"
//           },
//           subject: {
//             type: "object",
//             properties: {
//               id: {
//                 type: "integer",
//                 example: 1
//               },
//               name: {
//                 type: "string",
//                 example: "Matematika"
//               }
//             }
//           },
//           academicPeriod: {
//             type: "object",
//             properties: {
//               id: {
//                 type: "integer",
//                 example: 1
//               },
//               name: {
//                 type: "string",
//                 example: "Semester 1 2024/2025"
//               }
//             }
//           }
//         }
//       },
//       Assignment: {
//         type: "object",
//         properties: {
//           id: {
//             type: "integer",
//             example: 1
//           },
//           title: {
//             type: "string",
//             example: "Tugas Integral"
//           },
//           description: {
//             type: "string",
//             example: "Mengerjakan soal integral definit dan tak definit"
//           },
//           instruction: {
//             type: "string",
//             example: "Kerjakan soal 1-10 pada halaman 45"
//           },
//           deadline: {
//             type: "string",
//             format: "date-time",
//             example: "2025-01-30T23:59:00.000Z"
//           },
//           maxScore: {
//             type: "integer",
//             example: 100
//           },
//           status: {
//             type: "string",
//             enum: ["DRAFT", "PUBLISHED"],
//             example: "PUBLISHED"
//           },
//           fileUrl: {
//             type: "string",
//             example: "https://storage.com/assignments/file.pdf"
//           },
//           fileName: {
//             type: "string",
//             example: "assignment.pdf"
//           },
//           teacher: {
//             $ref: "#/components/schemas/User"
//           },
//           class: {
//             $ref: "#/components/schemas/Class"
//           }
//         }
//       },
//       Material: {
//         type: "object",
//         properties: {
//           id: {
//             type: "integer",
//             example: 1
//           },
//           title: {
//             type: "string",
//             example: "Pengantar Integral"
//           },
//           description: {
//             type: "string",
//             example: "Materi pengantar tentang integral dan aplikasinya"
//           },
//           content: {
//             type: "string",
//             example: "Integral adalah operasi matematika yang merupakan kebalikan dari diferensiasi..."
//           },
//           fileUrl: {
//             type: "string",
//             example: "https://storage.com/materials/file.pdf"
//           },
//           fileName: {
//             type: "string",
//             example: "material.pdf"
//           },
//           teacher: {
//             $ref: "#/components/schemas/User"
//           },
//           class: {
//             $ref: "#/components/schemas/Class"
//           }
//         }
//       },
//       Submission: {
//         type: "object",
//         properties: {
//           id: {
//             type: "integer",
//             example: 1
//           },
//           version: {
//             type: "integer",
//             example: 1
//           },
//           content: {
//             type: "string",
//             example: "Jawaban tugas integral..."
//           },
//           submittedAt: {
//             type: "string",
//             format: "date-time",
//             example: "2025-01-25T14:30:00.000Z"
//           },
//           score: {
//             type: "integer",
//             example: 85
//           },
//           feedback: {
//             type: "string",
//             example: "Bagus! Tapi masih ada kesalahan di soal nomor 3"
//           },
//           status: {
//             type: "string",
//             enum: ["SUBMITTED", "GRADED"],
//             example: "GRADED"
//           },
//           isLate: {
//             type: "boolean",
//             example: false
//           },
//           lateByMinutes: {
//             type: "integer",
//             example: null
//           },
//           fileUrl: {
//             type: "string",
//             example: "https://storage.com/submissions/file.pdf"
//           },
//           fileName: {
//             type: "string",
//             example: "submission.pdf"
//           }
//         }
//       },
//       Notification: {
//         type: "object",
//         properties: {
//           id: {
//             type: "integer",
//             example: 1
//           },
//           title: {
//             type: "string",
//             example: "Tugas Baru: Integral"
//           },
//           message: {
//             type: "string",
//             example: "Tugas baru telah ditambahkan di kelas Matematika"
//           },
//           type: {
//             type: "string",
//             enum: ["ASSIGNMENT_CREATED", "ASSIGNMENT_UPDATED", "ASSIGNMENT_DEADLINE_REMINDER", "MATERIAL_UPLOADED", "GRADE_PUBLISHED"],
//             example: "ASSIGNMENT_CREATED"
//           },
//           isRead: {
//             type: "boolean",
//             example: false
//           },
//           readAt: {
//             type: "string",
//             format: "date-time",
//             example: null
//           },
//           createdAt: {
//             type: "string",
//             format: "date-time",
//             example: "2025-01-15T10:30:00.000Z"
//           }
//         }
//       },
//       ApiResponse: {
//         type: "object",
//         properties: {
//           success: {
//             type: "boolean",
//             example: true
//           },
//           message: {
//             type: "string",
//             example: "Operation successful"
//           },
//           data: {
//             type: "object"
//           }
//         }
//       },
//       ErrorResponse: {
//         type: "object",
//         properties: {
//           success: {
//             type: "boolean",
//             example: false
//           },
//           message: {
//             type: "string",
//             example: "Error occurred"
//           },
//           errors: {
//             type: "array",
//             items: {
//               type: "string"
//             },
//             example: ["Field is required", "Invalid format"]
//           }
//         }
//       }
//     }
//   },
//   tags: [
//     {
//       name: "Authentication",
//       description: "User authentication and profile management"
//     },
//     {
//       name: "Classes",
//       description: "Class management and enrollment"
//     },
//     {
//       name: "Assignments",
//       description: "Assignment creation, submission, and grading"
//     },
//     {
//       name: "Materials",
//       description: "Learning materials management"
//     },
//     {
//       name: "Notifications",
//       description: "Notification system"
//     }
//   ]
// };