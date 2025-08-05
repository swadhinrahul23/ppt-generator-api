/**
 * PPTAgentforceGeneratorTest - Test class for PPT Generation Agent
 * 
 * Comprehensive test coverage for the Agentforce PPT generator including:
 * - Input validation scenarios
 * - External API integration testing
 * - Fallback mechanism testing
 * - Error handling validation
 * 
 * @author AI Assistant
 * @version 1.0
 */
@isTest
public class PPTAgentforceGeneratorTest {
    
    /**
     * Test successful PPT generation with valid input
     */
    @isTest
    static void testSuccessfulPPTGeneration() {
        // Create valid request
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = 'This is a comprehensive test content for PowerPoint generation. ' +
                         'It contains multiple sentences to ensure we meet the minimum content requirements. ' +
                         'The content should be long enough to pass validation but not too long to cause issues. ' +
                         'This presentation will cover various business topics and provide valuable insights.';
        request.title = 'Test Presentation';
        request.theme = 'modern';
        request.method = 'paragraph';
        
        Test.startTest();
        
        // Mock HTTP response for external API
        Test.setMock(HttpCalloutMock.class, new MockPPTAPIResponse(200, true));
        
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        
        Test.stopTest();
        
        // Assertions
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Should return one result');
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(true, result.success, 'Generation should be successful');
        System.assertNotEquals(null, result.downloadLink, 'Download link should be provided');
        System.assert(result.message.contains('successfully'), 'Success message should be present');
    }
    
    /**
     * Test content validation - empty content
     */
    @isTest
    static void testEmptyContentValidation() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = '';
        request.title = 'Test Presentation';
        
        Test.startTest();
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(false, result.success, 'Should fail validation');
        System.assert(result.message.contains('required'), 'Should mention content is required');
        System.assertEquals(null, result.downloadLink, 'No download link should be provided');
    }
    
    /**
     * Test content validation - content too short
     */
    @isTest
    static void testShortContentValidation() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = 'Too short'; // Less than 50 characters
        request.title = 'Test Presentation';
        
        Test.startTest();
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(false, result.success, 'Should fail validation');
        System.assert(result.message.contains('too short'), 'Should mention content is too short');
    }
    
    /**
     * Test content validation - content too long
     */
    @isTest
    static void testLongContentValidation() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        
        // Generate content longer than 50,000 characters
        String longContent = '';
        for (Integer i = 0; i < 5001; i++) {
            longContent += 'This is a very long content string. ';
        }
        request.content = longContent;
        request.title = 'Test Presentation';
        
        Test.startTest();
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(false, result.success, 'Should fail validation');
        System.assert(result.message.contains('too long'), 'Should mention content is too long');
    }
    
    /**
     * Test invalid theme validation
     */
    @isTest
    static void testInvalidThemeValidation() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = 'This is valid content with enough characters to pass the minimum length requirement for testing purposes.';
        request.title = 'Test Presentation';
        request.theme = 'invalid_theme';
        
        Test.startTest();
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(false, result.success, 'Should fail validation');
        System.assert(result.message.contains('Invalid theme'), 'Should mention invalid theme');
    }
    
    /**
     * Test invalid method validation
     */
    @isTest
    static void testInvalidMethodValidation() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = 'This is valid content with enough characters to pass the minimum length requirement for testing purposes.';
        request.title = 'Test Presentation';
        request.method = 'invalid_method';
        
        Test.startTest();
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(false, result.success, 'Should fail validation');
        System.assert(result.message.contains('Invalid method'), 'Should mention invalid method');
    }
    
    /**
     * Test external API failure and HTML fallback
     */
    @isTest
    static void testAPIFailureWithHTMLFallback() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = 'This is test content for fallback scenario. ' +
                         'When the external API fails, the system should automatically fallback to HTML generation. ' +
                         'This ensures users always get a presentation even if the primary service is unavailable.';
        request.title = 'Fallback Test Presentation';
        request.theme = 'blue';
        
        Test.startTest();
        
        // Mock HTTP response for API failure
        Test.setMock(HttpCalloutMock.class, new MockPPTAPIResponse(500, false));
        
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        // Should succeed with HTML fallback
        System.assertEquals(true, result.success, 'Should succeed with HTML fallback');
        System.assert(result.message.contains('HTML presentation'), 'Should mention HTML fallback');
        System.assertNotEquals(null, result.downloadLink, 'Should provide HTML presentation link');
    }
    
    /**
     * Test default values when optional parameters are not provided
     */
    @isTest
    static void testDefaultValues() {
        PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
        request.content = 'This is test content to verify that default values are properly applied when optional parameters are not provided by the user.';
        // title, theme, and method are not set - should use defaults
        
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockPPTAPIResponse(200, true));
        
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(new List<PPTAgentforceGenerator.AgentPPTRequest>{request});
        Test.stopTest();
        
        PPTAgentforceGenerator.AgentPPTResult result = results[0];
        System.assertEquals(true, result.success, 'Should succeed with default values');
        System.assert(result.fileDetails.contains('modern'), 'Should use default modern theme');
        System.assert(result.fileDetails.contains('paragraph'), 'Should use default paragraph method');
    }
    
    /**
     * Test multiple requests processing
     */
    @isTest
    static void testMultipleRequests() {
        List<PPTAgentforceGenerator.AgentPPTRequest> requests = new List<PPTAgentforceGenerator.AgentPPTRequest>();
        
        // Create multiple requests
        for (Integer i = 1; i <= 3; i++) {
            PPTAgentforceGenerator.AgentPPTRequest request = new PPTAgentforceGenerator.AgentPPTRequest();
            request.content = 'This is test content for presentation number ' + i + '. ' +
                             'Each presentation should be processed independently and return appropriate results.';
            request.title = 'Test Presentation ' + i;
            request.theme = 'modern';
            requests.add(request);
        }
        
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockPPTAPIResponse(200, true));
        
        List<PPTAgentforceGenerator.AgentPPTResult> results = 
            PPTAgentforceGenerator.generatePresentationForAgent(requests);
        Test.stopTest();
        
        System.assertEquals(3, results.size(), 'Should process all three requests');
        
        for (PPTAgentforceGenerator.AgentPPTResult result : results) {
            System.assertEquals(true, result.success, 'All requests should succeed');
            System.assertNotEquals(null, result.downloadLink, 'All should have download links');
        }
    }
    
    /**
     * Test API connectivity check
     */
    @isTest
    static void testAPIConnectivityCheck() {
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockPPTAPIHealthResponse(200));
        
        String status = PPTAgentforceGenerator.checkAPIConnectivity();
        
        Test.stopTest();
        
        System.assert(status.contains('healthy'), 'Should indicate API is healthy');
    }
    
    /**
     * Test API connectivity failure
     */
    @isTest
    static void testAPIConnectivityFailure() {
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockPPTAPIHealthResponse(500));
        
        String status = PPTAgentforceGenerator.checkAPIConnectivity();
        
        Test.stopTest();
        
        System.assert(status.contains('status: 500'), 'Should indicate API error status');
    }
    
    /**
     * Mock class for PPT API responses
     */
    public class MockPPTAPIResponse implements HttpCalloutMock {
        private Integer statusCode;
        private Boolean success;
        
        public MockPPTAPIResponse(Integer statusCode, Boolean success) {
            this.statusCode = statusCode;
            this.success = success;
        }
        
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(this.statusCode);
            
            if (this.success && this.statusCode == 200) {
                // Mock successful API response
                Map<String, Object> responseData = new Map<String, Object>{
                    'success' => true,
                    'message' => 'Presentation generated successfully',
                    'data' => new Map<String, Object>{
                        'downloadUrl' => 'https://mock-api.com/download/test-file.pptx',
                        'fileId' => 'mock-file-id-123',
                        'filename' => 'Test_Presentation.pptx',
                        'slides' => 5,
                        'words' => 150,
                        'categories' => 3,
                        'method' => 'paragraph'
                    }
                };
                res.setBody(JSON.serialize(responseData));
            } else {
                // Mock API error response
                Map<String, Object> errorData = new Map<String, Object>{
                    'success' => false,
                    'error' => 'API service unavailable',
                    'code' => 'SERVICE_ERROR'
                };
                res.setBody(JSON.serialize(errorData));
            }
            
            res.setHeader('Content-Type', 'application/json');
            return res;
        }
    }
    
    /**
     * Mock class for API health check responses
     */
    public class MockPPTAPIHealthResponse implements HttpCalloutMock {
        private Integer statusCode;
        
        public MockPPTAPIHealthResponse(Integer statusCode) {
            this.statusCode = statusCode;
        }
        
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(this.statusCode);
            
            if (this.statusCode == 200) {
                Map<String, Object> healthData = new Map<String, Object>{
                    'status' => 'OK',
                    'service' => 'PPT Generator API',
                    'version' => '1.0.0'
                };
                res.setBody(JSON.serialize(healthData));
            } else {
                res.setBody('Service unavailable');
            }
            
            res.setHeader('Content-Type', 'application/json');
            return res;
        }
    }
} 