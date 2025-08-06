// Salesforce Storage Service for PPT Generator API
const axios = require('axios');

class SalesforceStorageService {
    constructor() {
        this.accessToken = null;
        this.instanceUrl = null;
        this.clientId = process.env.SALESFORCE_CLIENT_ID;
        this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
        this.username = process.env.SALESFORCE_USERNAME;
        this.password = process.env.SALESFORCE_PASSWORD;
        this.securityToken = process.env.SALESFORCE_SECURITY_TOKEN;
        this.loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
    }

    async authenticate() {
        try {
            console.log('🔐 Authenticating with Salesforce...');
            
            const authData = new URLSearchParams({
                grant_type: 'password',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                username: this.username,
                password: this.password + this.securityToken
            });

            const response = await axios.post(`${this.loginUrl}/services/oauth2/token`, authData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            this.instanceUrl = response.data.instance_url;
            
            console.log('✅ Salesforce authentication successful');
            return true;
        } catch (error) {
            console.error('❌ Salesforce authentication failed:', error.response?.data || error.message);
            throw new Error('Salesforce authentication failed: ' + (error.response?.data?.error_description || error.message));
        }
    }

    async uploadFile(fileBuffer, fileName, title) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            console.log(`📤 Uploading file to Salesforce: ${fileName}`);

            // Create ContentVersion record
            const contentVersionData = {
                Title: title || fileName,
                PathOnClient: fileName,
                VersionData: fileBuffer.toString('base64'),
                ContentLocation: 'S',
                IsMajorVersion: true
            };

            const response = await axios.post(
                `${this.instanceUrl}/services/data/v58.0/sobjects/ContentVersion`,
                contentVersionData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const contentVersionId = response.data.id;
            console.log(`✅ File uploaded to Salesforce. ContentVersion ID: ${contentVersionId}`);

            // Get ContentDocument ID
            const contentDocResponse = await axios.get(
                `${this.instanceUrl}/services/data/v58.0/sobjects/ContentVersion/${contentVersionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const contentDocumentId = contentDocResponse.data.ContentDocumentId;

            // Create ContentDistribution for public sharing
            const distributionData = {
                ContentDocumentId: contentDocumentId,
                Name: title || fileName,
                PreferencesAllowOriginalDownload: true,
                PreferencesAllowPDFDownload: false,
                PreferencesAllowViewInBrowser: true,
                PreferencesExpires: false,
                PreferencesLinkLatestVersion: true,
                PreferencesNotifyOnVisit: false,
                PreferencesPasswordRequired: false,
                PreferencesRedirectURL: null,
                PreferencesSendPDFViaEmail: false
            };

            const distributionResponse = await axios.post(
                `${this.instanceUrl}/services/data/v58.0/sobjects/ContentDistribution`,
                distributionData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const distributionId = distributionResponse.data.id;

            // Get the public download URL
            const publicUrlResponse = await axios.get(
                `${this.instanceUrl}/services/data/v58.0/sobjects/ContentDistribution/${distributionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const downloadUrl = publicUrlResponse.data.DistributionPublicUrl;

            console.log(`✅ Public download URL created: ${downloadUrl}`);

            return {
                fileId: contentVersionId,
                downloadUrl: downloadUrl,
                fileName: fileName,
                fileSize: fileBuffer.length,
                contentDocumentId: contentDocumentId,
                distributionId: distributionId
            };

        } catch (error) {
            console.error('❌ Salesforce upload failed:', error.response?.data || error.message);
            throw new Error('Salesforce upload failed: ' + (error.response?.data?.message || error.message));
        }
    }

    async getFileInfo(fileId) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            const response = await axios.get(
                `${this.instanceUrl}/services/data/v58.0/sobjects/ContentVersion/${fileId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return {
                fileId: response.data.Id,
                title: response.data.Title,
                fileName: response.data.PathOnClient,
                fileSize: response.data.ContentSize,
                createdDate: response.data.CreatedDate,
                fileType: 'POWER_POINT_X'
            };

        } catch (error) {
            console.error('❌ Salesforce get file info failed:', error.response?.data || error.message);
            throw new Error('Salesforce get file info failed: ' + (error.response?.data?.message || error.message));
        }
    }

    async listFiles(limit = 10) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            const query = `
                SELECT Id, Title, PathOnClient, ContentSize, CreatedDate, ContentDocumentId 
                FROM ContentVersion 
                WHERE PathOnClient LIKE '%.pptx' 
                ORDER BY CreatedDate DESC 
                LIMIT ${limit}
            `;

            const response = await axios.get(
                `${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return response.data.records.map(record => ({
                fileId: record.Id,
                title: record.Title,
                fileName: record.PathOnClient,
                fileSize: record.ContentSize,
                createdDate: record.CreatedDate,
                fileType: 'POWER_POINT_X'
            }));

        } catch (error) {
            console.error('❌ Salesforce list files failed:', error.response?.data || error.message);
            throw new Error('Salesforce list files failed: ' + (error.response?.data?.message || error.message));
        }
    }

    async deleteFile(fileId) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            // First get the ContentDocumentId
            const fileInfo = await this.getFileInfo(fileId);
            
            // Delete the ContentDocument (this will delete all versions)
            await axios.delete(
                `${this.instanceUrl}/services/data/v58.0/sobjects/ContentDocument/${fileInfo.contentDocumentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log(`✅ File deleted from Salesforce: ${fileId}`);
            return true;

        } catch (error) {
            console.error('❌ Salesforce delete file failed:', error.response?.data || error.message);
            throw new Error('Salesforce delete file failed: ' + (error.response?.data?.message || error.message));
        }
    }
}

module.exports = SalesforceStorageService; 