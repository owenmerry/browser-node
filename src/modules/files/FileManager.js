/**
 * File Manager
 * Handles file operations, project creation, and file explorer functionality
 */

import { FileSystemHelper, OutputParser } from '../../helpers/index.js';
import { debounce, throttle } from '../../utils/common.js';
import { FileExplorerHelper, ProjectTemplateHelper } from './helpers.js';

export class FileManager {
    constructor(webContainerManager = null) {
        this.webContainerManager = webContainerManager;
        this.currentFiles = [];
        this.selectedFile = null;
        
        // Bind methods
        this.loadFiles = this.loadFiles.bind(this);
        this.createFile = this.createFile.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
        this.createDirectory = this.createDirectory.bind(this);
        
        // Throttled file operations
        this.debouncedSearch = debounce(this.searchFiles.bind(this), 300);
        this.throttledRefresh = throttle(this.refreshFiles.bind(this), 1000);
        
        this.initializeElements();
    }

    /**
     * Initialize DOM elements and event listeners
     */
    initializeElements() {
        this.fileExplorer = document.getElementById('fileExplorer');
        this.fileSearch = document.getElementById('file-search');
        this.fileUpload = document.getElementById('file-upload');
        this.createFileBtn = document.getElementById('create-file-btn');
        this.createDirBtn = document.getElementById('create-dir-btn');
        this.refreshFilesBtn = document.getElementById('refresh-files-btn');
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for file operations
     */
    setupEventListeners() {
        // File search
        if (this.fileSearch) {
            this.fileSearch.addEventListener('input', (e) => {
                this.debouncedSearch(e.target.value);
            });
        }

        // File upload
        if (this.fileUpload) {
            this.fileUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        // Create file button
        if (this.createFileBtn) {
            this.createFileBtn.addEventListener('click', () => {
                this.promptCreateFile();
            });
        }

        // Create directory button
        if (this.createDirBtn) {
            this.createDirBtn.addEventListener('click', () => {
                this.promptCreateDirectory();
            });
        }

        // Refresh files button
        if (this.refreshFilesBtn) {
            this.refreshFilesBtn.addEventListener('click', () => {
                this.throttledRefresh();
            });
        }

        // File explorer events
        if (this.fileExplorer) {
            this.fileExplorer.addEventListener('fileSelected', (e) => {
                this.handleFileSelection(e.detail.file);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.promptCreateFile();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.throttledRefresh();
                        break;
                }
            }
        });
    }

    /**
     * Load files from WebContainer
     * @returns {Promise<Array>} File tree array
     */
    async loadFiles() {
        try {
            const webcontainerInstance = this.webContainerManager?.getInstance();
            if (!webcontainerInstance) {
                console.warn('WebContainer not available for file loading');
                return [];
            }

            const files = await this.readDirectoryRecursive('/');
            this.currentFiles = files;
            this.renderFiles();
            return files;
        } catch (error) {
            console.error('Error loading files:', error);
            return [];
        }
    }

    /**
     * Read directory recursively to build file tree
     * @param {string} path - Directory path
     * @returns {Promise<Array>} File tree array
     */
    async readDirectoryRecursive(path) {
        try {
            const webcontainerInstance = this.webContainerManager.getInstance();
            const entries = await webcontainerInstance.fs.readdir(path, { withFileTypes: true });
            const files = [];

            for (const entry of entries) {
                const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
                
                if (entry.isDirectory()) {
                    const children = await this.readDirectoryRecursive(fullPath);
                    files.push({
                        name: entry.name,
                        path: fullPath,
                        type: 'directory',
                        children: children
                    });
                } else {
                    // Get file stats
                    try {
                        const stats = await webcontainerInstance.fs.stat(fullPath);
                        files.push({
                            name: entry.name,
                            path: fullPath,
                            type: 'file',
                            size: stats.size,
                            modified: new Date(stats.mtime)
                        });
                    } catch (statError) {
                        // If stat fails, add file without stats
                        files.push({
                            name: entry.name,
                            path: fullPath,
                            type: 'file'
                        });
                    }
                }
            }

            return files.sort((a, b) => {
                // Directories first, then alphabetical
                if (a.type === 'directory' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            console.error(`Error reading directory ${path}:`, error);
            return [];
        }
    }

    /**
     * Render files in the file explorer
     */
    renderFiles() {
        if (!this.fileExplorer) return;

        // Show file statistics
        const stats = FileExplorerHelper.getFileStats(this.currentFiles);
        const statsHtml = `
            <div class="file-stats">
                <span>${stats.totalFiles} files</span>
                <span>${stats.totalDirectories} folders</span>
                <span>${stats.formattedSize}</span>
            </div>
        `;

        // Create container for stats and tree
        this.fileExplorer.innerHTML = statsHtml;
        
        const treeContainer = document.createElement('ul');
        treeContainer.className = 'file-tree';
        this.fileExplorer.appendChild(treeContainer);

        // Render collapsible file tree
        FileExplorerHelper.renderCollapsibleFileTree(this.currentFiles, treeContainer);
    }

    /**
     * Search files based on search term
     * @param {string} searchTerm - Search term
     */
    searchFiles(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderFiles();
            return;
        }

        const filteredFiles = FileExplorerHelper.filterFiles(this.currentFiles, searchTerm);
        
        if (this.fileExplorer) {
            const treeContainer = this.fileExplorer.querySelector('.file-tree');
            if (treeContainer) {
                FileExplorerHelper.renderCollapsibleFileTree(filteredFiles, treeContainer);
            }
        }
    }

    /**
     * Handle file selection
     * @param {object} file - Selected file
     */
    async handleFileSelection(file) {
        this.selectedFile = file;
        
        if (file.type === 'file') {
            // Read and display file content
            try {
                const content = await this.readFile(file.path);
                this.displayFileContent(file, content);
            } catch (error) {
                console.error('Error reading file:', error);
            }
        }

        // Emit file selection event
        const event = new CustomEvent('fileManagerSelection', {
            detail: { file }
        });
        document.dispatchEvent(event);
    }

    /**
     * Read file content from WebContainer
     * @param {string} path - File path
     * @returns {Promise<string>} File content
     */
    async readFile(path) {
        const webcontainerInstance = this.webContainerManager?.getInstance();
        if (!webcontainerInstance) {
            throw new Error('WebContainer not available');
        }

        const content = await webcontainerInstance.fs.readFile(path, 'utf-8');
        return content;
    }

    /**
     * Display file content in editor or viewer
     * @param {object} file - File object
     * @param {string} content - File content
     */
    displayFileContent(file, content) {
        // Create or update file content display
        let contentDisplay = document.getElementById('file-content-display');
        if (!contentDisplay) {
            contentDisplay = document.createElement('div');
            contentDisplay.id = 'file-content-display';
            contentDisplay.className = 'file-content-display';
            
            // Insert after file explorer
            if (this.fileExplorer) {
                this.fileExplorer.parentNode.insertBefore(contentDisplay, this.fileExplorer.nextSibling);
            }
        }

        const extension = FileSystemHelper.getFileExtension(file.name);
        const language = this.getLanguageFromExtension(extension);

        contentDisplay.innerHTML = `
            <div class="file-header">
                <h3>${file.name}</h3>
                <div class="file-info">
                    <span>Size: ${FileExplorerHelper.formatFileSize(file.size || 0)}</span>
                    ${file.modified ? `<span>Modified: ${file.modified.toLocaleDateString()}</span>` : ''}
                </div>
            </div>
            <div class="file-content">
                <pre><code class="language-${language}">${this.escapeHtml(content)}</code></pre>
            </div>
        `;

        // Apply syntax highlighting if available
        if (window.Prism) {
            window.Prism.highlightAllUnder(contentDisplay);
        }
    }

    /**
     * Get programming language from file extension
     * @param {string} extension - File extension
     * @returns {string} Language identifier
     */
    getLanguageFromExtension(extension) {
        const languageMap = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'sh': 'bash',
            'yml': 'yaml',
            'yaml': 'yaml',
            'xml': 'xml',
            'sql': 'sql'
        };

        return languageMap[extension.toLowerCase()] || 'text';
    }

    /**
     * Escape HTML characters for safe display
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Create a new file
     * @param {string} path - File path
     * @param {string} content - File content
     */
    async createFile(path, content = '') {
        try {
            const webcontainerInstance = this.webContainerManager?.getInstance();
            if (!webcontainerInstance) {
                throw new Error('WebContainer not available');
            }

            await webcontainerInstance.fs.writeFile(path, content);
            await this.refreshFiles();
            
            console.log(`File created: ${path}`);
        } catch (error) {
            console.error('Error creating file:', error);
            throw error;
        }
    }

    /**
     * Delete a file or directory
     * @param {string} path - File/directory path
     */
    async deleteFile(path) {
        try {
            const webcontainerInstance = this.webContainerManager?.getInstance();
            if (!webcontainerInstance) {
                throw new Error('WebContainer not available');
            }

            const stats = await webcontainerInstance.fs.stat(path);
            
            if (stats.isDirectory()) {
                await webcontainerInstance.fs.rmdir(path, { recursive: true });
            } else {
                await webcontainerInstance.fs.unlink(path);
            }
            
            await this.refreshFiles();
            console.log(`Deleted: ${path}`);
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Create a new directory
     * @param {string} path - Directory path
     */
    async createDirectory(path) {
        try {
            const webcontainerInstance = this.webContainerManager?.getInstance();
            if (!webcontainerInstance) {
                throw new Error('WebContainer not available');
            }

            await webcontainerInstance.fs.mkdir(path, { recursive: true });
            await this.refreshFiles();
            
            console.log(`Directory created: ${path}`);
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    }

    /**
     * Prompt user to create a new file
     */
    promptCreateFile() {
        const fileName = prompt('Enter file name:');
        if (fileName) {
            const path = this.selectedFile?.type === 'directory' 
                ? `${this.selectedFile.path}/${fileName}`
                : `/${fileName}`;
            
            this.createFile(path);
        }
    }

    /**
     * Prompt user to create a new directory
     */
    promptCreateDirectory() {
        const dirName = prompt('Enter directory name:');
        if (dirName) {
            const path = this.selectedFile?.type === 'directory' 
                ? `${this.selectedFile.path}/${dirName}`
                : `/${dirName}`;
            
            this.createDirectory(path);
        }
    }

    /**
     * Handle file upload from user
     * @param {FileList} files - Files to upload
     */
    async handleFileUpload(files) {
        try {
            for (const file of files) {
                const content = await this.readFileAsText(file);
                const path = `/${file.name}`;
                await this.createFile(path, content);
            }
        } catch (error) {
            console.error('Error uploading files:', error);
        }
    }

    /**
     * Read uploaded file as text
     * @param {File} file - File object
     * @returns {Promise<string>} File content
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Refresh files list
     */
    async refreshFiles() {
        await this.loadFiles();
    }

    /**
     * Create project from template
     * @param {string} templateId - Template identifier
     */
    async createProjectFromTemplate(templateId) {
        try {
            const templates = ProjectTemplateHelper.getDefaultTemplates();
            const template = templates.find(t => t.id === templateId);
            
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            // Create files from template
            for (const [filePath, content] of Object.entries(template.files)) {
                await this.createFile(filePath, content);
            }

            console.log(`Project created from template: ${template.name}`);
            await this.refreshFiles();
        } catch (error) {
            console.error('Error creating project from template:', error);
            throw error;
        }
    }

    /**
     * Get available project templates
     * @returns {Array} Array of templates
     */
    getAvailableTemplates() {
        return ProjectTemplateHelper.getDefaultTemplates();
    }

    /**
     * Get current file statistics
     * @returns {object} File statistics
     */
    getFileStatistics() {
        return FileExplorerHelper.getFileStats(this.currentFiles);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        if (this.fileSearch) {
            this.fileSearch.removeEventListener('input', this.debouncedSearch);
        }
        
        // Clear references
        this.webContainerManager = null;
        this.currentFiles = [];
        this.selectedFile = null;
    }
}