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
        where: { name: 'Agama Hindu' },
        update: { description: 'Mata pelajaran Agama Hindu untuk tingkat SMP' },
        create: {
          name: 'Agama Hindu',
          description: 'Mata pelajaran Agama Hindu untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Bahasa Bali' },
        update: { description: 'Mata pelajaran Bahasa Bali untuk tingkat SMP' },
        create: {
          name: 'Bahasa Bali',
          description: 'Mata pelajaran Bahasa Bali untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Bahasa Indonesia' },
        update: { description: 'Mata pelajaran Bahasa Indonesia untuk tingkat SMP' },
        create: {
          name: 'Bahasa Indonesia',
          description: 'Mata pelajaran Bahasa Indonesia untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Bahasa Inggris' },
        update: { description: 'Mata pelajaran Bahasa Inggris untuk tingkat SMP' },
        create: {
          name: 'Bahasa Inggris',
          description: 'Mata pelajaran Bahasa Inggris untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'BK' },
        update: { description: 'Mata pelajaran Bimbingan Konseling untuk tingkat SMP' },
        create: {
          name: 'BK',
          description: 'Mata pelajaran Bimbingan Konseling untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Informatika' },
        update: { description: 'Mata pelajaran Informatika untuk tingkat SMP' },
        create: {
          name: 'Informatika',
          description: 'Mata pelajaran Informatika untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'IPA' },
        update: { description: 'Mata pelajaran Ilmu Pengetahuan Alam untuk tingkat SMP' },
        create: {
          name: 'IPA',
          description: 'Mata pelajaran Ilmu Pengetahuan Alam untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'IPS' },
        update: { description: 'Mata pelajaran Ilmu Pengetahuan Sosial untuk tingkat SMP' },
        create: {
          name: 'IPS',
          description: 'Mata pelajaran Ilmu Pengetahuan Sosial untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Matematika' },
        update: { description: 'Mata pelajaran Matematika untuk tingkat SMP' },
        create: {
          name: 'Matematika',
          description: 'Mata pelajaran Matematika untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'P.Pancasila / PPKn' },
        update: { description: 'Mata pelajaran Pendidikan Pancasila dan Kewarganegaraan untuk tingkat SMP' },
        create: {
          name: 'P.Pancasila / PPKn',
          description: 'Mata pelajaran Pendidikan Pancasila dan Kewarganegaraan untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'PJOK' },
        update: { description: 'Mata pelajaran Pendidikan Jasmani, Olahraga, dan Kesehatan untuk tingkat SMP' },
        create: {
          name: 'PJOK',
          description: 'Mata pelajaran Pendidikan Jasmani, Olahraga, dan Kesehatan untuk tingkat SMP'
        }
      }),
      prisma.subject.upsert({
        where: { name: 'Seni Budaya' },
        update: { description: 'Mata pelajaran Seni Budaya untuk tingkat SMP' },
        create: {
          name: 'Seni Budaya',
          description: 'Mata pelajaran Seni Budaya untuk tingkat SMP'
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
        where: { email: 'guru.agamahindu@gmail.com' },
        update: { 
          name: 'I Made Sutrisna', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.agamahindu@gmail.com',
          name: 'I Made Sutrisna',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.bahasabali@gmail.com' },
        update: { 
          name: 'Ni Kadek Sari', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.bahasabali@gmail.com',
          name: 'Ni Kadek Sari',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.indonesia@gmail.com' },
        update: { 
          name: 'Sari Dewi Lestari', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.indonesia@gmail.com',
          name: 'Sari Dewi Lestari',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.inggris@gmail.com' },
        update: { 
          name: 'Putu Ayu Pertiwi', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.inggris@gmail.com',
          name: 'Putu Ayu Pertiwi',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.bk@gmail.com' },
        update: { 
          name: 'Wayan Sumiasih', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.bk@gmail.com',
          name: 'Wayan Sumiasih',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.informatika@gmail.com' },
        update: { 
          name: 'I Gede Wirawan', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.informatika@gmail.com',
          name: 'I Gede Wirawan',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.ipa@gmail.com' },
        update: { 
          name: 'Ni Luh Ketut Sari', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.ipa@gmail.com',
          name: 'Ni Luh Ketut Sari',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.ips@gmail.com' },
        update: { 
          name: 'I Komang Budi Artana', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.ips@gmail.com',
          name: 'I Komang Budi Artana',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.matematika@gmail.com' },
        update: { 
          name: 'Kadek Widiyani', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.matematika@gmail.com',
          name: 'Kadek Widiyani',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.pancasila@gmail.com' },
        update: { 
          name: 'Made Indra Kusuma', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.pancasila@gmail.com',
          name: 'Made Indra Kusuma',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.pjok@gmail.com' },
        update: { 
          name: 'Wayan Darma Putra', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.pjok@gmail.com',
          name: 'Wayan Darma Putra',
          role: 'TEACHER',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'guru.senibudaya@gmail.com' },
        update: { 
          name: 'Luh Putu Sriasih', 
          role: 'TEACHER',
          password: hashedPassword
        },
        create: {
          email: 'guru.senibudaya@gmail.com',
          name: 'Luh Putu Sriasih',
          role: 'TEACHER',
          password: hashedPassword
        }
      })
    ]);
    console.log('✅ Teacher users created:', teachers.length);

    // Create Student Users with upsert - 5 students for each grade (7, 8, 9)
    const students = await Promise.all([
      // Kelas 7 Students
      prisma.user.upsert({
        where: { email: 'kelas7.siswa1@gmail.com' },
        update: { 
          name: 'I Made Agus Kurniawan', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas7.siswa1@gmail.com',
          name: 'I Made Agus Kurniawan',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas7.siswa2@gmail.com' },
        update: { 
          name: 'Ni Putu Sari Dewi', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas7.siswa2@gmail.com',
          name: 'Ni Putu Sari Dewi',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas7.siswa3@gmail.com' },
        update: { 
          name: 'Kadek Ayu Lestari', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas7.siswa3@gmail.com',
          name: 'Kadek Ayu Lestari',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas7.siswa4@gmail.com' },
        update: { 
          name: 'Wayan Dika Pratama', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas7.siswa4@gmail.com',
          name: 'Wayan Dika Pratama',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas7.siswa5@gmail.com' },
        update: { 
          name: 'Luh Ketut Ayu Sari', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas7.siswa5@gmail.com',
          name: 'Luh Ketut Ayu Sari',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      // Kelas 8 Students
      prisma.user.upsert({
        where: { email: 'kelas8.siswa1@gmail.com' },
        update: { 
          name: 'I Gede Putu Wijaya', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas8.siswa1@gmail.com',
          name: 'I Gede Putu Wijaya',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas8.siswa2@gmail.com' },
        update: { 
          name: 'Ni Kadek Rina Anjani', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas8.siswa2@gmail.com',
          name: 'Ni Kadek Rina Anjani',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas8.siswa3@gmail.com' },
        update: { 
          name: 'Made Bayu Setiawan', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas8.siswa3@gmail.com',
          name: 'Made Bayu Setiawan',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas8.siswa4@gmail.com' },
        update: { 
          name: 'Putu Ayu Maharani', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas8.siswa4@gmail.com',
          name: 'Putu Ayu Maharani',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas8.siswa5@gmail.com' },
        update: { 
          name: 'Komang Gede Ari', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas8.siswa5@gmail.com',
          name: 'Komang Gede Ari',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      // Kelas 9 Students
      prisma.user.upsert({
        where: { email: 'kelas9.siswa1@gmail.com' },
        update: { 
          name: 'I Wayan Eka Prawira', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas9.siswa1@gmail.com',
          name: 'I Wayan Eka Prawira',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas9.siswa2@gmail.com' },
        update: { 
          name: 'Ni Luh Putu Indira', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas9.siswa2@gmail.com',
          name: 'Ni Luh Putu Indira',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas9.siswa3@gmail.com' },
        update: { 
          name: 'Kadek Arya Wirawan', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas9.siswa3@gmail.com',
          name: 'Kadek Arya Wirawan',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas9.siswa4@gmail.com' },
        update: { 
          name: 'Wayan Luh Aprilia', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas9.siswa4@gmail.com',
          name: 'Wayan Luh Aprilia',
          role: 'STUDENT',
          password: hashedPassword
        }
      }),
      prisma.user.upsert({
        where: { email: 'kelas9.siswa5@gmail.com' },
        update: { 
          name: 'Made Surya Darma', 
          role: 'STUDENT',
          password: hashedPassword
        },
        create: {
          email: 'kelas9.siswa5@gmail.com',
          name: 'Made Surya Darma',
          role: 'STUDENT',
          password: hashedPassword
        }
      })
    ]);
    console.log('✅ Student users created:', students.length);

    // Create Classes for each subject and grade (7, 8, 9) with enrollCode using upsert
    const classes = [];
    const subjectCodes = ['AGAMA', 'BALI', 'INDO', 'ENG', 'BK', 'INFO', 'IPA', 'IPS', 'MATH', 'PANCASILA', 'PJOK', 'SENI'];
    const subjectNames = ['Agama Hindu', 'Bahasa Bali', 'Bahasa Indonesia', 'Bahasa Inggris', 'BK', 'Informatika', 'IPA', 'IPS', 'Matematika', 'P.Pancasila / PPKn', 'PJOK', 'Seni Budaya'];
    
    for (let grade = 7; grade <= 9; grade++) {
      for (let i = 0; i < subjects.length; i++) {
        const enrollCode = `${subjectCodes[i]}${grade}`;
        const className = `${subjectNames[i]} Kelas ${grade}`;
        const description = `Kelas ${subjectNames[i]} untuk siswa kelas ${grade}`;
        
        const classData = await prisma.class.upsert({
          where: { enrollCode },
          update: {
            name: className,
            description: description,
            subjectId: subjects[i].id,
            academicPeriodId: academicPeriod.id
          },
          create: {
            name: className,
            description: description,
            enrollCode: enrollCode,
            subjectId: subjects[i].id,
            academicPeriodId: academicPeriod.id
          }
        });
        
        classes.push(classData);
      }
    }
    console.log('✅ Classes created:', classes.length);

    // Assign teachers to classes (each teacher teaches their subject across all grades)
    const teacherClassAssignments = [];
    
    for (let i = 0; i < teachers.length; i++) {
      // Each teacher teaches their subject in all 3 grades (7, 8, 9)
      const teacherSubjectClasses = classes.filter((classItem, index) => {
        return Math.floor(index / subjects.length) < 3 && (index % subjects.length) === i;
      });
      
      for (const classItem of teacherSubjectClasses) {
        try {
          const existing = await prisma.teacherClass.findFirst({
            where: {
              teacherId: teachers[i].id,
              classId: classItem.id
            }
          });

          if (!existing) {
            const assignment = await prisma.teacherClass.create({
              data: {
                teacherId: teachers[i].id,
                classId: classItem.id
              }
            });
            teacherClassAssignments.push(assignment);
          }
        } catch (error) {
          console.warn(`Teacher-Class assignment already exists: ${teachers[i].id}-${classItem.id}`);
        }
      }
    }
    console.log('✅ Teacher-Class assignments created:', teacherClassAssignments.length);

    // Enroll students to their grade-appropriate classes
    const enrollments = [];
    
    // Group students by grade
    const grade7Students = students.slice(0, 5);   // First 5 students for grade 7
    const grade8Students = students.slice(5, 10);  // Next 5 students for grade 8
    const grade9Students = students.slice(10, 15); // Last 5 students for grade 9
    
    const studentGroups = [
      { students: grade7Students, grade: 7 },
      { students: grade8Students, grade: 8 },
      { students: grade9Students, grade: 9 }
    ];
    
    for (const group of studentGroups) {
      // Get classes for this grade (12 subjects per grade)
      const gradeClasses = classes.filter((classItem, index) => {
        const gradeIndex = Math.floor(index / subjects.length);
        return gradeIndex === (group.grade - 7);
      });
      
      // Enroll all students in this grade to all their grade classes
      for (const student of group.students) {
        for (const classItem of gradeClasses) {
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
    }
    console.log('✅ Student enrollments created:', enrollments.length);

    // Create some sample materials for different subjects and grades
    const materials = [];
    
    // Sample materials for each grade and subject
    const sampleMaterials = [
      {
        title: 'Bilangan Bulat',
        description: 'Pengenalan bilangan bulat dan operasinya',
        content: 'Bilangan bulat adalah himpunan bilangan yang terdiri dari bilangan negatif, nol, dan bilangan positif...',
        subjectIndex: 8, // Matematika
        grade: 7
      },
      {
        title: 'Puisi Rakyat',
        description: 'Memahami ciri-ciri dan jenis puisi rakyat',
        content: 'Puisi rakyat adalah karya sastra lisan yang berkembang di masyarakat dan diwariskan turun temurun...',
        subjectIndex: 2, // Bahasa Indonesia
        grade: 7
      },
      {
        title: 'Simple Present Tense',
        description: 'Understanding Simple Present Tense usage and examples',
        content: 'Simple Present Tense is used to express habits, general truths, and scheduled events...',
        subjectIndex: 3, // Bahasa Inggris
        grade: 7
      },
      {
        title: 'Klasifikasi Makhluk Hidup',
        description: 'Memahami sistem klasifikasi makhluk hidup',
        content: 'Klasifikasi makhluk hidup adalah pengelompokan makhluk hidup berdasarkan persamaan dan perbedaan ciri...',
        subjectIndex: 6, // IPA
        grade: 8
      }
    ];
    
    for (const material of sampleMaterials) {
      const classIndex = (material.grade - 7) * subjects.length + material.subjectIndex;
      if (classes[classIndex]) {
        const createdMaterial = await prisma.material.create({
          data: {
            title: material.title,
            description: material.description,
            content: material.content,
            classId: classes[classIndex].id,
            teacherId: teachers[material.subjectIndex].id
          }
        });
        materials.push(createdMaterial);
      }
    }
    console.log('✅ Materials created:', materials.length);

    // Create sample assignments for different grades and subjects
    const assignments = [];
    
    const sampleAssignments = [
      {
        title: 'Tugas Operasi Bilangan Bulat',
        description: 'Kerjakan soal-soal operasi bilangan bulat',
        instruction: 'Silakan kerjakan soal nomor 1-15 pada buku paket halaman 25. Kumpulkan dalam bentuk tulis tangan.',
        subjectIndex: 8, // Matematika
        grade: 7,
        status: 'PUBLISHED'
      },
      {
        title: 'Menganalisis Puisi Rakyat',
        description: 'Analisis ciri dan makna puisi rakyat',
        instruction: 'Carilah satu contoh puisi rakyat, lalu analisis ciri-ciri dan makna yang terkandung di dalamnya.',
        subjectIndex: 2, // Bahasa Indonesia
        grade: 7,
        status: 'PUBLISHED'
      },
      {
        title: 'Simple Present Exercise',
        description: 'Complete the Simple Present Tense exercises',
        instruction: 'Complete exercises 1-20 in your workbook page 45. Write full sentences.',
        subjectIndex: 3, // Bahasa Inggris
        grade: 7,
        status: 'DRAFT'
      }
    ];
    
    for (const assignment of sampleAssignments) {
      const classIndex = (assignment.grade - 7) * subjects.length + assignment.subjectIndex;
      if (classes[classIndex]) {
        const createdAssignment = await prisma.assignment.create({
          data: {
            title: assignment.title,
            description: assignment.description,
            instruction: assignment.instruction,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            maxScore: 100,
            status: assignment.status,
            classId: classes[classIndex].id,
            teacherId: teachers[assignment.subjectIndex].id
          }
        });
        assignments.push(createdAssignment);
      }
    }
    console.log('✅ Assignments created:', assignments.length);

    // Create sample quiz for Grade 7 Matematika
    const mathClassIndex = (7 - 7) * subjects.length + 8; // Grade 7, Matematika (index 8)
    const quiz = await prisma.quiz.create({
      data: {
        title: 'Quiz Matematika - Bilangan Bulat',
        description: 'Quiz untuk menguji pemahaman tentang operasi bilangan bulat',
        instruction: 'Jawab semua pertanyaan dengan teliti. Waktu pengerjaan 45 menit.',
        timeLimit: 45, // 45 minutes
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        maxAttempts: 2,
        maxScore: 100,
        status: 'PUBLISHED',
        classId: classes[mathClassIndex].id,
        teacherId: teachers[8].id // Matematika teacher
      }
    });

    // Create quiz questions
    const question1 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: 'Berapakah hasil dari (-5) + 8?',
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
          text: '-3',
          isCorrect: false,
          order: 1
        }
      }),
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '3',
          isCorrect: true, // (-5) + 8 = 3
          order: 2
        }
      }),
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '13',
          isCorrect: false,
          order: 3
        }
      }),
      prisma.quizOption.create({
        data: {
          questionId: question1.id,
          text: '-13',
          isCorrect: false,
          order: 4
        }
      })
    ]);

    console.log('✅ Quiz and questions created');

    // Create sample submissions (some students already submitted)
    const sampleSubmissions = [];
    
    if (assignments.length > 0) {
      const submissions = await Promise.all([
        prisma.submission.create({
          data: {
            assignmentId: assignments[0].id, // First assignment
            studentId: students[0].id, // First Grade 7 student
            content: 'Berikut adalah jawaban saya untuk soal operasi bilangan bulat: 1. (-5) + 8 = 3, 2. 7 - (-3) = 10...',
            version: 1,
            isLatest: true,
            isLate: false,
            status: 'SUBMITTED'
          }
        }),
        prisma.submission.create({
          data: {
            assignmentId: assignments[0].id, // First assignment
            studentId: students[1].id, // Second Grade 7 student
            content: 'Penyelesaian soal bilangan bulat dengan cara yang sistematis...',
            version: 1,
            isLatest: true,
            isLate: false,
            status: 'GRADED',
            score: 90,
            feedback: 'Jawaban sudah benar dan sistematis. Pertahankan!',
            gradedAt: new Date()
          }
        })
      ]);
      sampleSubmissions.push(...submissions);
    }
    console.log('✅ Sample submissions created:', sampleSubmissions.length);

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`👤 Users: ${1 + teachers.length + students.length} (1 Admin, ${teachers.length} Teachers, ${students.length} Students)`);
    console.log(`📚 Subjects: ${subjects.length} (12 subjects for SMP)`);
    console.log(`🏫 Classes: ${classes.length} (12 subjects × 3 grades)`);
    console.log(`📖 Materials: ${materials.length}`);
    console.log(`📝 Assignments: ${assignments.length}`);
    console.log(`🧠 Quizzes: 1 (with questions)`);
    console.log(`📄 Submissions: ${sampleSubmissions.length}`);
    console.log(`🎓 Academic Periods: 2`);
    
    console.log('\n📧 Test Accounts:');
    console.log('👤 Admin: admin.lms@gmail.com');
    console.log('👨‍🏫 Teachers: guru.matematika@gmail.com, guru.indonesia@gmail.com, etc.');
    console.log('👨‍🎓 Students: kelas7.siswa1@gmail.com, kelas8.siswa1@gmail.com, kelas9.siswa1@gmail.com, etc.');
    
    console.log('\n🔑 Sample Class Enrollment Codes:');
    console.log('🙏 Agama Hindu Kelas 7: AGAMA7');
    console.log('🏛️ Bahasa Bali Kelas 7: BALI7');
    console.log('📝 Bahasa Indonesia Kelas 7: INDO7');
    console.log('🌍 Bahasa Inggris Kelas 7: ENG7');
    console.log('📊 Matematika Kelas 7: MATH7');
    console.log('⚗️ IPA Kelas 8: IPA8');
    console.log('🏛️ IPS Kelas 9: IPS9');
    console.log('💻 Informatika Kelas 7: INFO7');
    
    console.log('\n👥 Student Distribution:');
    console.log('📘 Kelas 7: 5 students (kelas7.siswa1@gmail.com to kelas7.siswa5@gmail.com)');
    console.log('📗 Kelas 8: 5 students (kelas8.siswa1@gmail.com to kelas8.siswa5@gmail.com)');
    console.log('📙 Kelas 9: 5 students (kelas9.siswa1@gmail.com to kelas9.siswa5@gmail.com)');
    
    console.log('\n💡 Note: Each student is enrolled in all 12 subjects for their grade level!');

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