const app = require('./app');
const prisma = require('./configs/prisma');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Function to test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Start server function
async function startServer() {
  try {
    // Test database connection first
    await testDatabaseConnection();

    // Start the server
    const server = app.listen(PORT, () => {
      console.log('🚀 ========================================');
      console.log(`🚀 LMS Backend Server is running!`);
      console.log(`🚀 Environment: ${NODE_ENV}`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 URL: http://localhost:${PORT}`);
      console.log(`🚀 Health Check: http://localhost:${PORT}/health`);
      console.log('🚀 ========================================');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await prisma.$disconnect();
          console.log('🔌 Database disconnected');
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the application
startServer();