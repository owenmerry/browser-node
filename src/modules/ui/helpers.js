/**
 * UI and interface helper functions
 */

import { throttle, debounce } from '../../utils/common.js';

/**
 * Layout and responsive helpers
 */
export class LayoutHelper {
    /**
     * Setup responsive layout with panels
     * @param {HTMLElement} container - Main container
     * @param {object} panels - Panel configuration
     */
    static setupResponsiveLayout(container, panels = {}) {
        if (!container) return;

        const {
            terminal = '#terminal-container',
            files = '#file-explorer',
            preview = '#preview-container',
            editor = '#editor-container'
        } = panels;

        // Add responsive classes
        container.classList.add('responsive-layout');
        
        // Create layout structure
        const layout = document.createElement('div');
        layout.className = 'layout-grid';
        
        // Move existing panels into layout
        const terminalEl = document.querySelector(terminal);
        const filesEl = document.querySelector(files);
        const previewEl = document.querySelector(preview);
        const editorEl = document.querySelector(editor);

        if (terminalEl) {
            terminalEl.className += ' layout-panel terminal-panel';
            layout.appendChild(terminalEl);
        }

        if (filesEl) {
            filesEl.className += ' layout-panel files-panel';
            layout.appendChild(filesEl);
        }

        if (editorEl) {
            editorEl.className += ' layout-panel editor-panel';
            layout.appendChild(editorEl);
        }

        if (previewEl) {
            previewEl.className += ' layout-panel preview-panel';
            layout.appendChild(previewEl);
        }

        container.appendChild(layout);

        // Setup media query handlers
        this.setupMediaQueryHandlers(container);
    }

    /**
     * Setup media query handlers for responsive design
     * @param {HTMLElement} container - Layout container
     */
    static setupMediaQueryHandlers(container) {
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const tabletQuery = window.matchMedia('(max-width: 1024px)');

        const handleMobile = (e) => {
            if (e.matches) {
                container.classList.add('mobile-layout');
                container.classList.remove('tablet-layout', 'desktop-layout');
            }
        };

        const handleTablet = (e) => {
            if (e.matches && !mobileQuery.matches) {
                container.classList.add('tablet-layout');
                container.classList.remove('mobile-layout', 'desktop-layout');
            }
        };

        const handleDesktop = () => {
            if (!mobileQuery.matches && !tabletQuery.matches) {
                container.classList.add('desktop-layout');
                container.classList.remove('mobile-layout', 'tablet-layout');
            }
        };

        // Initial setup
        handleMobile(mobileQuery);
        handleTablet(tabletQuery);
        handleDesktop();

        // Listen for changes
        mobileQuery.addListener(handleMobile);
        tabletQuery.addListener(handleTablet);
    }

    /**
     * Create collapsible panel
     * @param {string} title - Panel title
     * @param {HTMLElement} content - Panel content
     * @param {object} options - Panel options
     * @returns {HTMLElement} Panel element
     */
    static createCollapsiblePanel(title, content, options = {}) {
        const { 
            collapsed = false, 
            className = '', 
            headerActions = null,
            resizable = false 
        } = options;

        const panel = document.createElement('div');
        panel.className = `collapsible-panel ${className} ${collapsed ? 'collapsed' : ''}`;

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <button class="panel-toggle" aria-expanded="${!collapsed}">
                <span class="toggle-icon">${collapsed ? '▶' : '▼'}</span>
                <span class="panel-title">${title}</span>
            </button>
        `;

        // Add header actions if provided
        if (headerActions) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'panel-actions';
            actionsContainer.appendChild(headerActions);
            header.appendChild(actionsContainer);
        }

        const body = document.createElement('div');
        body.className = 'panel-body';
        body.style.display = collapsed ? 'none' : 'block';
        body.appendChild(content);

        panel.appendChild(header);
        panel.appendChild(body);

        // Toggle functionality
        const toggle = header.querySelector('.panel-toggle');
        const icon = header.querySelector('.toggle-icon');
        
        toggle.addEventListener('click', () => {
            const isCollapsed = panel.classList.contains('collapsed');
            
            if (isCollapsed) {
                panel.classList.remove('collapsed');
                body.style.display = 'block';
                icon.textContent = '▼';
                toggle.setAttribute('aria-expanded', 'true');
            } else {
                panel.classList.add('collapsed');
                body.style.display = 'none';
                icon.textContent = '▶';
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Make resizable if requested
        if (resizable) {
            this.makeResizable(panel);
        }

        return panel;
    }

    /**
     * Make element resizable
     * @param {HTMLElement} element - Element to make resizable
     */
    static makeResizable(element) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        element.appendChild(resizeHandle);

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        });

        const handleResize = (e) => {
            if (!isResizing) return;
            const height = startHeight + e.clientY - startY;
            element.style.height = Math.max(100, height) + 'px';
        };

        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        };
    }

    /**
     * Create tabbed interface
     * @param {Array} tabs - Tab configuration
     * @param {HTMLElement} container - Container element
     * @returns {object} Tab interface
     */
    static createTabbedInterface(tabs, container) {
        if (!container) return null;

        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';

        const tabHeaders = document.createElement('div');
        tabHeaders.className = 'tab-headers';

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';

        let activeTab = 0;

        tabs.forEach((tab, index) => {
            // Create tab header
            const header = document.createElement('button');
            header.className = `tab-header ${index === activeTab ? 'active' : ''}`;
            header.innerHTML = `${tab.icon || ''} ${tab.title}`;
            header.addEventListener('click', () => switchTab(index));
            tabHeaders.appendChild(header);

            // Create tab panel
            const panel = document.createElement('div');
            panel.className = `tab-panel ${index === activeTab ? 'active' : ''}`;
            panel.appendChild(tab.content);
            tabContent.appendChild(panel);
        });

        const switchTab = (index) => {
            // Update headers
            tabHeaders.querySelectorAll('.tab-header').forEach((header, i) => {
                header.classList.toggle('active', i === index);
            });

            // Update panels
            tabContent.querySelectorAll('.tab-panel').forEach((panel, i) => {
                panel.classList.toggle('active', i === index);
            });

            activeTab = index;

            // Emit tab change event
            const event = new CustomEvent('tabChanged', {
                detail: { index, tab: tabs[index] }
            });
            tabContainer.dispatchEvent(event);
        };

        tabContainer.appendChild(tabHeaders);
        tabContainer.appendChild(tabContent);
        container.appendChild(tabContainer);

        return {
            container: tabContainer,
            switchTab,
            getActiveTab: () => activeTab,
            addTab: (tab) => {
                tabs.push(tab);
                // Re-render tabs
                tabHeaders.innerHTML = '';
                tabContent.innerHTML = '';
                tabs.forEach((t, i) => {
                    // Re-create headers and panels
                    const header = document.createElement('button');
                    header.className = `tab-header ${i === activeTab ? 'active' : ''}`;
                    header.innerHTML = `${t.icon || ''} ${t.title}`;
                    header.addEventListener('click', () => switchTab(i));
                    tabHeaders.appendChild(header);

                    const panel = document.createElement('div');
                    panel.className = `tab-panel ${i === activeTab ? 'active' : ''}`;
                    panel.appendChild(t.content);
                    tabContent.appendChild(panel);
                });
            }
        };
    }
}

/**
 * Modal and dialog helpers
 */
export class ModalHelper {
    /**
     * Create modal dialog
     * @param {object} config - Modal configuration
     * @returns {HTMLElement} Modal element
     */
    static createModal(config) {
        const {
            title = '',
            content = '',
            actions = [],
            className = '',
            backdrop = true,
            keyboard = true,
            size = 'medium'
        } = config;

        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');

        const modalDialog = document.createElement('div');
        modalDialog.className = `modal-dialog modal-${size}`;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Header
        if (title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.innerHTML = `
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="modal-close" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            `;
            modalContent.appendChild(header);
        }

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        modalContent.appendChild(body);

        // Footer with actions
        if (actions.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `btn ${action.className || 'btn-secondary'}`;
                button.textContent = action.text;
                button.onclick = action.onClick || (() => this.closeModal(modal));
                footer.appendChild(button);
            });
            
            modalContent.appendChild(footer);
        }

        modalDialog.appendChild(modalContent);
        modal.appendChild(modalDialog);

        // Event listeners
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal(modal);
        }

        // Backdrop click to close
        if (backdrop) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            };
        }

        // Keyboard support
        if (keyboard) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    this.closeModal(modal);
                }
            });
        }

        return modal;
    }

    /**
     * Show modal
     * @param {HTMLElement} modal - Modal element
     */
    static showModal(modal) {
        document.body.appendChild(modal);
        modal.classList.add('show');
        modal.style.display = 'block';
        
        // Focus management
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Emit show event
        const event = new CustomEvent('modalShown', { detail: { modal } });
        document.dispatchEvent(event);
    }

    /**
     * Close modal
     * @param {HTMLElement} modal - Modal element
     */
    static closeModal(modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300); // Wait for animation

        // Emit close event
        const event = new CustomEvent('modalClosed', { detail: { modal } });
        document.dispatchEvent(event);
    }

    /**
     * Create confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Confirmation callback
     * @param {Function} onCancel - Cancel callback
     * @returns {HTMLElement} Modal element
     */
    static createConfirmDialog(message, onConfirm, onCancel = null) {
        return this.createModal({
            title: 'Confirm Action',
            content: `<p>${message}</p>`,
            actions: [
                {
                    text: 'Cancel',
                    className: 'btn-secondary',
                    onClick: () => {
                        if (onCancel) onCancel();
                    }
                },
                {
                    text: 'Confirm',
                    className: 'btn-primary',
                    onClick: () => {
                        if (onConfirm) onConfirm();
                    }
                }
            ],
            size: 'small'
        });
    }

    /**
     * Show alert dialog
     * @param {string} message - Alert message
     * @param {string} type - Alert type ('info', 'warning', 'error', 'success')
     */
    static showAlert(message, type = 'info') {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️', 
            error: '❌',
            success: '✅'
        };

        const modal = this.createModal({
            title: `${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            content: `<p>${message}</p>`,
            actions: [
                {
                    text: 'OK',
                    className: 'btn-primary'
                }
            ],
            size: 'small',
            className: `alert-${type}`
        });

        this.showModal(modal);
    }
}

/**
 * Toast notification helpers
 */
export class ToastHelper {
    static toastContainer = null;

    /**
     * Initialize toast container
     */
    static initializeContainer() {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {object} options - Toast options
     */
    static showToast(message, options = {}) {
        this.initializeContainer();

        const {
            type = 'info',
            duration = 4000,
            closable = true,
            actions = []
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        let actionsHtml = '';
        if (actions.length > 0) {
            actionsHtml = '<div class="toast-actions">' +
                actions.map(action => 
                    `<button class="toast-action" onclick="${action.onClick}">${action.text}</button>`
                ).join('') +
                '</div>';
        }

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <span class="toast-message">${message}</span>
            </div>
            ${actionsHtml}
            ${closable ? '<button class="toast-close">&times;</button>' : ''}
        `;

        // Close functionality
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.onclick = () => this.removeToast(toast);
        }

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        // Add to container
        this.toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        return toast;
    }

    /**
     * Remove toast
     * @param {HTMLElement} toast - Toast element
     */
    static removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Show success toast
     * @param {string} message - Success message
     * @param {number} duration - Display duration
     */
    static showSuccess(message, duration = 3000) {
        return this.showToast(message, { type: 'success', duration });
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     * @param {number} duration - Display duration
     */
    static showError(message, duration = 5000) {
        return this.showToast(message, { type: 'error', duration, closable: true });
    }

    /**
     * Show warning toast
     * @param {string} message - Warning message
     * @param {number} duration - Display duration
     */
    static showWarning(message, duration = 4000) {
        return this.showToast(message, { type: 'warning', duration });
    }

    /**
     * Clear all toasts
     */
    static clearAll() {
        if (this.toastContainer) {
            this.toastContainer.innerHTML = '';
        }
    }
}

/**
 * Theme and appearance helpers
 */
export class ThemeHelper {
    /**
     * Initialize theme system
     */
    static initialize() {
        // Load saved theme
        const savedTheme = localStorage.getItem('app-theme') || 'light';
        this.setTheme(savedTheme);
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            if (!localStorage.getItem('app-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Set application theme
     * @param {string} theme - Theme name ('light', 'dark', 'auto')
     */
    static setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
        
        // Emit theme change event
        const event = new CustomEvent('themeChanged', { detail: { theme } });
        document.dispatchEvent(event);
    }

    /**
     * Toggle between light and dark themes
     */
    static toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Get current theme
     * @returns {string} Current theme
     */
    static getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
}