/**
 * PPTAgentforceGenerator - PPTX Generation via External API
 * This version calls the hosted api-server.js to generate actual PPTX files
 */
public class PPTAgentforceGenerator_PPTX {
    
    // Configuration - Update this URL to your hosted API
    private static final String EXTERNAL_API_URL = 'https://pptxx-generator-api-qeac.vercel.app'; // VERCEL API SERVER
    private static final Integer API_TIMEOUT = 60000;
    private static final Integer MAX_CONTENT_LENGTH = 50000;
    private static final Integer MIN_CONTENT_LENGTH = 50;
    
    /**
     * Input wrapper class for Agentforce Agent Actions
     */
    public class AgentPPTRequest {
        @InvocableVariable(label='Content' description='The text content for the presentation' required=true)
        public String content;
        
        @InvocableVariable(label='Title' description='Presentation title (optional)')
        public String title;
        
        @InvocableVariable(label='Theme' description='Theme: modern, classic, minimal, creative')
        public String theme;
        
        @InvocableVariable(label='Method' description='Content processing method: paragraph, topic, length, keywords')
        public String method;
    }
    
    /**
     * Output wrapper class for Agentforce Agent Actions
     */
    public class AgentPPTResult {
        @InvocableVariable(label='Download URL' description='Download link for the PPTX file')
        public String downloadUrl;
        
        @InvocableVariable(label='Success' description='Whether generation was successful')
        public Boolean success;
        
        @InvocableVariable(label='Message' description='Success or error message')
        public String message;
        
        @InvocableVariable(label='File ID' description='File ID for tracking')
        public String fileId;
        
        @InvocableVariable(label='File Name' description='Generated file name')
        public String fileName;
        
        @InvocableVariable(label='File Size' description='Size of the generated file in bytes')
        public Integer fileSize;
        
        @InvocableVariable(label='Slides Count' description='Number of slides generated')
        public Integer slidesCount;
        
        @InvocableVariable(label='Debug Info' description='Additional debug information')
        public String debugInfo;
    }
    
    /**
     * Main invocable method for Agentforce Agent
     */
    @InvocableMethod(
        label='Generate PowerPoint Presentation' 
        description='Generate a professional PowerPoint presentation from text content' 
        category='Content Generation'
    )
    public static List<AgentPPTResult> generatePresentationForAgent(List<AgentPPTRequest> requests) {
        List<AgentPPTResult> results = new List<AgentPPTResult>();
        
        for (AgentPPTRequest request : requests) {
            AgentPPTResult result = new AgentPPTResult();
            
            try {
                // Input validation
                if (String.isBlank(request.content)) {
                    result.success = false;
                    result.message = 'Content is required and cannot be empty.';
                    result.downloadLink = null;
                    result.debugInfo = 'Validation failed: Empty content';
                    results.add(result);
                    continue;
                }
                
                if (request.content.length() < MIN_CONTENT_LENGTH) {
                    result.success = false;
                    result.message = 'Content is too short. Please provide at least ' + MIN_CONTENT_LENGTH + ' characters.';
                    result.downloadLink = null;
                    result.debugInfo = 'Validation failed: Content length ' + request.content.length() + ' < ' + MIN_CONTENT_LENGTH;
                    results.add(result);
                    continue;
                }
                
                if (request.content.length() > MAX_CONTENT_LENGTH) {
                    result.success = false;
                    result.message = 'Content is too long. Maximum allowed is ' + MAX_CONTENT_LENGTH + ' characters.';
                    result.downloadLink = null;
                    result.debugInfo = 'Validation failed: Content length ' + request.content.length() + ' > ' + MAX_CONTENT_LENGTH;
                    results.add(result);
                    continue;
                }
                
                // Set defaults
                String title = String.isNotBlank(request.title) ? request.title : 'Generated Presentation';
                String theme = String.isNotBlank(request.theme) ? request.theme : 'modern';
                String method = String.isNotBlank(request.method) ? request.method : 'paragraph';
                
                System.debug('Calling API with: Title=' + title + ', Theme=' + theme + ', Method=' + method);
                
                // Call external API to generate PPTX
                result = callExternalAPIGeneration(request.content, title, theme, method);
                
            } catch (Exception e) {
                result.success = false;
                result.message = 'Unexpected error: ' + e.getMessage();
                result.downloadLink = null;
                result.debugInfo = 'Exception: ' + e.getTypeName() + ' - ' + e.getStackTraceString();
            }
            
            results.add(result);
        }
        
        return results;
    }
    
    /**
     * Call external API to generate PPTX
     */
    private static AgentPPTResult callExternalAPIGeneration(String content, String title, String theme, String method) {
        AgentPPTResult result = new AgentPPTResult();
        
        try {
            System.debug('Starting API call to: ' + EXTERNAL_API_URL + '/api/generate');
            
            // Create request payload
            Map<String, Object> requestPayload = new Map<String, Object>{
                'content' => content,
                'title' => title,
                'theme' => theme,
                'method' => method
            };
            
            String jsonPayload = JSON.serialize(requestPayload);
            System.debug('Request payload length: ' + jsonPayload.length());
            
            // Make HTTP callout
            Http http = new Http();
            HttpRequest httpRequest = new HttpRequest();
            httpRequest.setEndpoint(EXTERNAL_API_URL + '/api/generate');
            httpRequest.setMethod('POST');
            httpRequest.setHeader('Content-Type', 'application/json');
            httpRequest.setHeader('Accept', 'application/json');
            httpRequest.setBody(jsonPayload);
            httpRequest.setTimeout(API_TIMEOUT);
            
            System.debug('Sending HTTP request...');
            HttpResponse httpResponse = http.send(httpRequest);
            
            System.debug('Response Status Code: ' + httpResponse.getStatusCode());
            System.debug('Response Body: ' + httpResponse.getBody());
            
            if (httpResponse.getStatusCode() == 200) {
                Map<String, Object> responseData = (Map<String, Object>) JSON.deserializeUntyped(httpResponse.getBody());
                
                if ((Boolean) responseData.get('success')) {
                    Map<String, Object> data = (Map<String, Object>) responseData.get('data');
                    
                    result.success = true;
                    result.downloadUrl = (String) data.get('downloadUrl');
                    result.fileId = (String) data.get('fileId');
                    result.fileName = (String) data.get('fileName');
                    result.fileSize = (Integer) data.get('fileSize');
                    result.slidesCount = (Integer) data.get('slides');
                    result.message = 'PowerPoint presentation generated successfully! Click the link to download.';
                    result.debugInfo = 'API call successful - File ID: ' + result.fileId + ', Size: ' + result.fileSize + ' bytes';
                } else {
                    result.success = false;
                    result.message = 'API returned error: ' + responseData.get('error');
                    result.downloadUrl = null;
                    result.debugInfo = 'API returned success=false';
                }
            } else {
                result.success = false;
                result.message = 'API request failed with status: ' + httpResponse.getStatusCode() + ' - ' + httpResponse.getStatus();
                result.downloadUrl = null;
                result.debugInfo = 'HTTP Status: ' + httpResponse.getStatusCode() + ', Body: ' + httpResponse.getBody();
            }
            
        } catch (Exception e) {
            result.success = false;
            result.message = 'API connection failed: ' + e.getMessage();
            result.downloadUrl = null;
            result.debugInfo = 'Exception: ' + e.getTypeName() + ' - ' + e.getStackTraceString();
        }
        
        return result;
    }
    
    /**
     * Test method to verify API connection
     */
    public static void testAPIConnection() {
        try {
            System.debug('Testing API connection to: ' + EXTERNAL_API_URL + '/api/health');
            
            Http http = new Http();
            HttpRequest httpRequest = new HttpRequest();
            httpRequest.setEndpoint(EXTERNAL_API_URL + '/api/health');
            httpRequest.setMethod('GET');
            httpRequest.setHeader('Accept', 'application/json');
            httpRequest.setTimeout(10000);
            
            System.debug('Sending health check request...');
            HttpResponse httpResponse = http.send(httpRequest);
            
            System.debug('Health check response status: ' + httpResponse.getStatusCode());
            System.debug('Health check response body: ' + httpResponse.getBody());
            
            if (httpResponse.getStatusCode() == 200) {
                System.debug('✅ API connection successful: ' + httpResponse.getBody());
            } else {
                System.debug('❌ API connection failed: ' + httpResponse.getStatusCode() + ' - ' + httpResponse.getStatus());
            }
        } catch (Exception e) {
            System.debug('❌ API connection error: ' + e.getMessage());
            System.debug('Error type: ' + e.getTypeName());
            System.debug('Stack trace: ' + e.getStackTraceString());
        }
    }
    
    /**
     * Test method to check remote site settings
     */
    public static void testRemoteSiteSettings() {
        try {
            System.debug('=== REMOTE SITE SETTINGS TEST ===');
            
            // Test basic HTTP callout
            Http http = new Http();
            HttpRequest request = new HttpRequest();
            request.setEndpoint('http://localhost:3001/api/health');
            request.setMethod('GET');
            request.setTimeout(5000);
            
            System.debug('Testing basic HTTP callout...');
            HttpResponse response = http.send(request);
            
            System.debug('Response Status: ' + response.getStatusCode());
            System.debug('Response Body: ' + response.getBody());
            
            if (response.getStatusCode() == 200) {
                System.debug('✅ Remote site settings are working correctly');
            } else {
                System.debug('❌ Remote site settings issue - Status: ' + response.getStatusCode());
            }
            
        } catch (Exception e) {
            System.debug('❌ Remote site settings error: ' + e.getMessage());
            System.debug('Error type: ' + e.getTypeName());
        }
    }
} 