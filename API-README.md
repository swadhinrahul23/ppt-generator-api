# PPT Generator API

A powerful REST API service that converts structured content into professional PowerPoint presentations with multiple cloud storage options.

## 🚀 Features

- **Content Categorization**: Automatically organizes content using multiple methods
- **Multiple Storage Options**: Local, AWS S3, Cloudinary, Firebase
- **Shareable Links**: Generate secure, temporary download links
- **Theme Support**: Multiple presentation themes
- **Auto-Expiry**: Configurable file retention periods
- **RESTful API**: Clean, standardized API endpoints

## 📋 API Endpoints

### Generate PPT
```http
POST /api/generate
Content-Type: application/json

{
  "content": "Your structured content here...",
  "title": "My Presentation",
  "theme": "modern",
  "method": "paragraph"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Presentation generated successfully",
  "data": {
    "downloadUrl": "https://your-storage.com/file-link",
    "fileId": "unique-file-identifier",
    "filename": "My_Presentation_1640995200000.pptx",
    "expiresAt": "2024-01-07T12:00:00.000Z",
    "slides": 5,
    "words": 250,
    "categories": 4,
    "method": "paragraph"
  }
}
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "service": "PPT Generator API",
  "version": "1.0.0",
  "storage": "local",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Download File (Local Storage Only)
```http
GET /api/download/:fileId
```

### Get File Info (Local Storage Only)
```http
GET /api/file/:fileId
```

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
# Copy package-api.json to package.json
cp package-api.json package.json

# Install required dependencies
npm install

# Install optional cloud storage dependencies (choose what you need)
npm install aws-sdk          # For AWS S3
npm install cloudinary       # For Cloudinary
npm install firebase-admin   # For Firebase
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## ⚙️ Configuration Options

### Storage Types

#### 1. Local Storage (Default)
- Files stored on server filesystem
- Good for development and small deployments
- Includes file mapping system
- Built-in download endpoints

```env
STORAGE_TYPE=local
```

#### 2. AWS S3
- Scalable cloud storage
- Signed URLs for secure access
- Automatic expiry support
- CDN integration available

```env
STORAGE_TYPE=aws
AWS_REGION=us-east-1
AWS_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

#### 3. Cloudinary
- Media management platform
- Automatic optimization
- Built-in transformations
- Global CDN

```env
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

#### 4. Firebase Storage
- Google Cloud integration
- Real-time database sync
- Automatic scaling
- Security rules support

```env
STORAGE_TYPE=firebase
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=service@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### Content Categorization Methods

- **paragraph**: Split by paragraph breaks
- **topic**: Auto-detect headings and topics
- **length**: Distribute by word count
- **keywords**: Group by key themes

### Themes

- **modern**: Blue gradient design
- **classic**: Traditional brown theme
- **minimal**: Clean black and white
- **creative**: Colorful purple and red

## 📊 Usage Examples

### cURL Example
```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Introduction to Machine Learning\n\nMachine learning is a subset of artificial intelligence...",
    "title": "ML Presentation",
    "theme": "modern",
    "method": "topic"
  }'
```

### JavaScript Example
```javascript
const response = await fetch('http://localhost:3001/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Your structured content here...',
    title: 'My Presentation',
    theme: 'modern',
    method: 'paragraph'
  })
});

const result = await response.json();
console.log('Download URL:', result.data.downloadUrl);
```

### Python Example
```python
import requests

response = requests.post('http://localhost:3001/api/generate', json={
    'content': 'Your structured content here...',
    'title': 'My Presentation',
    'theme': 'modern',
    'method': 'paragraph'
})

result = response.json()
print(f"Download URL: {result['data']['downloadUrl']}")
```

## 🔧 Error Handling

The API returns standardized error responses:

```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `INVALID_CONTENT`: Content validation failed
- `CONTENT_TOO_LONG`: Content exceeds size limit
- `GENERATION_ERROR`: PPT generation failed
- `STORAGE_ERROR`: File upload failed
- `FILE_NOT_FOUND`: File doesn't exist or expired

## 🚀 Deployment

### Option 1: Cloud Platforms
- **Heroku**: Easy deployment with buildpacks
- **Vercel**: Serverless functions
- **Railway**: Simple container deployment
- **DigitalOcean App Platform**: Managed containers

### Option 2: VPS/Server
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start api-server.js --name "ppt-api"

# Setup auto-restart
pm2 startup
pm2 save
```

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📈 Scaling Considerations

1. **File Storage**: Use cloud storage for production
2. **Database**: Replace JSON file mapping with proper database
3. **Queue System**: Add Redis/Bull for background processing
4. **Rate Limiting**: Implement request throttling
5. **Monitoring**: Add logging and metrics
6. **CDN**: Use CloudFront/CloudFlare for file delivery

## 🔒 Security

- Input validation and sanitization
- File type verification
- Rate limiting recommendations
- Secure cloud storage configurations
- Environment variable protection

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Need help?** Check the health endpoint or review the logs for troubleshooting. 