# Salesforce Agentforce PPT Generator - Complete Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the PPT Generator Agentforce agent in your Salesforce org, including both external API hosting and pure Salesforce solutions.

## Architecture Options

### Option 1: Hybrid Architecture (Recommended)
- **Primary**: External API hosted on cloud platform (Heroku, Vercel, AWS)
- **Fallback**: Pure Salesforce HTML presentation generator
- **Benefits**: Best performance, professional PPT output with HTML fallback

### Option 2: Pure Salesforce Architecture
- **Primary**: Salesforce-native HTML presentation generator
- **Benefits**: No external dependencies, immediate deployment, built-in security

---

## Part 1: Salesforce Org Setup

### Step 1: Deploy Apex Classes

1. **Deploy the Enhanced Apex Class**
   ```apex
   // Deploy PPTAgentforceGenerator.cls to your org
   // This class handles both external API calls and Salesforce fallback
   ```

2. **Deploy Supporting Classes**
   ```apex
   // Deploy ApexPresentationGenerator.cls for HTML fallback
   // This provides pure Salesforce presentation generation
   ```

3. **Create Test Class** (Required for production deployment)
   ```apex
   @isTest
   public class PPTAgentforceGeneratorTest {
       @isTest
       static void testPresentationGeneration() {
           PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
           request.content = 'Test content for presentation generation. This is a sample paragraph with enough content to meet minimum requirements.';
           request.title = 'Test Presentation';
           request.theme = 'modern';
           
           Test.startTest();
           List<PPTAgentforceGenerator.AgentPPTResult> results = 
               PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
           Test.stopTest();
           
           System.assertNotEquals(null, results);
           System.assertEquals(1, results.size());
           // Additional assertions based on expected behavior
       }
   }
   ```

### Step 2: Configure Remote Site Settings

1. Navigate to **Setup > Security > Remote Site Settings**
2. Add these remote sites:

   **For External API (Production)**
   - Name: `PPT_API_Production`
   - Remote Site URL: `https://your-ppt-api-domain.com`
   - Active: ✓

   **For External API (Development)**
   - Name: `PPT_API_Development`
   - Remote Site URL: `http://localhost:3001`
   - Active: ✓ (for testing)

### Step 3: Set Up Content Distribution

1. Navigate to **Setup > Feature Settings > Content > Content Deliveries**
2. Enable **Content Deliveries** for public file sharing
3. Configure security settings as needed

### Step 4: Configure Agentforce Agent

1. **Create New Agent**
   - Go to **Setup > Einstein > Agents**
   - Click **New Agent**
   - Name: `PPT Presentation Generator`
   - Description: `Generate professional PowerPoint presentations from text content`

2. **Configure Agent Topics**
   - Copy the topics from `PPT-Generator-Agent-Config.md`
   - Configure the three main topics:
     - PPT Content Collection and Generation
     - PPT Creation Guidance and Best Practices
     - File Management and Access Support

3. **Configure Agent Actions**
   - Add the Apex action: `Generate PowerPoint Presentation`
   - Map to the `PPTAgentforceGenerator.generatePresentationForAgent` method
   - Configure input/output parameters as defined in the config

4. **Set Up Variables and Filters**
   - Configure custom variables for session tracking
   - Set up content length validation filters

---

## Part 2: External API Hosting Options

### Option A: Heroku Deployment (Recommended)

1. **Prepare Your Code**
   ```bash
   # Clone or prepare your API server code
   git clone <your-repo>
   cd ppt-agent
   ```

2. **Create Heroku App**
   ```bash
   # Install Heroku CLI first
   heroku create your-ppt-api-app
   heroku config:set NODE_ENV=production
   heroku config:set STORAGE_TYPE=salesforce
   ```

3. **Configure Salesforce Integration**
   ```bash
   # Set Salesforce credentials in Heroku
   heroku config:set SALESFORCE_CLIENT_ID="your_connected_app_client_id"
   heroku config:set SALESFORCE_CLIENT_SECRET="your_connected_app_client_secret"
   heroku config:set SALESFORCE_LOGIN_URL="https://login.salesforce.com"
   heroku config:set SALESFORCE_API_VERSION="v58.0"
   ```

4. **Deploy to Heroku**
   ```bash
   git push heroku main
   heroku logs --tail
   ```

5. **Update Salesforce Remote Site Settings**
   - Add your Heroku app URL: `https://your-ppt-api-app.herokuapp.com`

### Option B: Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure for Vercel**
   Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "api-server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/api-server.js"
       }
     ],
     "env": {
       "STORAGE_TYPE": "salesforce",
       "SALESFORCE_CLIENT_ID": "@salesforce_client_id",
       "SALESFORCE_CLIENT_SECRET": "@salesforce_client_secret",
       "SALESFORCE_LOGIN_URL": "https://login.salesforce.com",
       "SALESFORCE_API_VERSION": "v58.0"
     }
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option C: AWS Lambda Deployment

1. **Package for Lambda**
   ```bash
   npm install
   zip -r ppt-generator.zip . -x "node_modules/aws-sdk/*"
   ```

2. **Create Lambda Function**
   - Runtime: Node.js 18.x
   - Handler: `api-server.handler`
   - Environment variables: Salesforce credentials

3. **Set up API Gateway**
   - Create REST API
   - Configure routes to Lambda function

---

## Part 3: Salesforce Connected App Setup

### Step 1: Create Connected App

1. Navigate to **Setup > App Manager**
2. Click **New Connected App**
3. Configure:
   - **Connected App Name**: PPT Generator API
   - **API Name**: PPT_Generator_API
   - **Contact Email**: your-email@company.com
   - **Enable OAuth Settings**: ✓
   - **Callback URL**: `https://your-api-domain.com/oauth/callback`
   - **OAuth Scopes**:
     - Access your basic information (id, profile, email, address, phone)
     - Access and manage your data (api)
     - Perform requests on your behalf at any time (refresh_token, offline_access)

### Step 2: Configure Security Settings

1. **IP Restrictions**: Set to "Relax IP restrictions"
2. **Refresh Token Policy**: "Refresh token is valid until revoked"
3. **Permitted Users**: "All users may self-authorize"

### Step 3: Get Client Credentials

1. After saving, note down:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret)
2. Use these in your external API configuration

---

## Part 4: Testing and Validation

### Step 1: Test Apex Classes

```apex
// Execute in Developer Console
PPTAgentforceGenerator.testAgentPPTGeneration();
```

### Step 2: Test API Connectivity

```apex
// Check if external API is reachable
String status = PPTAgentforceGenerator.checkAPIConnectivity();
System.debug('API Status: ' + status);
```

### Step 3: Test Agent in Salesforce

1. Go to **App Launcher > Einstein Copilot**
2. Start a conversation with your PPT agent
3. Test the complete flow:
   - Content collection
   - PPT generation
   - File download

### Step 4: Validate File Generation

Test different scenarios:
- Short content (should show validation error)
- Normal content (should generate successfully)
- Very long content (should show length error)
- Different themes and methods

---

## Part 5: Production Considerations

### Security Best Practices

1. **API Security**
   - Use HTTPS only
   - Implement rate limiting
   - Add API authentication if needed

2. **Salesforce Security**
   - Review Connected App permissions
   - Set up appropriate user profiles
   - Configure sharing settings for generated files

3. **Data Privacy**
   - Implement file retention policies
   - Add audit logging
   - Consider data encryption for sensitive content

### Performance Optimization

1. **API Performance**
   - Monitor response times
   - Implement caching where appropriate
   - Set up error monitoring (e.g., Sentry)

2. **Salesforce Performance**
   - Monitor Apex CPU limits
   - Optimize SOQL queries
   - Implement bulk processing for multiple requests

### Monitoring and Maintenance

1. **Set Up Monitoring**
   - API uptime monitoring
   - Salesforce debug logs
   - User adoption metrics

2. **Regular Maintenance**
   - Update dependencies
   - Review and clean up old files
   - Monitor storage usage

---

## Part 6: Troubleshooting Guide

### Common Issues and Solutions

1. **"Remote Site Setting Required" Error**
   - Solution: Add your API URL to Remote Site Settings

2. **"Authentication Failed" Error**
   - Solution: Verify Connected App credentials and OAuth settings

3. **"Content Too Long" Error**
   - Solution: User needs to reduce content length below 50,000 characters

4. **"API Unavailable" Error**
   - Solution: Check API hosting status, falls back to HTML generation

5. **File Access Issues**
   - Solution: Check Content Distribution settings and user permissions

### Debug Steps

1. **Enable Debug Logs**
   ```apex
   // In Developer Console, enable debug logs for your user
   // Monitor API calls and responses
   ```

2. **Check API Health**
   ```bash
   curl https://your-api-domain.com/api/health
   ```

3. **Verify Salesforce Integration**
   ```apex
   // Test Salesforce storage directly
   SalesforceStorageService storage = new SalesforceStorageService(config);
   String token = storage.authenticate();
   System.debug('Auth Token: ' + token);
   ```

---

## Part 7: Alternative Pure Salesforce Setup

If you prefer to avoid external dependencies entirely:

### Step 1: Use HTML Presentation Only

1. Deploy only `ApexPresentationGenerator.cls`
2. Configure agent to use HTML presentation generation
3. Update agent instructions to mention HTML format

### Step 2: Enhanced HTML Features

Consider adding:
- PDF export capabilities using Salesforce's rendering service
- More sophisticated HTML templates
- Integration with Salesforce branding

### Step 3: File Management

- Use Salesforce Files for storage
- Set up appropriate sharing rules
- Implement file lifecycle management

---

## Conclusion

This deployment guide provides multiple options for implementing the PPT Generator Agentforce agent. The hybrid approach (external API + Salesforce fallback) is recommended for the best user experience, while the pure Salesforce approach offers maximum security and simplicity.

Choose the deployment strategy that best fits your organization's requirements, security policies, and technical capabilities. 