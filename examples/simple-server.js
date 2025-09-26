// Simple HTTP Server Example
// Run with: node simple-server.js

const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Simple Server</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 40px auto; 
                    padding: 20px;
                    background: #f5f5f5;
                }
                h1 { color: #4CAF50; }
                .info { 
                    background: white; 
                    padding: 20px; 
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="info">
                <h1>🚀 Simple HTTP Server</h1>
                <p><strong>Status:</strong> Running successfully!</p>
                <p><strong>URL:</strong> ${req.headers.host}</p>
                <p><strong>Method:</strong> ${req.method}</p>
                <p><strong>Path:</strong> ${req.url}</p>
                <p><strong>User Agent:</strong> ${req.headers['user-agent']}</p>
                
                <h2>Available Routes</h2>
                <ul>
                    <li><a href="/">/ - This page</a></li>
                    <li><a href="/about">/about - About page</a></li>
                    <li><a href="/api">/api - JSON API endpoint</a></li>
                </ul>
                
                <h2>Next Steps</h2>
                <p>Try modifying this server code and restart to see changes!</p>
            </div>
        </body>
        </html>
    `);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🌐 Server running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop the server');
});