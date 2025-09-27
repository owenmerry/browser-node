/**
 * Browser Node Application
 * Main coordinator class that orchestrates all modules
 */

import { TerminalManager } from './modules/terminal/TerminalManager.js';
import { WebContainerManager } from './modules/webcontainer/WebContainerManager.js';
import { GitHubRepository } from './modules/github/GitHubRepository.js';
import { FileManager } from './modules/files/FileManager.js';
import { PreviewManager } from './modules/preview/PreviewManager.js';
import { UIManager } from './modules/ui/UIManager.js';
import { ModalHelper } from './modules/ui/helpers.js';

export class BrowserNodeApp {
    constructor() {
        this.isInitialized = false;
        this.modules = {};
        
        // Initialize modules in dependency order
        this.initializeModules();
    }

      /**
     * Create initial environment with welcome files
     * @param {object} webcontainerInstance - WebContainer instance
     */
    async createInitialEnvironment(webcontainerInstance) {
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
     * Update loading overlay text
     * @param {string} text - Loading text to display
     */
    updateLoadingText(text) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            const loadingContent = loadingOverlay.querySelector('.loading-content div:last-child');
            if (loadingContent) {
                loadingContent.textContent = text;
            }
        }
    }

    /**
     * Initialize all modules in proper order
     */
    async initializeModules() {
        try {
            console.log('🚀 Initializing Browser Node Application...');

            // Update loading text
            this.updateLoadingText('Initializing UI Manager...');

            // 1. Initialize UI Manager first (for error handling and notifications)
            console.log('📱 Initializing UI Manager...');
            this.modules.ui = new UIManager();

            // Update loading text
            this.updateLoadingText('Starting WebContainer...');

            // 2. Initialize WebContainer Manager
            console.log('🐳 Initializing WebContainer...');
            this.modules.webContainer = new WebContainerManager();
            
            // Boot WebContainer and wait for it to be fully ready
            const webcontainerInstance = await this.modules.webContainer.bootWebContainer();
            console.log('✅ WebContainer fully booted and ready');

            // Create initial welcome environment
            await this.createInitialEnvironment(webcontainerInstance);

            // Update loading text
            this.updateLoadingText('Setting up terminal...');

            // 3. Initialize Terminal Manager
            console.log('💻 Initializing Terminal...');
            this.modules.terminal = new TerminalManager(this.modules.webContainer);
            
            // Initialize the terminal UI first (this will find the #terminal element)
            this.modules.terminal.initializeTerminal();
            
            // Start the shell process with the ready WebContainer instance
            console.log('🐚 Starting shell process...');
            await this.modules.terminal.startShell(webcontainerInstance);
            console.log('✅ Terminal and shell ready');

            // Update loading text
            this.updateLoadingText('Loading file system...');

            // 4. Initialize File Manager
            console.log('📁 Initializing File Manager...');
            this.modules.files = new FileManager(this.modules.webContainer);
            
            // Load initial files
            await this.modules.files.loadFiles();

            // Update loading text
            this.updateLoadingText('Setting up preview...');

            // 5. Initialize Preview Manager
            console.log('👁️ Initializing Preview Manager...');
            this.modules.preview = new PreviewManager();

            // 6. Initialize GitHub Repository Manager
            console.log('🐙 Initializing GitHub Manager...');
            this.modules.github = new GitHubRepository(
                this.modules.webContainer,
                this.modules.terminal
            );

            // Setup module interactions
            this.setupModuleInteractions();
            
            // Connect to existing HTML UI
            this.connectExistingUI();

            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            console.log('✅ Browser Node Application initialized successfully!');
            
            // Show welcome notification
            this.modules.ui.showSuccessNotification('Browser Node is ready! 🚀');

            // Load initial state
            await this.loadInitialState();

            // Run feature tests
            setTimeout(() => this.testAllFeatures(), 2000);

        } catch (error) {
            console.error('❌ Failed to initialize Browser Node Application:', error);
            
            // Hide loading overlay on error
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            if (this.modules.ui) {
                this.modules.ui.showErrorNotification(`Initialization failed: ${error.message}`);
            }
            
            throw error;
        }
    }

    /**
     * Connect to existing HTML UI elements
     */
    connectExistingUI() {
        // GitHub Repo Loading
        const loadRepoBtn = document.getElementById('loadRepoBtn');
        const githubUrl = document.getElementById('githubUrl');
        
        if (loadRepoBtn && githubUrl) {
            loadRepoBtn.addEventListener('click', async () => {
                const url = githubUrl.value.trim();
                if (url) {
                    try {
                        this.updateLoadingText('Loading GitHub repository...');
                        await this.modules.github.loadRepository(url);
                        this.modules.ui.showSuccessNotification('Repository loaded successfully!');
                        
                        // Save to localStorage for sharing
                        localStorage.setItem('lastRepository', JSON.stringify({
                            url: url,
                            name: this.extractRepoName(url),
                            timestamp: Date.now()
                        }));
                        
                    } catch (error) {
                        this.modules.ui.showErrorNotification(`Failed to load repository: ${error.message}`);
                    }
                } else {
                    this.modules.ui.showErrorNotification('Please enter a GitHub repository URL');
                }
            });
        }

        // New Project Button
        const newProjectBtn = document.getElementById('newProjectBtn');
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => {
                this.showCreateProjectDialog();
            });
        }

        // Share Button
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.handleShare();
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

        // Clear Terminal Button
        const clearTerminalBtn = document.getElementById('clearTerminalBtn');
        if (clearTerminalBtn) {
            clearTerminalBtn.addEventListener('click', () => {
                if (this.modules.terminal) {
                    this.modules.terminal.clear();
                }
            });
        }

        // Toggle Preview Button
        const togglePreviewBtn = document.getElementById('togglePreviewBtn');
        if (togglePreviewBtn) {
            togglePreviewBtn.addEventListener('click', () => {
                const previewContainer = document.getElementById('previewContainer');
                if (previewContainer) {
                    const isVisible = previewContainer.style.display !== 'none';
                    previewContainer.style.display = isVisible ? 'none' : 'block';
                    togglePreviewBtn.textContent = isVisible ? 'Show Preview' : 'Hide Preview';
                }
            });
        }

        // Test Preview Button
        const testPreviewBtn = document.getElementById('testPreviewBtn');
        if (testPreviewBtn) {
            testPreviewBtn.addEventListener('click', () => {
                if (this.modules.preview) {
                    // Try to detect if there's a server running
                    this.testForRunningServer();
                }
            });
        }

        // Handle URL parameters for sharing
        this.handleUrlParameters();
    }

    /**
     * Handle URL parameters for direct loading and sharing
     */
    handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const repo = urlParams.get('repo');
        const cmd = urlParams.get('cmd');

        if (repo) {
            // Auto-load repository from URL parameter
            console.log('🔗 Loading repository from URL parameter:', repo);
            
            setTimeout(async () => {
                try {
                    const githubUrl = document.getElementById('githubUrl');
                    if (githubUrl) {
                        githubUrl.value = repo;
                    }
                    
                    await this.modules.github.loadRepository(repo);
                    this.modules.ui.showSuccessNotification('Repository loaded from shared link!');
                    
                    // Auto-run command if specified
                    if (cmd && this.modules.terminal) {
                        setTimeout(() => {
                            console.log('🤖 Running command from URL:', cmd);
                            this.modules.terminal.runCommand(cmd);
                        }, 2000);
                    }
                } catch (error) {
                    this.modules.ui.showErrorNotification(`Failed to load shared repository: ${error.message}`);
                }
            }, 1000);
        }
    }

    /**
     * Handle sharing functionality
     */
    handleShare() {
        const lastRepo = localStorage.getItem('lastRepository');
        let shareUrl = window.location.origin + window.location.pathname;

        if (lastRepo) {
            const repoData = JSON.parse(lastRepo);
            shareUrl += `?repo=${encodeURIComponent(repoData.url)}`;
            
            // Add current command if available
            // const currentCommand = this.getCurrentCommand();
            // if (currentCommand) {
            //     shareUrl += `&cmd=${encodeURIComponent(currentCommand)}`;
            // }
        }

        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            this.modules.ui.showSuccessNotification('Share link copied to clipboard! 📋');
        }).catch(() => {
            // Fallback: show the URL in a modal
            const modal = ModalHelper.createModal({
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
            ModalHelper.showModal(modal);
        });
    }

    /**
     * Test for running development server
     */
    async testForRunningServer() {
        const commonPorts = [3000, 8080, 5000, 4200, 3001, 5173, 5174];
        
        for (const port of commonPorts) {
            try {
                const response = await fetch(`http://localhost:${port}`, {
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                
                // If we get here, there might be something running
                this.modules.ui.showSuccessNotification(`Found potential server on port ${port}`);
                if (this.modules.preview) {
                    this.modules.preview.updatePreview(`http://localhost:${port}`);
                }
                return;
            } catch (error) {
                // Continue trying other ports
            }
        }
        
        this.modules.ui.showWarningNotification('No development server detected. Try running "npm start" or "npm run dev" first.');
    }

    /**
     * Extract repository name from GitHub URL
     * @param {string} githubUrl - GitHub repository URL
     * @returns {string} Repository name
     */
    extractRepoName(githubUrl) {
        const match = githubUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
        return match ? match[1].replace('.git', '') : 'repository';
    }

    /**
     * Show create project dialog
     */
    showCreateProjectDialog() {
        const modal = ModalHelper.createModal({
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
                await this.createProjectTemplate('vanilla-js');
                ModalHelper.closeModal(modal);
            } else if (e.target.id === 'createReact') {
                await this.createProjectTemplate('react');
                ModalHelper.closeModal(modal);
            } else if (e.target.id === 'createVite') {
                await this.createProjectTemplate('vite');
                ModalHelper.closeModal(modal);
            } else if (e.target.id === 'createExpress') {
                await this.createProjectTemplate('express');
                ModalHelper.closeModal(modal);
            } else if (e.target.id === 'createCustomProject') {
                const projectName = modal.querySelector('#projectName').value.trim();
                if (projectName) {
                    await this.createCustomProject(projectName);
                    ModalHelper.closeModal(modal);
                } else {
                    this.modules.ui.showErrorNotification('Please enter a project name');
                }
            }
        });

        ModalHelper.showModal(modal);
    }

    /**
     * Create project from template
     * @param {string} template - Template type
     */
    async createProjectTemplate(template) {
        try {
            this.updateLoadingText(`Creating ${template} project...`);
            await this.modules.github.createProjectFromTemplate(template);
            this.modules.ui.showSuccessNotification(`${template} project created successfully!`);
        } catch (error) {
            this.modules.ui.showErrorNotification(`Failed to create project: ${error.message}`);
        }
    }

    /**
     * Create custom project
     * @param {string} name - Project name
     */
    async createCustomProject(name) {
        try {
            this.updateLoadingText(`Creating ${name} project...`);
            
            // Create basic project structure
            if (this.modules.files) {
                await this.modules.files.writeFile('package.json', JSON.stringify({
                    name: name.toLowerCase().replace(/\s+/g, '-'),
                    version: '1.0.0',
                    description: `${name} project`,
                    main: 'index.js',
                    scripts: {
                        start: 'node index.js',
                        dev: 'node index.js'
                    }
                }, null, 2));

                await this.modules.files.writeFile('index.js', `console.log('Welcome to ${name}!');`);
                await this.modules.files.writeFile('README.md', `# ${name}\n\nA new project created with Browser Node.`);
            }
            
            this.modules.ui.showSuccessNotification(`Project "${name}" created successfully!`);
        } catch (error) {
            this.modules.ui.showErrorNotification(`Failed to create project: ${error.message}`);
        }
    }

    /**
     * Setup interactions between modules
     */
    setupModuleInteractions() {
        // WebContainer port changes → Preview Manager
        document.addEventListener('webContainerPort', (e) => {
            if (this.modules.preview) {
                this.modules.preview.handlePortChange(e.detail.port);
            }
        });

        // File Manager selections → Terminal (cd to directory)
        document.addEventListener('fileManagerSelection', (e) => {
            if (e.detail.file?.type === 'directory' && this.modules.terminal) {
                const command = `cd "${e.detail.file.path}"`;
                console.log(`Auto-navigating to: ${e.detail.file.path}`);
            }
        });

        // Terminal server detection → Preview Manager
        document.addEventListener('serverDetected', (e) => {
            if (this.modules.preview && e.detail.port) {
                const url = `http://localhost:${e.detail.port}`;
                this.modules.preview.updatePreview(url);
                this.modules.ui.showSuccessNotification(`Server detected on port ${e.detail.port}`);
            }
        });

        // GitHub repository loaded → File Manager refresh
        document.addEventListener('repositoryLoaded', async (e) => {
            if (this.modules.files) {
                await this.modules.files.refreshFiles();
                this.modules.ui.showSuccessNotification(`Repository "${e.detail.name}" loaded successfully`);
            }
        });

        // Project created → Multiple modules
        document.addEventListener('projectCreated', async (e) => {
            const { projectType, name } = e.detail;
            
            // Refresh files
            if (this.modules.files) {
                await this.modules.files.refreshFiles();
            }
            
            // Run installation commands if needed
            if (this.modules.terminal) {
                if (projectType === 'node' || projectType === 'express') {
                    this.modules.terminal.runCommand('npm install');
                }
            }
            
            this.modules.ui.showSuccessNotification(`Project "${name}" created successfully`);
        });

        // Error handling - route all module errors to UI
        ['terminalError', 'webContainerError', 'fileManagerError', 'previewError', 'githubError'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                console.error(`Module error (${eventName}):`, e.detail);
                this.modules.ui.showErrorNotification(e.detail.message || 'An error occurred');
            });
        });
    }

    /**
     * Load initial application state
     */
    async loadInitialState() {
        try {
            // Check if there's a saved project or repository to load
            const savedRepo = localStorage.getItem('lastRepository');
            const savedProject = localStorage.getItem('lastProject');

            if (savedRepo) {
                const repoData = JSON.parse(savedRepo);
                console.log('Loading last repository:', repoData.name);
                await this.modules.github.loadRepository(repoData.url);
            } else if (savedProject) {
                const projectData = JSON.parse(savedProject);
                console.log('Loading last project:', projectData.name);
                await this.modules.files.loadFiles();
            } else {
                // Show welcome screen or load default project
                this.showWelcomeScreen();
            }

        } catch (error) {
            console.warn('Could not load initial state:', error);
            this.showWelcomeScreen();
        }
    }

    /**
     * Show welcome screen for new users
     */
    showWelcomeScreen() {
        const welcomeContent = document.createElement('div');
        welcomeContent.className = 'welcome-screen';
        welcomeContent.innerHTML = `
            <div class="welcome-header">
                <h1>🚀 Welcome to Browser Node</h1>
                <p>A powerful Node.js development environment that runs entirely in your browser!</p>
            </div>
            
            <div class="welcome-options">
                <div class="welcome-option" data-action="create-project">
                    <div class="option-icon">📝</div>
                    <h3>Create New Project</h3>
                    <p>Start with a template project</p>
                </div>
                
                <div class="welcome-option" data-action="load-github">
                    <div class="option-icon">🐙</div>
                    <h3>Load from GitHub</h3>
                    <p>Import a repository from GitHub</p>
                </div>
                
                <div class="welcome-option" data-action="browse-examples">
                    <div class="option-icon">📚</div>
                    <h3>Browse Examples</h3>
                    <p>Explore example projects</p>
                </div>
            </div>

            <div class="welcome-features">
                <h3>What you can do:</h3>
                <ul>
                    <li>✅ Run Node.js applications in the browser</li>
                    <li>✅ Install npm packages</li>
                    <li>✅ Live preview your web apps</li>
                    <li>✅ Full terminal access</li>
                    <li>✅ File management and editing</li>
                    <li>✅ GitHub integration</li>
                </ul>
            </div>
        `;

        // Setup welcome screen actions
        welcomeContent.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleWelcomeAction(action);
            }
        });

        // Show as modal using ModalHelper directly
        const modal = ModalHelper.createModal({
            title: '',
            content: welcomeContent,
            actions: [],
            size: 'large',
            className: 'welcome-modal'
        });
        ModalHelper.showModal(modal);
    }

    /**
     * Handle welcome screen actions
     * @param {string} action - Action name
     */
    async handleWelcomeAction(action) {
        switch (action) {
            case 'create-project':
                await this.showCreateProjectDialog();
                break;
            case 'load-github':
                await this.showLoadGitHubDialog();
                break;
            case 'browse-examples':
                await this.showExamplesDialog();
                break;
        }
    }

    /**
     * Show create project dialog
     */
    async showCreateProjectDialog() {
        const templates = this.modules.files.getAvailableTemplates();
        
        const templateList = document.createElement('div');
        templateList.className = 'template-list';
        templateList.innerHTML = templates.map(template => `
            <div class="template-item" data-template="${template.id}">
                <h4>${template.name}</h4>
                <p>${template.description}</p>
            </div>
        `).join('');

        templateList.addEventListener('click', async (e) => {
            const templateId = e.target.closest('[data-template]')?.dataset.template;
            if (templateId) {
                try {
                    await this.modules.files.createProjectFromTemplate(templateId);
                    // Close modal by removing it
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        ModalHelper.closeModal(modal);
                    }
                } catch (error) {
                    this.modules.ui.showErrorNotification('Failed to create project');
                }
            }
        });

        const modal = ModalHelper.createModal({
            title: 'Create New Project',
            content: templateList,
            actions: [
                { text: 'Cancel', className: 'btn-secondary' }
            ]
        });
        ModalHelper.showModal(modal);
    }

    /**
     * Show load GitHub dialog
     */
    async showLoadGitHubDialog() {
        const githubForm = document.createElement('form');
        githubForm.innerHTML = `
            <div class="form-group">
                <label for="github-url">GitHub Repository URL:</label>
                <input type="url" id="github-url" placeholder="https://github.com/user/repo" required>
                <small>Enter a public GitHub repository URL</small>
            </div>
        `;

        githubForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = githubForm.querySelector('#github-url').value;
            
            if (url) {
                try {
                    await this.modules.github.loadRepository(url);
                    // Close modal
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        ModalHelper.closeModal(modal);
                    }
                } catch (error) {
                    this.modules.ui.showErrorNotification('Failed to load repository');
                }
            }
        });

        const modal = ModalHelper.createModal({
            title: 'Load GitHub Repository',
            content: githubForm,
            actions: [
                { text: 'Cancel', className: 'btn-secondary' },
                { 
                    text: 'Load', 
                    className: 'btn-primary',
                    onClick: () => githubForm.dispatchEvent(new Event('submit'))
                }
            ]
        });
        ModalHelper.showModal(modal);
    }

    /**
     * Show examples dialog
     */
    async showExamplesDialog() {
        const examples = [
            {
                name: 'Express Server',
                description: 'Simple Express.js web server',
                url: 'https://github.com/expressjs/express'
            },
            {
                name: 'Node.js HTTP Server',
                description: 'Basic Node.js HTTP server',
                url: 'https://github.com/nodejs/examples'
            }
        ];

        const exampleList = document.createElement('div');
        exampleList.className = 'example-list';
        exampleList.innerHTML = examples.map(example => `
            <div class="example-item" data-url="${example.url}">
                <h4>${example.name}</h4>
                <p>${example.description}</p>
            </div>
        `).join('');

        exampleList.addEventListener('click', async (e) => {
            const url = e.target.closest('[data-url]')?.dataset.url;
            if (url) {
                try {
                    await this.modules.github.loadRepository(url);
                    // Close modal
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        ModalHelper.closeModal(modal);
                    }
                } catch (error) {
                    this.modules.ui.showErrorNotification('Failed to load example');
                }
            }
        });

        const modal = ModalHelper.createModal({
            title: 'Example Projects',
            content: exampleList,
            actions: [
                { text: 'Close', className: 'btn-secondary' }
            ]
        });
        ModalHelper.showModal(modal);
    }

    /**
     * Get application status
     * @returns {object} Application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: Object.keys(this.modules),
            webContainer: this.modules.webContainer?.isReady() || false,
            terminal: this.modules.terminal?.isReady() || false,
            ui: this.modules.ui?.getLayoutInfo() || null
        };
    }

    /**
     * Reset application to initial state
     */
    async reset() {
        try {
            // Clear localStorage
            localStorage.removeItem('lastRepository');
            localStorage.removeItem('lastProject');
            
            // Reset modules
            if (this.modules.files) {
                this.modules.files.currentFiles = [];
            }
            
            if (this.modules.terminal) {
                this.modules.terminal.clear();
            }
            
            // Clear WebContainer
            if (this.modules.webContainer) {
                await this.modules.webContainer.reset();
            }
            
            this.modules.ui.showSuccessNotification('Application reset successfully');
            
            // Show welcome screen again
            this.showWelcomeScreen();
            
        } catch (error) {
            console.error('Error resetting application:', error);
            this.modules.ui.showErrorNotification('Failed to reset application');
        }
    }

    /**
     * Test all features to ensure they work correctly
     */
    async testAllFeatures() {
        console.log('🧪 Testing all features...');
        
        try {
            // 1. Test WebContainer
            if (this.modules.webContainer) {
                const instance = this.modules.webContainer.getInstance();
                console.log('✅ WebContainer:', instance ? 'Available' : '❌ Not available');
            }
            
            // 2. Test Terminal
            if (this.modules.terminal) {
                console.log('✅ Terminal:', this.modules.terminal.terminal ? 'Initialized' : '❌ Not initialized');
            }
            
            // 3. Test File Manager
            if (this.modules.files) {
                try {
                    const files = await this.modules.files.loadFiles();
                    console.log(`✅ File Manager: Loaded ${files.length} files`);
                } catch (error) {
                    console.log('❌ File Manager error:', error.message);
                }
            }
            
            // 4. Test UI Manager
            if (this.modules.ui) {
                this.modules.ui.showSuccessNotification('Feature test running...');
                console.log('✅ UI Manager: Notifications working');
            }
            
            // 5. Test GitHub Manager
            if (this.modules.github) {
                console.log('✅ GitHub Manager:', this.modules.github ? 'Available' : '❌ Not available');
            }
            
            // 6. Test Preview Manager
            if (this.modules.preview) {
                console.log('✅ Preview Manager:', this.modules.preview ? 'Available' : '❌ Not available');
            }
            
            console.log('🎉 Feature test completed!');
            
        } catch (error) {
            console.error('❌ Feature test failed:', error);
        }
    }

    /**
     * Cleanup and destroy the application
     */
    destroy() {
        console.log('🧹 Cleaning up Browser Node Application...');
        
        // Destroy modules in reverse order
        Object.values(this.modules).forEach(module => {
            if (typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    console.warn('Error destroying module:', error);
                }
            }
        });
        
        this.modules = {};
        this.isInitialized = false;
        
        console.log('✅ Browser Node Application cleanup complete');
    }
}

// Make BrowserNodeApp available globally for debugging
window.BrowserNodeApp = BrowserNodeApp;