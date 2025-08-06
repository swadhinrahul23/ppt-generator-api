# PPT Generator API for Salesforce Agentforce

A Node.js API server that generates PowerPoint presentations and integrates with Salesforce Agentforce agents.

## Features

- ✅ Generate PPTX presentations from text content
- ✅ Multiple themes (modern, classic, minimal, creative)
- ✅ Content processing methods (paragraph, topic, length, keywords)
- ✅ Salesforce Files integration for storage
- ✅ Download links for generated presentations
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

Set these in Vercel dashboard:

```
STORAGE_TYPE=salesforce
SALESFORCE_LOGIN_URL=https://your-instance.salesforce.com
SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_connected_app_client_secret
SALESFORCE_API_VERSION=v58.0
```

## Local Development

```bash
npm install
npm start
```

Server runs on `http://localhost:3001`

## Salesforce Integration

The API integrates with Salesforce Agentforce agents through the `PPTAgentforceGenerator_PPTX` Apex class, which:

- Accepts content from Agentforce agents
- Calls the external API to generate PPTX files
- Stores files in Salesforce Files
- Returns download links for sharing

## License

MIT 