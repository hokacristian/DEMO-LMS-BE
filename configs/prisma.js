const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting from database...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('🔌 Disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;