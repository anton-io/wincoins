#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// MIME types for different file extensions.
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4'
};

const PORT = process.env.PORT || 8090;
const HOST = process.env.NODE_ENV === 'production' ? 'localhost' : '0.0.0.0';

const server = http.createServer((req, res) => {
    // Parse the URL.
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Serve index.html for root path.
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // If pathname doesn't have an extension, try adding .html
    if (!path.extname(pathname)) {
        pathname = pathname + '.html';
    }

    // Construct file path.
    const filePath = path.join(__dirname, pathname);

    // Check if file exists.
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found.
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
            return;
        }

        // Get file extension and corresponding MIME type.
        const ext = path.extname(filePath);
        const mimeType = mimeTypes[ext] || 'text/plain';

        // Read and serve file.
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>');
                return;
            }

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 WinCoins Web Server running at:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    if (HOST === '0.0.0.0') {
        console.log(`   Network: http://0.0.0.0:${PORT}`);
    } else {
        console.log(`   Binding: localhost only (production mode)`);
    }
    console.log('');
    console.log('💡 Make sure to:');
    console.log('   1. Connect MetaMask to the correct network');
    console.log('   2. Have your WinCoins contract address ready');
    console.log('   3. Ensure sufficient ETH for gas fees');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown.
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});