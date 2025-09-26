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
            
            // Boot WebContainer
            await this.modules.webContainer.bootWebContainer();

            // Update loading text
            this.updateLoadingText('Setting up terminal...');

            // 3. Initialize Terminal Manager
            console.log('💻 Initializing Terminal...');
            this.modules.terminal = new TerminalManager(this.modules.webContainer);
            
            // Initialize the terminal UI
            this.modules.terminal.initializeTerminal();
            
            // Start the shell process
            await this.modules.terminal.startShell(this.modules.webContainer.getInstance());

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
                this.modules.files,
                this.modules.ui
            );

            // Setup module interactions
            this.setupModuleInteractions();

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