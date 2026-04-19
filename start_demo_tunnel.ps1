# ChronoVerse Remote Demo Tunnel Script
# This script uses 'localtunnel' to give you a public URL for your project presentation.

Write-Host "🚀 Preparing Remote Access for ChronoVerse..." -ForegroundColor Cyan

# 1. Start Frontend Tunnel
Write-Host "Opening Frontend Tunnel (Port 3000)..." -ForegroundColor Yellow
npx localtunnel --port 3000

# INSTRUCTIONS FOR THE USER:
# After running this script, you will see a URL like: https://six-dogs-jump.loca.lt
# 📢 Share THIS URL with your Sir.
#
# NOTE: Because the backend is running on localhost, this tunnel is best used for 
# a "Screen Share" demonstration where you show the Sir the public link. 
#
# If you want him to interact with the app on his OWN computer:
# 1. Capture the backend tunnel link (npx localtunnel --port 4000)
# 2. Update your .env file VITE_API_URL to that link.
# 3. Rebuild the frontend.
