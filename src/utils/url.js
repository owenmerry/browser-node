/**
 * URL and navigation utility functions
 */

/**
 * Get URL parameters as an object
 * @returns {object} Object with URL parameters
 */
export function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

/**
 * Set URL parameter without page reload
 * @param {string} key - Parameter key
 * @param {string} value - Parameter value
 */
export function setUrlParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
}

/**
 * Remove URL parameter without page reload
 * @param {string} key - Parameter key to remove
 */
export function removeUrlParam(key) {
    const url = new URL(window.location);
    url.searchParams.delete(key);
    window.history.pushState({}, '', url);
}

/**
 * Generate shareable link with parameters
 * @param {object} params - Parameters to include
 * @returns {string} Complete shareable URL
 */
export function generateShareableLink(params = {}) {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const urlParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            urlParams.set(key, value);
        }
    });
    
    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Open URL in new tab/window
 * @param {string} url - URL to open
 * @param {string} target - Target window name (default '_blank')
 * @returns {Window|null} Opened window or null if blocked
 */
export function openInNewTab(url, target = '_blank') {
    try {
        return window.open(url, target, 'noopener,noreferrer');
    } catch (error) {
        console.error('Failed to open URL:', error);
        return null;
    }
}

/**
 * Check if current page is loaded over HTTPS
 * @returns {boolean} Is HTTPS
 */
export function isHttps() {
    return window.location.protocol === 'https:';
}

/**
 * Get current domain
 * @returns {string} Current domain
 */
export function getCurrentDomain() {
    return window.location.hostname;
}

/**
 * Get current full URL
 * @returns {string} Current full URL
 */
export function getCurrentUrl() {
    return window.location.href;
}

/**
 * Navigate to URL
 * @param {string} url - URL to navigate to
 * @param {boolean} replace - Use replaceState instead of pushState
 */
export function navigateTo(url, replace = false) {
    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
}