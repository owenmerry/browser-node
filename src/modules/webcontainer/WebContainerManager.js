import { WebContainer } from '@webcontainer/api';
import { WebContainerHelper } from './helpers.js';

export class WebContainerManager {
    constructor() {
        this.webcontainerInstance = null;
        this.isBooting = false;
        this.bootPromise = null;
        this.environmentInfo = null;
    }

    /**
     * Boot WebContainer instance
     * @param {object} options - Boot options
     * @returns {Promise<object>} WebContainer instance
     */
    async bootWebContainer(options = {}) {
        // Return existing instance if already booted
        if (this.webcontainerInstance) {
            return this.webcontainerInstance;
        }

        // Return existing boot promise if currently booting
        if (this.isBooting && this.bootPromise) {
            return this.bootPromise;
        }

        try {
            this.isBooting = true;
            
            // Check browser support first
            const supportStatus = WebContainerHelper.checkBrowserSupport();
            if (!supportStatus.supported) {
                throw new Error(`Browser not supported. Missing: ${supportStatus.missingFeatures.join(', ')}`);
            }

            console.log('Booting WebContainer...');
            
            // Create boot promise
            this.bootPromise = this.performBoot(options);
            this.webcontainerInstance = await this.bootPromise;
            
            // Get environment information
            this.environmentInfo = await WebContainerHelper.getEnvironmentInfo(this.webcontainerInstance);
            
            console.log('WebContainer booted successfully', this.environmentInfo);
            return this.webcontainerInstance;

        } catch (error) {
            console.error('Error booting WebContainer:', error);
            this.webcontainerInstance = null;
            this.bootPromise = null;
            throw error;
        } finally {
            this.isBooting = false;
        }
    }

    /**
     * Perform the actual WebContainer boot
     * @param {object} options - Boot options
     * @returns {Promise<object>} WebContainer instance
     * @private
     */
    async performBoot(options) {
        const bootOptions = {
            ...WebContainerHelper.getBootOptions(),
            ...options
        };

        return await WebContainer.boot(bootOptions);
    }

    /**
     * Get WebContainer instance
     * @returns {object|null} WebContainer instance
     */
    getInstance() {
        return this.webcontainerInstance;
    }

    /**
     * Get environment information
     * @returns {object|null} Environment info
     */
    getEnvironmentInfo() {
        return this.environmentInfo;
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path to check
     * @returns {Promise<boolean>} File exists
     */
    async fileExists(filePath) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(filePath);
        
        try {
            const stats = await this.webcontainerInstance.fs.stat(normalizedPath);
            return !!stats;
        } catch (error) {
            return false;
        }
    }

    /**
     * Read file content
     * @param {string} filePath - File path
     * @param {string} encoding - File encoding (default 'utf-8')
     * @returns {Promise<string|Uint8Array>} File content
     */
    async readFile(filePath, encoding = 'utf-8') {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(filePath);

        try {
            if (WebContainerHelper.isBinaryFile(normalizedPath)) {
                // Read as binary for binary files
                return await this.webcontainerInstance.fs.readFile(normalizedPath);
            } else {
                // Read as text with encoding
                return await this.webcontainerInstance.fs.readFile(normalizedPath, encoding);
            }
        } catch (error) {
            console.error(`Error reading file ${normalizedPath}:`, error);
            throw error;
        }
    }

    /**
     * Write file content
     * @param {string} filePath - File path
     * @param {string|Uint8Array} content - File content
     * @param {object} options - Write options
     * @returns {Promise<void>}
     */
    async writeFile(filePath, content, options = {}) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(filePath);

        // Validate path
        if (!WebContainerHelper.isValidPath(normalizedPath)) {
            throw new Error(`Invalid file path: ${normalizedPath}`);
        }

        try {
            // Ensure parent directory exists
            const parentDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
            if (parentDir && parentDir !== '/') {
                await this.mkdir(parentDir);
            }

            await this.webcontainerInstance.fs.writeFile(normalizedPath, content, options);
        } catch (error) {
            console.error(`Error writing file ${normalizedPath}:`, error);
            throw error;
        }
    }

    /**
     * Create directory
     * @param {string} dirPath - Directory path
     * @param {object} options - Options (recursive, mode)
     * @returns {Promise<void>}
     */
    async mkdir(dirPath, options = {}) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(dirPath);

        // Validate path
        if (!WebContainerHelper.isValidPath(normalizedPath)) {
            throw new Error(`Invalid directory path: ${normalizedPath}`);
        }

        try {
            await this.webcontainerInstance.fs.mkdir(normalizedPath, { 
                recursive: true,
                ...options 
            });
        } catch (error) {
            // Ignore error if directory already exists
            if (error.code !== 'EEXIST') {
                console.error(`Error creating directory ${normalizedPath}:`, error);
                throw error;
            }
        }
    }

    /**
     * Read directory contents
     * @param {string} dirPath - Directory path
     * @param {object} options - Options (withFileTypes)
     * @returns {Promise<Array>} Directory entries
     */
    async readdir(dirPath, options = {}) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(dirPath);

        try {
            const entries = await this.webcontainerInstance.fs.readdir(normalizedPath, { 
                withFileTypes: true,
                ...options 
            });

            return WebContainerHelper.buildDirectoryTree(entries, normalizedPath);
        } catch (error) {
            console.error(`Error reading directory ${normalizedPath}:`, error);
            return [];
        }
    }

    /**
     * Get file/directory stats
     * @param {string} path - File or directory path
     * @returns {Promise<object>} File stats
     */
    async stat(path) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(path);

        try {
            return await this.webcontainerInstance.fs.stat(normalizedPath);
        } catch (error) {
            console.error(`Error getting stats for ${normalizedPath}:`, error);
            throw error;
        }
    }

    /**
     * Remove file or directory
     * @param {string} path - Path to remove
     * @param {object} options - Options (recursive, force)
     * @returns {Promise<void>}
     */
    async remove(path, options = {}) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        const normalizedPath = WebContainerHelper.normalizePath(path);

        try {
            const stats = await this.stat(normalizedPath);
            
            if (stats.isDirectory()) {
                await this.webcontainerInstance.fs.rmdir(normalizedPath, {
                    recursive: true,
                    ...options
                });
            } else {
                await this.webcontainerInstance.fs.unlink(normalizedPath);
            }
        } catch (error) {
            console.error(`Error removing ${normalizedPath}:`, error);
            throw error;
        }
    }

    /**
     * Spawn a process
     * @param {string} command - Command to spawn
     * @param {Array} args - Command arguments
     * @param {object} options - Spawn options
     * @returns {Promise<object>} Process object
     */
    async spawn(command, args = [], options = {}) {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        try {
            const process = await this.webcontainerInstance.spawn(command, args, options);
            return process;
        } catch (error) {
            console.error(`Error spawning command ${command}:`, error);
            throw error;
        }
    }

    /**
     * Mount file system from object
     * @param {object} files - File system structure
     * @param {string} mountPath - Mount path (default '/')
     * @returns {Promise<void>}
     */
    async mountFiles(files, mountPath = '/') {
        if (!this.webcontainerInstance) {
            throw new Error('WebContainer not initialized');
        }

        try {
            await this.webcontainerInstance.mount(files, mountPath);
        } catch (error) {
            console.error('Error mounting files:', error);
            throw error;
        }
    }

    /**
     * Create a basic project structure
     * @param {string} projectName - Project name
     * @param {object} options - Project options
     * @returns {Promise<string>} Project path
     */
    async createProject(projectName, options = {}) {
        const projectPath = `/${projectName}`;
        
        // Create project directory
        await this.mkdir(projectPath);

        // Create package.json
        const packageJson = WebContainerHelper.createDefaultPackageJson(projectName, options);
        await this.writeFile(
            `${projectPath}/package.json`,
            JSON.stringify(packageJson, null, 2)
        );

        // Create basic index.js if not provided
        if (!options.skipIndexFile) {
            const indexJs = options.indexContent || this.getDefaultIndexContent(projectName);
            await this.writeFile(`${projectPath}/index.js`, indexJs);
        }

        // Create README.md
        if (!options.skipReadme) {
            const readme = options.readmeContent || this.getDefaultReadmeContent(projectName, options);
            await this.writeFile(`${projectPath}/README.md`, readme);
        }

        return projectPath;
    }

    /**
     * Get default index.js content
     * @param {string} projectName - Project name
     * @returns {string} Default index.js content
     * @private
     */
    getDefaultIndexContent(projectName) {
        return `// ${projectName}
console.log('🚀 Welcome to ${projectName}!');
console.log('This project is running in WebContainer environment.');

// Basic HTTP server
import { createServer } from 'http';

const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${projectName}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px;
                    text-align: center;
                }
                h1 { color: #4CAF50; }
            </style>
        </head>
        <body>
            <h1>🚀 ${projectName}</h1>
            <p>Your project is running successfully!</p>
            <p>Created with WebContainer</p>
        </body>
        </html>
    \`);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(\`🌐 Server running at http://localhost:\${port}\`);
});
`;
    }

    /**
     * Get default README.md content
     * @param {string} projectName - Project name
     * @param {object} options - Project options
     * @returns {string} Default README content
     * @private
     */
    getDefaultReadmeContent(projectName, options) {
        return `# ${projectName}

${options.description || 'A WebContainer project running in the browser.'}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Features

- ✅ Runs in the browser with WebContainer
- ✅ Full Node.js environment
- ✅ Real-time development
- ✅ No local setup required

## Development

This project runs in a browser-based WebContainer environment. You can:

- Edit files in real-time
- Install npm packages
- Run Node.js applications
- Use all standard Node.js APIs

Happy coding! 🚀
`;
    }

    /**
     * Check WebContainer status
     * @returns {object} Status information
     */
    getStatus() {
        return {
            isInitialized: !!this.webcontainerInstance,
            isBooting: this.isBooting,
            environmentInfo: this.environmentInfo,
            browserSupport: WebContainerHelper.checkBrowserSupport()
        };
    }

    /**
     * Clean up WebContainer resources
     */
    cleanup() {
        try {
            if (this.webcontainerInstance) {
                // WebContainer cleanup if needed in future versions
                this.webcontainerInstance = null;
            }
            
            this.environmentInfo = null;
            this.bootPromise = null;
            this.isBooting = false;
            
            console.log('WebContainer cleaned up successfully');
        } catch (error) {
            console.error('Error during WebContainer cleanup:', error);
        }
    }
}