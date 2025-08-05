#!/bin/bash

# Salesforce Agentforce PPT Generator Setup Script
# This script helps automate the deployment of the PPT Generator Agent

echo "🚀 Salesforce Agentforce PPT Generator Setup"
echo "============================================="

# Check if SFDX CLI is installed
if ! command -v sfdx &> /dev/null; then
    echo "❌ Salesforce CLI (sfdx) is not installed. Please install it first."
    echo "   Visit: https://developer.salesforce.com/tools/sfdxcli"
    exit 1
fi

echo "✅ Salesforce CLI found"

# Check if user is authenticated
if ! sfdx auth:list --json | jq -e '.result | length > 0' > /dev/null 2>&1; then
    echo "❌ No authenticated Salesforce orgs found."
    echo "   Please authenticate first with: sfdx auth:web:login"
    exit 1
fi

echo "✅ Authenticated Salesforce orgs found"

# Get target org
echo ""
echo "📋 Available Salesforce orgs:"
sfdx auth:list

echo ""
read -p "Enter the username/alias of your target org: " TARGET_ORG

if [ -z "$TARGET_ORG" ]; then
    echo "❌ No org specified. Exiting."
    exit 1
fi

# Verify org exists
if ! sfdx auth:list --json | jq -e --arg org "$TARGET_ORG" '.result[] | select(.username == $org or .alias == $org)' > /dev/null; then
    echo "❌ Org '$TARGET_ORG' not found. Please check the username/alias."
    exit 1
fi

echo "✅ Target org: $TARGET_ORG"

# Create temporary directory for deployment
TEMP_DIR="./salesforce-deployment-temp"
mkdir -p "$TEMP_DIR/force-app/main/default/classes"

echo ""
echo "📦 Preparing deployment files..."

# Copy Apex classes
if [ -f "PPTAgentforceGenerator.cls" ]; then
    cp "PPTAgentforceGenerator.cls" "$TEMP_DIR/force-app/main/default/classes/"
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<ApexClass xmlns=\"http://soap.sforce.com/2006/04/metadata\">
    <apiVersion>58.0</apiVersion>
    <status>Active</status>
</ApexClass>" > "$TEMP_DIR/force-app/main/default/classes/PPTAgentforceGenerator.cls-meta.xml"
    echo "  ✅ PPTAgentforceGenerator.cls"
else
    echo "  ❌ PPTAgentforceGenerator.cls not found"
fi

if [ -f "PPTAgentforceGeneratorTest.cls" ]; then
    cp "PPTAgentforceGeneratorTest.cls" "$TEMP_DIR/force-app/main/default/classes/"
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<ApexClass xmlns=\"http://soap.sforce.com/2006/04/metadata\">
    <apiVersion>58.0</apiVersion>
    <status>Active</status>
</ApexClass>" > "$TEMP_DIR/force-app/main/default/classes/PPTAgentforceGeneratorTest.cls-meta.xml"
    echo "  ✅ PPTAgentforceGeneratorTest.cls"
else
    echo "  ❌ PPTAgentforceGeneratorTest.cls not found"
fi

if [ -f "ApexPresentationGenerator.cls" ]; then
    cp "ApexPresentationGenerator.cls" "$TEMP_DIR/force-app/main/default/classes/"
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<ApexClass xmlns=\"http://soap.sforce.com/2006/04/metadata\">
    <apiVersion>58.0</apiVersion>
    <status>Active</status>
</ApexClass>" > "$TEMP_DIR/force-app/main/default/classes/ApexPresentationGenerator.cls-meta.xml"
    echo "  ✅ ApexPresentationGenerator.cls"
else
    echo "  ❌ ApexPresentationGenerator.cls not found"
fi

# Create sfdx-project.json
echo '{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true
    }
  ],
  "name": "PPT-Generator-Agent",
  "namespace": "",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "58.0"
}' > "$TEMP_DIR/sfdx-project.json"

echo ""
echo "🚀 Deploying to Salesforce..."

# Deploy to Salesforce
cd "$TEMP_DIR"
if sfdx force:source:deploy -p force-app -u "$TARGET_ORG" --wait 10; then
    echo "✅ Apex classes deployed successfully!"
else
    echo "❌ Deployment failed. Check the errors above."
    cd ..
    rm -rf "$TEMP_DIR"
    exit 1
fi

cd ..

echo ""
echo "🧪 Running tests..."

# Run tests
if sfdx force:apex:test:run -c -r human -u "$TARGET_ORG" -n PPTAgentforceGeneratorTest --wait 10; then
    echo "✅ Tests passed!"
else
    echo "⚠️  Some tests may have failed. Check the results above."
fi

echo ""
echo "🔧 Next steps for manual configuration:"
echo "1. Set up Remote Site Settings:"
echo "   - Go to Setup > Security > Remote Site Settings"
echo "   - Add your API endpoint URLs"
echo ""
echo "2. Create Connected App (if using external API):"
echo "   - Go to Setup > App Manager > New Connected App"
echo "   - Configure OAuth settings"
echo ""
echo "3. Configure Agentforce Agent:"
echo "   - Go to Setup > Einstein > Agents"
echo "   - Create new agent using PPT-Generator-Agent-Config.md"
echo ""
echo "4. Enable Content Distribution:"
echo "   - Go to Setup > Feature Settings > Content > Content Deliveries"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Setup completed! Check the deployment guide for detailed configuration steps."

# Optional: Open relevant setup pages
read -p "Would you like to open Salesforce setup pages? (y/n): " OPEN_SETUP
if [ "$OPEN_SETUP" = "y" ] || [ "$OPEN_SETUP" = "Y" ]; then
    echo "Opening Salesforce setup pages..."
    
    # Get org URL
    ORG_URL=$(sfdx force:org:display -u "$TARGET_ORG" --json | jq -r '.result.instanceUrl')
    
    if [ "$ORG_URL" != "null" ] && [ -n "$ORG_URL" ]; then
        # Open setup pages in browser
        open "$ORG_URL/lightning/setup/RemoteProxy/home" 2>/dev/null || echo "Remote Site Settings: $ORG_URL/lightning/setup/RemoteProxy/home"
        open "$ORG_URL/lightning/setup/ConnectedApplication/home" 2>/dev/null || echo "Connected Apps: $ORG_URL/lightning/setup/ConnectedApplication/home"
        open "$ORG_URL/lightning/setup/EinsteinAssistant/home" 2>/dev/null || echo "Einstein Agents: $ORG_URL/lightning/setup/EinsteinAssistant/home"
    fi
fi

echo ""
echo "🎉 Deployment complete! Refer to Salesforce-Deployment-Guide.md for next steps." 