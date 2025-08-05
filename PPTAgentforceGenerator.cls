/**
 * PPTAgentforceGenerator - Advanced PPT Generation for Agentforce Agent
 * 
 * This class provides PPT generation capabilities specifically designed for Agentforce agents.
 * It includes both external API integration and pure Salesforce fallback solutions.
 * 
 * Features:
 * - External API integration for advanced PPT generation
 * - Pure Salesforce HTML presentation fallback
 * - Comprehensive error handling and validation
 * - Agentforce-optimized input/output structure
 * - Automatic file management and sharing
 * 
 * @author AI Assistant
 * @version 1.0 - Agentforce Optimized
 */
public class PPTAgentforceGenerator {
    
    // Configuration - Update these values for your environment
    private static final String EXTERNAL_API_URL = 'https://your-ppt-api-server.herokuapp.com'; // Update this URL
    private static final String LOCAL_API_URL = 'http://localhost:3001'; // For local development
    private static final Integer API_TIMEOUT = 60000; // 60 seconds
    private static final Integer MAX_CONTENT_LENGTH = 50000;
    private static final Integer MIN_CONTENT_LENGTH = 50;
    
    /**
     * Input wrapper class for Agentforce Agent Actions
     */
    public class AgentPPTRequest {
        @InvocableVariable(label='Content' description='The text content for the presentation (50-50,000 characters)' required=true)
        public String content;
        
        @InvocableVariable(label='Title' description='Presentation title (optional, will be auto-generated if not provided)')
        public String title;
        
        @InvocableVariable(label='Theme' description='Theme: modern, classic, minimal, creative (default: modern)')
        public String theme;
        
        @InvocableVariable(label='Method' description='Content organization: paragraph, topic, length, keywords (default: paragraph)')
        public String method;
    }
    
    /**
     * Output wrapper class for Agentforce Agent Actions
     */
    public class AgentPPTResult {
        @InvocableVariable(label='Download Link' description='Direct download link for the generated PPT file')
        public String downloadLink;
        
        @InvocableVariable(label='Success' description='Whether the generation was successful')
        public Boolean success;
        
        @InvocableVariable(label='Message' description='Success or error message')
        public String message;
        
        @InvocableVariable(label='File Details' description='Additional information about the generated file')
        public String fileDetails;
    }
    
    /**
     * Main invocable method for Agentforce Agent
     * Generates PowerPoint presentations with intelligent fallback mechanisms
     */
    @InvocableMethod(
        label='Generate PowerPoint Presentation' 
        description='Generate a professional PowerPoint presentation from text content with download link' 
        category='Content Generation'
    )
    public static List<AgentPPTResult> generatePresentationForAgent(List<AgentPPTRequest> requests) {
        List<AgentPPTResult> results = new List<AgentPPTResult>();
        
        for (AgentPPTRequest request : requests) {
            AgentPPTResult result = new AgentPPTResult();
            
            try {
                // Input validation
                String validationError = validateInput(request);
                if (validationError != null) {
                    result.success = false;
                    result.message = validationError;
                    result.downloadLink = null;
                    result.fileDetails = 'Validation failed';
                    results.add(result);
                    continue;
                }
                
                // Set defaults
                String title = String.isNotBlank(request.title) ? request.title : generateTitleFromContent(request.content);
                String theme = String.isNotBlank(request.theme) ? request.theme : 'modern';
                String method = String.isNotBlank(request.method) ? request.method : 'paragraph';
                
                System.debug('🎯 Starting PPT generation for: ' + title);
                
                // Try external API first, then fallback to Salesforce solution
                AgentPPTResult apiResult = tryExternalAPIGeneration(request.content, title, theme, method);
                
                if (apiResult.success) {
                    result = apiResult;
                    System.debug('✅ External API generation successful');
                } else {
                    System.debug('⚠️ External API failed, trying Salesforce fallback: ' + apiResult.message);
                    AgentPPTResult fallbackResult = tryHTMLPresentationFallback(request.content, title, theme);
                    
                    if (fallbackResult.success) {
                        result = fallbackResult;
                        result.message = 'Generated HTML presentation (PowerPoint API unavailable)';
                        System.debug('✅ Salesforce fallback successful');
                    } else {
                        result = fallbackResult;
                        System.debug('❌ Both methods failed');
                    }
                }
                
            } catch (Exception e) {
                System.debug('❌ Unexpected error in PPT generation: ' + e.getMessage());
                result.success = false;
                result.message = 'Unexpected error occurred: ' + e.getMessage();
                result.downloadLink = null;
                result.fileDetails = 'System error - please try again';
            }
            
            results.add(result);
        }
        
        return results;
    }
    
    /**
     * Validate input parameters
     */
    private static String validateInput(AgentPPTRequest request) {
        if (String.isBlank(request.content)) {
            return 'Content is required and cannot be empty.';
        }
        
        if (request.content.length() < MIN_CONTENT_LENGTH) {
            return 'Content is too short. Please provide at least ' + MIN_CONTENT_LENGTH + ' characters.';
        }
        
        if (request.content.length() > MAX_CONTENT_LENGTH) {
            return 'Content is too long. Maximum allowed length is ' + MAX_CONTENT_LENGTH + ' characters. Current length: ' + request.content.length();
        }
        
        // Validate theme if provided
        if (String.isNotBlank(request.theme)) {
            Set<String> validThemes = new Set<String>{'modern', 'classic', 'minimal', 'creative'};
            if (!validThemes.contains(request.theme.toLowerCase())) {
                return 'Invalid theme. Valid options are: modern, classic, minimal, creative';
            }
        }
        
        // Validate method if provided
        if (String.isNotBlank(request.method)) {
            Set<String> validMethods = new Set<String>{'paragraph', 'topic', 'length', 'keywords'};
            if (!validMethods.contains(request.method.toLowerCase())) {
                return 'Invalid method. Valid options are: paragraph, topic, length, keywords';
            }
        }
        
        return null; // No validation errors
    }
    
    /**
     * Try external API generation (primary method)
     */
    private static AgentPPTResult tryExternalAPIGeneration(String content, String title, String theme, String method) {
        AgentPPTResult result = new AgentPPTResult();
        
        try {
            // Create request payload
            Map<String, Object> requestPayload = new Map<String, Object>{
                'content' => content,
                'title' => title,
                'theme' => theme,
                'method' => method
            };
            
            String jsonPayload = JSON.serialize(requestPayload);
            
            // Try production URL first, then local development URL
            String[] apiUrls = new String[]{ EXTERNAL_API_URL, LOCAL_API_URL };
            
            for (String baseUrl : apiUrls) {
                if (String.isBlank(baseUrl) || baseUrl.contains('your-ppt-api-server')) {
                    continue; // Skip unconfigured URLs
                }
                
                try {
                    Http http = new Http();
                    HttpRequest httpRequest = new HttpRequest();
                    httpRequest.setEndpoint(baseUrl + '/api/generate');
                    httpRequest.setMethod('POST');
                    httpRequest.setHeader('Content-Type', 'application/json');
                    httpRequest.setBody(jsonPayload);
                    httpRequest.setTimeout(API_TIMEOUT);
                    
                    System.debug('🌐 Trying API endpoint: ' + httpRequest.getEndpoint());
                    
                    HttpResponse httpResponse = http.send(httpRequest);
                    
                    if (httpResponse.getStatusCode() == 200) {
                        Map<String, Object> responseData = (Map<String, Object>) JSON.deserializeUntyped(httpResponse.getBody());
                        Map<String, Object> data = (Map<String, Object>) responseData.get('data');
                        
                        result.success = true;
                        result.downloadLink = (String) data.get('downloadUrl');
                        result.message = 'PowerPoint presentation generated successfully!';
                        result.fileDetails = String.format(
                            'Slides: {0}, Words: {1}, Theme: {2}, Method: {3}',
                            new String[]{
                                String.valueOf(data.get('slides')),
                                String.valueOf(data.get('words')),
                                theme,
                                method
                            }
                        );
                        
                        System.debug('✅ API call successful: ' + result.downloadLink);
                        return result;
                    } else {
                        System.debug('⚠️ API returned error code: ' + httpResponse.getStatusCode() + ' - ' + httpResponse.getBody());
                    }
                } catch (Exception apiEx) {
                    System.debug('⚠️ API call failed for ' + baseUrl + ': ' + apiEx.getMessage());
                    continue; // Try next URL
                }
            }
            
            // If we get here, all API attempts failed
            result.success = false;
            result.message = 'External PowerPoint API is currently unavailable';
            result.downloadLink = null;
            result.fileDetails = 'API connection failed';
            
        } catch (Exception e) {
            result.success = false;
            result.message = 'Error connecting to PowerPoint generation service: ' + e.getMessage();
            result.downloadLink = null;
            result.fileDetails = 'Connection error';
        }
        
        return result;
    }
    
    /**
     * Fallback to HTML presentation generation
     */
    private static AgentPPTResult tryHTMLPresentationFallback(String content, String title, String theme) {
        AgentPPTResult result = new AgentPPTResult();
        
        try {
            System.debug('🔄 Generating HTML presentation fallback');
            
            // Use the existing HTML presentation generator
            ApexPresentationGenerator.PresentationRequest htmlRequest = new ApexPresentationGenerator.PresentationRequest();
            htmlRequest.content = content;
            htmlRequest.title = title;
            htmlRequest.theme = theme;
            
            List<ApexPresentationGenerator.PresentationRequest> htmlRequests = 
                new List<ApexPresentationGenerator.PresentationRequest>{ htmlRequest };
            
            List<ApexPresentationGenerator.PresentationResult> htmlResults = 
                ApexPresentationGenerator.generateHTMLPresentation(htmlRequests);
            
            if (!htmlResults.isEmpty() && String.isNotBlank(htmlResults[0].presentationUrl) && 
                !htmlResults[0].presentationUrl.startsWith('Error:')) {
                
                result.success = true;
                result.downloadLink = htmlResults[0].presentationUrl;
                result.message = 'HTML presentation generated successfully! (PowerPoint format not available)';
                result.fileDetails = String.format(
                    'Format: HTML Slideshow, Theme: {0}, Viewable in browser, Can be printed to PDF',
                    new String[]{ theme }
                );
                
                System.debug('✅ HTML fallback successful: ' + result.downloadLink);
            } else {
                result.success = false;
                result.message = htmlResults.isEmpty() ? 'HTML generation failed' : htmlResults[0].presentationUrl;
                result.downloadLink = null;
                result.fileDetails = 'HTML generation error';
            }
            
        } catch (Exception e) {
            System.debug('❌ HTML fallback failed: ' + e.getMessage());
            result.success = false;
            result.message = 'Both PowerPoint and HTML generation failed: ' + e.getMessage();
            result.downloadLink = null;
            result.fileDetails = 'All generation methods failed';
        }
        
        return result;
    }
    
    /**
     * Generate a title from content if not provided
     */
    private static String generateTitleFromContent(String content) {
        if (String.isBlank(content)) {
            return 'Generated Presentation';
        }
        
        // Take the first sentence or first 50 characters
        String[] sentences = content.split('\\.');
        String firstSentence = sentences[0].trim();
        
        if (firstSentence.length() > 50) {
            return firstSentence.substring(0, 47) + '...';
        }
        
        return String.isNotBlank(firstSentence) ? firstSentence : 'Generated Presentation';
    }
    
    /**
     * Test method for development and validation
     */
    public static void testAgentPPTGeneration() {
        AgentPPTRequest request = new AgentPPTRequest();
        request.content = 'Welcome to our comprehensive business overview presentation. ' +
                         'Our company has achieved remarkable growth this quarter through innovative solutions and dedicated teamwork. ' +
                         'Key achievements include expanding our market presence, launching new products, and improving customer satisfaction. ' +
                         'We have successfully implemented cutting-edge technologies that streamline our operations and enhance productivity. ' +
                         'Looking forward, we plan to continue this momentum with strategic investments in research and development. ' +
                         'Our team remains committed to delivering exceptional value to our clients and stakeholders.';
        request.title = 'Q4 Business Overview';
        request.theme = 'modern';
        request.method = 'paragraph';
        
        List<AgentPPTRequest> requests = new List<AgentPPTRequest>{ request };
        List<AgentPPTResult> results = generatePresentationForAgent(requests);
        
        for (AgentPPTResult result : results) {
            System.debug('=== PPT Generation Test Results ===');
            System.debug('Success: ' + result.success);
            System.debug('Message: ' + result.message);
            System.debug('Download Link: ' + result.downloadLink);
            System.debug('File Details: ' + result.fileDetails);
            System.debug('=====================================');
        }
    }
    
    /**
     * Utility method to check API connectivity
     */
    public static String checkAPIConnectivity() {
        try {
            Http http = new Http();
            HttpRequest request = new HttpRequest();
            request.setEndpoint(EXTERNAL_API_URL + '/api/health');
            request.setMethod('GET');
            request.setTimeout(10000); // 10 seconds for health check
            
            HttpResponse response = http.send(request);
            
            if (response.getStatusCode() == 200) {
                return 'API is accessible and healthy';
            } else {
                return 'API returned status: ' + response.getStatusCode();
            }
        } catch (Exception e) {
            return 'API connectivity failed: ' + e.getMessage();
        }
    }
} 