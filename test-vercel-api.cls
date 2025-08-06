// Anonymous Window Test for Vercel PPT Generator API
// Copy and paste this code into Salesforce Developer Console > Debug > Open Execute Anonymous Window

System.debug('=== TESTING VERCEL PPT GENERATOR API ===');
System.debug('API URL: https://ppt-generator-nujie5v4f-swadhins-projects-efdfbd0e.vercel.app');
System.debug('Timestamp: ' + Datetime.now());

// Test 1: Health Check
System.debug('=== TEST 1: HEALTH CHECK ===');
try {
    Http http = new Http();
    HttpRequest request = new HttpRequest();
    request.setEndpoint('https://ppt-generator-nujie5v4f-swadhins-projects-efdfbd0e.vercel.app/api/health');
    request.setMethod('GET');
    request.setTimeout(10000);
    
    System.debug('Sending health check request...');
    HttpResponse response = http.send(request);
    
    System.debug('Health Check - Status Code: ' + response.getStatusCode());
    System.debug('Health Check - Response Body: ' + response.getBody());
    
    if (response.getStatusCode() == 200) {
        System.debug('✅ HEALTH CHECK SUCCESSFUL');
    } else {
        System.debug('❌ HEALTH CHECK FAILED');
    }
    
} catch (Exception e) {
    System.debug('❌ Health check error: ' + e.getMessage());
}

// Test 2: Basic PPT Generation
System.debug('=== TEST 2: BASIC PPT GENERATION ===');
PPTAgentforceGenerator_PPTX.AgentPPTRequest request1 = new PPTAgentforceGenerator_PPTX.AgentPPTRequest();
request1.content = 'Salesforce Lightning Platform Overview\n\n' +
    'Introduction to Lightning Platform\n\n' +
    'The Salesforce Lightning Platform is a powerful low-code development platform that enables organizations to build custom applications, automate business processes, and extend Salesforce functionality without extensive coding knowledge.\n\n' +
    'Key Components\n\n' +
    'Lightning App Builder: Allows users to create custom applications using a drag-and-drop interface. Users can design user interfaces, define data models, and configure business logic without writing code.\n\n' +
    'Lightning Flow Builder: Enables users to create automated business processes using a visual interface. Users can build complex workflows that handle decision logic, data manipulation, and system integrations.\n\n' +
    'Lightning Process Builder: Provides declarative automation capabilities for creating approval processes, automated field updates, and complex business logic.\n\n' +
    'Benefits\n\n' +
    'Rapid Development: The low-code approach enables faster application development and deployment. Organizations can build custom solutions in days or weeks instead of months.\n\n' +
    'User-Friendly Interface: The drag-and-drop interface makes it easy for business users to create and modify applications without technical expertise.\n\n' +
    'Scalability and Security: Lightning Platform applications inherit Salesforce\'s enterprise-grade security and scalability features.\n\n' +
    'Integration Capabilities: Lightning Platform applications can integrate with external systems and data sources through various APIs and connectors.';

request1.title = 'Salesforce Lightning Platform';
request1.theme = 'modern';
request1.method = 'topic';

List<PPTAgentforceGenerator_PPTX.AgentPPTRequest> requests1 = new List<PPTAgentforceGenerator_PPTX.AgentPPTRequest>{request1};

try {
    System.debug('Calling generatePresentationForAgent...');
    List<PPTAgentforceGenerator_PPTX.AgentPPTResult> results1 = PPTAgentforceGenerator_PPTX.generatePresentationForAgent(requests1);
    
    for (PPTAgentforceGenerator_PPTX.AgentPPTResult result : results1) {
        System.debug('Basic Test - Success: ' + result.success);
        System.debug('Basic Test - Message: ' + result.message);
        System.debug('Basic Test - Download Link: ' + result.downloadLink);
        System.debug('Basic Test - File ID: ' + result.fileId);
        System.debug('Basic Test - Slides Count: ' + result.slidesCount);
        System.debug('Basic Test - Debug Info: ' + result.debugInfo);
        
        if (result.success) {
            System.debug('✅ BASIC PPT GENERATION SUCCESSFUL');
            System.debug('📄 Download your PPT at: ' + result.downloadLink);
        } else {
            System.debug('❌ BASIC PPT GENERATION FAILED');
        }
    }
} catch (Exception e) {
    System.debug('❌ Basic PPT generation error: ' + e.getMessage());
    System.debug('Error type: ' + e.getTypeName());
}

// Test 3: Different Theme and Method
System.debug('=== TEST 3: CREATIVE THEME TEST ===');
PPTAgentforceGenerator_PPTX.AgentPPTRequest request2 = new PPTAgentforceGenerator_PPTX.AgentPPTRequest();
request2.content = 'Artificial Intelligence in Business\n\n' +
    'AI Transformation\n\n' +
    'Artificial Intelligence is revolutionizing how businesses operate, make decisions, and interact with customers. From predictive analytics to automated customer service, AI technologies are becoming essential tools for competitive advantage.\n\n' +
    'Key AI Applications\n\n' +
    'Predictive Analytics: AI algorithms analyze historical data to predict future trends, customer behavior, and business outcomes. This enables proactive decision-making and strategic planning.\n\n' +
    'Natural Language Processing: AI systems can understand and process human language, enabling automated customer service, content analysis, and intelligent document processing.\n\n' +
    'Computer Vision: AI-powered image and video analysis enables automated quality control, facial recognition, and visual data extraction from various sources.\n\n' +
    'Machine Learning: AI systems learn from data to improve performance over time, enabling personalized recommendations, fraud detection, and process optimization.\n\n' +
    'Business Benefits\n\n' +
    'Increased Efficiency: AI automates repetitive tasks, reducing manual effort and improving operational efficiency. This allows employees to focus on higher-value activities.\n\n' +
    'Better Decision Making: AI provides data-driven insights that help businesses make more informed decisions. Predictive analytics identify opportunities and risks before they become apparent.\n\n' +
    'Enhanced Customer Experience: AI enables personalized interactions and faster response times, improving customer satisfaction and loyalty.\n\n' +
    'Cost Reduction: AI automation reduces operational costs while improving accuracy and consistency in business processes.';

request2.title = 'AI in Business Strategy';
request2.theme = 'creative';
request2.method = 'paragraph';

List<PPTAgentforceGenerator_PPTX.AgentPPTRequest> requests2 = new List<PPTAgentforceGenerator_PPTX.AgentPPTRequest>{request2};

try {
    System.debug('Calling generatePresentationForAgent with creative theme...');
    List<PPTAgentforceGenerator_PPTX.AgentPPTResult> results2 = PPTAgentforceGenerator_PPTX.generatePresentationForAgent(requests2);
    
    for (PPTAgentforceGenerator_PPTX.AgentPPTResult result : results2) {
        System.debug('Creative Test - Success: ' + result.success);
        System.debug('Creative Test - Message: ' + result.message);
        System.debug('Creative Test - Download Link: ' + result.downloadLink);
        System.debug('Creative Test - File ID: ' + result.fileId);
        System.debug('Creative Test - Slides Count: ' + result.slidesCount);
        
        if (result.success) {
            System.debug('✅ CREATIVE THEME TEST SUCCESSFUL');
            System.debug('📄 Download your PPT at: ' + result.downloadLink);
        } else {
            System.debug('❌ CREATIVE THEME TEST FAILED');
        }
    }
} catch (Exception e) {
    System.debug('❌ Creative theme test error: ' + e.getMessage());
}

// Test 4: Validation Tests
System.debug('=== TEST 4: VALIDATION TESTS ===');

// Test 4a: Empty Content
System.debug('--- Test 4a: Empty Content ---');
PPTAgentforceGenerator_PPTX.AgentPPTRequest emptyRequest = new PPTAgentforceGenerator_PPTX.AgentPPTRequest();
emptyRequest.content = '';
emptyRequest.title = 'Empty Test';

List<PPTAgentforceGenerator_PPTX.AgentPPTRequest> emptyRequests = new List<PPTAgentforceGenerator_PPTX.AgentPPTRequest>{emptyRequest};
List<PPTAgentforceGenerator_PPTX.AgentPPTResult> emptyResults = PPTAgentforceGenerator_PPTX.generatePresentationForAgent(emptyRequests);

for (PPTAgentforceGenerator_PPTX.AgentPPTResult result : emptyResults) {
    System.debug('Empty Test - Success: ' + result.success);
    System.debug('Empty Test - Message: ' + result.message);
    System.debug('Empty Test - Debug Info: ' + result.debugInfo);
}

// Test 4b: Short Content
System.debug('--- Test 4b: Short Content ---');
PPTAgentforceGenerator_PPTX.AgentPPTRequest shortRequest = new PPTAgentforceGenerator_PPTX.AgentPPTRequest();
shortRequest.content = 'Short content';
shortRequest.title = 'Short Test';

List<PPTAgentforceGenerator_PPTX.AgentPPTRequest> shortRequests = new List<PPTAgentforceGenerator_PPTX.AgentPPTRequest>{shortRequest};
List<PPTAgentforceGenerator_PPTX.AgentPPTResult> shortResults = PPTAgentforceGenerator_PPTX.generatePresentationForAgent(shortRequests);

for (PPTAgentforceGenerator_PPTX.AgentPPTResult result : shortResults) {
    System.debug('Short Test - Success: ' + result.success);
    System.debug('Short Test - Message: ' + result.message);
    System.debug('Short Test - Debug Info: ' + result.debugInfo);
}

// Test 5: Direct API Call Test
System.debug('=== TEST 5: DIRECT API CALL TEST ===');
try {
    Http http = new Http();
    HttpRequest request = new HttpRequest();
    request.setEndpoint('https://ppt-generator-nujie5v4f-swadhins-projects-efdfbd0e.vercel.app/api/generate');
    request.setMethod('POST');
    request.setHeader('Content-Type', 'application/json');
    request.setTimeout(30000);
    
    // Test payload
    Map<String, Object> testPayload = new Map<String, Object>{
        'content' => 'This is a test content for direct API validation. It contains enough characters to pass the minimum length requirement and should generate a valid PowerPoint presentation.',
        'title' => 'Direct API Test',
        'theme' => 'modern',
        'method' => 'topic'
    };
    
    String jsonPayload = JSON.serialize(testPayload);
    request.setBody(jsonPayload);
    
    System.debug('Sending direct API call...');
    HttpResponse response = http.send(request);
    
    System.debug('Direct API Test - Status Code: ' + response.getStatusCode());
    System.debug('Direct API Test - Response Body: ' + response.getBody());
    
    if (response.getStatusCode() == 200) {
        System.debug('✅ DIRECT API CALL SUCCESSFUL');
    } else {
        System.debug('❌ DIRECT API CALL FAILED');
    }
    
} catch (Exception e) {
    System.debug('❌ Direct API call error: ' + e.getMessage());
}

System.debug('=== ALL TESTS COMPLETED ===');
System.debug('Final timestamp: ' + Datetime.now()); 