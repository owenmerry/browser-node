/**
 * Browser Node - Main Entry Point
 * A powerful Node.js development environment that runs entirely in your browser
 */

import { BrowserNodeApp } from './BrowserNodeApp.js';

// Initialize the application
let app = null;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

/**
 * Initialize the Browser Node application
 */
async function initializeApp() {
    try {
        console.log('🚀 Starting Browser Node Application...');
        
        // Create and initialize the application
        app = new BrowserNodeApp();
        
        // Make available globally for debugging
        window.browserNodeApp = app;
        
        console.log('✅ Browser Node Application started successfully!');
        
    } catch (error) {
        console.error('❌ Failed to start Browser Node Application:', error);
        
        // Show basic error message if UI is not available
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.innerHTML = `
            <h3>❌ Initialization Error</h3>
            <p>${error.message}</p>
            <p><small>Check console for details</small></p>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-remove error after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app && typeof app.destroy === 'function') {
        console.log('🧹 Cleaning up Browser Node Application...');
        app.destroy();
    }
});

// Handle errors gracefully
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
