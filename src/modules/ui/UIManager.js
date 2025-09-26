/**
 * UI Manager
 * Handles user interface, layout, modals, notifications, and theme management
 */

import { debounce, throttle } from '../../utils/common.js';
import { LayoutHelper, ModalHelper, ToastHelper, ThemeHelper } from './helpers.js';

export class UIManager {
    constructor() {
        this.currentLayout = 'default';
        this.panels = new Map();
        this.modals = new Set();
        this.theme = 'light';
        this.isFullscreen = false;
        
        // Bind methods
        this.togglePanel = this.togglePanel.bind(this);
        this.showNotification = this.showNotification.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Debounced methods
        this.debouncedResize = debounce(this.handleResize, 250);
        
        this.initialize();
    }

    /**
     * Initialize UI Manager
     */
    initialize() {
        this.initializeTheme();
        this.initializeLayout();
        this.initializeEventListeners();
        this.initializeKeyboardShortcuts();
        this.initializeAccessibility();
        
        console.log('UI Manager initialized');
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        ThemeHelper.initialize();
        this.theme = ThemeHelper.getCurrentTheme();
        
        // Listen for theme changes
        document.addEventListener('themeChanged', (e) => {
            this.theme = e.detail.theme;
            this.updateThemeUI();
        });
    }

    /**
     * Initialize responsive layout
     */
    initializeLayout() {
        const mainContainer = document.querySelector('.app-container') || document.body;
        
        // Setup responsive layout
        LayoutHelper.setupResponsiveLayout(mainContainer, {
            terminal: '#terminal-container',
            files: '#file-explorer-container',
            preview: '#preview-container',
            editor: '#editor-container'
        });

        // Initialize panels
        this.initializePanels();
    }

    /**
     * Initialize collapsible panels
     */
    initializePanels() {
        const panelConfigs = [
            {
                id: 'file-explorer',
                title: '📁 File Explorer',
                selector: '#file-explorer-container',
                defaultCollapsed: false,
                resizable: true
            },
            {
                id: 'terminal',
                title: '💻 Terminal',
                selector: '#terminal-container',
                defaultCollapsed: false,
                resizable: true
            },
            {
                id: 'preview',
                title: '👁️ Preview',
                selector: '#preview-container',
                defaultCollapsed: false,
                resizable: true
            }
        ];

        panelConfigs.forEach(config => {
            const element = document.querySelector(config.selector);
            if (element) {
                const panel = this.createPanel(config, element);
                this.panels.set(config.id, panel);
            }
        });
    }

    /**
     * Create collapsible panel
     * @param {object} config - Panel configuration
     * @param {HTMLElement} content - Panel content
     * @returns {object} Panel interface
     */
    createPanel(config, content) {
        // Create panel actions
        const actions = document.createElement('div');
        actions.innerHTML = `
            <button class="panel-action" title="Settings" data-action="settings">⚙️</button>
            <button class="panel-action" title="Help" data-action="help">❓</button>
        `;

        // Setup action handlers
        actions.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handlePanelAction(config.id, action);
            }
        });

        // Create collapsible panel
        const panelElement = LayoutHelper.createCollapsiblePanel(
            config.title,
            content,
            {
                collapsed: config.defaultCollapsed,
                className: `panel-${config.id}`,
                headerActions: actions,
                resizable: config.resizable
            }
        );

        // Replace original content with panel
        content.parentNode.replaceChild(panelElement, content);

        return {
            id: config.id,
            element: panelElement,
            config,
            isCollapsed: () => panelElement.classList.contains('collapsed'),
            toggle: () => {
                const toggle = panelElement.querySelector('.panel-toggle');
                if (toggle) toggle.click();
            },
            show: () => {
                if (panelElement.classList.contains('collapsed')) {
                    const toggle = panelElement.querySelector('.panel-toggle');
                    if (toggle) toggle.click();
                }
            },
            hide: () => {
                if (!panelElement.classList.contains('collapsed')) {
                    const toggle = panelElement.querySelector('.panel-toggle');
                    if (toggle) toggle.click();
                }
            }
        };
    }

    /**
     * Handle panel actions
     * @param {string} panelId - Panel ID
     * @param {string} action - Action name
     */
    handlePanelAction(panelId, action) {
        switch (action) {
            case 'settings':
                this.showPanelSettings(panelId);
                break;
            case 'help':
                this.showPanelHelp(panelId);
                break;
        }
    }

    /**
     * Show panel settings modal
     * @param {string} panelId - Panel ID
     */
    showPanelSettings(panelId) {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        const settingsContent = document.createElement('div');
        settingsContent.innerHTML = `
            <div class="panel-settings">
                <div class="setting-group">
                    <label>
                        <input type="checkbox" ${!panel.isCollapsed() ? 'checked' : ''}> 
                        Panel Visible
                    </label>
                </div>
                <div class="setting-group">
                    <label>
                        Auto-collapse on mobile
                        <input type="checkbox" checked>
                    </label>
                </div>
                <div class="setting-group">
                    <label>
                        Panel Position
                        <select>
                            <option>Default</option>
                            <option>Top</option>
                            <option>Bottom</option>
                            <option>Left</option>
                            <option>Right</option>
                        </select>
                    </label>
                </div>
            </div>
        `;

        const modal = ModalHelper.createModal({
            title: `${panel.config.title} Settings`,
            content: settingsContent,
            actions: [
                { text: 'Cancel', className: 'btn-secondary' },
                { text: 'Save', className: 'btn-primary', onClick: () => {
                    this.savePanelSettings(panelId, settingsContent);
                }}
            ]
        });

        ModalHelper.showModal(modal);
        this.modals.add(modal);
    }

    /**
     * Save panel settings
     * @param {string} panelId - Panel ID
     * @param {HTMLElement} settingsElement - Settings form element
     */
    savePanelSettings(panelId, settingsElement) {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        // Get form values
        const visible = settingsElement.querySelector('input[type="checkbox"]').checked;
        
        // Apply settings
        if (visible && panel.isCollapsed()) {
            panel.show();
        } else if (!visible && !panel.isCollapsed()) {
            panel.hide();
        }

        // Save to localStorage
        const settings = {
            visible,
            panelId
        };
        localStorage.setItem(`panel_settings_${panelId}`, JSON.stringify(settings));

        ToastHelper.showSuccess('Panel settings saved');
    }

    /**
     * Show panel help modal
     * @param {string} panelId - Panel ID
     */
    showPanelHelp(panelId) {
        const helpContent = this.getPanelHelpContent(panelId);
        
        const modal = ModalHelper.createModal({
            title: `Help - ${panelId}`,
            content: helpContent,
            actions: [
                { text: 'Close', className: 'btn-primary' }
            ],
            size: 'large'
        });

        ModalHelper.showModal(modal);
        this.modals.add(modal);
    }

    /**
     * Get help content for panel
     * @param {string} panelId - Panel ID
     * @returns {string} Help content HTML
     */
    getPanelHelpContent(panelId) {
        const helpContent = {
            'file-explorer': `
                <div class="help-content">
                    <h4>File Explorer</h4>
                    <p>Browse and manage your project files.</p>
                    <h5>Features:</h5>
                    <ul>
                        <li>Browse files and folders</li>
                        <li>Create new files and directories</li>
                        <li>Search files by name</li>
                        <li>Upload files from your computer</li>
                    </ul>
                    <h5>Keyboard Shortcuts:</h5>
                    <ul>
                        <li><kbd>Ctrl+N</kbd> - New file</li>
                        <li><kbd>Ctrl+R</kbd> - Refresh</li>
                    </ul>
                </div>
            `,
            'terminal': `
                <div class="help-content">
                    <h4>Terminal</h4>
                    <p>Run commands in the browser-based terminal.</p>
                    <h5>Features:</h5>
                    <ul>
                        <li>Full terminal emulator</li>
                        <li>Node.js command execution</li>
                        <li>Package management (npm, yarn)</li>
                        <li>Project building and running</li>
                    </ul>
                    <h5>Tips:</h5>
                    <ul>
                        <li>Use <code>npm start</code> to run your project</li>
                        <li>All Node.js commands are available</li>
                        <li>Terminal history is preserved</li>
                    </ul>
                </div>
            `,
            'preview': `
                <div class="help-content">
                    <h4>Preview</h4>
                    <p>Live preview of your web applications.</p>
                    <h5>Features:</h5>
                    <ul>
                        <li>Live preview of running applications</li>
                        <li>Responsive testing tools</li>
                        <li>Auto-refresh on changes</li>
                        <li>Full-screen preview mode</li>
                    </ul>
                    <h5>Keyboard Shortcuts:</h5>
                    <ul>
                        <li><kbd>Ctrl+Shift+R</kbd> - Refresh preview</li>
                        <li><kbd>Ctrl+Shift+F</kbd> - Toggle fullscreen</li>
                    </ul>
                </div>
            `
        };

        return helpContent[panelId] || '<p>No help available for this panel.</p>';
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Window resize
        window.addEventListener('resize', this.debouncedResize);

        // Modal events
        document.addEventListener('modalShown', (e) => {
            this.modals.add(e.detail.modal);
        });

        document.addEventListener('modalClosed', (e) => {
            this.modals.delete(e.detail.modal);
        });

        // Error handling
        window.addEventListener('error', (e) => {
            this.showErrorNotification(`Error: ${e.message}`);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.showErrorNotification(`Unhandled error: ${e.reason}`);
        });
    }

    /**
     * Initialize keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 't':
                        e.preventDefault();
                        ThemeHelper.toggleTheme();
                        break;
                    case 'k':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showCommandPalette();
                        }
                        break;
                    case '/':
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                }
            }

            // Panel shortcuts
            if (e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.togglePanel('file-explorer');
                        break;
                    case '2':
                        e.preventDefault();
                        this.togglePanel('terminal');
                        break;
                    case '3':
                        e.preventDefault();
                        this.togglePanel('preview');
                        break;
                }
            }

            // Close modals with Escape
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });
    }

    /**
     * Initialize accessibility features
     */
    initializeAccessibility() {
        // Add skip links
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Add landmarks
        const mainContent = document.querySelector('.app-container');
        if (mainContent) {
            mainContent.setAttribute('role', 'main');
            mainContent.id = 'main-content';
        }

        // Focus management
        this.setupFocusManagement();
    }

    /**
     * Setup focus management for accessibility
     */
    setupFocusManagement() {
        let focusableElements = [];
        let currentFocusIndex = -1;

        const updateFocusableElements = () => {
            focusableElements = Array.from(
                document.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
                )
            ).filter(el => {
                return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.closest('.hidden');
            });
        };

        // Update on DOM changes
        const observer = new MutationObserver(throttle(updateFocusableElements, 500));
        observer.observe(document.body, { childList: true, subtree: true });

        updateFocusableElements();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = window.innerWidth;
        
        // Update layout based on screen size
        if (width < 768) {
            this.setMobileLayout();
        } else if (width < 1024) {
            this.setTabletLayout();
        } else {
            this.setDesktopLayout();
        }

        // Emit resize event
        const event = new CustomEvent('uiResize', {
            detail: { width, height: window.innerHeight }
        });
        document.dispatchEvent(event);
    }

    /**
     * Set mobile layout
     */
    setMobileLayout() {
        this.currentLayout = 'mobile';
        
        // Auto-collapse panels on mobile
        this.panels.forEach(panel => {
            if (panel.config.id !== 'terminal') {
                panel.hide();
            }
        });
    }

    /**
     * Set tablet layout
     */
    setTabletLayout() {
        this.currentLayout = 'tablet';
    }

    /**
     * Set desktop layout
     */
    setDesktopLayout() {
        this.currentLayout = 'desktop';
        
        // Show all panels on desktop
        this.panels.forEach(panel => {
            panel.show();
        });
    }

    /**
     * Toggle panel visibility
     * @param {string} panelId - Panel ID
     */
    togglePanel(panelId) {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.toggle();
        }
    }

    /**
     * Show command palette
     */
    showCommandPalette() {
        const commands = [
            { name: 'Toggle Theme', action: () => ThemeHelper.toggleTheme() },
            { name: 'Show File Explorer', action: () => this.togglePanel('file-explorer') },
            { name: 'Show Terminal', action: () => this.togglePanel('terminal') },
            { name: 'Show Preview', action: () => this.togglePanel('preview') },
            { name: 'Show Keyboard Shortcuts', action: () => this.showKeyboardShortcuts() }
        ];

        const commandList = document.createElement('div');
        commandList.className = 'command-palette';
        commandList.innerHTML = `
            <input type="text" placeholder="Type a command..." class="command-input">
            <div class="command-list">
                ${commands.map(cmd => `
                    <div class="command-item" data-command="${cmd.name}">
                        ${cmd.name}
                    </div>
                `).join('')}
            </div>
        `;

        const modal = ModalHelper.createModal({
            title: 'Command Palette',
            content: commandList,
            size: 'medium',
            className: 'command-palette-modal'
        });

        // Setup command filtering and selection
        const input = commandList.querySelector('.command-input');
        const list = commandList.querySelector('.command-list');
        
        input.addEventListener('input', (e) => {
            const filter = e.target.value.toLowerCase();
            const items = list.querySelectorAll('.command-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(filter) ? 'block' : 'none';
            });
        });

        list.addEventListener('click', (e) => {
            if (e.target.classList.contains('command-item')) {
                const commandName = e.target.dataset.command;
                const command = commands.find(cmd => cmd.name === commandName);
                if (command) {
                    command.action();
                    ModalHelper.closeModal(modal);
                }
            }
        });

        ModalHelper.showModal(modal);
        input.focus();
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        const shortcuts = `
            <div class="keyboard-shortcuts">
                <h4>Global Shortcuts</h4>
                <div class="shortcut-group">
                    <div class="shortcut-item">
                        <kbd>Ctrl+T</kbd> <span>Toggle theme</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+Shift+K</kbd> <span>Command palette</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+/</kbd> <span>Show shortcuts</span>
                    </div>
                </div>

                <h4>Panel Shortcuts</h4>
                <div class="shortcut-group">
                    <div class="shortcut-item">
                        <kbd>Alt+1</kbd> <span>Toggle file explorer</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Alt+2</kbd> <span>Toggle terminal</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Alt+3</kbd> <span>Toggle preview</span>
                    </div>
                </div>

                <h4>Preview Shortcuts</h4>
                <div class="shortcut-group">
                    <div class="shortcut-item">
                        <kbd>Ctrl+Shift+R</kbd> <span>Refresh preview</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+Shift+F</kbd> <span>Toggle fullscreen</span>
                    </div>
                </div>
            </div>
        `;

        const modal = ModalHelper.createModal({
            title: 'Keyboard Shortcuts',
            content: shortcuts,
            actions: [
                { text: 'Close', className: 'btn-primary' }
            ],
            size: 'large'
        });

        ModalHelper.showModal(modal);
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {object} options - Notification options
     */
    showNotification(message, options = {}) {
        return ToastHelper.showToast(message, options);
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     */
    showSuccessNotification(message) {
        return ToastHelper.showSuccess(message);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     */
    showErrorNotification(message) {
        return ToastHelper.showError(message);
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     */
    showWarningNotification(message) {
        return ToastHelper.showWarning(message);
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Confirmation callback
     * @param {Function} onCancel - Cancel callback
     */
    showConfirmDialog(message, onConfirm, onCancel) {
        const modal = ModalHelper.createConfirmDialog(message, onConfirm, onCancel);
        ModalHelper.showModal(modal);
        this.modals.add(modal);
        return modal;
    }

    /**
     * Close the top-most modal
     */
    closeTopModal() {
        const modalsArray = Array.from(this.modals);
        if (modalsArray.length > 0) {
            const topModal = modalsArray[modalsArray.length - 1];
            ModalHelper.closeModal(topModal);
        }
    }

    /**
     * Update theme-related UI elements
     */
    updateThemeUI() {
        // Update any theme-specific UI elements
        const themeIndicator = document.querySelector('.theme-indicator');
        if (themeIndicator) {
            themeIndicator.textContent = this.theme === 'dark' ? '🌙' : '☀️';
        }
    }

    /**
     * Get current layout information
     * @returns {object} Layout information
     */
    getLayoutInfo() {
        return {
            currentLayout: this.currentLayout,
            panels: Array.from(this.panels.keys()),
            activeModals: this.modals.size,
            theme: this.theme,
            isFullscreen: this.isFullscreen
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.debouncedResize);

        // Close all modals
        this.modals.forEach(modal => {
            ModalHelper.closeModal(modal);
        });

        // Clear references
        this.panels.clear();
        this.modals.clear();
    }
}