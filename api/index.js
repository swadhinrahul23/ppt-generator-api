// Vercel Serverless Function for PPT Generator API
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

// Import the storage service
let storageService;
try {
    const SalesforceStorage = require('../salesforce-storage.js');
    storageService = new SalesforceStorage();
} catch (error) {
    console.log('Salesforce storage not available, using local storage');
    storageService = null;
}

const app = express();
const upload = multer({ dest: '/tmp/' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration
const config = {
    port: process.env.PORT || 3000,
    storage: {
        type: process.env.STORAGE_TYPE || 'local',
        local: {
            uploadDir: '/tmp/uploads',
            retentionDays: 7
        }
    },
    limits: {
        maxFileSize: '50mb',
        maxContentLength: 50000
    }
};

// Ensure upload directory exists
if (!fs.existsSync(config.storage.local.uploadDir)) {
    fs.mkdirSync(config.storage.local.uploadDir, { recursive: true });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'PPT Generator API',
        version: '1.0.0',
        storage: config.storage.type,
        timestamp: new Date().toISOString()
    });
});

// Generate PPT endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { content, title = 'Generated Presentation', theme = 'modern', method = 'paragraph' } = req.body;

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
        if (method === 'topic') {
            slides = processContentByTopic(content);
        } else if (method === 'paragraph') {
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

        // Store file
        let fileId, downloadUrl;
        if (config.storage.type === 'salesforce' && storageService) {
            try {
                const result = await storageService.uploadFile(filePath, fileName);
                fileId = result.fileId;
                downloadUrl = result.downloadUrl;
                console.log(`✅ PPT generated successfully: ${fileId}`);
            } catch (error) {
                console.error('Salesforce storage failed, using local storage:', error.message);
                fileId = fileName;
                downloadUrl = `/api/file/${fileName}`;
            }
        } else {
            fileId = fileName;
            downloadUrl = `/api/file/${fileName}`;
        }

        res.json({
            success: true,
            message: 'Presentation generated successfully',
            data: {
                fileId,
                downloadUrl,
                slides: slides.length,
                fileName
            }
        });

    } catch (error) {
        console.error('Error generating PPT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate presentation'
        });
    }
});

// Get file info
app.get('/api/file/:fileId', (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(config.storage.local.uploadDir, fileId);
        
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            res.json({
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
            res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get file info'
        });
    }
});

// List files
app.get('/api/files', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
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

        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to list files'
        });
    }
});

// Delete file
app.delete('/api/file/:fileId', (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(config.storage.local.uploadDir, fileId);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete file'
        });
    }
});

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

// Export for Vercel
module.exports = app; 