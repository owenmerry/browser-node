/**
 * File management helper functions
 */

import { FileSystemHelper } from '../../helpers/index.js';

/**
 * File explorer and tree rendering helpers
 */
export class FileExplorerHelper {
    /**
     * Render file tree structure as HTML
     * @param {Array} files - File tree array
     * @param {HTMLElement} container - Container element
     */
    static renderFileTree(files, container) {
        if (!container) return;

        container.innerHTML = '';

        const renderItems = (items, parentElement) => {
            items.forEach(item => {
                const li = document.createElement('li');
                const span = document.createElement('span');
                
                // Get appropriate icon and styling
                const icon = FileSystemHelper.getFileIcon(item.name, item.type === 'directory');
                span.innerHTML = `${icon} ${item.name}`;
                span.className = item.type === 'directory' ? 'directory' : 'file';
                
                // Add click handler for files
                if (item.type === 'file') {
                    span.style.cursor = 'pointer';
                    span.onclick = () => {
                        console.log(`File clicked: ${item.path}`);
                        // Emit custom event for file selection
                        const event = new CustomEvent('fileSelected', {
                            detail: { file: item }
                        });
                        container.dispatchEvent(event);
                    };
                }
                
                li.appendChild(span);
                parentElement.appendChild(li);
                
                // Render children if directory has children
                if (item.children && item.children.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'file-tree-children';
                    li.appendChild(ul);
                    renderItems(item.children, ul);
                }
            });
        };

        renderItems(files, container);
    }

    /**
     * Create collapsible file tree with expand/collapse functionality
     * @param {Array} files - File tree array
     * @param {HTMLElement} container - Container element
     */
    static renderCollapsibleFileTree(files, container) {
        if (!container) return;

        container.innerHTML = '';

        const renderItems = (items, parentElement, level = 0) => {
            items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'file-tree-item';
                li.style.paddingLeft = `${level * 20}px`;
                
                const span = document.createElement('span');
                const icon = FileSystemHelper.getFileIcon(item.name, item.type === 'directory');
                
                if (item.type === 'directory' && item.children && item.children.length > 0) {
                    // Directory with children - add expand/collapse
                    const expandIcon = document.createElement('span');
                    expandIcon.className = 'expand-icon';
                    expandIcon.textContent = '▶';
                    expandIcon.style.cursor = 'pointer';
                    expandIcon.style.marginRight = '5px';
                    
                    span.appendChild(expandIcon);
                    span.innerHTML += `${icon} ${item.name}`;
                    span.className = 'directory expandable';
                    
                    const childrenContainer = document.createElement('ul');
                    childrenContainer.className = 'file-tree-children collapsed';
                    childrenContainer.style.display = 'none';
                    
                    expandIcon.onclick = (e) => {
                        e.stopPropagation();
                        const isExpanded = !childrenContainer.style.display || childrenContainer.style.display === 'none';
                        childrenContainer.style.display = isExpanded ? 'block' : 'none';
                        expandIcon.textContent = isExpanded ? '▼' : '▶';
                        childrenContainer.className = isExpanded 
                            ? 'file-tree-children expanded' 
                            : 'file-tree-children collapsed';
                    };
                    
                    li.appendChild(span);
                    li.appendChild(childrenContainer);
                    
                    renderItems(item.children, childrenContainer, level + 1);
                } else {
                    // File or empty directory
                    span.innerHTML = `${icon} ${item.name}`;
                    span.className = item.type === 'directory' ? 'directory' : 'file';
                    
                    if (item.type === 'file') {
                        span.style.cursor = 'pointer';
                        span.onclick = () => {
                            const event = new CustomEvent('fileSelected', {
                                detail: { file: item }
                            });
                            container.dispatchEvent(event);
                        };
                    }
                    
                    li.appendChild(span);
                }
                
                parentElement.appendChild(li);
            });
        };

        renderItems(files, container);
    }

    /**
     * Filter files based on search criteria
     * @param {Array} files - File tree array
     * @param {string} searchTerm - Search term
     * @returns {Array} Filtered files
     */
    static filterFiles(files, searchTerm) {
        if (!searchTerm) return files;

        const term = searchTerm.toLowerCase();
        
        const filterRecursive = (items) => {
            return items.filter(item => {
                // Check if item name matches
                const nameMatches = item.name.toLowerCase().includes(term);
                
                if (item.type === 'directory' && item.children) {
                    // Filter children
                    const filteredChildren = filterRecursive(item.children);
                    if (filteredChildren.length > 0) {
                        return {
                            ...item,
                            children: filteredChildren
                        };
                    }
                }
                
                return nameMatches;
            }).map(item => {
                if (item.type === 'directory' && item.children) {
                    return {
                        ...item,
                        children: filterRecursive(item.children)
                    };
                }
                return item;
            });
        };

        return filterRecursive(files);
    }

    /**
     * Get file statistics from file tree
     * @param {Array} files - File tree array
     * @returns {object} File statistics
     */
    static getFileStats(files) {
        let totalFiles = 0;
        let totalDirectories = 0;
        let totalSize = 0;
        let fileTypes = {};

        const countRecursive = (items) => {
            items.forEach(item => {
                if (item.type === 'directory') {
                    totalDirectories++;
                    if (item.children) {
                        countRecursive(item.children);
                    }
                } else {
                    totalFiles++;
                    totalSize += item.size || 0;
                    
                    const ext = FileSystemHelper.getFileExtension(item.name);
                    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                }
            });
        };

        countRecursive(files);

        return {
            totalFiles,
            totalDirectories,
            totalSize,
            fileTypes,
            formattedSize: this.formatFileSize(totalSize)
        };
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = bytes / Math.pow(1024, i);
        
        return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }
}

/**
 * Project template helpers
 */
export class ProjectTemplateHelper {
    /**
     * Get default project templates
     * @returns {Array} Array of project templates
     */
    static getDefaultTemplates() {
        return [
            {
                id: 'basic-node',
                name: 'Basic Node.js Project',
                description: 'Simple Node.js project with HTTP server',
                files: this.getBasicNodeTemplate()
            },
            {
                id: 'express-server',
                name: 'Express Server',
                description: 'Express.js web server with basic routing',
                files: this.getExpressTemplate()
            },
            {
                id: 'static-site',
                name: 'Static Website',
                description: 'Simple static HTML/CSS/JS website',
                files: this.getStaticSiteTemplate()
            }
        ];
    }

    /**
     * Get basic Node.js project template
     * @returns {object} Project files structure
     */
    static getBasicNodeTemplate() {
        return {
            'package.json': JSON.stringify({
                name: 'basic-node-project',
                version: '1.0.0',
                description: 'A basic Node.js project',
                main: 'index.js',
                scripts: {
                    start: 'node index.js',
                    dev: 'node index.js'
                },
                keywords: ['node', 'javascript'],
                license: 'MIT'
            }, null, 2),
            'index.js': `// Basic Node.js HTTP Server
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`
        <h1>🚀 Basic Node.js Project</h1>
        <p>Server is running successfully!</p>
        <p>Edit index.js to customize this page.</p>
    \`);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(\`Server running at http://localhost:\${port}\`);
});`,
            'README.md': `# Basic Node.js Project

A simple Node.js HTTP server project.

## Getting Started

1. Install dependencies (if any):
   \`\`\`
   npm install
   \`\`\`

2. Start the server:
   \`\`\`
   npm start
   \`\`\`

3. Open http://localhost:3000

## Development

Edit \`index.js\` to modify the server behavior.
`
        };
    }

    /**
     * Get Express.js project template
     * @returns {object} Project files structure
     */
    static getExpressTemplate() {
        return {
            'package.json': JSON.stringify({
                name: 'express-project',
                version: '1.0.0',
                description: 'Express.js web server',
                main: 'app.js',
                scripts: {
                    start: 'node app.js',
                    dev: 'node app.js'
                },
                dependencies: {
                    express: '^4.18.0'
                },
                keywords: ['express', 'node', 'web'],
                license: 'MIT'
            }, null, 2),
            'app.js': `const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.send(\`
        <h1>🚀 Express Server</h1>
        <p>Your Express.js server is running!</p>
        <p><a href="/api/hello">Try the API</a></p>
    \`);
});

app.get('/api/hello', (req, res) => {
    res.json({ 
        message: 'Hello from Express!',
        timestamp: new Date().toISOString()
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(\`Express server running at http://localhost:\${port}\`);
});`,
            'README.md': `# Express Project

Express.js web server with basic routing and API endpoints.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the server:
   \`\`\`
   npm start
   \`\`\`

3. Open http://localhost:3000

## API Endpoints

- \`GET /\` - Main page
- \`GET /api/hello\` - Hello API endpoint

## Development

Edit \`app.js\` to add more routes and functionality.
`
        };
    }

    /**
     * Get static site template
     * @returns {object} Project files structure
     */
    static getStaticSiteTemplate() {
        return {
            'package.json': JSON.stringify({
                name: 'static-site',
                version: '1.0.0',
                description: 'Static HTML/CSS/JS website',
                main: 'server.js',
                scripts: {
                    start: 'node server.js',
                    dev: 'node server.js'
                },
                keywords: ['static', 'html', 'css', 'javascript'],
                license: 'MIT'
            }, null, 2),
            'server.js': `const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer(async (req, res) => {
    try {
        let filePath = req.url === '/' ? '/index.html' : req.url;
        const fullPath = path.join(__dirname, 'public', filePath);
        
        const data = await fs.readFile(fullPath);
        const ext = path.extname(fullPath);
        
        let contentType = 'text/plain';
        switch(ext) {
            case '.html': contentType = 'text/html'; break;
            case '.css': contentType = 'text/css'; break;
            case '.js': contentType = 'application/javascript'; break;
            case '.json': contentType = 'application/json'; break;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(404);
        res.end('File not found');
    }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(\`Static site server running at http://localhost:\${port}\`);
});`,
            'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Static Site</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>🚀 Static Website</h1>
        <p>Welcome to your static website!</p>
        <button onclick="showMessage()">Click Me</button>
        <div id="message"></div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
            'public/style.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    text-align: center;
    max-width: 600px;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    backdrop-filter: blur(10px);
}

h1 {
    margin-bottom: 1rem;
    font-size: 2.5rem;
}

p {
    margin-bottom: 2rem;
    font-size: 1.1rem;
}

button {
    padding: 0.8rem 2rem;
    font-size: 1rem;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover {
    background: #ff5252;
}

#message {
    margin-top: 1rem;
    font-size: 1.2rem;
    font-weight: bold;
}`,
            'public/script.js': `function showMessage() {
    const messageEl = document.getElementById('message');
    const messages = [
        '✨ Hello World!',
        '🎉 Welcome!',
        '🚀 Amazing!',
        '💫 Fantastic!',
        '🌟 Awesome!'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    messageEl.textContent = randomMessage;
    messageEl.style.color = '#ffeb3b';
}`,
            'README.md': `# Static Website

A simple static website with HTML, CSS, and JavaScript.

## Getting Started

1. Start the development server:
   \`\`\`
   npm start
   \`\`\`

2. Open http://localhost:3000

## Structure

- \`public/index.html\` - Main HTML file
- \`public/style.css\` - Stylesheet
- \`public/script.js\` - JavaScript functionality
- \`server.js\` - Development server

## Development

Edit files in the \`public/\` directory to customize your website.
`
        };
    }
}