// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Try to load optional dependencies for cloud storage
let AWS, cloudinary, admin, SalesforceStorageService;
try {
    AWS = require('aws-sdk');
} catch (e) { console.log('AWS SDK not installed'); }

try {
    cloudinary = require('cloudinary').v2;
} catch (e) { console.log('Cloudinary not installed'); }

try {
    admin = require('firebase-admin');
} catch (e) { console.log('Firebase Admin not installed'); }

try {
    SalesforceStorageService = require('./salesforce-storage');
} catch (e) { console.log('Salesforce storage service not found'); }

// Try to load pptx-automizer, fallback if not available
let Automizer;
try {
    Automizer = require('pptx-automizer');
    console.log('✅ pptx-automizer loaded successfully');
} catch (error) {
    console.log('⚠️  pptx-automizer not found, using PptxGenJS only');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration from environment variables
const config = {
    storage: {
        type: process.env.STORAGE_TYPE || 'local', // 'local', 'aws', 'cloudinary', 'firebase', 'salesforce'
        
        // AWS S3 Configuration
        aws: {
            region: process.env.AWS_REGION || 'us-east-1',
            bucket: process.env.AWS_BUCKET,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },
        
        // Cloudinary Configuration
        cloudinary: {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            apiSecret: process.env.CLOUDINARY_API_SECRET
        },
        
        // Firebase Configuration
        firebase: {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        }
    },
    baseUrl: process.env.BASE_URL || `http://localhost:${PORT}`,
    fileRetentionDays: parseInt(process.env.FILE_RETENTION_DAYS) || 7,
    maxFileSize: process.env.MAX_FILE_SIZE || '50mb',
    
    // Salesforce Configuration
    salesforce: {
        loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        version: process.env.SALESFORCE_API_VERSION || 'v58.0'
    }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: config.maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxFileSize }));

// Create necessary directories
const ensureDirectories = () => {
    const dirs = ['uploads', 'temp', 'logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

ensureDirectories();

// Content categorization functions (from previous implementation)
class ContentCategorizer {
    static categorizeByParagraphs(content) {
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        return paragraphs.map((paragraph, index) => ({
            type: 'paragraph',
            title: this.generateTitleFromContent(paragraph),
            content: paragraph.trim(),
            index: index + 1
        }));
    }

    static categorizeByTopics(content) {
        const topics = [];
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        let currentTopic = null;
        let currentContent = [];

        for (const line of lines) {
            if (this.isLikelyHeading(line)) {
                if (currentTopic && currentContent.length > 0) {
                    topics.push({
                        type: 'topic',
                        title: currentTopic,
                        content: currentContent.join('\n'),
                        index: topics.length + 1
                    });
                }
                currentTopic = line.trim();
                currentContent = [];
            } else {
                currentContent.push(line);
            }
        }

        if (currentTopic && currentContent.length > 0) {
            topics.push({
                type: 'topic',
                title: currentTopic,
                content: currentContent.join('\n'),
                index: topics.length + 1
            });
        }

        return topics.length > 0 ? topics : this.categorizeByParagraphs(content);
    }

    static categorizeByLength(content) {
        const words = content.split(/\s+/);
        const wordsPerSlide = Math.max(50, Math.floor(words.length / 8));
        const categories = [];
        
        for (let i = 0; i < words.length; i += wordsPerSlide) {
            const slideWords = words.slice(i, i + wordsPerSlide);
            const slideContent = slideWords.join(' ');
            
            categories.push({
                type: 'length',
                title: this.generateTitleFromContent(slideContent),
                content: slideContent,
                index: categories.length + 1
            });
        }

        return categories;
    }

    static categorizeByKeywords(content) {
        const keywords = this.extractKeywords(content);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const categories = [];

        for (const keyword of keywords.slice(0, 6)) {
            const relatedSentences = sentences.filter(sentence => 
                sentence.toLowerCase().includes(keyword.toLowerCase())
            );

            if (relatedSentences.length > 0) {
                categories.push({
                    type: 'keyword',
                    title: `About ${keyword}`,
                    content: relatedSentences.join('. ') + '.',
                    index: categories.length + 1,
                    keyword
                });
            }
        }

        return categories.length > 0 ? categories : this.categorizeByParagraphs(content);
    }

    static isLikelyHeading(line) {
        const trimmed = line.trim();
        return (
            trimmed.length < 100 &&
            (trimmed.endsWith(':') ||
             /^[A-Z][^.!?]*$/.test(trimmed) ||
             /^\d+\./.test(trimmed) ||
             trimmed === trimmed.toUpperCase())
        );
    }

    static extractKeywords(content) {
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);

        const stopWords = new Set([
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'does', 'let', 'man', 'men', 'put', 'say', 'she', 'too', 'use', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
        ]);

        const wordCount = {};
        words.forEach(word => {
            if (!stopWords.has(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    static generateTitleFromContent(content) {
        const sentences = content.split(/[.!?]+/);
        const firstSentence = sentences[0].trim();
        
        if (firstSentence.length < 60) {
            return firstSentence;
        }

        const words = firstSentence.split(' ');
        return words.slice(0, 8).join(' ') + '...';
    }

    static categorizeContent(content, method) {
        let categories = [];
        
        switch (method) {
            case 'paragraph':
                categories = this.categorizeByParagraphs(content);
                break;
            case 'topic':
                categories = this.categorizeByTopics(content);
                break;
            case 'length':
                categories = this.categorizeByLength(content);
                break;
            case 'keywords':
                categories = this.categorizeByKeywords(content);
                break;
            default:
                categories = this.categorizeByParagraphs(content);
        }

        return {
            method,
            totalWords: content.split(/\s+/).length,
            totalParagraphs: content.split(/\n\s*\n/).length,
            categories,
            estimatedSlides: categories.length + 1
        };
    }
}

// Storage Service Factory
class StorageService {
    static create(type) {
        switch (type) {
            case 'aws':
                return new AWSStorageService();
            case 'cloudinary':
                return new CloudinaryStorageService();
            case 'firebase':
                return new FirebaseStorageService();
            case 'salesforce':
                return new SalesforceStorageServiceWrapper();
            case 'local':
            default:
                return new LocalStorageService();
        }
    }
}

// Local Storage Service
class LocalStorageService {
    constructor() {
        this.uploadsDir = path.join(__dirname, 'uploads');
    }

    async uploadFile(filePath, filename) {
        const uploadPath = path.join(this.uploadsDir, filename);
        
        // Copy file to uploads directory
        fs.copyFileSync(filePath, uploadPath);
        
        // Generate shareable link
        const fileId = crypto.randomBytes(16).toString('hex');
        const shareableLink = `${config.baseUrl}/api/download/${fileId}`;
        
        // Store mapping in simple JSON file (in production, use a database)
        const mappingFile = path.join(this.uploadsDir, 'file-mappings.json');
        let mappings = {};
        
        if (fs.existsSync(mappingFile)) {
            mappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
        }
        
        mappings[fileId] = {
            filename: filename,
            originalPath: uploadPath,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + config.fileRetentionDays * 24 * 60 * 60 * 1000).toISOString()
        };
        
        fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2));
        
        return {
            success: true,
            shareableLink,
            fileId,
            expiresAt: mappings[fileId].expiresAt
        };
    }

    async getFile(fileId) {
        const mappingFile = path.join(this.uploadsDir, 'file-mappings.json');
        
        if (!fs.existsSync(mappingFile)) {
            return null;
        }
        
        const mappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
        const fileInfo = mappings[fileId];
        
        if (!fileInfo || new Date() > new Date(fileInfo.expiresAt)) {
            return null;
        }
        
        return fileInfo;
    }
}

// AWS S3 Storage Service
class AWSStorageService {
    constructor() {
        if (!AWS || !config.storage.aws.bucket) {
            throw new Error('AWS configuration incomplete');
        }
        
        this.s3 = new AWS.S3({
            region: config.storage.aws.region,
            accessKeyId: config.storage.aws.accessKeyId,
            secretAccessKey: config.storage.aws.secretAccessKey
        });
        
        this.bucket = config.storage.aws.bucket;
    }

    async uploadFile(filePath, filename) {
        const fileContent = fs.readFileSync(filePath);
        const key = `ppt-files/${Date.now()}-${filename}`;
        
        const params = {
            Bucket: this.bucket,
            Key: key,
            Body: fileContent,
            ContentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            Expires: new Date(Date.now() + config.fileRetentionDays * 24 * 60 * 60 * 1000)
        };
        
        const result = await this.s3.upload(params).promise();
        
        // Generate signed URL for secure access
        const signedUrl = this.s3.getSignedUrl('getObject', {
            Bucket: this.bucket,
            Key: key,
            Expires: config.fileRetentionDays * 24 * 60 * 60 // seconds
        });
        
        return {
            success: true,
            shareableLink: signedUrl,
            fileId: key,
            expiresAt: new Date(Date.now() + config.fileRetentionDays * 24 * 60 * 60 * 1000).toISOString()
        };
    }
}

// Cloudinary Storage Service
class CloudinaryStorageService {
    constructor() {
        if (!cloudinary || !config.storage.cloudinary.cloudName) {
            throw new Error('Cloudinary configuration incomplete');
        }
        
        cloudinary.config({
            cloud_name: config.storage.cloudinary.cloudName,
            api_key: config.storage.cloudinary.apiKey,
            api_secret: config.storage.cloudinary.apiSecret
        });
    }

    async uploadFile(filePath, filename) {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',
            public_id: `ppt-files/${Date.now()}-${filename.replace('.pptx', '')}`,
            expires_at: Math.floor(Date.now() / 1000) + (config.fileRetentionDays * 24 * 60 * 60)
        });
        
        return {
            success: true,
            shareableLink: result.secure_url,
            fileId: result.public_id,
            expiresAt: new Date(Date.now() + config.fileRetentionDays * 24 * 60 * 60 * 1000).toISOString()
        };
    }
}

// Firebase Storage Service
class FirebaseStorageService {
    constructor() {
        if (!admin || !config.storage.firebase.projectId) {
            throw new Error('Firebase configuration incomplete');
        }
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: config.storage.firebase.projectId,
                    privateKey: config.storage.firebase.privateKey.replace(/\\n/g, '\n'),
                    clientEmail: config.storage.firebase.clientEmail
                }),
                storageBucket: config.storage.firebase.storageBucket
            });
        }
        
        this.bucket = admin.storage().bucket();
    }

    async uploadFile(filePath, filename) {
        const destination = `ppt-files/${Date.now()}-${filename}`;
        
        await this.bucket.upload(filePath, {
            destination,
            metadata: {
                contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            }
        });
        
        const file = this.bucket.file(destination);
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + config.fileRetentionDays * 24 * 60 * 60 * 1000
        });
        
        return {
            success: true,
            shareableLink: signedUrl,
            fileId: destination,
            expiresAt: new Date(Date.now() + config.fileRetentionDays * 24 * 60 * 60 * 1000).toISOString()
        };
    }
}

// Salesforce Storage Service Wrapper
class SalesforceStorageServiceWrapper {
    constructor() {
        if (!SalesforceStorageService || !config.salesforce.clientId) {
            throw new Error('Salesforce configuration incomplete');
        }
        
        this.salesforce = new SalesforceStorageService(config.salesforce);
    }

    async uploadFile(filePath, filename) {
        return await this.salesforce.uploadFile(filePath, filename);
    }

    async getFile(fileId) {
        return await this.salesforce.getFileInfo(fileId);
    }

    async downloadFile(fileId) {
        return await this.salesforce.downloadFile(fileId);
    }

    async listFiles(limit = 10) {
        return await this.salesforce.listRecentFiles(limit);
    }

    async deleteFile(fileId) {
        return await this.salesforce.deleteFile(fileId);
    }
}

// Initialize storage service
const storageService = StorageService.create(config.storage.type);

// PPT Generation Service
class PPTGenerationService {
    static async generatePPT(content, options = {}) {
        const {
            title = 'Generated Presentation',
            theme = 'modern',
            method = 'paragraph'
        } = options;

        const PptxGenJS = require('pptxgenjs');
        const analysis = ContentCategorizer.categorizeContent(content, method);
        
        const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pptx`;
        const tempPath = path.join(__dirname, 'temp', filename);

        const pptx = new PptxGenJS();
        const themeColors = this.getThemeColors(theme);

        // Title slide
        const titleSlide = pptx.addSlide();
        titleSlide.addText(title, {
            x: 0.5, y: 2.5, w: 9, h: 1.5,
            fontSize: 36, bold: true, color: themeColors.primary, align: 'center'
        });
        
        titleSlide.addText('Generated Content Presentation', {
            x: 0.5, y: 4, w: 9, h: 0.8,
            fontSize: 18, color: themeColors.secondary, align: 'center'
        });

        // Content slides
        for (const category of analysis.categories) {
            const slide = pptx.addSlide();
            
            slide.addText(category.title, {
                x: 0.5, y: 0.5, w: 9, h: 1,
                fontSize: 24, bold: true, color: themeColors.primary
            });
            
            const bullets = category.content
                .split(/[.!?]+/)
                .filter(s => s.trim().length > 0)
                .slice(0, 5)
                .map(sentence => sentence.trim());
                
            slide.addText(bullets.join('\n'), {
                x: 0.5, y: 1.8, w: 9, h: 4.5,
                fontSize: 16, color: themeColors.text, bullet: true, lineSpacing: 24
            });
        }

        await pptx.writeFile({ fileName: tempPath });

        return {
            filePath: tempPath,
            filename,
            analysis
        };
    }

    static getThemeColors(theme) {
        const themes = {
            modern: { primary: '2563EB', secondary: '667eea', text: '374151' },
            classic: { primary: '7C2D12', secondary: '4B5563', text: '374151' },
            minimal: { primary: '000000', secondary: '666666', text: '555555' },
            creative: { primary: '7C3AED', secondary: 'DC2626', text: '1F2937' }
        };
        return themes[theme] || themes.modern;
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'PPT Generator API',
        version: '1.0.0',
        storage: config.storage.type,
        timestamp: new Date().toISOString()
    });
});

// Generate PPT API endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { content, title, theme, method } = req.body;
        
        // Validation
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
                error: 'Content is required and must be a non-empty string',
                code: 'INVALID_CONTENT'
            });
        }

        if (content.length > 50000) {
            return res.status(400).json({
                error: 'Content too long. Maximum 50,000 characters allowed.',
                code: 'CONTENT_TOO_LONG'
            });
        }

        console.log(`📝 Generating PPT for: ${title || 'Untitled'}`);

        // Generate PPT
        const result = await PPTGenerationService.generatePPT(content, {
            title: title || 'Generated Presentation',
            theme: theme || 'modern',
            method: method || 'paragraph'
        });

        // Upload to storage
        const uploadResult = await storageService.uploadFile(result.filePath, result.filename);

        // Clean up temp file
        if (fs.existsSync(result.filePath)) {
            fs.unlinkSync(result.filePath);
        }

        // Log the generation
        console.log(`✅ PPT generated successfully: ${uploadResult.fileId}`);

        res.json({
            success: true,
            message: 'Presentation generated successfully',
            data: {
                downloadUrl: uploadResult.shareableLink,
                fileId: uploadResult.fileId,
                filename: result.filename,
                expiresAt: uploadResult.expiresAt,
                slides: result.analysis.estimatedSlides,
                words: result.analysis.totalWords,
                categories: result.analysis.categories.length,
                method: result.analysis.method
            }
        });

    } catch (error) {
        console.error('❌ PPT generation error:', error);
        res.status(500).json({
            error: 'Failed to generate presentation',
            message: error.message,
            code: 'GENERATION_ERROR'
        });
    }
});

// Download endpoint for local storage
app.get('/api/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (config.storage.type !== 'local') {
            return res.status(404).json({
                error: 'Download endpoint only available for local storage',
                code: 'ENDPOINT_NOT_AVAILABLE'
            });
        }

        const fileInfo = await storageService.getFile(fileId);
        
        if (!fileInfo) {
            return res.status(404).json({
                error: 'File not found or expired',
                code: 'FILE_NOT_FOUND'
            });
        }

        if (!fs.existsSync(fileInfo.originalPath)) {
            return res.status(404).json({
                error: 'File no longer exists',
                code: 'FILE_MISSING'
            });
        }

        res.download(fileInfo.originalPath, fileInfo.filename);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Failed to download file',
            code: 'DOWNLOAD_ERROR'
        });
    }
});

// Get file info endpoint
app.get('/api/file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const fileInfo = await storageService.getFile(fileId);
        
        if (!fileInfo) {
            return res.status(404).json({
                error: 'File not found or expired',
                code: 'FILE_NOT_FOUND'
            });
        }

        // Format response based on storage type
        if (config.storage.type === 'salesforce') {
            res.json({
                success: true,
                data: {
                    fileId: fileInfo.fileId,
                    title: fileInfo.title,
                    size: fileInfo.size,
                    createdAt: fileInfo.createdDate,
                    fileType: fileInfo.fileType,
                    directLink: fileInfo.directLink,
                    downloadLink: fileInfo.downloadLink,
                    publicLink: fileInfo.publicLink
                }
            });
        } else if (config.storage.type === 'local') {
            res.json({
                success: true,
                data: {
                    filename: fileInfo.filename,
                    createdAt: fileInfo.createdAt,
                    expiresAt: fileInfo.expiresAt,
                    downloadUrl: `${config.baseUrl}/api/download/${fileId}`
                }
            });
        } else {
            res.json({
                success: true,
                data: fileInfo
            });
        }

    } catch (error) {
        console.error('File info error:', error);
        res.status(500).json({
            error: 'Failed to get file info',
            code: 'FILE_INFO_ERROR'
        });
    }
});

// List recent files endpoint (useful for Salesforce)
app.get('/api/files', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        if (config.storage.type === 'salesforce') {
            const files = await storageService.listFiles(limit);
            res.json({
                success: true,
                data: files
            });
        } else {
            res.status(404).json({
                error: 'File listing only available for Salesforce storage',
                code: 'ENDPOINT_NOT_AVAILABLE'
            });
        }

    } catch (error) {
        console.error('File listing error:', error);
        res.status(500).json({
            error: 'Failed to list files',
            code: 'FILE_LIST_ERROR'
        });
    }
});

// Delete file endpoint
app.delete('/api/file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (config.storage.type === 'salesforce') {
            await storageService.deleteFile(fileId);
            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } else {
            res.status(404).json({
                error: 'File deletion only available for Salesforce storage',
                code: 'ENDPOINT_NOT_AVAILABLE'
            });
        }

    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({
            error: 'Failed to delete file',
            code: 'FILE_DELETE_ERROR'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 PPT Generator API Server running on ${config.baseUrl}`);
    console.log(`📁 Storage type: ${config.storage.type}`);
    console.log(`⏰ File retention: ${config.fileRetentionDays} days`);
    console.log(`📊 Max file size: ${config.maxFileSize}`);
    console.log('\n📋 API Endpoints:');
    console.log(`   POST   ${config.baseUrl}/api/generate - Generate PPT`);
    console.log(`   GET    ${config.baseUrl}/api/health - Health check`);
    console.log(`   GET    ${config.baseUrl}/api/file/:fileId - Get file info`);
    
    if (config.storage.type === 'local') {
        console.log(`   GET    ${config.baseUrl}/api/download/:fileId - Download file`);
    }
    
    if (config.storage.type === 'salesforce') {
        console.log(`   GET    ${config.baseUrl}/api/files - List recent files`);
        console.log(`   DELETE ${config.baseUrl}/api/file/:fileId - Delete file`);
        console.log(`\n🔗 Salesforce Configuration:`);
        console.log(`   Login URL: ${config.salesforce.loginUrl}`);
        console.log(`   API Version: ${config.salesforce.version}`);
        console.log(`   Client ID: ${config.salesforce.clientId ? '✅ Configured' : '❌ Missing'}`);
        console.log(`   Client Secret: ${config.salesforce.clientSecret ? '✅ Configured' : '❌ Missing'}`);
    }
    console.log('');
}); 