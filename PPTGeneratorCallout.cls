/**
 * PPTGeneratorCallout - Simple Apex class for Agent Actions
 * 
 * This class provides a single invocable method that takes content as input
 * and returns a shareable download link for the generated PowerPoint file.
 * 
 * Usage in Agent Actions:
 *   Input: Content (String)
 *   Output: Download Link (String)
 * 
 * @author Your Name
 * @version 2.0 - Simplified for Agent Actions
 */
public class PPTGeneratorCallout {
    
    // API Configuration - Update this to match your server URL
    private static final String API_BASE_URL = 'http://localhost:3001'; // Change to your server URL
    private static final Integer TIMEOUT = 60000; // 60 seconds
    
    /**
     * Input wrapper class for Agent Actions
     */
    public class PPTAgentRequest {
        @InvocableVariable(label='Content' description='The text content for the presentation' required=true)
        public String content;
    }
    
    /**
     * Output wrapper class for Agent Actions
     */
    public class PPTAgentResult {
        @InvocableVariable(label='Download Link' description='Shareable link to download the generated PPT file')
        public String downloadLink;
    }
    
    /**
     * Single consolidated invocable method for Agent Actions
     * Takes content as input and returns download link as output
     * 
     * @param requests List of content requests
     * @return List of download links
     */
    @InvocableMethod(label='Generate PowerPoint from Content' description='Generate a PowerPoint presentation from text content and return download link' category='Content Generation')
    public static List<PPTAgentResult> generatePPTFromContent(List<PPTAgentRequest> requests) {
        List<PPTAgentResult> results = new List<PPTAgentResult>();
        
        for (PPTAgentRequest request : requests) {
            PPTAgentResult result = new PPTAgentResult();
            
            try {
                // Validate input
                if (String.isBlank(request.content)) {
                    result.downloadLink = 'Error: Content cannot be empty';
                    results.add(result);
                    continue;
                }
                
                // Create request payload
                Map<String, Object> requestPayload = new Map<String, Object>{
                    'content' => request.content,
                    'title' => 'Generated Presentation',
                    'theme' => 'modern',
                    'method' => 'paragraph'
                };
                String jsonPayload = JSON.serialize(requestPayload);
                
                // Make HTTP callout to PPT Generator API
                Http http = new Http();
                HttpRequest httpRequest = new HttpRequest();
                httpRequest.setEndpoint(API_BASE_URL + '/api/generate');
                httpRequest.setMethod('POST');
                httpRequest.setHeader('Content-Type', 'application/json');
                httpRequest.setBody(jsonPayload);
                httpRequest.setTimeout(TIMEOUT);
                
                System.debug('Making PPT generation request to: ' + httpRequest.getEndpoint());
                System.debug('Request payload: ' + jsonPayload);
                
                HttpResponse httpResponse = http.send(httpRequest);
                
                System.debug('Response Status: ' + httpResponse.getStatusCode());
                System.debug('Response Body: ' + httpResponse.getBody());
                
                // Process response
                if (httpResponse.getStatusCode() == 200) {
                    Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(httpResponse.getBody());
                    
                    if ((Boolean) responseMap.get('success')) {
                        Map<String, Object> data = (Map<String, Object>) responseMap.get('data');
                        String downloadUrl = (String) data.get('downloadUrl');
                        
                        if (String.isNotBlank(downloadUrl)) {
                            result.downloadLink = downloadUrl;
                        } else {
                            result.downloadLink = 'Error: No download URL received';
                        }
                    } else {
                        String errorMessage = (String) responseMap.get('message');
                        result.downloadLink = 'Error: ' + (errorMessage != null ? errorMessage : 'Unknown error occurred');
                    }
                } else {
                    // Handle HTTP errors
                    String errorMessage = 'API request failed with status: ' + httpResponse.getStatusCode();
                    
                    // Try to parse error response
                    try {
                        Map<String, Object> errorMap = (Map<String, Object>) JSON.deserializeUntyped(httpResponse.getBody());
                        if (errorMap.containsKey('error')) {
                            errorMessage = (String) errorMap.get('error');
                        }
                    } catch (Exception e) {
                        System.debug('Could not parse error response: ' + e.getMessage());
                    }
                    
                    result.downloadLink = 'Error: ' + errorMessage;
                }
                
            } catch (System.CalloutException e) {
                result.downloadLink = 'Error: Unable to connect to PPT service. Please check if the API server is running.';
                System.debug('Callout Exception: ' + e.getMessage());
            } catch (Exception e) {
                result.downloadLink = 'Error: ' + e.getMessage();
                System.debug('General Exception: ' + e.getMessage());
                System.debug('Stack trace: ' + e.getStackTraceString());
            }
            
            results.add(result);
        }
        
        return results;
    }
    
    /**
     * Simple test method for the invocable method
     * Run this in Anonymous Apex to test the integration
     */
    public static void testAgentAction() {
        System.debug('=== Testing Agent Action Integration ===');
        
        // Create test request
        PPTAgentRequest request = new PPTAgentRequest();
        request.content = 'Welcome to Agent Actions integration. ' +
                         'This is a test presentation generated from Salesforce Agent Action. ' +
                         'The content is automatically processed and converted to slides. ' +
                         'Each section becomes a separate slide with proper formatting.';
        
        // Create request list (as required by InvocableMethod)
        List<PPTAgentRequest> requests = new List<PPTAgentRequest>{ request };
        
        // Call the invocable method
        List<PPTAgentResult> results = generatePPTFromContent(requests);
        
        // Display results
        for (PPTAgentResult result : results) {
            System.debug('Download Link: ' + result.downloadLink);
        }
        
        System.debug('=== Test Completed ===');
    }
} 