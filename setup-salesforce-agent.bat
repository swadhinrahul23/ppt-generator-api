@echo off
REM Salesforce Agentforce PPT Generator Setup Script (Windows)
REM This script helps automate the deployment of the PPT Generator Agent

echo 🚀 Salesforce Agentforce PPT Generator Setup
echo =============================================

REM Check if SFDX CLI is installed
sfdx version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Salesforce CLI (sfdx) is not installed. Please install it first.
    echo    Visit: https://developer.salesforce.com/tools/sfdxcli
    pause
    exit /b 1
)

echo ✅ Salesforce CLI found

REM Check if user is authenticated
sfdx auth:list --json >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ No authenticated Salesforce orgs found.
    echo    Please authenticate first with: sfdx auth:web:login
    pause
    exit /b 1
)

echo ✅ Authenticated Salesforce orgs found

REM Get target org
echo.
echo 📋 Available Salesforce orgs:
sfdx auth:list

echo.
set /p TARGET_ORG=Enter the username/alias of your target org: 

if "%TARGET_ORG%"=="" (
    echo ❌ No org specified. Exiting.
    pause
    exit /b 1
)

echo ✅ Target org: %TARGET_ORG%

REM Create temporary directory for deployment
set TEMP_DIR=salesforce-deployment-temp
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%\force-app\main\default\classes"

echo.
echo 📦 Preparing deployment files...

REM Copy Apex classes
if exist "PPTAgentforceGenerator.cls" (
    copy "PPTAgentforceGenerator.cls" "%TEMP_DIR%\force-app\main\default\classes\" >nul
    echo ^<?xml version="1.0" encoding="UTF-8"?^>
    echo ^<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata"^>
    echo     ^<apiVersion^>58.0^</apiVersion^>
    echo     ^<status^>Active^</status^>
    echo ^</ApexClass^> > "%TEMP_DIR%\force-app\main\default\classes\PPTAgentforceGenerator.cls-meta.xml"
    echo   ✅ PPTAgentforceGenerator.cls
) else (
    echo   ❌ PPTAgentforceGenerator.cls not found
)

if exist "PPTAgentforceGeneratorTest.cls" (
    copy "PPTAgentforceGeneratorTest.cls" "%TEMP_DIR%\force-app\main\default\classes\" >nul
    echo ^<?xml version="1.0" encoding="UTF-8"?^>
    echo ^<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata"^>
    echo     ^<apiVersion^>58.0^</apiVersion^>
    echo     ^<status^>Active^</status^>
    echo ^</ApexClass^> > "%TEMP_DIR%\force-app\main\default\classes\PPTAgentforceGeneratorTest.cls-meta.xml"
    echo   ✅ PPTAgentforceGeneratorTest.cls
) else (
    echo   ❌ PPTAgentforceGeneratorTest.cls not found
)

if exist "ApexPresentationGenerator.cls" (
    copy "ApexPresentationGenerator.cls" "%TEMP_DIR%\force-app\main\default\classes\" >nul
    echo ^<?xml version="1.0" encoding="UTF-8"?^>
    echo ^<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata"^>
    echo     ^<apiVersion^>58.0^</apiVersion^>
    echo     ^<status^>Active^</status^>
    echo ^</ApexClass^> > "%TEMP_DIR%\force-app\main\default\classes\ApexPresentationGenerator.cls-meta.xml"
    echo   ✅ ApexPresentationGenerator.cls
) else (
    echo   ❌ ApexPresentationGenerator.cls not found
)

REM Create sfdx-project.json
echo {
echo   "packageDirectories": [
echo     {
echo       "path": "force-app",
echo       "default": true
echo     }
echo   ],
echo   "name": "PPT-Generator-Agent",
echo   "namespace": "",
echo   "sfdcLoginUrl": "https://login.salesforce.com",
echo   "sourceApiVersion": "58.0"
echo } > "%TEMP_DIR%\sfdx-project.json"

echo.
echo 🚀 Deploying to Salesforce...

REM Deploy to Salesforce
cd "%TEMP_DIR%"
sfdx force:source:deploy -p force-app -u "%TARGET_ORG%" --wait 10
if %errorlevel% equ 0 (
    echo ✅ Apex classes deployed successfully!
) else (
    echo ❌ Deployment failed. Check the errors above.
    cd ..
    rmdir /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

cd ..

echo.
echo 🧪 Running tests...

REM Run tests
sfdx force:apex:test:run -c -r human -u "%TARGET_ORG%" -n PPTAgentforceGeneratorTest --wait 10
if %errorlevel% equ 0 (
    echo ✅ Tests passed!
) else (
    echo ⚠️  Some tests may have failed. Check the results above.
)

echo.
echo 🔧 Next steps for manual configuration:
echo 1. Set up Remote Site Settings:
echo    - Go to Setup ^> Security ^> Remote Site Settings
echo    - Add your API endpoint URLs
echo.
echo 2. Create Connected App (if using external API):
echo    - Go to Setup ^> App Manager ^> New Connected App
echo    - Configure OAuth settings
echo.
echo 3. Configure Agentforce Agent:
echo    - Go to Setup ^> Einstein ^> Agents
echo    - Create new agent using PPT-Generator-Agent-Config.md
echo.
echo 4. Enable Content Distribution:
echo    - Go to Setup ^> Feature Settings ^> Content ^> Content Deliveries
echo.

REM Cleanup
rmdir /s /q "%TEMP_DIR%"

echo ✅ Setup completed! Check the deployment guide for detailed configuration steps.

REM Optional: Open relevant setup pages
set /p OPEN_SETUP=Would you like to open Salesforce setup pages? (y/n): 
if /i "%OPEN_SETUP%"=="y" (
    echo Opening Salesforce setup pages...
    
    REM Get org URL - simplified for Windows
    for /f "tokens=*" %%i in ('sfdx force:org:display -u "%TARGET_ORG%" --json ^| findstr "instanceUrl"') do (
        set ORG_LINE=%%i
    )
    
    REM Note: Windows batch is limited for JSON parsing, so we'll provide manual URLs
    echo Please manually navigate to these setup pages in your Salesforce org:
    echo - Remote Site Settings: Setup ^> Security ^> Remote Site Settings
    echo - Connected Apps: Setup ^> App Manager
    echo - Einstein Agents: Setup ^> Einstein ^> Agents
    echo - Content Deliveries: Setup ^> Feature Settings ^> Content ^> Content Deliveries
)

echo.
echo 🎉 Deployment complete! Refer to Salesforce-Deployment-Guide.md for next steps.
pause 