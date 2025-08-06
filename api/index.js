// Vercel Serverless Function for PPT Generator API
require('dotenv').config();

const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const SalesforceStorageService = require('../salesforce-storage');

// Configuration
const config = {
    storage: {
        type: process.env.STORAGE_TYPE || 'salesforce',
        local: {
            uploadDir: '/tmp/uploads',
            retentionDays: 7
        }
    },
    limits: {
        maxFileSize: '50mb',
        maxContentLength: 50000
    },
    // Salesforce Configuration (same as api-server.js)
    salesforce: {
        loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        version: process.env.SALESFORCE_API_VERSION || 'v58.0'
    }
};

// Initialize storage service
let storageService = null;
if (config.storage.type === 'salesforce') {
    storageService = new SalesforceStorageService(config.salesforce);
}

// Ensure upload directory exists (for local temp storage)
if (!fs.existsSync(config.storage.local.uploadDir)) {
    fs.mkdirSync(config.storage.local.uploadDir, { recursive: true });
}

// Helper functions
function processContentByTopic(content) {
    const sections = content.split('\n\n').filter(section => section.trim().length > 0);
    const slides = [];
    
    sections.forEach((section, index) => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
            slides.push({ title, content });
        }
    });
    
    return slides.length > 0 ? slides : [{ title: 'Content', content }];
}

function processContentByParagraph(content) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const slides = [];
    
    paragraphs.forEach((paragraph, index) => {
        const lines = paragraph.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        slides.push({ title, content: content || title });
    });
    
    return slides;
}

// Main handler function
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { method, url } = req;

        // Health check endpoint
        if (method === 'GET' && url === '/api/health') {
            return res.status(200).json({
                status: 'OK',
                service: 'PPT Generator API',
                version: '1.0.0',
                storage: config.storage.type,
                timestamp: new Date().toISOString()
            });
        }

        // Generate PPT endpoint
        if (method === 'POST' && url === '/api/generate') {
            const { content, title = 'Generated Presentation', theme = 'modern', method: contentMethod = 'paragraph' } = req.body;

            // Validation
            if (!content || content.length < 50) {
                return res.status(400).json({
                    success: false,
                    error: 'Content must be at least 50 characters long'
                });
            }

            if (content.length > config.limits.maxContentLength) {
                return res.status(400).json({
                    success: false,
                    error: `Content too long. Maximum ${config.limits.maxContentLength} characters allowed`
                });
            }

            console.log(`📝 Generating PPT for: ${title}`);

            // Generate PPT
            const pptx = new PptxGenJS();
            
            // Set theme
            pptx.layout = 'LAYOUT_16x9';
            pptx.theme = { color: 'F1F1F1', back: 'FFFFFF' };

            // Process content based on method
            let slides = [];
            if (contentMethod === 'topic') {
                slides = processContentByTopic(content);
            } else if (contentMethod === 'paragraph') {
                slides = processContentByParagraph(content);
            } else {
                slides = processContentByTopic(content);
            }

            // Add slides
            slides.forEach((slideContent, index) => {
                const slide = pptx.addSlide();
                
                if (index === 0) {
                    // Title slide
                    slide.addText(title, {
                        x: 1, y: 2, w: 8, h: 1.5,
                        fontSize: 32,
                        bold: true,
                        color: '2E86AB',
                        align: 'center'
                    });
                    
                    if (slideContent.content) {
                        slide.addText(slideContent.content, {
                            x: 1, y: 3.5, w: 8, h: 2,
                            fontSize: 16,
                            color: '666666',
                            align: 'center'
                        });
                    }
                } else {
                    // Content slide
                    slide.addText(slideContent.title, {
                        x: 0.5, y: 0.5, w: 9, h: 0.8,
                        fontSize: 24,
                        bold: true,
                        color: '2E86AB'
                    });
                    
                    slide.addText(slideContent.content, {
                        x: 0.5, y: 1.5, w: 9, h: 5,
                        fontSize: 14,
                        color: '333333',
                        bullet: { type: 'number' }
                    });
                }
            });

            // Generate file
            const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pptx`;
            const filePath = path.join(config.storage.local.uploadDir, fileName);
            
            await pptx.writeFile({ fileName: filePath });

            // Read the generated file
            const fileBuffer = fs.readFileSync(filePath);
            
            // Clean up the temporary file
            fs.unlinkSync(filePath);

            // Store in Salesforce if configured
            if (config.storage.type === 'salesforce' && storageService) {
                try {
                    console.log('📤 Uploading to Salesforce...');
                    const uploadResult = await storageService.uploadFile(fileBuffer, fileName, title);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Presentation generated and uploaded to Salesforce successfully!',
                        data: {
                            fileId: uploadResult.fileId,
                            downloadUrl: uploadResult.downloadUrl,
                            slides: slides.length,
                            fileName: uploadResult.fileName,
                            fileSize: uploadResult.fileSize
                        }
                    });
                } catch (error) {
                    console.error('❌ Salesforce upload failed:', error.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to upload to Salesforce',
                        message: error.message
                    });
                }
            } else {
                // Fallback to local storage (for development)
                return res.status(200).json({
                    success: true,
                    message: 'Presentation generated successfully (local storage)',
                    data: {
                        fileId: fileName,
                        fileData: fileBuffer.toString('base64'),
                        slides: slides.length,
                        fileName,
                        fileSize: fileBuffer.length
                    }
                });
            }
        }

        // Get file info endpoint
        if (method === 'GET' && url.startsWith('/api/file/')) {
            const fileId = url.split('/api/file/')[1];
            
            if (config.storage.type === 'salesforce' && storageService) {
                try {
                    const fileInfo = await storageService.getFileInfo(fileId);
                    return res.status(200).json({
                        success: true,
                        data: fileInfo
                    });
                } catch (error) {
                    return res.status(404).json({
                        success: false,
                        error: 'File not found in Salesforce',
                        message: error.message
                    });
                }
            } else {
                // Fallback to local storage
                const filePath = path.join(config.storage.local.uploadDir, fileId);
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    return res.status(200).json({
                        success: true,
                        data: {
                            fileId,
                            title: fileId,
                            size: stats.size,
                            createdAt: stats.birthtime.toISOString(),
                            fileType: 'POWER_POINT_X'
                        }
                    });
                } else {
                    return res.status(404).json({
                        success: false,
                        error: 'File not found'
                    });
                }
            }
        }

        // List files endpoint
        if (method === 'GET' && url === '/api/files') {
            const limit = parseInt(req.query?.limit) || 10;
            
            if (config.storage.type === 'salesforce' && storageService) {
                try {
                    const files = await storageService.listFiles(limit);
                    return res.status(200).json({
                        success: true,
                        data: files
                    });
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to list files from Salesforce',
                        message: error.message
                    });
                }
            } else {
                // Fallback to local storage
                const files = fs.readdirSync(config.storage.local.uploadDir)
                    .filter(file => file.endsWith('.pptx'))
                    .map(file => {
                        const filePath = path.join(config.storage.local.uploadDir, file);
                        const stats = fs.statSync(filePath);
                        return {
                            fileId: file,
                            title: file,
                            size: stats.size,
                            createdDate: stats.birthtime.toISOString(),
                            fileType: 'POWER_POINT_X'
                        };
                    })
                    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
                    .slice(0, limit);

                return res.status(200).json({
                    success: true,
                    data: files
                });
            }
        }

        // Delete file endpoint
        if (method === 'DELETE' && url.startsWith('/api/file/')) {
            const fileId = url.split('/api/file/')[1];
            
            if (config.storage.type === 'salesforce' && storageService) {
                try {
                    await storageService.deleteFile(fileId);
                    return res.status(200).json({
                        success: true,
                        message: 'File deleted from Salesforce successfully'
                    });
                } catch (error) {
                    return res.status(404).json({
                        success: false,
                        error: 'Failed to delete file from Salesforce',
                        message: error.message
                    });
                }
            } else {
                // Fallback to local storage
                const filePath = path.join(config.storage.local.uploadDir, fileId);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    return res.status(200).json({
                        success: true,
                        message: 'File deleted successfully'
                    });
                } else {
                    return res.status(404).json({
                        success: false,
                        error: 'File not found'
                    });
                }
            }
        }

        // Default response for unknown endpoints
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found'
        });

    } catch (error) {
        console.error('Error in serverless function:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}; 