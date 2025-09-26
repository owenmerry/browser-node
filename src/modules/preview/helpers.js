/**
 * Preview and iframe management helper functions
 */

import { debounce } from '../../utils/common.js';

/**
 * Preview iframe helpers
 */
export class PreviewHelper {
    /**
     * Create iframe element with proper attributes
     * @param {string} src - Source URL
     * @param {object} options - Iframe options
     * @returns {HTMLIFrameElement} Iframe element
     */
    static createIframe(src, options = {}) {
        const iframe = document.createElement('iframe');
        
        // Set basic attributes
        iframe.src = src;
        iframe.width = options.width || '100%';
        iframe.height = options.height || '100%';
        iframe.frameBorder = '0';
        iframe.style.border = 'none';
        
        // Security attributes
        iframe.sandbox = options.sandbox || 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        
        // Accessibility
        if (options.title) {
            iframe.title = options.title;
        }
        
        // Additional attributes
        if (options.allow) {
            iframe.allow = options.allow;
        }
        
        if (options.loading) {
            iframe.loading = options.loading; // 'lazy' or 'eager'
        }

        // Add responsive classes if specified
        if (options.responsive) {
            iframe.className = 'responsive-iframe';
        }

        return iframe;
    }

    /**
     * Setup iframe with loading states and error handling
     * @param {HTMLIFrameElement} iframe - Iframe element
     * @param {object} callbacks - Callback functions
     */
    static setupIframeHandlers(iframe, callbacks = {}) {
        const { onLoad, onError, onLoadStart } = callbacks;
        
        // Loading state
        if (onLoadStart) {
            onLoadStart();
        }

        // Success handler
        iframe.onload = () => {
            try {
                // Check if iframe content is accessible
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                
                if (onLoad) {
                    onLoad({
                        success: true,
                        accessible: !!iframeDoc,
                        url: iframe.src
                    });
                }
            } catch (error) {
                // Cross-origin access denied
                if (onLoad) {
                    onLoad({
                        success: true,
                        accessible: false,
                        url: iframe.src,
                        error: 'Cross-origin access denied'
                    });
                }
            }
        };

        // Error handler
        iframe.onerror = (error) => {
            if (onError) {
                onError({
                    success: false,
                    error: error.message || 'Failed to load iframe',
                    url: iframe.src
                });
            }
        };

        // Timeout handler
        const timeout = setTimeout(() => {
            if (onError) {
                onError({
                    success: false,
                    error: 'Iframe loading timeout',
                    url: iframe.src
                });
            }
        }, 30000); // 30 second timeout

        // Clear timeout on load
        iframe.addEventListener('load', () => clearTimeout(timeout), { once: true });
        iframe.addEventListener('error', () => clearTimeout(timeout), { once: true });
    }

    /**
     * Create loading overlay for preview
     * @param {string} message - Loading message
     * @returns {HTMLElement} Loading overlay element
     */
    static createLoadingOverlay(message = 'Loading preview...') {
        const overlay = document.createElement('div');
        overlay.className = 'preview-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        return overlay;
    }

    /**
     * Create error overlay for preview
     * @param {string} error - Error message
     * @param {Function} retryCallback - Retry function
     * @returns {HTMLElement} Error overlay element
     */
    static createErrorOverlay(error, retryCallback = null) {
        const overlay = document.createElement('div');
        overlay.className = 'preview-error-overlay';
        
        const retryButton = retryCallback 
            ? `<button class="retry-btn" onclick="this.parentElement.parentElement.remove(); (${retryCallback})()">Retry</button>`
            : '';
        
        overlay.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h3>Preview Error</h3>
                <p>${error}</p>
                ${retryButton}
            </div>
        `;
        return overlay;
    }

    /**
     * Add mobile responsiveness controls
     * @param {HTMLElement} container - Preview container
     * @returns {object} Control elements
     */
    static addResponsiveControls(container) {
        const controls = document.createElement('div');
        controls.className = 'responsive-controls';
        
        const devices = [
            { name: 'Desktop', width: '100%', height: '100%', icon: '🖥️' },
            { name: 'Tablet', width: '768px', height: '1024px', icon: '📱' },
            { name: 'Mobile', width: '375px', height: '667px', icon: '📱' },
            { name: 'Small Mobile', width: '320px', height: '568px', icon: '📱' }
        ];

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'device-buttons';

        devices.forEach((device, index) => {
            const button = document.createElement('button');
            button.className = `device-btn ${index === 0 ? 'active' : ''}`;
            button.innerHTML = `${device.icon} ${device.name}`;
            button.onclick = () => {
                // Remove active class from all buttons
                buttonContainer.querySelectorAll('.device-btn').forEach(btn => 
                    btn.classList.remove('active')
                );
                button.classList.add('active');
                
                // Update iframe dimensions
                const iframe = container.querySelector('iframe');
                if (iframe) {
                    iframe.style.width = device.width;
                    iframe.style.height = device.height;
                    iframe.style.maxWidth = '100%';
                    iframe.style.maxHeight = '100%';
                }
            };
            buttonContainer.appendChild(button);
        });

        controls.appendChild(buttonContainer);
        container.insertBefore(controls, container.firstChild);
        
        return {
            controls,
            buttons: buttonContainer.querySelectorAll('.device-btn')
        };
    }

    /**
     * Setup auto-refresh for development
     * @param {HTMLIFrameElement} iframe - Iframe element
     * @param {number} interval - Refresh interval in ms
     * @returns {Function} Stop function
     */
    static setupAutoRefresh(iframe, interval = 5000) {
        const refresh = () => {
            if (iframe && iframe.src) {
                // Add timestamp to prevent caching
                const url = new URL(iframe.src);
                url.searchParams.set('_t', Date.now());
                iframe.src = url.toString();
            }
        };

        const intervalId = setInterval(refresh, interval);
        
        // Return stop function
        return () => clearInterval(intervalId);
    }

    /**
     * Monitor iframe for console messages (if accessible)
     * @param {HTMLIFrameElement} iframe - Iframe element
     * @param {Function} onMessage - Message handler
     */
    static monitorConsole(iframe, onMessage) {
        try {
            iframe.onload = () => {
                try {
                    const iframeWindow = iframe.contentWindow;
                    if (!iframeWindow) return;

                    // Override console methods
                    const originalLog = iframeWindow.console.log;
                    const originalError = iframeWindow.console.error;
                    const originalWarn = iframeWindow.console.warn;

                    iframeWindow.console.log = (...args) => {
                        originalLog.apply(iframeWindow.console, args);
                        onMessage({ type: 'log', args });
                    };

                    iframeWindow.console.error = (...args) => {
                        originalError.apply(iframeWindow.console, args);
                        onMessage({ type: 'error', args });
                    };

                    iframeWindow.console.warn = (...args) => {
                        originalWarn.apply(iframeWindow.console, args);
                        onMessage({ type: 'warn', args });
                    };

                    // Listen for errors
                    iframeWindow.addEventListener('error', (event) => {
                        onMessage({
                            type: 'error',
                            args: [event.message],
                            source: event.filename,
                            line: event.lineno
                        });
                    });

                } catch (error) {
                    // Cross-origin restrictions
                    console.warn('Cannot monitor iframe console due to cross-origin restrictions');
                }
            };
        } catch (error) {
            console.warn('Console monitoring setup failed:', error);
        }
    }
}

/**
 * URL and link validation helpers
 */
export class URLHelper {
    /**
     * Validate if URL is safe for iframe
     * @param {string} url - URL to validate
     * @returns {object} Validation result
     */
    static validateIframeURL(url) {
        try {
            const urlObj = new URL(url);
            
            // Check protocol
            const allowedProtocols = ['http:', 'https:'];
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return {
                    valid: false,
                    reason: 'Invalid protocol. Only HTTP and HTTPS are allowed.'
                };
            }

            // Check for localhost/development URLs
            const isLocalhost = urlObj.hostname === 'localhost' || 
                               urlObj.hostname === '127.0.0.1' ||
                               urlObj.hostname.includes('local') ||
                               urlObj.hostname.includes('dev');

            // Check for suspicious domains (basic security)
            const suspiciousDomains = ['data:', 'javascript:', 'vbscript:'];
            if (suspiciousDomains.some(domain => url.toLowerCase().includes(domain))) {
                return {
                    valid: false,
                    reason: 'Potentially unsafe URL detected.'
                };
            }

            return {
                valid: true,
                isLocalhost,
                protocol: urlObj.protocol,
                host: urlObj.host
            };
            
        } catch (error) {
            return {
                valid: false,
                reason: 'Invalid URL format.'
            };
        }
    }

    /**
     * Add URL parameters for cache busting
     * @param {string} url - Original URL
     * @param {object} params - Additional parameters
     * @returns {string} URL with parameters
     */
    static addURLParams(url, params = {}) {
        try {
            const urlObj = new URL(url);
            
            // Add cache busting timestamp
            urlObj.searchParams.set('_t', Date.now());
            
            // Add custom parameters
            Object.entries(params).forEach(([key, value]) => {
                urlObj.searchParams.set(key, value);
            });
            
            return urlObj.toString();
        } catch (error) {
            console.warn('Failed to add URL parameters:', error);
            return url;
        }
    }

    /**
     * Extract base URL from full URL
     * @param {string} url - Full URL
     * @returns {string} Base URL
     */
    static getBaseURL(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}`;
        } catch (error) {
            return url;
        }
    }

    /**
     * Check if URL is reachable
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} Reachability status
     */
    static async isURLReachable(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                timeout: 5000
            });
            return true;
        } catch (error) {
            // For no-cors requests, we can't determine the actual status
            // but if no error is thrown, the URL is likely reachable
            return false;
        }
    }
}

/**
 * Preview state management helpers
 */
export class PreviewStateHelper {
    /**
     * Save preview state to localStorage
     * @param {string} key - Storage key
     * @param {object} state - State object
     */
    static saveState(key, state) {
        try {
            localStorage.setItem(`preview_${key}`, JSON.stringify({
                ...state,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to save preview state:', error);
        }
    }

    /**
     * Load preview state from localStorage
     * @param {string} key - Storage key
     * @returns {object|null} Saved state
     */
    static loadState(key) {
        try {
            const saved = localStorage.getItem(`preview_${key}`);
            if (saved) {
                const state = JSON.parse(saved);
                
                // Check if state is not too old (24 hours)
                const maxAge = 24 * 60 * 60 * 1000;
                if (Date.now() - state.timestamp < maxAge) {
                    return state;
                }
            }
        } catch (error) {
            console.warn('Failed to load preview state:', error);
        }
        return null;
    }

    /**
     * Clear preview state
     * @param {string} key - Storage key
     */
    static clearState(key) {
        try {
            localStorage.removeItem(`preview_${key}`);
        } catch (error) {
            console.warn('Failed to clear preview state:', error);
        }
    }

    /**
     * Get all preview states
     * @returns {object} All saved states
     */
    static getAllStates() {
        const states = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('preview_')) {
                    const stateKey = key.replace('preview_', '');
                    states[stateKey] = this.loadState(stateKey);
                }
            }
        } catch (error) {
            console.warn('Failed to get preview states:', error);
        }
        return states;
    }
}