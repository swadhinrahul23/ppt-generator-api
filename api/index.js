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

// Content Categorizer (same as api-server.js)
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

            // Generate PPT using ContentCategorizer (same as api-server.js)
            const pptx = new PptxGenJS();
            
            // Set theme
            pptx.layout = 'LAYOUT_16x9';
            pptx.theme = { color: 'F1F1F1', back: 'FFFFFF' };

            // Get theme colors
            const getThemeColors = (theme) => {
                const themes = {
                    modern: { primary: '2563EB', secondary: '667eea', text: '374151' },
                    classic: { primary: '7C2D12', secondary: '4B5563', text: '374151' },
                    minimal: { primary: '000000', secondary: '666666', text: '555555' },
                    creative: { primary: '7C3AED', secondary: 'DC2626', text: '1F2937' }
                };
                return themes[theme] || themes.modern;
            };

            const themeColors = getThemeColors(theme);

            // Process content using ContentCategorizer
            const analysis = ContentCategorizer.categorizeContent(content, contentMethod);

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
                            slides: analysis.estimatedSlides,
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
                        slides: analysis.estimatedSlides,
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