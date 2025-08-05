# Salesforce Apex Integration Setup Guide

This guide will help you set up the PPT Generator API integration in your Salesforce org using the provided Apex class.

## 📋 Prerequisites

1. **API Server Running**: Ensure your PPT Generator API server is running and accessible
2. **Salesforce Admin Access**: You need System Administrator or equivalent permissions
3. **External Network Access**: Your Salesforce org must be able to make outbound HTTP calls

## 🔧 Setup Steps

### 1. Configure Remote Site Settings

Before your Apex class can make HTTP callouts, you need to whitelist the API server URL.

**Steps:**
1. Go to **Setup** → **Security** → **Remote Site Settings**
2. Click **New Remote Site**
3. Fill in the details:
   - **Remote Site Name**: `PPT_Generator_API`
   - **Remote Site URL**: `http://localhost:3001` (or your server URL)
   - **Description**: `PPT Generator API for creating presentations`
   - **Active**: ✅ Checked
4. Click **Save**

> **Note**: If your API server is running on a different URL/port, update the `API_BASE_URL` constant in the Apex class accordingly.

### 2. Deploy the Apex Class

**Method A: Developer Console**
1. Go to **Setup** → **Developer Console**
2. Click **File** → **New** → **Apex Class**
3. Name it `PPTGeneratorCallout`
4. Copy and paste the provided Apex code
5. Click **Save**

**Method B: VS Code with Salesforce Extensions**
1. Create a new file: `force-app/main/default/classes/PPTGeneratorCallout.cls`
2. Copy and paste the Apex code
3. Deploy using `sfdx force:source:deploy`

### 3. Update API Configuration

In the Apex class, update the `API_BASE_URL` constant to match your server:

```apex
private static final String API_BASE_URL = 'https://your-server-domain.com'; // Update this
```

### 4. Test the Integration

**Option A: Anonymous Apex**
1. Go to **Developer Console** → **Debug** → **Open Execute Anonymous Window**
2. Run this code:
```apex
PPTGeneratorCallout.testAPIIntegration();
```

**Option B: Simple Test**
```apex
String content = 'This is a test presentation. It will be converted to PowerPoint format automatically.';
PPTGeneratorCallout.PPTResponse response = PPTGeneratorCallout.generatePresentationWithTitle(content, 'Test Presentation');
System.debug('Success: ' + response.success);
System.debug('Download URL: ' + response.downloadUrl);
```

## 📖 Usage Examples

### Basic Usage
```apex
String content = 'Your presentation content here...';
PPTGeneratorCallout.PPTResponse response = PPTGeneratorCallout.generatePresentationFromContent(content);
if (response.success) {
    System.debug('PPT generated: ' + response.downloadUrl);
} else {
    System.debug('Error: ' + response.message);
}
```

### Advanced Usage with All Parameters
```apex
String content = 'Detailed presentation content...';
String title = 'My Custom Presentation';
String theme = 'modern'; // Options: modern, classic, minimal, creative
String method = 'paragraph'; // Options: paragraph, topic, length, keywords

PPTGeneratorCallout.PPTResponse response = PPTGeneratorCallout.generatePresentation(
    content, title, theme, method
);
```

### Use in Lightning Web Components
```apex
// Controller method
@AuraEnabled
public static PPTGeneratorCallout.PPTResponse createPresentation(String content, String title) {
    return PPTGeneratorCallout.generatePresentationWithTitle(content, title);
}
```

### Use in Flow/Process Builder
The methods are `@AuraEnabled`, so they can be called from Flows and Process Builder as Apex actions.

## 🔍 Response Object Properties

The `PPTResponse` class contains:

| Property | Type | Description |
|----------|------|-------------|
| `success` | Boolean | Whether the generation was successful |
| `message` | String | Success/error message |
| `downloadUrl` | String | Shareable link to download the PPT |
| `fileId` | String | Unique identifier for the file |
| `filename` | String | Generated filename |
| `slides` | Integer | Number of slides created |
| `words` | Integer | Word count of the content |
| `expiresAt` | String | Expiration date/time of the file |
| `errorCode` | String | Error code if generation failed |

## 🚨 Common Issues & Solutions

### Issue: "System.CalloutException: Unauthorized endpoint"
**Solution**: Add the API server URL to Remote Site Settings

### Issue: "System.CalloutException: Read timed out"
**Solution**: 
- Increase timeout in the Apex class
- Check if API server is responding slowly
- Reduce content size

### Issue: "API is not accessible"
**Solution**:
- Verify API server is running
- Check network connectivity
- Confirm the API_BASE_URL is correct

### Issue: "Invalid JSON response"
**Solution**:
- Check API server logs for errors
- Verify the API endpoints are working correctly
- Test with the Node.js test file first

## 🔒 Security Considerations

1. **HTTPS**: Use HTTPS endpoints in production
2. **Authentication**: Consider adding API key authentication
3. **IP Whitelisting**: Restrict API access to known Salesforce IP ranges
4. **Content Validation**: Sanitize content before sending to API
5. **Error Handling**: Don't expose internal API details in error messages

## 📊 Monitoring & Logging

### Debug Logs
The Apex class includes comprehensive logging. To view logs:
1. Go to **Setup** → **Debug Logs**
2. Create a trace flag for your user
3. Run the Apex code
4. Check the debug log for detailed information

### Key Debug Information
- API request/response details
- HTTP status codes
- JSON payload data
- Error messages and stack traces

## 🚀 Production Deployment

### Checklist
- [ ] Remote Site Settings configured
- [ ] API_BASE_URL updated to production server
- [ ] Apex class deployed and tested
- [ ] Error handling validated
- [ ] Performance tested with large content
- [ ] Security review completed
- [ ] User access permissions set

### Deployment Package
Create a deployment package including:
- `PPTGeneratorCallout.cls` - Apex class
- `PPTGeneratorCallout.cls-meta.xml` - Metadata file
- Remote Site Setting metadata (if using change sets)

## 📞 Support

If you encounter issues:
1. Check the debug logs for detailed error information
2. Test the API directly using the Node.js test file
3. Verify network connectivity between Salesforce and your API server
4. Review the API server logs for any errors

---

**Happy coding! 🎉** 