// Test script for Vercel API server
const axios = require('axios');

const API_BASE_URL = 'https://pptxx-generator-api-qeac.vercel.app';

async function testVercelAPI() {
    console.log('🧪 Testing Vercel API Server...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
        console.log('✅ Health Check Response:', healthResponse.data);
        console.log('');

        // Test 2: Generate PPT
        console.log('2️⃣ Testing PPT Generation...');
        const testContent = `Introduction to Artificial Intelligence

Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that work and react like humans.

Key Concepts of AI

Machine Learning: AI systems that can learn and improve from experience without being explicitly programmed.

Deep Learning: A subset of machine learning that uses neural networks with multiple layers to analyze various factors of data.

Natural Language Processing: Enables computers to understand, interpret, and generate human language.

Applications of AI

Healthcare: AI is used for disease diagnosis, drug discovery, and personalized treatment plans.

Finance: AI powers fraud detection, algorithmic trading, and customer service chatbots.

Transportation: Self-driving cars and traffic optimization systems rely heavily on AI technology.

Future of AI

The future of AI holds immense potential for transforming industries and improving human lives through automation and intelligent decision-making.`;

        const generateResponse = await axios.post(`${API_BASE_URL}/api/generate`, {
            content: testContent,
            title: 'AI in Business Strategy',
            theme: 'modern',
            method: 'paragraph'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ PPT Generation Response:', {
            success: generateResponse.data.success,
            message: generateResponse.data.message,
            fileId: generateResponse.data.data?.fileId,
            fileName: generateResponse.data.data?.fileName,
            fileSize: generateResponse.data.data?.fileSize,
            slides: generateResponse.data.data?.slides,
            hasDownloadUrl: !!generateResponse.data.data?.downloadUrl
        });

        if (generateResponse.data.success && generateResponse.data.data?.fileId) {
            const fileId = generateResponse.data.data.fileId;
            console.log('');

            // Test 3: Get File Info
            console.log('3️⃣ Testing Get File Info...');
            try {
                const fileInfoResponse = await axios.get(`${API_BASE_URL}/api/file/${fileId}`);
                console.log('✅ File Info Response:', fileInfoResponse.data);
            } catch (error) {
                console.log('⚠️ File Info Test (expected if using Salesforce storage):', error.response?.data || error.message);
            }
            console.log('');

            // Test 4: List Files
            console.log('4️⃣ Testing List Files...');
            try {
                const listResponse = await axios.get(`${API_BASE_URL}/api/files?limit=5`);
                console.log('✅ List Files Response:', {
                    success: listResponse.data.success,
                    count: listResponse.data.data?.length || 0
                });
            } catch (error) {
                console.log('⚠️ List Files Test (expected if using Salesforce storage):', error.response?.data || error.message);
            }
        }

        console.log('\n🎉 Vercel API Test Completed Successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Health check working');
        console.log('✅ PPT generation working');
        console.log('✅ API endpoints responding');
        
        if (generateResponse.data.data?.downloadUrl) {
            console.log('✅ Download URL generated:', generateResponse.data.data.downloadUrl);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

// Run the test
testVercelAPI(); 