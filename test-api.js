const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:3001';

// Simple HTTP request helper
function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing PPT Generator API...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await makeRequest(`${API_BASE_URL}/api/health`);
        
        if (healthResponse.status === 200) {
            console.log('   ✅ Health check passed');
            console.log(`   📊 Storage: ${healthResponse.data.storage}`);
            console.log(`   🕐 Timestamp: ${healthResponse.data.timestamp}`);
        } else {
            console.log('   ❌ Health check failed');
            console.log(`   Status: ${healthResponse.status}`);
        }

        console.log('');

        // Test 2: Generate PPT
        console.log('2️⃣ Testing PPT Generation...');
        
        const testContent = `
Welcome to swAdhIn Technology Overview

Artificial Intelligence is revolutionizing the business world. Machine learning algorithms enable companies to make data-driven decisions with unprecedented accuracy.

Key Benefits of AI:
• Automated decision making
• Predictive analytics capabilities  
• Enhanced customer experiences
• Operational efficiency improvements

Natural Language Processing allows computers to understand and respond to human language. This technology powers chatbots, virtual assistants, and automated customer support systems.

Computer Vision enables machines to interpret and understand visual information. Applications include medical image analysis, autonomous vehicles, and quality control in manufacturing.

Deep Learning networks can identify complex patterns in large datasets. These systems continue to improve their performance as they process more information over time.

The future of AI holds immense potential for transforming industries and creating new opportunities for innovation and growth.
        `.trim();

        const generateRequest = {
            content: testContent,
            title: "AI Technology Overview",
            theme: "modern",
            method: "paragraph"
        };

        const generateResponse = await makeRequest(
            `${API_BASE_URL}/api/generate`, 
            'POST', 
            generateRequest
        );

        if (generateResponse.status === 200 && generateResponse.data.success) {
            console.log('   ✅ PPT generated successfully!');
            console.log(`   📁 File ID: ${generateResponse.data.data.fileId}`);
            console.log(`   📄 Filename: ${generateResponse.data.data.filename}`);
            console.log(`   📊 Slides: ${generateResponse.data.data.slides}`);
            console.log(`   📝 Words: ${generateResponse.data.data.words}`);
            console.log(`   🔗 Download URL: ${generateResponse.data.data.downloadUrl}`);
            
            // Test 3: Get File Info
            console.log('\n3️⃣ Testing File Info Retrieval...');
            const fileInfoResponse = await makeRequest(
                `${API_BASE_URL}/api/file/${generateResponse.data.data.fileId}`
            );
            
            if (fileInfoResponse.status === 200) {
                console.log('   ✅ File info retrieved successfully');
                console.log(`   📄 Title: ${fileInfoResponse.data.data.title || fileInfoResponse.data.data.filename}`);
                console.log(`   📦 Size: ${fileInfoResponse.data.data.size || 'N/A'} bytes`);
            } else {
                console.log('   ❌ File info retrieval failed');
                console.log(`   Status: ${fileInfoResponse.status}`);
            }

        } else {
            console.log('   ❌ PPT generation failed');
            console.log(`   Status: ${generateResponse.status}`);
            console.log(`   Error: ${generateResponse.data.error || generateResponse.data.message}`);
        }

        console.log('');

        // Test 4: List Files (if Salesforce storage)
        console.log('4️⃣ Testing File List...');
        const listResponse = await makeRequest(`${API_BASE_URL}/api/files`);
        
        if (listResponse.status === 200) {
            console.log('   ✅ File list retrieved');
            console.log(`   📋 Files found: ${listResponse.data.data?.length || 0}`);
        } else {
            console.log('   ℹ️  File listing not available (expected for non-Salesforce storage)');
        }

    } catch (error) {
        console.log('❌ Test failed with error:');
        console.log(`   ${error.message}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the API server is running:');
            console.log('   node api-server.js');
            console.log('   or');
            console.log('   start-api.bat');
        }
    }

    console.log('\n🏁 Test completed!');
}

// Run the tests
runTests(); 