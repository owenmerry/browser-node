/**
 * GitHub repository-specific helper functions
 */

import { 
    parseGitHubUrl, 
    generateGitHubRawUrls, 
    generateGitHubApiUrl,
    generateCorsProxyUrls 
} from '../../utils/github.js';

/**
 * GitHub API interaction helpers
 */
export class GitHubApiHelper {
    /**
     * Fetch repository information with fallback methods
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Promise<object>} Repository data
     */
    static async fetchRepositoryInfo(owner, repo) {
        const apiUrl = generateGitHubApiUrl(owner, repo);
        
        // Try multiple approaches to get repository info
        const attempts = [
            // Direct GitHub API (may work if CORS allows)
            {
                url: apiUrl,
                headers: { 'Accept': 'application/vnd.github.v3+json' },
                isProxy: false
            },
            // Try CORS proxies
            ...generateCorsProxyUrls(apiUrl).map(url => ({
                url,
                isProxy: true
            }))
        ];

        for (const attempt of attempts) {
            try {
                console.log(`Trying to fetch repo info from: ${attempt.url}`);
                const response = await fetch(attempt.url, { 
                    headers: attempt.headers || {} 
                });

                if (response.ok) {
                    const data = await response.json();
                    // Handle proxy response format
                    const repoData = attempt.isProxy && data.contents 
                        ? JSON.parse(data.contents) 
                        : data;
                    
                    if (repoData && repoData.name) {
                        console.log(`Successfully fetched repo info for ${owner}/${repo}`);
                        return repoData;
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch repo info from ${attempt.url}:`, error.message);
            }
        }
        
        // Return basic repo structure if all API calls fail
        console.log(`All API attempts failed, creating basic repo info for ${owner}/${repo}`);
        return this.createFallbackRepoData(owner, repo);
    }

    /**
     * Create fallback repository data when API calls fail
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {object} Basic repository data
     */
    static createFallbackRepoData(owner, repo) {
        return {
            name: repo,
            full_name: `${owner}/${repo}`,
            description: `Repository ${owner}/${repo}`,
            owner: { login: owner },
            html_url: `https://github.com/${owner}/${repo}`,
            language: 'JavaScript', // Default assumption
            stargazers_count: 0,
            forks_count: 0,
            topics: [],
            license: null,
            default_branch: 'main'
        };
    }

    /**
     * Fetch file content from GitHub with multiple fallback methods
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} filepath - File path
     * @returns {Promise<string|null>} File content or null
     */
    static async fetchFileContent(owner, repo, filepath) {
        // Generate all possible URLs to try
        const rawUrls = generateGitHubRawUrls(owner, repo, filepath);
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`;
        
        const attempts = [
            ...rawUrls,
            apiUrl
        ];

        for (const url of attempts) {
            try {
                console.log(`Trying to fetch ${filepath} from: ${url}`);
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.text();
                    
                    // If it's from the API, it might be JSON with base64 content
                    if (url.includes('api.github.com')) {
                        try {
                            const jsonData = JSON.parse(data);
                            if (jsonData.content) {
                                const content = atob(jsonData.content);
                                console.log(`Successfully fetched ${filepath} via API`);
                                return content;
                            }
                        } catch (parseError) {
                            // If parsing fails, data might be plain text already
                            console.log(`Successfully fetched ${filepath} as plain text`);
                            return data;
                        }
                    } else {
                        // Raw content
                        console.log(`Successfully fetched ${filepath} from raw URL`);
                        return data;
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch ${filepath} from ${url}:`, error.message);
            }
        }
        
        console.log(`Could not fetch ${filepath} from any source`);
        return null;
    }
}

/**
 * Project type detection and configuration
 */
export class ProjectTypeHelper {
    /**
     * Detect project type from files and package.json
     * @param {object} packageJson - Parsed package.json
     * @param {Array} files - Available files
     * @returns {string} Project type
     */
    static detectProjectType(packageJson, files = []) {
        // Check package.json dependencies
        if (packageJson) {
            const deps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            if (deps.astro) return 'astro';
            if (deps.next) return 'next';
            if (deps.nuxt) return 'nuxt';
            if (deps.react && deps['react-scripts']) return 'create-react-app';
            if (deps.react) return 'react';
            if (deps.vue) return 'vue';
            if (deps.angular) return 'angular';
            if (deps.svelte) return 'svelte';
            if (deps.express) return 'express';
            if (deps.fastify) return 'fastify';
            if (deps.koa) return 'koa';
            if (deps.vite) return 'vite';
        }

        // Check for specific config files
        const configFiles = files.map(f => f.toLowerCase());
        
        if (configFiles.includes('astro.config.mjs') || configFiles.includes('astro.config.js')) {
            return 'astro';
        }
        if (configFiles.includes('next.config.js') || configFiles.includes('next.config.mjs')) {
            return 'next';
        }
        if (configFiles.includes('nuxt.config.js') || configFiles.includes('nuxt.config.ts')) {
            return 'nuxt';
        }
        if (configFiles.includes('vue.config.js')) {
            return 'vue';
        }
        if (configFiles.includes('angular.json')) {
            return 'angular';
        }
        if (configFiles.includes('svelte.config.js')) {
            return 'svelte';
        }
        if (configFiles.includes('vite.config.js') || configFiles.includes('vite.config.ts')) {
            return 'vite';
        }

        // Check for specific directories
        if (files.some(f => f.toLowerCase().includes('src/pages'))) {
            return 'astro'; // or Next.js, but Astro is more likely with src/pages
        }

        return 'node';
    }

    /**
     * Get project configuration based on type
     * @param {string} projectType - Project type
     * @returns {object} Project configuration
     */
    static getProjectConfig(projectType) {
        const configs = {
            astro: {
                defaultPort: 4321,
                devCommand: 'npm run dev',
                buildCommand: 'npm run build',
                startCommand: 'npm start',
                directories: ['src', 'src/pages', 'src/components', 'src/layouts', 'public'],
                mainFiles: ['src/pages/index.astro'],
                configFiles: ['astro.config.mjs'],
                dependencies: {
                    'astro': '^4.0.0'
                },
                scripts: {
                    'dev': 'astro dev',
                    'start': 'astro dev',
                    'build': 'astro build',
                    'preview': 'astro preview'
                }
            },
            next: {
                defaultPort: 3000,
                devCommand: 'npm run dev',
                buildCommand: 'npm run build',
                startCommand: 'npm start',
                directories: ['pages', 'components', 'public', 'styles'],
                mainFiles: ['pages/index.js', 'pages/index.tsx'],
                configFiles: ['next.config.js'],
                dependencies: {
                    'next': '^14.0.0',
                    'react': '^18.0.0',
                    'react-dom': '^18.0.0'
                },
                scripts: {
                    'dev': 'next dev',
                    'build': 'next build',
                    'start': 'next start'
                }
            },
            react: {
                defaultPort: 3000,
                devCommand: 'npm start',
                buildCommand: 'npm run build',
                startCommand: 'npm start',
                directories: ['src', 'public'],
                mainFiles: ['src/App.js', 'src/App.jsx', 'src/index.js'],
                configFiles: [],
                dependencies: {
                    'react': '^18.0.0',
                    'react-dom': '^18.0.0'
                },
                scripts: {
                    'start': 'react-scripts start',
                    'build': 'react-scripts build',
                    'test': 'react-scripts test'
                }
            },
            vue: {
                defaultPort: 8080,
                devCommand: 'npm run serve',
                buildCommand: 'npm run build',
                startCommand: 'npm run serve',
                directories: ['src', 'public'],
                mainFiles: ['src/App.vue', 'src/main.js'],
                configFiles: ['vue.config.js'],
                dependencies: {
                    'vue': '^3.0.0'
                },
                scripts: {
                    'serve': 'vue-cli-service serve',
                    'build': 'vue-cli-service build'
                }
            },
            vite: {
                defaultPort: 5173,
                devCommand: 'npm run dev',
                buildCommand: 'npm run build',
                startCommand: 'npm run dev',
                directories: ['src', 'public'],
                mainFiles: ['src/main.js', 'src/main.ts', 'index.html'],
                configFiles: ['vite.config.js', 'vite.config.ts'],
                dependencies: {
                    'vite': '^5.0.0'
                },
                scripts: {
                    'dev': 'vite',
                    'build': 'vite build',
                    'preview': 'vite preview'
                }
            },
            express: {
                defaultPort: 3000,
                devCommand: 'npm run dev',
                buildCommand: 'npm run build',
                startCommand: 'npm start',
                directories: ['routes', 'public', 'views'],
                mainFiles: ['app.js', 'server.js', 'index.js'],
                configFiles: [],
                dependencies: {
                    'express': '^4.18.0'
                },
                scripts: {
                    'start': 'node app.js',
                    'dev': 'nodemon app.js'
                }
            },
            node: {
                defaultPort: 3000,
                devCommand: 'npm start',
                buildCommand: 'npm run build',
                startCommand: 'npm start',
                directories: ['src', 'lib'],
                mainFiles: ['index.js', 'app.js', 'server.js'],
                configFiles: [],
                dependencies: {},
                scripts: {
                    'start': 'node index.js',
                    'dev': 'node index.js'
                }
            }
        };

        return configs[projectType] || configs.node;
    }

    /**
     * Generate quick start instructions for project type
     * @param {string} projectType - Project type
     * @param {string} projectName - Project name
     * @returns {Array} Array of instruction strings
     */
    static getQuickStartInstructions(projectType, projectName) {
        const config = this.getProjectConfig(projectType);
        
        const instructions = [
            `🚀 ${projectType.charAt(0).toUpperCase() + projectType.slice(1)} project detected!`,
            `💡 Quick start:`,
            `   1. cd ${projectName}`,
            `   2. npm install`,
            `   3. ${config.devCommand}`,
        ];

        if (config.defaultPort) {
            instructions.push(`   4. Open http://localhost:${config.defaultPort}`);
        }

        return instructions;
    }
}

/**
 * File template generators
 */
export class FileTemplateHelper {
    /**
     * Generate README.md content for GitHub project
     * @param {string} projectName - Project name
     * @param {string} owner - Repository owner
     * @param {object} repoData - Repository data
     * @param {string} projectType - Project type
     * @returns {string} README content
     */
    static generateReadme(projectName, owner, repoData, projectType) {
        const config = ProjectTypeHelper.getProjectConfig(projectType);
        const isAstroProject = projectType === 'astro';

        return `# ${projectName}

This project was loaded from GitHub repository: ${owner}/${projectName}

${repoData ? repoData.description : 'No description available.'}

## Original Repository
- **URL**: https://github.com/${owner}/${projectName}
- **Owner**: ${owner}
${repoData ? `- **Language**: ${repoData.language}` : ''}
${repoData ? `- **Stars**: ${repoData.stargazers_count}` : ''}
${repoData ? `- **Forks**: ${repoData.forks_count}` : ''}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the project:
   \`\`\`bash
   ${config.devCommand}
   \`\`\`

${isAstroProject ? `## Astro Project

This is an Astro project. Astro is a modern static site generator.

- **Development**: \`${config.scripts.dev}\`
- **Build**: \`${config.scripts.build}\`
- **Preview**: \`${config.scripts.preview || 'npm run preview'}\`

Visit [Astro Documentation](https://docs.astro.build) for more information.
` : ''}

## Note

This is a reconstructed version of the original repository loaded into Browser Node Terminal.
Some files may be missing or simplified. 

Visit the original repository for the complete source code:
https://github.com/${owner}/${projectName}

Happy coding! 🚀
`;
    }

    /**
     * Generate fallback index.js for Node.js projects
     * @param {string} projectName - Project name
     * @param {string} owner - Repository owner
     * @param {object} repoData - Repository data
     * @returns {string} Index.js content
     */
    static generateFallbackIndexJs(projectName, owner, repoData) {
        return `// ${projectName} - Loaded from GitHub
// Original repository: https://github.com/${owner}/${projectName}
${repoData ? `// Description: ${repoData.description}` : ''}

console.log('🚀 Welcome to ${projectName}!');
console.log('This project was loaded from GitHub into Browser Node Terminal.');
console.log('');
console.log('Original repository: https://github.com/${owner}/${projectName}');
${repoData ? `console.log('Description: ${repoData.description}');` : ''}

// Basic HTTP server example
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${projectName}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 40px auto; 
                    padding: 20px;
                    line-height: 1.6;
                }
                h1 { color: #4CAF50; }
                .info { 
                    background: #f5f5f5; 
                    padding: 20px; 
                    border-radius: 8px;
                    margin: 20px 0;
                }
                a { color: #4CAF50; }
            </style>
        </head>
        <body>
            <h1>🚀 ${projectName}</h1>
            <div class="info">
                <p><strong>Status:</strong> Running in Browser Node Terminal!</p>
                <p><strong>Original Repository:</strong> 
                   <a href="https://github.com/${owner}/${projectName}" target="_blank">
                       https://github.com/${owner}/${projectName}
                   </a>
                </p>
                ${repoData ? `<p><strong>Description:</strong> ${repoData.description}</p>` : ''}
                ${repoData ? `<p><strong>Language:</strong> ${repoData.language}</p>` : ''}
            </div>
            
            <h2>Next Steps</h2>
            <ul>
                <li>Install dependencies with <code>npm install</code></li>
                <li>Check the original repository for specific setup instructions</li>
                <li>Modify this code to match the original project structure</li>
                <li>Add the actual project files from the GitHub repository</li>
            </ul>
            
            <p>This is a basic starter template. Visit the original repository to see the complete source code.</p>
        </body>
        </html>
    \`);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(\`🌐 Server running at http://localhost:\${port}\`);
    console.log('📁 Project directory: /${projectName}');
    console.log('🔗 Original repo: https://github.com/${owner}/${projectName}');
});
`;
    }

    /**
     * Generate Astro index page
     * @param {string} projectName - Project name
     * @param {string} owner - Repository owner
     * @param {object} repoData - Repository data
     * @returns {string} Astro page content
     */
    static generateAstroIndexPage(projectName, owner, repoData) {
        return `---
// ${projectName} - Loaded from GitHub
// Original repository: https://github.com/${owner}/${projectName}
const title = '${projectName}';
const description = '${repoData ? repoData.description : `Project loaded from ${owner}/${projectName}`}';
---

<html lang="en">
    <head>
        <meta charset="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width" />
        <meta name="generator" content={Astro.generator} />
        <title>{title}</title>
        <meta name="description" content={description} />
    </head>
    <body>
        <main>
            <h1>🚀 {title}</h1>
            <p class="description">{description}</p>
            
            <div class="info">
                <p><strong>Status:</strong> Running in Browser Node Terminal!</p>
                <p><strong>Original Repository:</strong> 
                   <a href={\`https://github.com/${owner}/${projectName}\`} target="_blank">
                       https://github.com/${owner}/${projectName}
                   </a>
                </p>
                ${repoData ? `<p><strong>Language:</strong> ${repoData.language}</p>` : ''}
            </div>

            <div class="next-steps">
                <h2>Next Steps</h2>
                <ul>
                    <li>Install dependencies with <code>npm install</code></li>
                    <li>Start development server with <code>npm run dev</code></li>
                    <li>Check the original repository for specific setup instructions</li>
                    <li>Add the actual project files from the GitHub repository</li>
                </ul>
            </div>
        </main>

        <style>
            body {
                font-family: system-ui, sans-serif;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
                line-height: 1.6;
                color: #333;
            }
            
            h1 {
                color: #ff6600;
                border-bottom: 2px solid #ff6600;
                padding-bottom: 0.5rem;
            }
            
            .description {
                font-size: 1.1rem;
                color: #666;
                margin-bottom: 2rem;
            }
            
            .info {
                background: #f0f8ff;
                border: 1px solid #4a90e2;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            .next-steps {
                background: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            code {
                background: #f4f4f4;
                padding: 0.2rem 0.4rem;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
            }
            
            a {
                color: #4a90e2;
                text-decoration: none;
            }
            
            a:hover {
                text-decoration: underline;
            }
        </style>
    </body>
</html>
`;
    }
}