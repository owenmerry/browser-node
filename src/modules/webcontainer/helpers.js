/**
 * WebContainer-specific helper functions
 */

/**
 * WebContainer configuration and utilities
 */
export class WebContainerHelper {
    /**
     * Get optimal WebContainer boot options
     * @returns {object} Boot options
     */
    static getBootOptions() {
        return {
            // Add any specific boot options when needed
            coep: 'require-corp',
            coop: 'same-origin'
        };
    }

    /**
     * Validate file path for WebContainer
     * @param {string} path - File path to validate
     * @returns {boolean} Is valid path
     */
    static isValidPath(path) {
        // Check for invalid characters and patterns
        const invalidPatterns = [
            /\.\./,  // No parent directory traversal
            /^\/+$/,  // Not just slashes
            /[<>:"|?*]/, // No invalid filename characters
        ];

        return !invalidPatterns.some(pattern => pattern.test(path));
    }

    /**
     * Normalize file path for WebContainer
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    static normalizePath(path) {
        if (!path || typeof path !== 'string') {
            return '/';
        }

        // Ensure path starts with /
        let normalized = path.startsWith('/') ? path : `/${path}`;
        
        // Remove duplicate slashes
        normalized = normalized.replace(/\/+/g, '/');
        
        // Remove trailing slash unless it's root
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    }

    /**
     * Check if path is a directory based on convention
     * @param {string} path - Path to check
     * @returns {boolean} Likely a directory
     */
    static isLikelyDirectory(path) {
        const directoryIndicators = [
            path.endsWith('/'),
            !path.includes('.') && !path.endsWith('/'),
            /\/(src|public|dist|build|node_modules|assets|components|pages|utils|lib|test|tests)$/.test(path)
        ];

        return directoryIndicators.some(indicator => indicator);
    }

    /**
     * Get file type from path
     * @param {string} path - File path
     * @returns {string} File type
     */
    static getFileType(path) {
        const extension = path.split('.').pop()?.toLowerCase();
        
        const typeMap = {
            // Web
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'ts': 'application/typescript',
            'jsx': 'text/jsx',
            'tsx': 'text/tsx',
            
            // Data
            'json': 'application/json',
            'xml': 'application/xml',
            'yml': 'application/yaml',
            'yaml': 'application/yaml',
            'toml': 'application/toml',
            
            // Text
            'txt': 'text/plain',
            'md': 'text/markdown',
            'log': 'text/plain',
            
            // Images
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            
            // Other
            'pdf': 'application/pdf',
            'zip': 'application/zip'
        };

        return typeMap[extension] || 'application/octet-stream';
    }

    /**
     * Check if file is binary based on extension
     * @param {string} path - File path
     * @returns {boolean} Is binary file
     */
    static isBinaryFile(path) {
        const binaryExtensions = [
            'exe', 'bin', 'dll', 'so', 'dylib',
            'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp',
            'mp3', 'wav', 'ogg', 'flac', 'aac',
            'mp4', 'avi', 'mov', 'wmv', 'webm',
            'zip', 'tar', 'gz', 'rar', '7z',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
        ];

        const extension = path.split('.').pop()?.toLowerCase();
        return binaryExtensions.includes(extension);
    }

    /**
     * Generate directory tree structure
     * @param {Array} entries - Directory entries
     * @param {string} basePath - Base path
     * @returns {Array} Tree structure
     */
    static buildDirectoryTree(entries, basePath = '') {
        const tree = [];
        
        entries.forEach(entry => {
            const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
            
            tree.push({
                name: entry.name,
                path: fullPath,
                type: entry.isDirectory() ? 'directory' : 'file',
                isDirectory: entry.isDirectory(),
                size: entry.size || 0,
                modified: entry.mtime || null
            });
        });

        // Sort directories first, then files
        return tree.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Check if WebContainer API is available
     * @returns {boolean} WebContainer available
     */
    static isWebContainerAvailable() {
        try {
            return typeof WebContainer !== 'undefined';
        } catch {
            return false;
        }
    }

    /**
     * Check if browser supports WebContainer requirements
     * @returns {object} Support status
     */
    static checkBrowserSupport() {
        const checks = {
            webAssembly: typeof WebAssembly !== 'undefined',
            sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
            crossOriginIsolated: window.crossOriginIsolated === true,
            serviceWorker: 'serviceWorker' in navigator,
            webWorkers: typeof Worker !== 'undefined'
        };

        const supported = Object.values(checks).every(check => check);

        return {
            supported,
            checks,
            missingFeatures: Object.entries(checks)
                .filter(([, supported]) => !supported)
                .map(([feature]) => feature)
        };
    }

    /**
     * Get WebContainer environment info
     * @param {object} webcontainerInstance - WebContainer instance
     * @returns {Promise<object>} Environment information
     */
    static async getEnvironmentInfo(webcontainerInstance) {
        if (!webcontainerInstance) {
            return null;
        }

        try {
            // Try to get basic environment info
            const nodeVersionProcess = await webcontainerInstance.spawn('node', ['--version']);
            const npmVersionProcess = await webcontainerInstance.spawn('npm', ['--version']);

            let nodeVersion = '';
            let npmVersion = '';

            // Read node version
            const nodeReader = nodeVersionProcess.output.getReader();
            try {
                const { value } = await nodeReader.read();
                if (value) {
                    nodeVersion = new TextDecoder().decode(value).trim();
                }
            } finally {
                nodeReader.releaseLock();
            }

            // Read npm version
            const npmReader = npmVersionProcess.output.getReader();
            try {
                const { value } = await npmReader.read();
                if (value) {
                    npmVersion = new TextDecoder().decode(value).trim();
                }
            } finally {
                npmReader.releaseLock();
            }

            return {
                nodeVersion: nodeVersion || 'unknown',
                npmVersion: npmVersion || 'unknown',
                platform: 'webcontainer',
                architecture: 'wasm32'
            };
        } catch (error) {
            console.warn('Failed to get environment info:', error);
            return {
                nodeVersion: 'unknown',
                npmVersion: 'unknown',
                platform: 'webcontainer',
                architecture: 'wasm32'
            };
        }
    }

    /**
     * Create default package.json content
     * @param {string} name - Project name
     * @param {object} options - Additional options
     * @returns {object} Package.json object
     */
    static createDefaultPackageJson(name, options = {}) {
        return {
            name: name || 'webcontainer-project',
            version: '1.0.0',
            description: options.description || 'A WebContainer project',
            main: 'index.js',
            type: options.type || 'module',
            scripts: {
                start: 'node index.js',
                dev: options.devCommand || 'node index.js',
                build: 'echo "No build script specified"',
                test: 'echo "Error: no test specified" && exit 1',
                ...options.scripts
            },
            keywords: options.keywords || ['webcontainer', 'browser', 'nodejs'],
            author: options.author || '',
            license: options.license || 'MIT',
            dependencies: options.dependencies || {},
            devDependencies: options.devDependencies || {}
        };
    }
}