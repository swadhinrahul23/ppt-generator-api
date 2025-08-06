/**
 * Salesforce Storage Service for PPT Generator API
 * Handles file uploads, downloads, and sharing via Salesforce Files
 */

const axios = require('axios');

class SalesforceStorageService {
    constructor(config) {
        this.config = config;
        this.accessToken = null;
        this.instanceUrl = null;
    }

    /**
     * Authenticate with Salesforce using OAuth 2.0 Client Credentials flow
     */
    async authenticate() {
        try {
            const authUrl = `${this.config.loginUrl}/services/oauth2/token`;
            const params = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            });

            const response = await axios.post(authUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            });

            this.accessToken = response.data.access_token;
            this.instanceUrl = response.data.instance_url;

            console.log('✅ Salesforce authentication successful');
            return true;
        } catch (error) {
            console.error('❌ Salesforce authentication failed:', error.message);
            throw new Error('Salesforce authentication failed: ' + error.message);
        }
    }

    /**
     * Upload file to Salesforce Files
     */
    async uploadFile(filePath, filename) {
        try {
            // Ensure we're authenticated
            if (!this.accessToken) {
                await this.authenticate();
            }

            // Read file content
            const fs = require('fs');
            const fileContent = fs.readFileSync(filePath);
            const base64Content = fileContent.toString('base64');

            // Create ContentVersion record
            const contentVersionData = {
                Title: filename,
                PathOnClient: filename,
                VersionData: base64Content,
                ContentLocation: 'S' // Stored in Salesforce
            };

            const response = await axios.post(
                `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentVersion`,
                contentVersionData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const contentVersionId = response.data.id;

            // Get the ContentDocument ID
            const cvResponse = await axios.get(
                `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentVersion/${contentVersionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const contentDocumentId = cvResponse.data.ContentDocumentId;

            // Create ContentDistribution for public sharing
            const distributionData = {
                ContentVersionId: contentVersionId,
                Name: filename,
                PreferencesAllowOriginalDownload: true,
                PreferencesAllowPDFDownload: true,
                PreferencesAllowViewInBrowser: true
            };

            const distResponse = await axios.post(
                `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentDistribution`,
                distributionData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const distributionId = distResponse.data.id;

            // Get the public URL
            const publicUrlResponse = await axios.get(
                `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentDistribution/${distributionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const publicUrl = publicUrlResponse.data.DistributionPublicUrl;

            return {
                success: true,
                shareableLink: publicUrl,
                fileId: contentDocumentId,
                contentVersionId: contentVersionId,
                distributionId: distributionId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            };

        } catch (error) {
            console.error('❌ Salesforce file upload failed:', error.message);
            throw new Error('Salesforce file upload failed: ' + error.message);
        }
    }

    /**
     * Get file information
     */
    async getFileInfo(fileId) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            const response = await axios.get(
                `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentDocument/${fileId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return {
                fileId: response.data.Id,
                title: response.data.Title,
                size: response.data.ContentSize,
                createdDate: response.data.CreatedDate,
                fileType: response.data.FileType
            };

        } catch (error) {
            console.error('❌ Salesforce file info retrieval failed:', error.message);
            throw new Error('Salesforce file info retrieval failed: ' + error.message);
        }
    }

    /**
     * Download file from Salesforce
     */
    async downloadFile(fileId) {
        try {
            if (!this.accessToken) {
            await this.authenticate();
            }

            // Get the latest ContentVersion
            const response = await axios.get(
                `${this.instanceUrl}/services/data/${this.config.version}/query?q=SELECT+Id,VersionData+FROM+ContentVersion+WHERE+ContentDocumentId='${fileId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`,
                {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (response.data.records.length === 0) {
                throw new Error('File not found');
            }

            const versionData = response.data.records[0].VersionData;
            const buffer = Buffer.from(versionData, 'base64');

            return {
                success: true,
                data: buffer,
                filename: response.data.records[0].Title || 'download'
            };

        } catch (error) {
            console.error('❌ Salesforce file download failed:', error.message);
            throw new Error('Salesforce file download failed: ' + error.message);
        }
    }

    /**
     * List recent files
     */
    async listRecentFiles(limit = 10) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            const response = await axios.get(
                `${this.instanceUrl}/services/data/${this.config.version}/query?q=SELECT+Id,Title,ContentSize,CreatedDate,FileType+FROM+ContentDocument+ORDER+BY+CreatedDate+DESC+LIMIT+${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return response.data.records.map(record => ({
                fileId: record.Id,
                title: record.Title,
                size: record.ContentSize,
                createdDate: record.CreatedDate,
                fileType: record.FileType
            }));

        } catch (error) {
            console.error('❌ Salesforce file listing failed:', error.message);
            throw new Error('Salesforce file listing failed: ' + error.message);
        }
    }

    /**
     * Delete file from Salesforce
     */
    async deleteFile(fileId) {
        try {
            if (!this.accessToken) {
                await this.authenticate();
            }

            await axios.delete(
                `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentDocument/${fileId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return {
                success: true,
                message: 'File deleted successfully'
            };

        } catch (error) {
            console.error('❌ Salesforce file deletion failed:', error.message);
            throw new Error('Salesforce file deletion failed: ' + error.message);
        }
    }
}

module.exports = SalesforceStorageService; 