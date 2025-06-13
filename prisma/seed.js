const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Force cleanup in development
    console.log('🧹 Cleaning existing data...');
    
    // Clear in proper order due to foreign key constraints
    await prisma.studentAnswer.deleteMany();
    await prisma.quizAttempt.deleteMany();
    await prisma.quizOption.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.userNotification.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.material.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.teacherClass.deleteMany();
    await prisma.class.deleteMany();
    await prisma.academicPeriod.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Data cleaned successfully');

    // Create Academic Period with upsert to handle existing data
    const academicPeriod = await prisma.academicPeriod.upsert({
      where: {
        year_semester: {
          year: '2024/2025',
          semester: 'GANJIL'
        }
      },
      update: {
        isActive: true,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-12-31')
      },
      create: {
        year: '2024/2025',
        semester: 'GANJIL',
        isActive: true,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-12-31')
      }
    });
    console.log('✅ Academic period created:', academicPeriod.year, academicPeriod.semester);

    // Create additional academic period for semester genap
    const academicPeriod2 = await prisma.academicPeriod.upsert({
      where: {
        year_semester: {
          year: '2024/2025',
          semester: 'GENAP'
        }
      },
      update: {
        isActive: false,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30')
      },
      create: {
        year: '2024/2025',
        semester: 'GENAP',
        isActive: false,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30')
      }
    });
    console.log('✅ Academic period 2 created:', academicPeriod2.year, academicPeriod2.semester);

    // Create Subjects with upsert to handle existing data
    const subjects = await Promise.all([
      prisma.subject.upsert({
        where: { name: 'Matematika' },
        update: { description: 'Mata pelajaran Matematika untuk tingkat SMA' },
        create: {
          name: 'Matematika',
          description: 'Mata pelajaran Matematika untuk tingkat SMA'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Bahasa Indonesia' },
        update: { description: 'Mata pelajaran Bahasa Indonesia untuk tingkat SMA' },
        create: {
          name: 'Bahasa Indonesia',
          description: 'Mata pelajaran Bahasa Indonesia untuk tingkat SMA'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Bahasa Inggris' },
        update: { description: 'Mata pelajaran Bahasa Inggris untuk tingkat SMA' },
        create: {
          name: 'Bahasa Inggris',
          description: 'Mata pelajaran Bahasa Inggris untuk tingkat SMA'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Fisika' },
        update: { description: 'Mata pelajaran Fisika untuk tingkat SMA' },
        create: {
          name: 'Fisika',
          description: 'Mata pelajaran Fisika untuk tingkat SMA'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Kimia' },
        update: { description: 'Mata pelajaran Kimia untuk tingkat SMA' },
        create: {
          name: 'Kimia',
          description: 'Mata pelajaran Kimia untuk tingkat SMA'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Biologi' },
        update: { description: 'Mata pelajaran Biologi untuk tingkat SMA' },
        create: {
          name: 'Biologi',
          description: 'Mata pelajaran Biologi untuk tingkat SMA'
        }
      })
    ]);
    console.log('✅ Subjects created:', subjects.length);

    // Hash password for all users
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    console.log('✅ Password hashed for all users');

    // Create Admin User with upsert
    const admin = await prisma.user.upsert({
      where: { email: 'admin.lms@gmail.com' },
      update: { 
        name: 'Administrator', 
        role: 'ADMIN',
        password: hashedPassword
      },
      create: {
        email: 'admin.lms@gmail.com',
        name: 'Administrator',
        role: 'ADMIN',
        password: hashedPassword
      }
    });
    console.log('✅ Admin user created:', admin.email);

    // Create Teacher Users with upsert
    const teachers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'guru.matematika@gmail.com' },
        update: { 
          name: 'Budi Santoso', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.matematika@gmail.com',
          name: 'Budi Santoso',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.indonesia@gmail.com' },
        update: { 
          name: 'Sari Dewi', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.indonesia@gmail.com',
          name: 'Sari Dewi',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.inggris@gmail.com' },
        update: { 
          name: 'John Smith', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.inggris@gmail.com',
          name: 'John Smith',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.fisika@gmail.com' },
        update: { 
          name: 'Ahmad Wijaya', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.fisika@gmail.com',
          name: 'Ahmad Wijaya',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.kimia@gmail.com' },
        update: { 
          name: 'Lisa Sari', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.kimia@gmail.com',
          name: 'Lisa Sari',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.biologi@gmail.com' },
        update: { 
          name: 'Dr. Maya Indira', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.biologi@gmail.com',
          name: 'Dr. Maya Indira',
          role: 'TEACHER',
          password: hashedPassword
        }
      })
    ]);
    console.log('✅ Teacher users created:', teachers.length);

    // Create Student Users with upsert
    const students = await Promise.all([
      prisma.user.upsert({
        where: { email: 'siswa1@gmail.com' },
        update: { 
          name: 'Ahmad Rizki', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa1@gmail.com',
          name: 'Ahmad Rizki',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa2@gmail.com' },
        update: { 
          name: 'Siti Nurhaliza', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa2@gmail.com',
          name: 'Siti Nurhaliza',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa3@gmail.com' },
        update: { 
          name: 'Andi Wijaya', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa3@gmail.com',
          name: 'Andi Wijaya',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa4@gmail.com' },
        update: { 
          name: 'Maya Sari', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa4@gmail.com',
          name: 'Maya Sari',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa5@gmail.com' },
        update: { 
          name: 'Doni Pratama', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa5@gmail.com',
          name: 'Doni Pratama',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa6@gmail.com' },
        update: { 
          name: 'Rina Anggraini', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa6@gmail.com',
          name: 'Rina Anggraini',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa7@gmail.com' },
        update: { 
          name: 'Budi Setiawan', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa7@gmail.com',
          name: 'Budi Setiawan',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa8@gmail.com' },
        update: { 
          name: 'Putri Cahaya', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa8@gmail.com',
          name: 'Putri Cahaya',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa9@gmail.com' },
        update: { 
          name: 'Kevin Surya', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa9@gmail.com',
          name: 'Kevin Surya',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'siswa10@gmail.com' },
        update: { 
          name: 'Lestari Wulan', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'siswa10@gmail.com',
          name: 'Lestari Wulan',
          role: 'STUDENT',
          password: hashedPassword
        }
      })
    ]);
    console.log('✅ Student users created:', students.length);

    // Create Classes with enrollCode using upsert
    const classes = await Promise.all([
      prisma.class.upsert({
        where: { enrollCode: 'MATH12A' },
        update: {
          name: 'Matematika 12A',
          description: 'Kelas Matematika untuk siswa kelas 12A',
          subjectId: subjects[0].id,
          academicPeriodId: academicPeriod.id
        },
        create: {
          name: 'Matematika 12A',
          description: 'Kelas Matematika untuk siswa kelas 12A',
          enrollCode: 'MATH12A',
          subjectId: subjects[0].id,
          academicPeriodId: academicPeriod.id
        }
      }),
      prisma.class.upsert({
        where: { enrollCode: 'INDO12' },
        update: {
          name: 'Bahasa Indonesia 12A',
          description: 'Kelas Bahasa Indonesia untuk siswa kelas 12A',
          subjectId: subjects[1].id,
          academicPeriodId: academicPeriod.id
        },
        create: {
          name: 'Bahasa Indonesia 12A',
          description: 'Kelas Bahasa Indonesia untuk siswa kelas 12A',
          enrollCode: 'INDO12',
          subjectId: subjects[1].id,
          academicPeriodId: academicPeriod.id
        }
      }),
      prisma.class.upsert({
        where: { enrollCode: 'ENG12A' },
        update: {
          name: 'Bahasa Inggris 12A',
          description: 'Kelas Bahasa Inggris untuk siswa kelas 12A',
          subjectId: subjects[2].id,
          academicPeriodId: academicPeriod.id
        },
        create: {
          name: 'Bahasa Inggris 12A',
          description: 'Kelas Bahasa Inggris untuk siswa kelas 12A',
          enrollCode: 'ENG12A',
          subjectId: subjects[2].id,
          academicPeriodId: academicPeriod.id
        }
      }),
      prisma.class.upsert({
        where: { enrollCode: 'PHY12A' },
        update: {
          name: 'Fisika 12A',
          description: 'Kelas Fisika untuk siswa kelas 12A',
          subjectId: subjects[3].id,
          academicPeriodId: academicPeriod.id
        },
        create: {
          name: 'Fisika 12A',
          description: 'Kelas Fisika untuk siswa kelas 12A',
          enrollCode: 'PHY12A',
          subjectId: subjects[3].id,
          academicPeriodId: academicPeriod.id
        }
      }),
      prisma.class.upsert({
        where: { enrollCode: 'CHEM12' },
        update: {
          name: 'Kimia 12A',
          description: 'Kelas Kimia untuk siswa kelas 12A',
          subjectId: subjects[4].id,
          academicPeriodId: academicPeriod.id
        },
        create: {
          name: 'Kimia 12A',
          description: 'Kelas Kimia untuk siswa kelas 12A',
          enrollCode: 'CHEM12',
          subjectId: subjects[4].id,
          academicPeriodId: academicPeriod.id
        }
      }),
      prisma.class.upsert({
        where: { enrollCode: 'BIO12A' },
        update: {
          name: 'Biologi 12A',
          description: 'Kelas Biologi untuk siswa kelas 12A',
          subjectId: subjects[5].id,
          academicPeriodId: academicPeriod.id
        },
        create: {
          name: 'Biologi 12A',
          description: 'Kelas Biologi untuk siswa kelas 12A',
          enrollCode: 'BIO12A',
          subjectId: subjects[5].id,
          academicPeriodId: academicPeriod.id
        }
      })
    ]);
    console.log('✅ Classes created:', classes.length);

    // Assign teachers to classes (skip if already exists)
    const teacherClassAssignments = [];
    const teacherClassPairs = [
      { teacherId: teachers[0].id, classId: classes[0].id }, // Guru Matematika -> Kelas Matematika
      { teacherId: teachers[1].id, classId: classes[1].id }, // Guru Bahasa Indonesia -> Kelas Bahasa Indonesia
      { teacherId: teachers[2].id, classId: classes[2].id }, // Guru Bahasa Inggris -> Kelas Bahasa Inggris
      { teacherId: teachers[3].id, classId: classes[3].id }, // Guru Fisika -> Kelas Fisika
      { teacherId: teachers[4].id, classId: classes[4].id }, // Guru Kimia -> Kelas Kimia
      { teacherId: teachers[5].id, classId: classes[5].id }  // Guru Biologi -> Kelas Biologi
    ];

    for (const pair of teacherClassPairs) {
      try {
        const existing = await prisma.teacherClass.findFirst({
          where: {
            teacherId: pair.teacherId,
            classId: pair.classId
          }
        });

        if (!existing) {
          const assignment = await prisma.teacherClass.create({
            data: {
              teacherId: pair.teacherId,
              classId: pair.classId
            }
          });
          teacherClassAssignments.push(assignment);
        }
      } catch (error) {
        console.warn(`Teacher-Class assignment already exists: ${pair.teacherId}-${pair.classId}`);
      }
    }
    console.log('✅ Teacher-Class assignments created:', teacherClassAssignments.length);

    // Enroll students to classes (skip if already exists)
    const enrollments = [];
    for (const student of students) {
      for (const classItem of classes) {
        try {
          const existing = await prisma.enrollment.findFirst({
            where: {
              studentId: student.id,
              classId: classItem.id
            }
          });

          if (!existing) {
            const enrollment = await prisma.enrollment.create({
              data: {
                studentId: student.id,
                classId: classItem.id
              }
            });
            enrollments.push(enrollment);
          }
        } catch (error) {
          console.warn(`Enrollment already exists: ${student.id}-${classItem.id}`);
        }
      }
    }
    console.log('✅ Student enrollments created:', enrollments.length);

    // Create some sample materials
    const materials = await Promise.all([
      // Materi Matematika
      prisma.material.create({
        data: {
          title: 'Pengantar Kalkulus',
          description: 'Materi pengantar untuk mempelajari kalkulus dasar',
          content: 'Kalkulus adalah cabang matematika yang mempelajari tentang limit, diferensial, dan integral. Dalam materi ini kita akan mempelajari konsep dasar limit fungsi dan aplikasinya dalam kehidupan sehari-hari.',
          classId: classes[0].id,
          teacherId: teachers[0].id
        }
      }),
      prisma.material.create({
        data: {
          title: 'Fungsi Trigonometri',
          description: 'Memahami fungsi sin, cos, tan dan aplikasinya',
          content: 'Trigonometri adalah cabang matematika yang mempelajari hubungan antara sudut dan sisi dalam segitiga...',
          classId: classes[0].id,
          teacherId: teachers[0].id
        }
      }),
      // Materi Bahasa Indonesia
      prisma.material.create({
        data: {
          title: 'Teks Argumentasi',
          description: 'Memahami struktur dan ciri-ciri teks argumentasi',
          content: 'Teks argumentasi adalah jenis teks yang bertujuan untuk meyakinkan pembaca tentang suatu pendapat atau gagasan dengan memberikan alasan dan bukti yang kuat.',
          classId: classes[1].id,
          teacherId: teachers[1].id
        }
      }),
      // Materi Bahasa Inggris
      prisma.material.create({
        data: {
          title: 'Present Perfect Tense',
          description: 'Understanding Present Perfect Tense usage and examples',
          content: 'Present Perfect Tense is used to express actions that started in the past and continue to the present, or actions that happened at an unspecified time in the past.',
          classId: classes[2].id,
          teacherId: teachers[2].id
        }
      }),
      // Materi Fisika
      prisma.material.create({
        data: {
          title: 'Gerak Lurus Beraturan',
          description: 'Memahami konsep gerak lurus beraturan dan aplikasinya',
          content: 'Gerak lurus beraturan adalah gerak suatu benda pada lintasan lurus dengan kecepatan tetap...',
          classId: classes[3].id,
          teacherId: teachers[3].id
        }
      })
    ]);
    console.log('✅ Materials created:', materials.length);

    // Create sample assignments
    const assignments = await Promise.all([
      // Assignment Matematika
      prisma.assignment.create({
        data: {
          title: 'Tugas Limit Fungsi',
          description: 'Kerjakan soal-soal limit fungsi yang telah diberikan',
          instruction: 'Silakan kerjakan soal nomor 1-10 pada buku paket halaman 45. Kumpulkan dalam bentuk PDF dengan nama file: NamaLengkap_LimitFungsi.pdf',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          maxScore: 100,
          status: 'PUBLISHED',
          classId: classes[0].id,
          teacherId: teachers[0].id
        }
      }),
      // Assignment Bahasa Indonesia
      prisma.assignment.create({
        data: {
          title: 'Analisis Teks Argumentasi',
          description: 'Analisis struktur teks argumentasi dari artikel koran',
          instruction: 'Pilih satu artikel opini dari koran, lalu analisis struktur argumentasinya meliputi: tesis, argumentasi, dan kesimpulan.',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          maxScore: 100,
          status: 'PUBLISHED',
          classId: classes[1].id,
          teacherId: teachers[1].id
        }
      }),
      // Assignment Draft (belum dipublish)
      prisma.assignment.create({
        data: {
          title: 'Essay Writing Practice',
          description: 'Write an argumentative essay about social media impact',
          instruction: 'Write a 500-word argumentative essay about the positive and negative impacts of social media on teenagers.',
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          maxScore: 100,
          status: 'DRAFT', // Masih draft
          classId: classes[2].id,
          teacherId: teachers[2].id
        }
      })
    ]);
    console.log('✅ Assignments created:', assignments.length);

    // Create sample quiz
    const quiz = await prisma.quiz.create({
      data: {
        title: 'Quiz Matematika - Limit Fungsi',
        description: 'Quiz untuk menguji pemahaman tentang limit fungsi',
        instruction: 'Jawab semua pertanyaan dengan teliti. Waktu pengerjaan 60 menit.',
        timeLimit: 60, // 60 minutes
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        maxAttempts: 2,
        maxScore: 100,
        status: 'PUBLISHED',
        classId: classes[0].id,
        teacherId: teachers[0].id
      }
    });

    // Create quiz questions
    const question1 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: 'Berapakah nilai limit dari f(x) = 2x + 3 ketika x mendekati 5?',
        type: 'MULTIPLE_CHOICE',
        points: 25,
        order: 1
      }
    });

    // Create options for question 1
    await Promise.all([
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '10',
          isCorrect: false,
          order: 1
        }
      }),
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '13',
          isCorrect: true, // 2(5) + 3 = 13
          order: 2
        }
      }),
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '15',
          isCorrect: false,
          order: 3
        }
      }),
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '8',
          isCorrect: false,
          order: 4
        }
      })
    ]);

    console.log('✅ Quiz and questions created');

    // Create sample submissions (some students already submitted)
    const sampleSubmissions = await Promise.all([
      prisma.submission.create({
        data: {
          assignmentId: assignments[0].id, // Tugas Limit Fungsi
          studentId: students[0].id, // Ahmad Rizki
          content: 'Berikut adalah jawaban saya untuk soal limit fungsi...',
          version: 1,
          isLatest: true,
          isLate: false,
          status: 'SUBMITTED'
        }
      }),
      prisma.submission.create({
        data: {
          assignmentId: assignments[0].id, // Tugas Limit Fungsi
          studentId: students[1].id, // Siti Nurhaliza
          content: 'Penyelesaian soal limit menggunakan metode substitusi langsung...',
          version: 1,
          isLatest: true,
          isLate: false,
          status: 'GRADED',
          score: 85,
          feedback: 'Jawaban sudah benar, tapi perlu lebih detail dalam penjelasan langkah-langkahnya.',
          gradedAt: new Date()
        }
      })
    ]);
    console.log('✅ Sample submissions created:', sampleSubmissions.length);

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`👤 Users: ${1 + teachers.length + students.length} (1 Admin, ${teachers.length} Teachers, ${students.length} Students)`);
    console.log(`📚 Subjects: ${subjects.length}`);
    console.log(`🏫 Classes: ${classes.length}`);
    console.log(`📖 Materials: ${materials.length}`);
    console.log(`📝 Assignments: ${assignments.length} (2 Published, 1 Draft)`);
    console.log(`🧠 Quizzes: 1 (with questions)`);
    console.log(`📄 Submissions: ${sampleSubmissions.length}`);
    console.log(`🎓 Academic Periods: 2`);
    
    console.log('\n📧 Test Accounts:');
    console.log('👤 Admin: admin@lms.test');
    console.log('👨‍🏫 Teacher: guru.matematika@lms.test');
    console.log('👨‍🎓 Student: siswa1@lms.test');
    
    console.log('\n🔑 Class Enrollment Codes:');
    console.log('📊 Matematika 12A: MATH12A');
    console.log('📝 Bahasa Indonesia 12A: INDO12A');
    console.log('🌍 Bahasa Inggris 12A: ENG12A');
    console.log('⚛️ Fisika 12A: PHY12A');
    console.log('🧪 Kimia 12A: CHEM12A');
    console.log('🌱 Biologi 12A: BIO12A');
    
    console.log('\n💡 Note: All IDs are now using autoincrement integers for better performance!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });