# PPT Generator API for Salesforce Agentforce

A serverless Node.js API that generates PowerPoint presentations and integrates with Salesforce Agentforce agents.

## Features

- ✅ Generate PPTX presentations from text content
- ✅ Multiple themes (modern, classic, minimal, creative)
- ✅ Content processing methods (paragraph, topic, length, keywords)
- ✅ Serverless deployment on Vercel
- ✅ RESTful API endpoints

## API Endpoints

- `POST /api/generate` - Generate PPTX presentation
- `GET /api/health` - Health check
- `GET /api/file/:fileId` - Get file information
- `GET /api/files` - List recent files
- `DELETE /api/file/:fileId` - Delete file

## Deployment

### Vercel (Recommended)

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Import** this GitHub repository
3. **Deploy** automatically
4. **Get your HTTPS URL** (e.g., `https://your-app.vercel.app`)

### Vercel Configuration

This project uses Vercel's auto-detection for serverless functions:
- **Function**: `api/index.js` (auto-detected)
- **Framework**: Node.js (auto-detected)
- **Build**: No build step required

### Update Salesforce Configuration

1. **Update Apex Class** (`PPTAgentforceGenerator_PPTX.cls`):
   ```apex
   private static final String EXTERNAL_API_URL = 'https://your-app.vercel.app';
   ```

2. **Create Remote Site** in Salesforce Setup:
   - Remote Site Name: `VercelPPTAPI`
   - Remote Site URL: `https://your-app.vercel.app`
   - Active: ✅ CHECKED
   - Disable Protocol Security: ❌ UNCHECKED (HTTPS)

## Environment Variables

Set these in Vercel dashboard (optional):

```
STORAGE_TYPE=local
```

## Local Development

```bash
npm install
npm run dev
```

## Project Structure

```
├── api/
│   └── index.js          # Main serverless function
├── PPTAgentforceGenerator_PPTX.cls  # Salesforce Apex class
├── package.json          # Dependencies
└── README.md            # This file
```

## Salesforce Integration

The API integrates with Salesforce Agentforce agents through the `PPTAgentforceGenerator_PPTX` Apex class, which:

- Accepts content from Agentforce agents
- Calls the external API to generate PPTX files
- Returns download links for sharing

## License

MIT 