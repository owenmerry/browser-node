/**
 * Preview Manager
 * Handles iframe preview functionality, responsive testing, and live reloading
 */

import { debounce, throttle } from '../../utils/common.js';
import { PreviewHelper, URLHelper, PreviewStateHelper } from './helpers.js';

export class PreviewManager {
    constructor() {
        this.currentURL = null;
        this.iframe = null;
        this.container = null;
        this.autoRefreshEnabled = false;
        this.autoRefreshInterval = null;
        this.consoleMessages = [];
        
        // Bind methods
        this.updatePreview = this.updatePreview.bind(this);
        this.refreshPreview = this.refreshPreview.bind(this);
        this.toggleAutoRefresh = this.toggleAutoRefresh.bind(this);
        
        // Debounced methods
        this.debouncedUpdate = debounce(this.updatePreview, 500);
        this.throttledRefresh = throttle(this.refreshPreview, 1000);
        
        this.initializeElements();
        this.loadSavedState();
    }

    /**
     * Initialize DOM elements and event listeners
     */
    initializeElements() {
        this.container = document.getElementById('previewContainer');
        this.urlInput = document.getElementById('previewUrl');
        this.refreshBtn = document.getElementById('refresh-preview-btn');
        this.autoRefreshBtn = document.getElementById('auto-refresh-btn');
        this.fullscreenBtn = document.getElementById('fullscreen-preview-btn');
        this.consolePanel = document.getElementById('console-panel');
        this.responsiveToggle = document.getElementById('responsive-toggle');
        
        this.setupEventListeners();
        this.createPreviewContainer();
    }

    /**
     * Set up event listeners for preview controls
     */
    setupEventListeners() {
        // URL input
        if (this.urlInput) {
            this.urlInput.addEventListener('input', (e) => {
                this.debouncedUpdate(e.target.value);
            });
            
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.updatePreview(e.target.value);
                }
            });
        }

        // Refresh button
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => {
                this.throttledRefresh();
            });
        }

        // Auto-refresh toggle
        if (this.autoRefreshBtn) {
            this.autoRefreshBtn.addEventListener('click', () => {
                this.toggleAutoRefresh();
            });
        }

        // Fullscreen button
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Responsive toggle
        if (this.responsiveToggle) {
            this.responsiveToggle.addEventListener('click', () => {
                this.toggleResponsiveMode();
            });
        }

        // Listen for WebContainer port changes
        document.addEventListener('webContainerPort', (e) => {
            this.handlePortChange(e.detail.port);
        });

        // Listen for project changes
        document.addEventListener('projectLoaded', (e) => {
            this.handleProjectChange(e.detail);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'r':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.refreshPreview();
                        }
                        break;
                    case 'f':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.toggleFullscreen();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Create preview container structure
     */
    createPreviewContainer() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="preview-header">
                <div class="preview-controls">
                    <input type="url" id="preview-url-input" placeholder="Enter URL to preview...">
                    <button id="preview-refresh" title="Refresh (Ctrl+Shift+R)">🔄</button>
                    <button id="preview-auto-refresh" title="Toggle Auto-refresh">⚡</button>
                    <button id="preview-responsive" title="Responsive Mode">📱</button>
                    <button id="preview-fullscreen" title="Fullscreen (Ctrl+Shift+F)">⛶</button>
                    <button id="preview-console" title="Console">💬</button>
                </div>
                <div class="preview-status">
                    <span id="preview-status-text">Ready</span>
                </div>
            </div>
            <div class="preview-content">
                <div id="preview-frame-container"></div>
                <div id="preview-console-panel" class="console-panel hidden">
                    <div class="console-header">
                        <h3>Console</h3>
                        <button id="console-clear">Clear</button>
                        <button id="console-close">×</button>
                    </div>
                    <div class="console-content">
                        <div id="console-messages"></div>
                    </div>
                </div>
            </div>
        `;

        // Update element references
        this.updateElementReferences();
        this.setupNewEventListeners();
    }

    /**
     * Update element references after DOM creation
     */
    updateElementReferences() {
        this.urlInput = document.getElementById('preview-url-input');
        this.refreshBtn = document.getElementById('preview-refresh');
        this.autoRefreshBtn = document.getElementById('preview-auto-refresh');
        this.responsiveBtn = document.getElementById('preview-responsive');
        this.fullscreenBtn = document.getElementById('preview-fullscreen');
        this.consoleBtn = document.getElementById('preview-console');
        this.frameContainer = document.getElementById('preview-frame-container');
        this.consolePanel = document.getElementById('preview-console-panel');
        this.statusText = document.getElementById('preview-status-text');
    }

    /**
     * Setup event listeners for newly created elements
     */
    setupNewEventListeners() {
        if (this.urlInput) {
            this.urlInput.addEventListener('input', (e) => {
                this.debouncedUpdate(e.target.value);
            });
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.updatePreview(e.target.value);
                }
            });
        }

        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshPreview());
        }

        if (this.autoRefreshBtn) {
            this.autoRefreshBtn.addEventListener('click', () => this.toggleAutoRefresh());
        }

        if (this.responsiveBtn) {
            this.responsiveBtn.addEventListener('click', () => this.toggleResponsiveMode());
        }

        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        if (this.consoleBtn) {
            this.consoleBtn.addEventListener('click', () => this.toggleConsole());
        }

        // Console controls
        const consoleClear = document.getElementById('console-clear');
        if (consoleClear) {
            consoleClear.addEventListener('click', () => this.clearConsole());
        }

        const consoleClose = document.getElementById('console-close');
        if (consoleClose) {
            consoleClose.addEventListener('click', () => this.toggleConsole());
        }
    }

    /**
     * Update preview with new URL
     * @param {string} url - URL to preview
     */
    async updatePreview(url) {
        if (!url) return;

        // Validate URL
        const validation = URLHelper.validateIframeURL(url);
        if (!validation.valid) {
            this.showError(validation.reason);
            return;
        }

        this.currentURL = url;
        this.updateStatus('Loading...');
        
        // Save state
        this.saveCurrentState();

        try {
            // Remove existing iframe
            if (this.iframe) {
                this.iframe.remove();
            }

            // Show loading overlay
            const loadingOverlay = PreviewHelper.createLoadingOverlay('Loading preview...');
            this.frameContainer.appendChild(loadingOverlay);

            // Create new iframe
            this.iframe = PreviewHelper.createIframe(url, {
                title: `Preview: ${url}`,
                responsive: true,
                sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation'
            });

            // Setup iframe handlers
            PreviewHelper.setupIframeHandlers(this.iframe, {
                onLoadStart: () => {
                    this.updateStatus('Loading...');
                },
                onLoad: (result) => {
                    loadingOverlay.remove();
                    if (result.success) {
                        this.updateStatus('Loaded');
                        this.onPreviewLoaded(result);
                    } else {
                        this.showError('Failed to load preview');
                    }
                },
                onError: (error) => {
                    loadingOverlay.remove();
                    this.showError(error.error);
                    this.updateStatus('Error');
                }
            });

            // Setup console monitoring
            PreviewHelper.monitorConsole(this.iframe, (message) => {
                this.addConsoleMessage(message);
            });

            // Add iframe to container
            this.frameContainer.appendChild(this.iframe);

            // Update URL input
            if (this.urlInput) {
                this.urlInput.value = url;
            }

        } catch (error) {
            this.showError(`Preview error: ${error.message}`);
            this.updateStatus('Error');
        }
    }

    /**
     * Handle successful preview load
     * @param {object} result - Load result
     */
    onPreviewLoaded(result) {
        // Enable responsive controls if not already added
        if (!this.frameContainer.querySelector('.responsive-controls')) {
            PreviewHelper.addResponsiveControls(this.frameContainer);
        }

        // Emit preview loaded event
        const event = new CustomEvent('previewLoaded', {
            detail: { url: this.currentURL, result }
        });
        document.dispatchEvent(event);
    }

    /**
     * Refresh current preview
     */
    refreshPreview() {
        if (this.currentURL) {
            // Add cache busting parameter
            const refreshURL = URLHelper.addURLParams(this.currentURL);
            this.updatePreview(refreshURL);
        }
    }

    /**
     * Toggle auto-refresh functionality
     */
    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        
        if (this.autoRefreshEnabled) {
            this.autoRefreshInterval = setInterval(() => {
                this.refreshPreview();
            }, 5000); // Refresh every 5 seconds
            
            if (this.autoRefreshBtn) {
                this.autoRefreshBtn.classList.add('active');
                this.autoRefreshBtn.title = 'Disable Auto-refresh';
            }
        } else {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
            
            if (this.autoRefreshBtn) {
                this.autoRefreshBtn.classList.remove('active');
                this.autoRefreshBtn.title = 'Enable Auto-refresh';
            }
        }

        this.saveCurrentState();
    }

    /**
     * Toggle responsive testing mode
     */
    toggleResponsiveMode() {
        const controls = this.frameContainer.querySelector('.responsive-controls');
        if (controls) {
            controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
        } else if (this.iframe) {
            PreviewHelper.addResponsiveControls(this.frameContainer);
        }

        if (this.responsiveBtn) {
            this.responsiveBtn.classList.toggle('active');
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!this.container) return;

        if (this.container.classList.contains('fullscreen')) {
            this.container.classList.remove('fullscreen');
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        } else {
            this.container.classList.add('fullscreen');
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            }
        }

        if (this.fullscreenBtn) {
            this.fullscreenBtn.classList.toggle('active');
        }
    }

    /**
     * Toggle console panel
     */
    toggleConsole() {
        if (this.consolePanel) {
            this.consolePanel.classList.toggle('hidden');
            
            if (this.consoleBtn) {
                this.consoleBtn.classList.toggle('active');
            }
        }
    }

    /**
     * Add message to console
     * @param {object} message - Console message
     */
    addConsoleMessage(message) {
        this.consoleMessages.push({
            ...message,
            timestamp: new Date().toLocaleTimeString()
        });

        // Limit console messages
        if (this.consoleMessages.length > 100) {
            this.consoleMessages = this.consoleMessages.slice(-50);
        }

        this.renderConsoleMessages();
    }

    /**
     * Render console messages
     */
    renderConsoleMessages() {
        const messagesContainer = document.getElementById('console-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = this.consoleMessages
            .map(msg => `
                <div class="console-message console-${msg.type}">
                    <span class="console-timestamp">${msg.timestamp}</span>
                    <span class="console-content">${msg.args.join(' ')}</span>
                </div>
            `)
            .join('');

        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Clear console messages
     */
    clearConsole() {
        this.consoleMessages = [];
        this.renderConsoleMessages();
    }

    /**
     * Show error message
     * @param {string} error - Error message
     */
    showError(error) {
        if (this.iframe) {
            this.iframe.remove();
        }

        const errorOverlay = PreviewHelper.createErrorOverlay(error, () => {
            if (this.currentURL) {
                this.updatePreview(this.currentURL);
            }
        });

        this.frameContainer.appendChild(errorOverlay);
    }

    /**
     * Update status text
     * @param {string} status - Status message
     */
    updateStatus(status) {
        if (this.statusText) {
            this.statusText.textContent = status;
        }
    }

    /**
     * Handle WebContainer port change
     * @param {number} port - New port number
     */
    handlePortChange(port) {
        const newURL = `http://localhost:${port}`;
        this.updatePreview(newURL);
    }

    /**
     * Handle project change
     * @param {object} project - Project details
     */
    handleProjectChange(project) {
        // Auto-detect preview URL based on project type
        const previewURL = this.detectPreviewURL(project);
        if (previewURL) {
            this.updatePreview(previewURL);
        }
    }

    /**
     * Detect preview URL based on project configuration
     * @param {object} project - Project details
     * @returns {string|null} Preview URL
     */
    detectPreviewURL(project) {
        // Check for common development servers
        const commonPorts = [3000, 8080, 5000, 4200, 3001];
        
        // Try to detect based on package.json
        if (project.packageJson?.scripts?.start) {
            // Default to port 3000 for most Node.js projects
            return 'http://localhost:3000';
        }

        // Try other common ports
        return `http://localhost:${commonPorts[0]}`;
    }

    /**
     * Save current preview state
     */
    saveCurrentState() {
        const state = {
            url: this.currentURL,
            autoRefreshEnabled: this.autoRefreshEnabled,
            responsive: this.responsiveBtn?.classList.contains('active') || false,
            consoleOpen: !this.consolePanel?.classList.contains('hidden')
        };

        PreviewStateHelper.saveState('current', state);
    }

    /**
     * Load saved preview state
     */
    loadSavedState() {
        const state = PreviewStateHelper.loadState('current');
        if (state) {
            if (state.url) {
                this.updatePreview(state.url);
            }
            
            if (state.autoRefreshEnabled) {
                this.toggleAutoRefresh();
            }
            
            if (state.consoleOpen && this.consolePanel) {
                this.consolePanel.classList.remove('hidden');
            }
        }
    }

    /**
     * Get current preview URL
     * @returns {string|null} Current URL
     */
    getCurrentURL() {
        return this.currentURL;
    }

    /**
     * Get preview statistics
     * @returns {object} Preview statistics
     */
    getPreviewStats() {
        return {
            currentURL: this.currentURL,
            autoRefreshEnabled: this.autoRefreshEnabled,
            consoleMessages: this.consoleMessages.length,
            isResponsiveMode: this.responsiveBtn?.classList.contains('active') || false,
            isFullscreen: this.container?.classList.contains('fullscreen') || false
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Clear auto-refresh interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        // Remove iframe
        if (this.iframe) {
            this.iframe.remove();
        }

        // Clear references
        this.currentURL = null;
        this.consoleMessages = [];
    }
}