@echo off
title API Test - PPT Generator

echo Testing PPT Generator API...
echo.
echo Make sure the API server is running first!
echo (Run: start-api.bat in another terminal)
echo.
pause

node test-api.js

echo.
echo Test completed!
pause 