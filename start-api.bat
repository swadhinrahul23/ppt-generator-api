@echo off
title PPT Generator API Server

echo Starting PPT Generator API Server...
echo.

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting API server...
echo Server will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

node api-server.js

pause 