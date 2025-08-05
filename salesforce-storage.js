const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

class SalesforceStorageService {
    constructor(config) {
        this.config = {
            loginUrl: config.loginUrl || 'https://login.salesforce.com',
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            version: config.version || 'v58.0'
        };
        
        this.accessToken = null;
        this.instanceUrl = null;
        this.tokenExpiry = null;
    }

    // Authenticate with Salesforce using OAuth 2.0 Client Credentials flow
    async authenticate() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken; // Token still valid
        }

        // Build URL with client credentials parameters (like your working code)
        const authUrl = `${this.config.loginUrl}/services/oauth2/token?grant_type=client_credentials&client_id=${this.config.clientId}&client_secret=${this.config.clientSecret}`;
        
        const url = new URL(authUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const response = JSON.parse(data);
                        this.accessToken = response.access_token;
                        this.instanceUrl = response.instance_url;
                        this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour from now
                        
                        console.log('✅ Salesforce authentication successful');
                        console.log(`🏢 Connected to: ${this.instanceUrl}`);
                        resolve(this.accessToken);
                    } else {
                        console.error('❌ Salesforce authentication failed:', data);
                        reject(new Error(`Authentication failed: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end(); // No body data for GET request
        });
    }

    // Make authenticated request to Salesforce REST API
    async makeRequest(method, endpoint, data = null, isMultipart = false) {
        await this.authenticate();

        const url = new URL(endpoint, this.instanceUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json'
            }
        };

        if (data && !isMultipart) {
            options.headers['Content-Type'] = 'application/json';
            data = JSON.stringify(data);
        }

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        const parsed = responseData ? JSON.parse(responseData) : {};
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`Salesforce API error: ${responseData}`));
                        }
                    } catch (error) {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(responseData);
                        } else {
                            reject(new Error(`API error: ${responseData}`));
                        }
                    }
                });
            });

            req.on('error', reject);
            
            if (data && !isMultipart) {
                req.write(data);
            }
            
            req.end();
        });
    }

    // Upload file to Salesforce using ContentVersion
    async uploadFile(filePath, filename) {
        try {
            console.log(`📤 Uploading ${filename} to Salesforce...`);

            // Read file content
            const fileContent = fs.readFileSync(filePath);
            const base64Content = fileContent.toString('base64');

            // Create ContentVersion record
            const contentVersion = {
                Title: filename.replace('.pptx', ''),
                PathOnClient: filename,
                VersionData: base64Content,
                Description: `PPT file generated on ${new Date().toISOString()}`,
                Origin: 'H' // 'H' for Chatter Files
            };

            // Upload to Salesforce
            const uploadResult = await this.makeRequest(
                'POST',
                `/services/data/${this.config.version}/sobjects/ContentVersion/`,
                contentVersion
            );

            console.log('✅ File uploaded to Salesforce:', uploadResult.id);

            // Get the ContentDocument ID (needed for sharing)
            const contentVersionDetails = await this.makeRequest(
                'GET',
                `/services/data/${this.config.version}/sobjects/ContentVersion/${uploadResult.id}?fields=ContentDocumentId,Title,ContentSize,CreatedDate`
            );

            // Generate shareable link options
            const shareableLinks = await this.generateShareableLinks(
                contentVersionDetails.ContentDocumentId,
                contentVersionDetails
            );

            return {
                success: true,
                fileId: uploadResult.id,
                contentDocumentId: contentVersionDetails.ContentDocumentId,
                shareableLink: shareableLinks.directLink,
                downloadLink: shareableLinks.downloadLink,
                publicLink: shareableLinks.publicLink,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                fileInfo: {
                    title: contentVersionDetails.Title,
                    size: contentVersionDetails.ContentSize,
                    createdDate: contentVersionDetails.CreatedDate
                }
            };

        } catch (error) {
            console.error('❌ Salesforce upload error:', error);
            throw new Error(`Failed to upload to Salesforce: ${error.message}`);
        }
    }

    // Generate different types of shareable links
    async generateShareableLinks(contentDocumentId, fileDetails) {
        const baseUrl = this.instanceUrl;
        
        // Direct link to view file in Salesforce
        const directLink = `${baseUrl}/lightning/r/ContentDocument/${contentDocumentId}/view`;
        
        // Download link
        const downloadLink = `${baseUrl}/services/data/${this.config.version}/sobjects/ContentVersion/${fileDetails.Id}/VersionData`;
        
        // Try to create a public link (requires Content Distribution)
        let publicLink = null;
        try {
            const distributionResult = await this.createContentDistribution(contentDocumentId);
            publicLink = distributionResult?.DistributionPublicUrl || null;
        } catch (error) {
            console.log('ℹ️  Public link creation failed (may require Content Distribution setup):', error.message);
        }

        return {
            directLink,
            downloadLink,
            publicLink
        };
    }

    // Create Content Distribution for public sharing (optional)
    async createContentDistribution(contentDocumentId) {
        try {
            const distribution = {
                Name: `PPT_Distribution_${Date.now()}`,
                ContentVersionId: contentDocumentId,
                PreferencesAllowOriginalDownload: true,
                PreferencesAllowPDFDownload: false,
                PreferencesAllowViewInBrowser: true,
                PreferencesExpires: false,
                PreferencesNotifyOnVisit: false
            };

            return await this.makeRequest(
                'POST',
                `/services/data/${this.config.version}/sobjects/ContentDistribution/`,
                distribution
            );
        } catch (error) {
            console.log('ℹ️  Content Distribution not available or not configured');
            return null;
        }
    }

    // Get file information
    async getFileInfo(fileId) {
        try {
            const fileInfo = await this.makeRequest(
                'GET',
                `/services/data/${this.config.version}/sobjects/ContentVersion/${fileId}?fields=Id,Title,ContentSize,CreatedDate,ContentDocumentId,FileType`
            );

            const shareableLinks = await this.generateShareableLinks(
                fileInfo.ContentDocumentId,
                fileInfo
            );

            return {
                success: true,
                fileId: fileInfo.Id,
                title: fileInfo.Title,
                size: fileInfo.ContentSize,
                createdDate: fileInfo.CreatedDate,
                fileType: fileInfo.FileType,
                directLink: shareableLinks.directLink,
                downloadLink: shareableLinks.downloadLink,
                publicLink: shareableLinks.publicLink
            };
        } catch (error) {
            console.error('❌ Error getting file info:', error);
            return null;
        }
    }

    // Download file content (for local access)
    async downloadFile(fileId) {
        try {
            await this.authenticate();

            const url = `${this.instanceUrl}/services/data/${this.config.version}/sobjects/ContentVersion/${fileId}/VersionData`;
            const options = {
                hostname: new URL(url).hostname,
                path: new URL(url).pathname,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            };

            return new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    if (res.statusCode === 200) {
                        const chunks = [];
                        res.on('data', (chunk) => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                    } else {
                        let errorData = '';
                        res.on('data', (chunk) => errorData += chunk);
                        res.on('end', () => reject(new Error(`Download failed: ${errorData}`)));
                    }
                });

                req.on('error', reject);
                req.end();
            });
        } catch (error) {
            throw new Error(`Failed to download file: ${error.message}`);
        }
    }

    // List recent files
    async listRecentFiles(limit = 10) {
        try {
            const query = `SELECT Id, Title, ContentSize, CreatedDate, ContentDocumentId FROM ContentVersion WHERE IsLatest = true ORDER BY CreatedDate DESC LIMIT ${limit}`;
            const encodedQuery = encodeURIComponent(query);
            
            const result = await this.makeRequest(
                'GET',
                `/services/data/${this.config.version}/query/?q=${encodedQuery}`
            );

            return result.records.map(record => ({
                fileId: record.Id,
                title: record.Title,
                size: record.ContentSize,
                createdDate: record.CreatedDate,
                directLink: `${this.instanceUrl}/lightning/r/ContentDocument/${record.ContentDocumentId}/view`
            }));
        } catch (error) {
            console.error('❌ Error listing files:', error);
            return [];
        }
    }

    // Delete file
    async deleteFile(fileId) {
        try {
            await this.makeRequest(
                'DELETE',
                `/services/data/${this.config.version}/sobjects/ContentVersion/${fileId}`
            );
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting file:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
}

module.exports = SalesforceStorageService; 