/**
 * GitHub-related utility functions
 */

/**
 * Parse GitHub URL and extract owner and repository name
 * @param {string} url - GitHub URL
 * @returns {object|null} Object with owner and repo, or null if invalid
 */
export function parseGitHubUrl(url) {
    if (!url) return null;
    
    const patterns = [
        /github\.com\/([^\/]+)\/([^\/]+)/,
        /github\.com\/([^\/]+)\/([^\/]+)\.git/,
        /git@github\.com:([^\/]+)\/([^\/]+)\.git/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return {
                owner: match[1],
                repo: match[2].replace(/\.git$/, '')
            };
        }
    }
    
    return null;
}

/**
 * Generate GitHub raw content URLs for different branches
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} filepath - File path
 * @returns {string[]} Array of possible URLs
 */
export function generateGitHubRawUrls(owner, repo, filepath) {
    const branches = ['main', 'master'];
    return branches.map(branch => 
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`
    );
}

/**
 * Generate GitHub API URL for repository info
 * @param {string} owner - Repository owner  
 * @param {string} repo - Repository name
 * @returns {string} GitHub API URL
 */
export function generateGitHubApiUrl(owner, repo) {
    return `https://api.github.com/repos/${owner}/${repo}`;
}

/**
 * Generate GitHub API URL for file contents
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} filepath - File path
 * @returns {string} GitHub API URL
 */
export function generateGitHubFileApiUrl(owner, repo, filepath) {
    return `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`;
}

/**
 * Check if a URL is a valid GitHub repository URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid GitHub repo URL
 */
export function isValidGitHubUrl(url) {
    const parsed = parseGitHubUrl(url);
    return parsed !== null;
}

/**
 * Extract repository name from GitHub URL
 * @param {string} url - GitHub URL
 * @returns {string|null} Repository name or null
 */
export function extractRepoName(url) {
    const parsed = parseGitHubUrl(url);
    return parsed ? parsed.repo : null;
}

/**
 * Extract owner name from GitHub URL
 * @param {string} url - GitHub URL
 * @returns {string|null} Owner name or null
 */
export function extractOwnerName(url) {
    const parsed = parseGitHubUrl(url);
    return parsed ? parsed.owner : null;
}

/**
 * Generate GitHub repository web URL from owner and repo
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {string} GitHub web URL
 */
export function generateGitHubUrl(owner, repo) {
    return `https://github.com/${owner}/${repo}`;
}

/**
 * Generate CORS proxy URLs for GitHub API calls
 * @param {string} apiUrl - Original GitHub API URL
 * @returns {string[]} Array of proxy URLs
 */
export function generateCorsProxyUrls(apiUrl) {
    const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://corsproxy.io/?'
    ];
    
    return proxies.map(proxy => `${proxy}${encodeURIComponent(apiUrl)}`);
}