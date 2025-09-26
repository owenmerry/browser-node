/**
 * Global helper functions for common operations
 */

import { debounce, throttle } from '../utils/common.js';

/**
 * Terminal output parsing and detection helpers
 */
export class OutputParser {
    /**
     * Parse server detection patterns from terminal output
     * @param {string} output - Terminal output
     * @returns {number|null} Detected port number or null
     */
    static parseServerPort(output) {
        const serverPatterns = [
            // Astro specific patterns
            /Local:\s*http:\/\/localhost:(\d+)/i,
            /🚀.*Local:\s*http:\/\/localhost:(\d+)/i,
            /astro.*dev.*localhost:(\d+)/i,
            /dev server.*localhost:(\d+)/i,
            // Generic localhost patterns
            /localhost:(\d+)(?!\d)/g,
            /http:\/\/localhost:(\d+)/g,
            // Port-only patterns
            /listening.*port[:\s]+(\d+)/i,
            /server.*port[:\s]+(\d+)/i,
            /running.*port[:\s]+(\d+)/i,
            // Framework specific
            /astro.*ready.*(\d+)/i,
            /next.*ready.*(\d+)/i,
            /vite.*ready.*(\d+)/i,
            // Common dev ports
            /(4321|3000|3001|5173|8080|8000)/g
        ];

        for (const pattern of serverPatterns) {
            const match = output.match(pattern);
            if (match && match[1]) {
                const port = parseInt(match[1]);
                // Only handle valid port numbers for dev servers
                if (port >= 3000 && port <= 9999) {
                    return port;
                }
            }
        }

        return null;
    }

    /**
     * Check if output contains server ready messages
     * @param {string} output - Terminal output
     * @returns {boolean} Contains ready message
     */
    static containsReadyMessage(output) {
        const readyMessages = [
            /ready in \d+ms/i,
            /compiled successfully/i,
            /development server is ready/i,
            /build complete/i,
            /astro.*ready/i,
            /next.*ready/i,
            /vite.*ready/i,
            /server.*running/i
        ];

        return readyMessages.some(pattern => output.match(pattern));
    }

    /**
     * Check if output contains error messages
     * @param {string} output - Terminal output
     * @returns {boolean} Contains error message
     */
    static containsError(output) {
        const errorPatterns = [
            /error:/i,
            /failed/i,
            /exception/i,
            /cannot find module/i,
            /syntax error/i,
            /command not found/i
        ];

        return errorPatterns.some(pattern => output.match(pattern));
    }
}

/**
 * Project type detection helpers
 */
export class ProjectDetector {
    /**
     * Detect project type from package.json content
     * @param {string} packageJsonContent - package.json content
     * @returns {string} Project type
     */
    static detectProjectType(packageJsonContent) {
        if (!packageJsonContent) return 'unknown';

        try {
            const packageJson = JSON.parse(packageJsonContent);
            const dependencies = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            // Check for specific frameworks
            if (dependencies.astro) return 'astro';
            if (dependencies.next) return 'next';
            if (dependencies.react) return 'react';
            if (dependencies.vue) return 'vue';
            if (dependencies.angular) return 'angular';
            if (dependencies.svelte) return 'svelte';
            if (dependencies.express) return 'express';
            if (dependencies.fastify) return 'fastify';
            if (dependencies.koa) return 'koa';
            if (dependencies.vite) return 'vite';

            // Check scripts for clues
            const scripts = packageJson.scripts || {};
            if (scripts.dev && scripts.dev.includes('astro')) return 'astro';
            if (scripts.dev && scripts.dev.includes('next')) return 'next';
            if (scripts.dev && scripts.dev.includes('vite')) return 'vite';

            return 'node';
        } catch (error) {
            console.warn('Failed to parse package.json:', error);
            return 'unknown';
        }
    }

    /**
     * Get default port for project type
     * @param {string} projectType - Project type
     * @returns {number} Default port
     */
    static getDefaultPort(projectType) {
        const portMap = {
            astro: 4321,
            next: 3000,
            react: 3000,
            vue: 8080,
            angular: 4200,
            svelte: 5173,
            vite: 5173,
            express: 3000,
            node: 3000
        };

        return portMap[projectType] || 3000;
    }

    /**
     * Get common development commands for project type
     * @param {string} projectType - Project type
     * @returns {string[]} Array of common commands
     */
    static getCommonCommands(projectType) {
        const commandMap = {
            astro: ['npm install', 'npm run dev', 'npm run build'],
            next: ['npm install', 'npm run dev', 'npm run build'],
            react: ['npm install', 'npm start', 'npm run build'],
            vue: ['npm install', 'npm run serve', 'npm run build'],
            angular: ['npm install', 'ng serve', 'ng build'],
            svelte: ['npm install', 'npm run dev', 'npm run build'],
            vite: ['npm install', 'npm run dev', 'npm run build'],
            express: ['npm install', 'npm start', 'node index.js'],
            node: ['npm install', 'npm start', 'node index.js']
        };

        return commandMap[projectType] || ['npm install', 'npm start'];
    }
}

/**
 * File system helpers
 */
export class FileSystemHelper {
    /**
     * Get file extension from filename
     * @param {string} filename - Filename
     * @returns {string} File extension
     */
    static getFileExtension(filename) {
        return filename.split('.').pop()?.toLowerCase() || '';
    }

    /**
     * Check if file is a text file based on extension
     * @param {string} filename - Filename
     * @returns {boolean} Is text file
     */
    static isTextFile(filename) {
        const textExtensions = [
            'txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss',
            'json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'env', 'gitignore',
            'py', 'java', 'c', 'cpp', 'h', 'php', 'rb', 'go', 'rs', 'swift'
        ];
        
        const extension = this.getFileExtension(filename);
        return textExtensions.includes(extension);
    }

    /**
     * Get appropriate icon for file type
     * @param {string} filename - Filename
     * @param {boolean} isDirectory - Is directory
     * @returns {string} Icon emoji
     */
    static getFileIcon(filename, isDirectory = false) {
        if (isDirectory) return '📁';

        const extension = this.getFileExtension(filename);
        const iconMap = {
            js: '📄',
            ts: '📘',
            jsx: '⚛️',
            tsx: '⚛️',
            html: '🌐',
            css: '🎨',
            scss: '🎨',
            json: '📋',
            md: '📝',
            txt: '📄',
            py: '🐍',
            java: '☕',
            php: '🐘',
            rb: '💎',
            go: '🐹',
            rs: '🦀',
            swift: '🦉',
            xml: '📄',
            yml: '⚙️',
            yaml: '⚙️',
            env: '🔧',
            gitignore: '🙈',
            dockerfile: '🐳',
            image: '🖼️',
            video: '🎬',
            audio: '🎵',
            zip: '📦',
            pdf: '📕'
        };

        // Check for special filenames
        if (filename.toLowerCase().includes('dockerfile')) return '🐳';
        if (filename.toLowerCase().includes('readme')) return '📖';
        if (filename.toLowerCase().includes('license')) return '📜';
        if (filename.toLowerCase().includes('package')) return '📦';

        // Check for image/media files
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
        const videoExts = ['mp4', 'avi', 'mov', 'webm'];
        const audioExts = ['mp3', 'wav', 'ogg', 'flac'];

        if (imageExts.includes(extension)) return iconMap.image;
        if (videoExts.includes(extension)) return iconMap.video;
        if (audioExts.includes(extension)) return iconMap.audio;

        return iconMap[extension] || '📄';
    }

    /**
     * Sanitize filename for safe usage
     * @param {string} filename - Filename to sanitize
     * @returns {string} Sanitized filename
     */
    static sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9.-]/gi, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
}

/**
 * Async operation helpers
 */
export class AsyncHelper {
    /**
     * Retry an async operation with exponential backoff
     * @param {Function} operation - Async operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise} Operation result
     */
    static async retry(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw lastError;
                }
                
                const delay = baseDelay * Math.pow(2, attempt);
                await this.sleep(delay);
            }
        }
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after timeout
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a debounced version of an async function
     * @param {Function} func - Async function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    static debounceAsync(func, wait) {
        return debounce(func, wait);
    }

    /**
     * Create a throttled version of an async function
     * @param {Function} func - Async function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttleAsync(func, limit) {
        return throttle(func, limit);
    }
}