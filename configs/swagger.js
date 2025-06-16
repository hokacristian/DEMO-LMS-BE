const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDef = require("../docs/swaggerDef");

// Load file YAML Swagger
const swaggerAuth = YAML.load(path.join(__dirname, "../public/auth.yaml"));
const swaggerClasses = YAML.load(path.join(__dirname, "../public/classes.yaml"));
const swaggerAssignments = YAML.load(path.join(__dirname, "../public/assignments.yaml"));
const swaggerMaterials = YAML.load(path.join(__dirname, "../public/materials.yaml"));

// Validasi jika file tidak ditemukan
if (!swaggerAuth || !swaggerClasses || !swaggerAssignments || !swaggerMaterials) {
  console.error("❌ Error loading Swagger YAML files");
  console.log("📋 Checking files:");
  console.log("✅ Auth:", !!swaggerAuth);
  console.log("✅ Classes:", !!swaggerClasses);
  console.log("✅ Assignments:", !!swaggerAssignments);
  console.log("✅ Materials:", !!swaggerMaterials);
  
  if (!swaggerAuth) console.error("❌ Missing: auth.yaml");
  if (!swaggerClasses) console.error("❌ Missing: classes.yaml");
  if (!swaggerAssignments) console.error("❌ Missing: assignments.yaml");
  if (!swaggerMaterials) console.error("❌ Missing: materials.yaml");
  
  process.exit(1);
}

// Gabungkan definisi Swagger
const swaggerSpec = {
  ...swaggerDef,
  paths: {
    ...swaggerAuth.paths,
    ...swaggerClasses.paths,
    ...swaggerAssignments.paths,
    ...swaggerMaterials.paths,
  },
};

// Fungsi untuk menambahkan Swagger UI ke aplikasi
const swaggerDocs = (app) => {
  // Swagger UI options
  const options = {
    customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
    customCss: `
      .swagger-ui .opblock .opblock-summary-path-description-wrapper { 
        align-items: center; 
        display: flex; 
        flex-wrap: wrap; 
        gap: 0 10px; 
        padding: 0 10px; 
        width: 100%; 
      }
      .swagger-ui .topbar { 
        background-color: #1f2937; 
      }
      .swagger-ui .topbar .download-url-wrapper .download-url-button {
        background-color: #3b82f6;
        border-color: #3b82f6;
      }
      .swagger-ui .info .title {
        color: #1f2937;
        font-size: 36px;
        margin: 0;
      }
      .swagger-ui .info .description {
        font-size: 16px;
        margin: 20px 0;
      }
      .swagger-ui .scheme-container {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
      }
      .swagger-ui .opblock.opblock-post {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.1);
      }
      .swagger-ui .opblock.opblock-get {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
      .swagger-ui .opblock.opblock-put {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }
      .swagger-ui .opblock.opblock-delete {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
      .swagger-ui .opblock-tag {
        font-size: 24px;
        font-weight: bold;
        margin: 20px 0 10px 0;
        padding: 10px 0;
        border-bottom: 2px solid #e5e7eb;
      }
      .swagger-ui .opblock-summary-method {
        font-weight: bold;
        min-width: 80px;
        text-align: center;
        border-radius: 3px;
        padding: 6px 15px;
      }
      .swagger-ui .btn.authorize {
        background-color: #10b981;
        border-color: #10b981;
      }
      .swagger-ui .btn.authorize:hover {
        background-color: #059669;
        border-color: #059669;
      }
    `,
    customSiteTitle: "HOKAV2 API Documentation",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      docExpansion: "none", // 'list', 'full', 'none'
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
      persistAuthorization: true,
    }
  };

  // Setup Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, options)
  );
  
  // JSON endpoint for raw swagger spec
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Health check specifically for swagger
  app.get("/api-docs/health", (req, res) => {
    res.json({
      success: true,
      message: "Swagger documentation is healthy",
      totalEndpoints: Object.keys(swaggerSpec.paths).length,
      tags: swaggerSpec.tags.map(tag => tag.name),
      timestamp: new Date().toISOString()
    });
  });

  console.log("📚 Swagger docs available at /api-docs");
  console.log("📄 Swagger JSON available at /api-docs.json");
  console.log("🩺 Swagger health check available at /api-docs/health");
  console.log("🚀 HOKAV2 API Documentation loaded successfully!");
  console.log(`📊 Total documented endpoints: ${Object.keys(swaggerSpec.paths).length}`);
  console.log(`🏷️  Documentation tags: ${swaggerSpec.tags.map(tag => tag.name).join(', ')}`);
};

// Export both the function and the spec
module.exports = {
  swaggerDocs,
  swaggerSpec
};