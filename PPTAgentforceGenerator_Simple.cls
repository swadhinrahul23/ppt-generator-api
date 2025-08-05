/**
 * PPTAgentforceGenerator - PPT Generation for Agentforce Agent
 * Simplified version for easy deployment
 */
public class PPTAgentforceGenerator {
    
    // Configuration - Update this URL to your hosted API
    private static final String EXTERNAL_API_URL = 'https://your-ppt-api-server.herokuapp.com';
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
    }
    
    /**
     * Output wrapper class for Agentforce Agent Actions
     */
    public class AgentPPTResult {
        @InvocableVariable(label='Download Link' description='Download link for the PPT file')
        public String downloadLink;
        
        @InvocableVariable(label='Success' description='Whether generation was successful')
        public Boolean success;
        
        @InvocableVariable(label='Message' description='Success or error message')
        public String message;
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
                    results.add(result);
                    continue;
                }
                
                if (request.content.length() < MIN_CONTENT_LENGTH) {
                    result.success = false;
                    result.message = 'Content is too short. Please provide at least ' + MIN_CONTENT_LENGTH + ' characters.';
                    result.downloadLink = null;
                    results.add(result);
                    continue;
                }
                
                if (request.content.length() > MAX_CONTENT_LENGTH) {
                    result.success = false;
                    result.message = 'Content is too long. Maximum allowed is ' + MAX_CONTENT_LENGTH + ' characters.';
                    result.downloadLink = null;
                    results.add(result);
                    continue;
                }
                
                // Set defaults
                String title = String.isNotBlank(request.title) ? request.title : 'Generated Presentation';
                String theme = String.isNotBlank(request.theme) ? request.theme : 'modern';
                
                // Try external API generation
                result = tryExternalAPIGeneration(request.content, title, theme);
                
                if (!result.success) {
                    // Fallback to HTML presentation
                    result = tryHTMLPresentationFallback(request.content, title, theme);
                }
                
            } catch (Exception e) {
                result.success = false;
                result.message = 'Unexpected error: ' + e.getMessage();
                result.downloadLink = null;
            }
            
            results.add(result);
        }
        
        return results;
    }
    
    /**
     * Try external API generation
     */
    private static AgentPPTResult tryExternalAPIGeneration(String content, String title, String theme) {
        AgentPPTResult result = new AgentPPTResult();
        
        try {
            // Create request payload
            Map<String, Object> requestPayload = new Map<String, Object>{
                'content' => content,
                'title' => title,
                'theme' => theme,
                'method' => 'paragraph'
            };
            
            String jsonPayload = JSON.serialize(requestPayload);
            
            // Make HTTP callout
            Http http = new Http();
            HttpRequest httpRequest = new HttpRequest();
            httpRequest.setEndpoint(EXTERNAL_API_URL + '/api/generate');
            httpRequest.setMethod('POST');
            httpRequest.setHeader('Content-Type', 'application/json');
            httpRequest.setBody(jsonPayload);
            httpRequest.setTimeout(API_TIMEOUT);
            
            HttpResponse httpResponse = http.send(httpRequest);
            
            if (httpResponse.getStatusCode() == 200) {
                Map<String, Object> responseData = (Map<String, Object>) JSON.deserializeUntyped(httpResponse.getBody());
                Map<String, Object> data = (Map<String, Object>) responseData.get('data');
                
                result.success = true;
                result.downloadLink = (String) data.get('downloadUrl');
                result.message = 'PowerPoint presentation generated successfully!';
                
                return result;
            } else {
                result.success = false;
                result.message = 'External API unavailable';
                result.downloadLink = null;
            }
            
        } catch (Exception e) {
            result.success = false;
            result.message = 'API connection failed: ' + e.getMessage();
            result.downloadLink = null;
        }
        
        return result;
    }
    
    /**
     * Fallback to HTML presentation generation
     */
    private static AgentPPTResult tryHTMLPresentationFallback(String content, String title, String theme) {
        AgentPPTResult result = new AgentPPTResult();
        
        try {
            // Use existing HTML presentation generator
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
            } else {
                result.success = false;
                result.message = 'Both PowerPoint and HTML generation failed';
                result.downloadLink = null;
            }
            
        } catch (Exception e) {
            result.success = false;
            result.message = 'Generation failed: ' + e.getMessage();
            result.downloadLink = null;
        }
        
        return result;
    }
} 