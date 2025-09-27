/**
 * Browser Node - Consolidated Single File Version
 * A powerful Node.js development environment that runs entirely in your browser
 * 
 * This is a consolidated version that combines all modular functionality into a single file
 * to ensure everything works properly while we debug the modular version.
 */

import { WebContainer } from '@webcontainer/api';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

// Global state
let app = null;
let webcontainerInstance = null;
let terminal = null;
let fitAddon = null;
let shellProcess = null;
let shellWriter = null;
let currentFiles = [];
let currentProject = null;
let projectFiles = new Map();

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

/**
 * Initialize the Browser Node application
 */
async function initializeApp() {
    try {
        console.log('🚀 Initializing Browser Node Application...');
        
        // Update loading text
        updateLoadingText('Starting WebContainer...');
        
        // Initialize WebContainer
        console.log('🐳 Initializing WebContainer...');
        webcontainerInstance = await WebContainer.boot();
        console.log('✅ WebContainer booted successfully');

        // Create initial environment
        await createInitialEnvironment();

        // Update loading text
        updateLoadingText('Setting up terminal...');

        // Initialize Terminal
        console.log('💻 Initializing Terminal...');
        await initializeTerminal();
        console.log('✅ Terminal initialized');

        // Start shell
        console.log('🐚 Starting shell process...');
        await startShell();
        console.log('✅ Shell started');

        // Update loading text
        updateLoadingText('Setting up UI...');

        // Connect UI elements
        connectUI();

        // Load initial files
        await loadFiles();

        // Hide loading overlay
        hideLoadingOverlay();

        console.log('✅ Browser Node Application initialized successfully!');
        
        // Show welcome notification
        showNotification('Browser Node is ready! 🚀', 'success');

        // Show terminal welcome message
        setTimeout(() => showTerminalWelcome(), 1000);

    } catch (error) {
        console.error('❌ Failed to initialize Browser Node Application:', error);
        hideLoadingOverlay();
        showNotification(`Initialization failed: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Create initial environment with sample files
 */
async function createInitialEnvironment() {
    try {
        console.log('📁 Creating initial environment...');
        
        // Create a welcome package.json
        await webcontainerInstance.fs.writeFile('/package.json', JSON.stringify({
            name: 'browser-node-workspace',
            version: '1.0.0',
            description: 'Welcome to Browser Node! This is your workspace.',
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'node index.js',
                test: 'echo "No tests yet - start coding!"'
            }
        }, null, 2));
        
        // Create a welcome README
        await webcontainerInstance.fs.writeFile('/README.md', `# Welcome to Browser Node! 🚀

This is your browser-based Node.js environment. You can:

## Getting Started

1. **Load a GitHub repository** - Use the GitHub URL input above
2. **Create a new project** - Click "New Project" to start from templates
3. **Run commands** - Use the terminal below to run any Node.js commands

## Available Commands

- \`ls\` - List files in current directory
- \`pwd\` - Show current directory
- \`node --version\` - Check Node.js version
- \`npm --version\` - Check npm version
- \`cat README.md\` - Read this file
- \`node index.js\` - Run the welcome script

## Try Some Commands

\`\`\`bash
ls -la          # List all files with details
cat package.json # View the package.json file  
node index.js   # Run the welcome script
npm init        # Create a new project
\`\`\`

Happy coding! 🎉
`);
        
        // Create a welcome JavaScript file
        await webcontainerInstance.fs.writeFile('/index.js', `console.log('🎉 Welcome to Browser Node!');
console.log('📁 Current directory:', process.cwd());
console.log('🔧 Node.js version:', process.version);
console.log('📦 Available in this workspace:');

const fs = require('fs');
const files = fs.readdirSync('.');
files.forEach(file => {
    const stats = fs.statSync(file);
    const type = stats.isDirectory() ? '📁' : '📄';
    console.log(\`  \${type} \${file}\`);
});

console.log('');
console.log('💡 Try these commands:');
console.log('  • ls -la    (list files with details)');
console.log('  • cat README.md    (read the welcome guide)');  
console.log('  • npm run test    (run test script)');
console.log('');
console.log('Ready to start coding! 🚀');
`);
        
        // Create a simple .gitignore
        await webcontainerInstance.fs.writeFile('/.gitignore', `node_modules/
*.log
.env
dist/
build/
`);
        
        // Create examples directory with some sample files
        await webcontainerInstance.fs.mkdir('/examples', { recursive: true });
        
        await webcontainerInstance.fs.writeFile('/examples/hello.js', `// Simple hello world example
console.log('Hello from Browser Node!');

// You can use all Node.js features here
const os = require('os');
console.log('Platform:', os.platform());
console.log('Architecture:', os.arch());
`);
        
        await webcontainerInstance.fs.writeFile('/examples/server.js', `// Simple HTTP server example
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello from Browser Node server!\\n');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(\`Server running at http://localhost:\${PORT}/\`);
});
`);
        
        console.log('✅ Initial environment created with sample files');
        
    } catch (error) {
        console.error('Error creating initial environment:', error);
        // Don't throw - this is not critical
    }
}

/**
 * Initialize XTerm.js terminal
 */
async function initializeTerminal() {
    // Create terminal with configuration
    terminal = new Terminal({
        cursorBlink: true,
        theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            selection: '#264f78'
        },
        fontSize: 14,
        fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
        allowTransparency: true
    });

    // Set up addons
    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    // Open terminal in container
    const terminalElement = document.getElementById('terminal');
    if (terminalElement) {
        terminal.open(terminalElement);
        fitAddon.fit();
    } else {
        throw new Error('Terminal container not found');
    }

    // Set up resize handler
    window.addEventListener('resize', () => {
        if (fitAddon) {
            setTimeout(() => fitAddon.fit(), 100);
        }
    });

    // Handle terminal resize events
    terminal.onResize((size) => {
        if (shellProcess && shellProcess.resize) {
            shellProcess.resize(size);
        }
    });
}

/**
 * Start shell process
 */
async function startShell() {
    try {
        // Spawn shell process
        shellProcess = await webcontainerInstance.spawn('sh', {
            terminal: {
                cols: terminal.cols,
                rows: terminal.rows,
            },
        });

        // Set up shell output handling
        shellProcess.output.pipeTo(
            new WritableStream({
                write: (data) => {
                    terminal.write(data);
                },
            })
        );

        // Set up shell input handling
        const shellInput = shellProcess.input.getWriter();
        shellWriter = shellInput;

        // Handle terminal input
        terminal.onData((data) => {
            if (shellWriter) {
                shellWriter.write(data);
            }
        });

        console.log('Shell started successfully');

    } catch (error) {
        console.error('Error starting shell:', error);
        throw error;
    }
}

/**
 * Show terminal welcome message
 */
function showTerminalWelcome() {
    if (!terminal) return;

    // Clear any existing content and show welcome
    terminal.write('\r\n');
    writeToTerminal('🚀 Welcome to Browser Node Terminal!', 'success');
    writeToTerminal('');
    writeToTerminal('📍 Current Environment:', 'info');
    
    // Run commands to show system info
    setTimeout(() => runCommand('node --version'), 100);
    setTimeout(() => runCommand('npm --version'), 200);
    setTimeout(() => runCommand('pwd'), 300);
    setTimeout(() => runCommand('ls'), 400);
    
    setTimeout(() => {
        terminal.write('\r\n');
        writeToTerminal('💡 Try these commands:', 'info');
        writeToTerminal('  • ls -la           List files with details');
        writeToTerminal('  • cat README.md    Read the welcome guide');
        writeToTerminal('  • node index.js    Run the welcome script');
        writeToTerminal('  • npm install      Install dependencies');
        writeToTerminal('  • npm start        Start the project');
        writeToTerminal('');
        writeToTerminal('Happy coding! 🎉', 'success');
        terminal.write('\r\n');
    }, 1000);
}

/**
 * Write formatted message to terminal
 */
function writeToTerminal(message, type = 'default') {
    if (!terminal) return;
    
    const colors = {
        error: '\x1b[31m',     // Red
        warning: '\x1b[33m',   // Yellow
        success: '\x1b[32m',   // Green
        info: '\x1b[36m',      // Cyan
        default: '\x1b[37m'    // White
    };
    
    const reset = '\x1b[0m';
    const color = colors[type] || colors.default;
    
    terminal.writeln(`${color}${message}${reset}`);
}

/**
 * Run a command in the terminal
 */
function runCommand(command) {
    if (shellWriter) {
        shellWriter.write(`${command}\r\n`);
    }
}

/**
 * Clear terminal
 */
function clearTerminal() {
    if (terminal) {
        terminal.clear();
    }
}

/**
 * Connect UI elements to functionality
 */
function connectUI() {
    // GitHub Repo Loading
    const loadRepoBtn = document.getElementById('loadRepoBtn');
    const githubUrl = document.getElementById('githubUrl');
    
    if (loadRepoBtn && githubUrl) {
        loadRepoBtn.addEventListener('click', async () => {
            const url = githubUrl.value.trim();
            if (url) {
                try {
                    updateLoadingText('Loading GitHub repository...');
                    showLoadingOverlay();
                    
                    await loadGitHubRepository(url);
                    
                    hideLoadingOverlay();
                    showNotification('Repository loaded successfully!', 'success');
                    await loadFiles(); // Refresh file list
                    
                    // Save to localStorage for sharing
                    localStorage.setItem('lastRepository', JSON.stringify({
                        url: url,
                        name: extractRepoName(url),
                        timestamp: Date.now()
                    }));
                    
                } catch (error) {
                    hideLoadingOverlay();
                    showNotification(`Failed to load repository: ${error.message}`, 'error');
                }
            } else {
                showNotification('Please enter a GitHub repository URL', 'error');
            }
        });
    }

    // New Project Button
    const newProjectBtn = document.getElementById('newProjectBtn');
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', () => {
            showCreateProjectDialog();
        });
    }

    // Share Button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            handleShare();
        });
    }

    // Clear Terminal Button
    const clearTerminalBtn = document.getElementById('clearTerminalBtn');
    if (clearTerminalBtn) {
        clearTerminalBtn.addEventListener('click', () => {
            clearTerminal();
        });
    }

    // Toggle File Explorer
    const toggleExplorerBtn = document.getElementById('toggleExplorerBtn');
    if (toggleExplorerBtn) {
        toggleExplorerBtn.addEventListener('click', () => {
            const fileExplorer = document.getElementById('fileExplorer');
            if (fileExplorer) {
                const isVisible = fileExplorer.style.display !== 'none';
                fileExplorer.style.display = isVisible ? 'none' : 'block';
                toggleExplorerBtn.textContent = isVisible ? 'Show Files' : 'Hide Files';
            }
        });
    }

    // Handle URL parameters for sharing
    handleUrlParameters();
}

/**
 * Load GitHub repository
 */
async function loadGitHubRepository(githubUrl) {
    const urlParts = githubUrl.replace('https://github.com/', '').split('/');
    if (urlParts.length < 2) {
        throw new Error('Invalid GitHub URL format');
    }
    
    const owner = urlParts[0];
    const repo = urlParts[1];

    console.log(`Loading repository: ${owner}/${repo}`);

    try {
        // Fetch repository information
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoResponse.ok) {
            throw new Error(`Repository not found: ${owner}/${repo}`);
        }
        const repoData = await repoResponse.json();

        // Try to fetch package.json
        let packageJsonContent = null;
        try {
            const packageResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`);
            if (packageResponse.ok) {
                packageJsonContent = await packageResponse.json();
            }
        } catch (error) {
            console.warn('No package.json found or failed to fetch');
        }

        // Create project directory
        await webcontainerInstance.fs.mkdir(`/${repo}`, { recursive: true });

        // Create enhanced package.json
        const enhancedPackageJson = {
            name: repo,
            version: packageJsonContent?.version || "1.0.0",
            description: repoData.description || `Project loaded from ${owner}/${repo}`,
            main: packageJsonContent?.main || "index.js",
            scripts: {
                start: "node index.js",
                dev: "node index.js",
                build: "echo 'No build script specified'",
                test: "echo \"Error: no test specified\" && exit 1",
                ...(packageJsonContent?.scripts || {})
            },
            keywords: repoData.topics || [],
            author: owner,
            license: repoData.license?.spdx_id || packageJsonContent?.license || "ISC",
            repository: {
                type: "git",
                url: `https://github.com/${owner}/${repo}.git`
            },
            dependencies: packageJsonContent?.dependencies || {},
            devDependencies: packageJsonContent?.devDependencies || {}
        };

        await webcontainerInstance.fs.writeFile(
            `/${repo}/package.json`,
            JSON.stringify(enhancedPackageJson, null, 2)
        );

        // Create README if it doesn't exist
        const readmeContent = `# ${repo}

Project loaded from GitHub repository: ${owner}/${repo}

${repoData.description || ''}

## Getting Started

\`\`\`bash
cd ${repo}
npm install
npm start
\`\`\`

## Original Repository

${repoData.html_url}
`;
        
        await webcontainerInstance.fs.writeFile(`/${repo}/README.md`, readmeContent);

        // Create a basic index.js if it doesn't exist
        const indexContent = `// ${repo} - Main Entry Point
// Loaded from GitHub: ${owner}/${repo}

console.log('Welcome to ${repo}!');
console.log('This project was loaded from GitHub.');

// Add your code here
`;
        
        await webcontainerInstance.fs.writeFile(`/${repo}/index.js`, indexContent);

        currentProject = {
            name: repo,
            owner: owner,
            description: repoData.description,
            url: repoData.html_url,
            created: new Date().toISOString()
        };

        console.log(`✅ Repository ${owner}/${repo} loaded successfully`);
        
    } catch (error) {
        console.error('Error loading GitHub repository:', error);
        throw error;
    }
}

/**
 * Show create project dialog
 */
function showCreateProjectDialog() {
    const modal = createModal({
        title: 'Create New Project',
        content: `
            <div>
                <h3>Project Templates</h3>
                <div style="margin: 20px 0;">
                    <button id="createVanillaJs" class="btn-primary" style="margin: 5px;">Vanilla JavaScript</button>
                    <button id="createReact" class="btn-primary" style="margin: 5px;">React App</button>
                    <button id="createVite" class="btn-primary" style="margin: 5px;">Vite + Vanilla</button>
                    <button id="createExpress" class="btn-primary" style="margin: 5px;">Express Server</button>
                </div>
                <hr>
                <h4>Custom Project</h4>
                <input type="text" id="projectName" placeholder="Enter project name..." style="width: 100%; padding: 8px; margin: 10px 0;">
            </div>
        `,
        actions: [
            { text: 'Create Custom', className: 'btn-primary', id: 'createCustomProject' },
            { text: 'Cancel', className: 'btn-secondary' }
        ]
    });

    // Add event listeners for template buttons
    modal.addEventListener('click', async (e) => {
        if (e.target.id === 'createVanillaJs') {
            await createProjectFromTemplate('vanilla-js');
            closeModal(modal);
        } else if (e.target.id === 'createReact') {
            await createProjectFromTemplate('react');
            closeModal(modal);
        } else if (e.target.id === 'createVite') {
            await createProjectFromTemplate('vite');
            closeModal(modal);
        } else if (e.target.id === 'createExpress') {
            await createProjectFromTemplate('express');
            closeModal(modal);
        } else if (e.target.id === 'createCustomProject') {
            const projectName = modal.querySelector('#projectName').value.trim();
            if (projectName) {
                await createCustomProject(projectName);
                closeModal(modal);
            } else {
                showNotification('Please enter a project name', 'error');
            }
        }
    });

    showModal(modal);
}

/**
 * Create project from template
 */
async function createProjectFromTemplate(template) {
    try {
        updateLoadingText(`Creating ${template} project...`);
        showLoadingOverlay();
        
        const templates = {
            'vanilla-js': {
                'package.json': {
                    name: 'vanilla-js-project',
                    version: '1.0.0',
                    description: 'A vanilla JavaScript project',
                    main: 'index.js',
                    scripts: {
                        start: 'node index.js',
                        dev: 'npx serve .'
                    }
                },
                'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS Project</title>
</head>
<body>
    <h1>Vanilla JavaScript Project</h1>
    <p>Welcome to your new project!</p>
    <script src="index.js"></script>
</body>
</html>`,
                'index.js': `console.log('Hello from Vanilla JavaScript!');`,
                'README.md': `# Vanilla JavaScript Project\n\nA simple vanilla JavaScript project.`
            },
            'vite': {
                'package.json': {
                    name: 'vite-project',
                    version: '1.0.0',
                    scripts: {
                        dev: 'vite',
                        build: 'vite build'
                    },
                    devDependencies: {
                        vite: '^4.0.0'
                    }
                },
                'index.html': `<!DOCTYPE html>
<html>
<head>
    <title>Vite Project</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
</body>
</html>`,
                'main.js': `document.querySelector('#app').innerHTML = '<h1>Hello Vite!</h1>';`,
                'README.md': `# Vite Project\n\nA Vite-based project.`
            },
            'express': {
                'package.json': {
                    name: 'express-server',
                    version: '1.0.0',
                    main: 'server.js',
                    scripts: {
                        start: 'node server.js'
                    },
                    dependencies: {
                        express: '^4.18.2'
                    }
                },
                'server.js': `const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('Hello from Express!');
});

app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});`,
                'README.md': `# Express Server\n\nA simple Express.js server.`
            }
        };

        const templateData = templates[template];
        if (!templateData) {
            throw new Error(`Unknown template: ${template}`);
        }

        const projectName = `${template}-project`;
        await webcontainerInstance.fs.mkdir(`/${projectName}`, { recursive: true });

        for (const [filePath, content] of Object.entries(templateData)) {
            const fullPath = `/${projectName}/${filePath}`;
            const fileContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
            await webcontainerInstance.fs.writeFile(fullPath, fileContent);
        }

        hideLoadingOverlay();
        showNotification(`${template} project created successfully!`, 'success');
        await loadFiles(); // Refresh file list
        
    } catch (error) {
        hideLoadingOverlay();
        showNotification(`Failed to create project: ${error.message}`, 'error');
    }
}

/**
 * Create custom project
 */
async function createCustomProject(name) {
    try {
        updateLoadingText(`Creating ${name} project...`);
        showLoadingOverlay();
        
        const projectName = name.toLowerCase().replace(/\s+/g, '-');
        await webcontainerInstance.fs.mkdir(`/${projectName}`, { recursive: true });

        await webcontainerInstance.fs.writeFile(`/${projectName}/package.json`, JSON.stringify({
            name: projectName,
            version: '1.0.0',
            description: `${name} project`,
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'node index.js'
            }
        }, null, 2));

        await webcontainerInstance.fs.writeFile(`/${projectName}/index.js`, `console.log('Welcome to ${name}!');`);
        await webcontainerInstance.fs.writeFile(`/${projectName}/README.md`, `# ${name}\n\nA new project created with Browser Node.`);
        
        hideLoadingOverlay();
        showNotification(`Project "${name}" created successfully!`, 'success');
        await loadFiles(); // Refresh file list
        
    } catch (error) {
        hideLoadingOverlay();
        showNotification(`Failed to create project: ${error.message}`, 'error');
    }
}

/**
 * Handle sharing functionality
 */
function handleShare() {
    const lastRepo = localStorage.getItem('lastRepository');
    let shareUrl = window.location.origin + window.location.pathname;

    if (lastRepo) {
        const repoData = JSON.parse(lastRepo);
        shareUrl += `?repo=${encodeURIComponent(repoData.url)}`;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Share link copied to clipboard! 📋', 'success');
    }).catch(() => {
        // Fallback: show the URL in a modal
        const modal = createModal({
            title: 'Share This Project',
            content: `
                <div>
                    <p>Share this link to let others access your project:</p>
                    <input type="text" value="${shareUrl}" readonly style="width: 100%; padding: 8px; margin: 10px 0;">
                    <p><small>Copy the URL above to share your current project setup.</small></p>
                </div>
            `,
            actions: [
                { text: 'Close', className: 'btn-primary' }
            ]
        });
        showModal(modal);
    });
}

/**
 * Handle URL parameters for direct loading and sharing
 */
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const repo = urlParams.get('repo');

    if (repo) {
        console.log('🔗 Loading repository from URL parameter:', repo);
        
        setTimeout(async () => {
            try {
                const githubUrl = document.getElementById('githubUrl');
                if (githubUrl) {
                    githubUrl.value = repo;
                }
                
                updateLoadingText('Loading shared repository...');
                showLoadingOverlay();
                
                await loadGitHubRepository(repo);
                
                hideLoadingOverlay();
                showNotification('Repository loaded from shared link!', 'success');
                await loadFiles();
                
            } catch (error) {
                hideLoadingOverlay();
                showNotification(`Failed to load shared repository: ${error.message}`, 'error');
            }
        }, 2000);
    }
}

/**
 * Load and display files
 */
async function loadFiles() {
    try {
        const files = await readDirectoryRecursive('/');
        currentFiles = files;
        renderFiles();
        return files;
    } catch (error) {
        console.error('Error loading files:', error);
        return [];
    }
}

/**
 * Read directory recursively
 */
async function readDirectoryRecursive(path) {
    try {
        const entries = await webcontainerInstance.fs.readdir(path, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
            const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
            
            if (entry.isDirectory()) {
                files.push({
                    name: entry.name,
                    path: fullPath,
                    type: 'directory',
                    children: await readDirectoryRecursive(fullPath)
                });
            } else {
                try {
                    const stats = await webcontainerInstance.fs.stat(fullPath);
                    files.push({
                        name: entry.name,
                        path: fullPath,
                        type: 'file',
                        size: stats.size,
                        modified: new Date(stats.mtime)
                    });
                } catch (error) {
                    // Skip files that can't be read
                    console.warn(`Could not read file stats: ${fullPath}`);
                }
            }
        }

        return files;
    } catch (error) {
        console.error(`Error reading directory ${path}:`, error);
        return [];
    }
}

/**
 * Render files in the file explorer
 */
function renderFiles() {
    const fileExplorer = document.getElementById('fileExplorer');
    if (!fileExplorer) return;

    let html = '<div class="file-list">';
    
    function renderFileTree(files, indent = 0) {
        let result = '';
        files.forEach(file => {
            const indentStyle = `style="padding-left: ${indent * 20}px"`;
            const icon = file.type === 'directory' ? '📁' : '📄';
            
            result += `<div class="file-item" ${indentStyle} onclick="handleFileClick('${file.path}', '${file.type}')">
                ${icon} ${file.name}
                ${file.size ? `<span class="file-size">(${formatFileSize(file.size)})</span>` : ''}
            </div>`;
            
            if (file.children && file.children.length > 0) {
                result += renderFileTree(file.children, indent + 1);
            }
        });
        return result;
    }
    
    html += renderFileTree(currentFiles);
    html += '</div>';
    
    fileExplorer.innerHTML = html;
}

/**
 * Handle file click
 */
async function handleFileClick(path, type) {
    if (type === 'file') {
        try {
            const content = await webcontainerInstance.fs.readFile(path, 'utf-8');
            showFileContent(path, content);
        } catch (error) {
            showNotification(`Failed to read file: ${error.message}`, 'error');
        }
    } else {
        console.log(`Directory clicked: ${path}`);
    }
}

/**
 * Show file content in a modal
 */
function showFileContent(path, content) {
    const modal = createModal({
        title: `File: ${path}`,
        content: `
            <div>
                <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; max-height: 400px;"><code>${escapeHtml(content)}</code></pre>
            </div>
        `,
        actions: [
            { text: 'Close', className: 'btn-primary' }
        ]
    });
    showModal(modal);
}

/**
 * Extract repository name from GitHub URL
 */
function extractRepoName(githubUrl) {
    const match = githubUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
    return match ? match[1].replace('.git', '') : 'repository';
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Escape HTML for display
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update loading overlay text
 */
function updateLoadingText(text) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        const loadingContent = loadingOverlay.querySelector('.loading-content div:last-child');
        if (loadingContent) {
            loadingContent.textContent = text;
        }
    }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    // Set colors based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
    
    // Add CSS animations if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Create modal
 */
function createModal({ title, content, actions = [] }) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;
    
    let actionsHtml = '';
    if (actions.length > 0) {
        actionsHtml = '<div style="margin-top: 20px; text-align: right;">';
        actions.forEach(action => {
            const buttonClass = action.className || 'btn-secondary';
            const buttonId = action.id ? `id="${action.id}"` : '';
            actionsHtml += `<button ${buttonId} class="${buttonClass}" style="margin-left: 10px; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">${action.text}</button>`;
        });
        actionsHtml += '</div>';
    }
    
    modalContent.innerHTML = `
        <h2 style="margin-top: 0;">${title}</h2>
        <div>${content}</div>
        ${actionsHtml}
    `;
    
    modal.appendChild(modalContent);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
    
    return modal;
}

/**
 * Show modal
 */
function showModal(modal) {
    document.body.appendChild(modal);
}

/**
 * Close modal
 */
function closeModal(modal) {
    if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}

// Make functions available globally for debugging
window.BrowserNodeConsolidated = {
    webcontainerInstance,
    terminal,
    loadGitHubRepository,
    createProjectFromTemplate,
    loadFiles,
    clearTerminal,
    runCommand,
    showNotification
};

console.log('📦 Browser Node Consolidated loaded');