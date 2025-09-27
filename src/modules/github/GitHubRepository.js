import { GitHubApiHelper, ProjectTypeHelper, FileTemplateHelper } from './helpers.js';
import { parseGitHubUrl } from '../../utils/github.js';

export class GitHubRepository {
    constructor(webcontainerManager, terminalManager) {
        this.webcontainer = webcontainerManager;
        this.terminal = terminalManager;
        this.projectFiles = new Map();
        this.currentProject = null;
    }

    /**
     * Load GitHub repository by URL
     * @param {string} githubUrl - GitHub repository URL
     * @returns {Promise<object>} Project information
     */
    async loadRepository(githubUrl) {
        const parsed = parseGitHubUrl(githubUrl);
        if (!parsed) {
            throw new Error('Invalid GitHub URL format');
        }

        const { owner, repo } = parsed;
        this.terminal.writeln(`🔄 Loading GitHub repository: ${owner}/${repo}`, 'info');

        try {
            // Fetch repository information and package.json in parallel
            const [repoData, packageJsonContent] = await Promise.all([
                GitHubApiHelper.fetchRepositoryInfo(owner, repo),
                GitHubApiHelper.fetchFileContent(owner, repo, 'package.json')
            ]);

            this.terminal.writeln(`📦 Repository: ${repoData.full_name}`, 'success');
            if (repoData.description) {
                this.terminal.writeln(`📄 Description: ${repoData.description}`);
            }

            // Create project from repository data
            const project = await this.createProjectFromRepository(owner, repo, repoData, packageJsonContent);
            this.currentProject = project;

            return project;

        } catch (error) {
            console.error('Error loading GitHub repository:', error);
            throw error;
        }
    }

    /**
     * Create project structure from GitHub repository
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {object} repoData - Repository metadata
     * @param {string} packageJsonContent - Package.json content
     * @returns {Promise<object>} Created project info
     */
    async createProjectFromRepository(owner, repo, repoData, packageJsonContent) {
        // Create project directory
        await this.webcontainer.mkdir(repo);

        // Parse package.json and detect project type
        let packageJson = null;
        let projectType = 'node';

        if (packageJsonContent) {
            try {
                packageJson = JSON.parse(packageJsonContent);
                projectType = ProjectTypeHelper.detectProjectType(packageJson);
                this.terminal.writeln(
                    `📦 Found package.json with ${Object.keys(packageJson.dependencies || {}).length} dependencies`,
                    'success'
                );
            } catch (error) {
                console.warn('Failed to parse package.json:', error);
            }
        }

        // Create or enhance package.json
        const finalPackageJson = this.createEnhancedPackageJson(repo, owner, repoData, packageJson, projectType);
        await this.webcontainer.writeFile(
            `${repo}/package.json`,
            JSON.stringify(finalPackageJson, null, 2)
        );

        // Fetch and create common project files
        const filesCreated = await this.createProjectFiles(owner, repo, repoData, projectType);

        // Show project type specific instructions
        const instructions = ProjectTypeHelper.getQuickStartInstructions(projectType, repo);
        instructions.forEach(instruction => this.terminal.writeln(instruction));

        return {
            name: repo,
            owner,
            type: projectType,
            path: `/${repo}`,
            filesCreated,
            packageJson: finalPackageJson,
            repoData
        };
    }

    /**
     * Create enhanced package.json with fallbacks
     * @param {string} repo - Repository name
     * @param {string} owner - Repository owner
     * @param {object} repoData - Repository data
     * @param {object} existingPackageJson - Existing package.json
     * @param {string} projectType - Detected project type
     * @returns {object} Enhanced package.json
     */
    createEnhancedPackageJson(repo, owner, repoData, existingPackageJson, projectType) {
        const config = ProjectTypeHelper.getProjectConfig(projectType);

        const basePackageJson = {
            name: repo,
            version: "1.0.0",
            description: repoData?.description || `Project loaded from ${owner}/${repo}`,
            main: "index.js",
            scripts: {
                start: "node index.js",
                dev: "node index.js",
                build: "echo 'No build script specified'",
                test: "echo \"Error: no test specified\" && exit 1",
                ...config.scripts
            },
            keywords: repoData?.topics || [],
            author: owner,
            license: repoData?.license?.spdx_id || "ISC",
            repository: {
                type: "git",
                url: `https://github.com/${owner}/${repo}.git`
            },
            homepage: `https://github.com/${owner}/${repo}#readme`,
            dependencies: config.dependencies || {},
            devDependencies: {}
        };

        // Merge with existing package.json if available
        if (existingPackageJson) {
            return {
                ...basePackageJson,
                ...existingPackageJson,
                scripts: {
                    ...basePackageJson.scripts,
                    ...existingPackageJson.scripts
                },
                dependencies: {
                    ...basePackageJson.dependencies,
                    ...existingPackageJson.dependencies
                },
                devDependencies: {
                    ...basePackageJson.devDependencies,
                    ...existingPackageJson.devDependencies
                }
            };
        }

        return basePackageJson;
    }

    /**
     * Create project files from GitHub repository
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {object} repoData - Repository data
     * @param {string} projectType - Project type
     * @returns {Promise<number>} Number of files created
     */
    async createProjectFiles(owner, repo, repoData, projectType) {
        const config = ProjectTypeHelper.getProjectConfig(projectType);

        // List of files to try to fetch
        const filesToFetch = [
            'README.md',
            'LICENSE',
            '.gitignore',
            'index.js',
            'app.js',
            'server.js',
            'src/index.js',
            'src/app.js',
            'src/main.js',
            'src/main.ts',
            'tsconfig.json',
            'vite.config.js',
            'vite.config.ts',
            ...config.configFiles,
            ...config.mainFiles
        ];

        // Add project-specific files based on type
        if (projectType === 'astro') {
            filesToFetch.push(
                'src/pages/index.astro',
                'src/layouts/Layout.astro',
                'astro.config.mjs',
                'astro.config.js'
            );
        }

        let filesCreated = 0;

        // Try to fetch each file
        for (const filepath of filesToFetch) {
            try {
                const content = await GitHubApiHelper.fetchFileContent(owner, repo, filepath);
                if (content) {
                    // Create directory if needed
                    const dirPath = filepath.includes('/') 
                        ? filepath.substring(0, filepath.lastIndexOf('/'))
                        : '';
                    
                    if (dirPath) {
                        await this.webcontainer.mkdir(`${repo}/${dirPath}`);
                    }

                    await this.webcontainer.writeFile(`${repo}/${filepath}`, content);
                    filesCreated++;
                    this.terminal.writeln(`📄 Created: ${filepath}`, 'success');
                }
            } catch (error) {
                console.warn(`Failed to fetch ${filepath}:`, error);
            }
        }

        // Create fallback files if no main files were found
        await this.createFallbackFiles(owner, repo, repoData, projectType, filesCreated);

        // Create project directories
        await this.createProjectDirectories(repo, config.directories);

        this.terminal.writeln(`✅ Created ${filesCreated} files from repository`, 'success');
        return filesCreated;
    }

    /**
     * Create fallback files when originals can't be fetched
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {object} repoData - Repository data
     * @param {string} projectType - Project type
     * @param {number} existingFiles - Number of existing files
     */
    async createFallbackFiles(owner, repo, repoData, projectType, existingFiles) {
        // Always create README if it doesn't exist
        const readmeExists = await this.webcontainer.fileExists(`${repo}/README.md`);
        if (!readmeExists) {
            const readme = FileTemplateHelper.generateReadme(repo, owner, repoData, projectType);
            await this.webcontainer.writeFile(`${repo}/README.md`, readme);
            this.terminal.writeln(`📄 Created: README.md (fallback)`, 'info');
        }

        // Create main file if none exists
        const mainFileExists = await this.checkMainFileExists(repo, projectType);
        if (!mainFileExists) {
            if (projectType === 'astro') {
                await this.createAstroFiles(owner, repo, repoData);
            } else {
                const indexJs = FileTemplateHelper.generateFallbackIndexJs(repo, owner, repoData);
                await this.webcontainer.writeFile(`${repo}/index.js`, indexJs);
                this.terminal.writeln(`📄 Created: index.js (fallback)`, 'info');
            }
        }
    }

    /**
     * Check if any main file exists
     * @param {string} repo - Repository name
     * @param {string} projectType - Project type
     * @returns {Promise<boolean>} Main file exists
     */
    async checkMainFileExists(repo, projectType) {
        const config = ProjectTypeHelper.getProjectConfig(projectType);
        const mainFiles = [
            'index.js',
            'app.js',
            'server.js',
            'src/index.js',
            'src/app.js',
            ...config.mainFiles
        ];

        for (const file of mainFiles) {
            if (await this.webcontainer.fileExists(`${repo}/${file}`)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Create Astro-specific files
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {object} repoData - Repository data
     */
    async createAstroFiles(owner, repo, repoData) {
        // Create Astro directories
        const astroDirectories = ['src', 'src/pages', 'src/components', 'src/layouts', 'public'];
        for (const dir of astroDirectories) {
            await this.webcontainer.mkdir(`${repo}/${dir}`);
        }

        // Create index page
        const indexAstro = FileTemplateHelper.generateAstroIndexPage(repo, owner, repoData);
        await this.webcontainer.writeFile(`${repo}/src/pages/index.astro`, indexAstro);
        this.terminal.writeln(`📄 Created: src/pages/index.astro (Astro starter)`, 'info');

        // Create basic layout
        const layout = this.createAstroLayout();
        await this.webcontainer.writeFile(`${repo}/src/layouts/Layout.astro`, layout);
        this.terminal.writeln(`📄 Created: src/layouts/Layout.astro`, 'info');

        // Create Astro config if it doesn't exist
        const configExists = await this.webcontainer.fileExists(`${repo}/astro.config.mjs`);
        if (!configExists) {
            const config = this.createAstroConfig();
            await this.webcontainer.writeFile(`${repo}/astro.config.mjs`, config);
            this.terminal.writeln(`📄 Created: astro.config.mjs`, 'info');
        }
    }

    /**
     * Create Astro layout template
     * @returns {string} Layout content
     */
    createAstroLayout() {
        return `---
export interface Props {
    title: string;
    description?: string;
}

const { title, description } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="description" content={description || "Astro project"} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="generator" content={Astro.generator} />
        <title>{title}</title>
    </head>
    <body>
        <slot />
    </body>
</html>
`;
    }

    /**
     * Create basic Astro config
     * @returns {string} Config content
     */
    createAstroConfig() {
        return `import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    // Enable server-side rendering if needed
    // output: 'server',
    
    // Configure integrations
    integrations: [],
    
    // Development server configuration
    server: {
        port: 4321,
        host: true
    }
});
`;
    }

    /**
     * Create project directories
     * @param {string} repo - Repository name
     * @param {Array} directories - Directories to create
     */
    async createProjectDirectories(repo, directories = []) {
        for (const dir of directories) {
            try {
                await this.webcontainer.mkdir(`${repo}/${dir}`);
            } catch (error) {
                // Ignore if directory already exists
                if (error.code !== 'EEXIST') {
                    console.warn(`Failed to create directory ${dir}:`, error);
                }
            }
        }
    }

    /**
     * Get current project information
     * @returns {object|null} Current project
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * Get project files list
     * @returns {Map} Project files map
     */
    getProjectFiles() {
        return this.projectFiles;
    }

    /**
     * Clear current project
     */
    clearCurrentProject() {
        this.currentProject = null;
        this.projectFiles.clear();
    }

    /**
     * Create project from template
     * @param {string} template - Template type (vanilla-js, react, vite, express)
     * @returns {Promise<object>} Created project information
     */
    async createProjectFromTemplate(template) {
        this.terminal.writeln(`🚀 Creating ${template} project...`, 'info');

        const templates = {
            'vanilla-js': {
                name: 'vanilla-js-project',
                description: 'A vanilla JavaScript project',
                files: {
                    'package.json': {
                        name: 'vanilla-js-project',
                        version: '1.0.0',
                        description: 'A vanilla JavaScript project',
                        main: 'index.js',
                        scripts: {
                            start: 'node index.js',
                            dev: 'npx serve .'
                        }
                    },
                    'index.js': `console.log('Hello from Vanilla JavaScript!');

// Your code here
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
});`,
                    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS Project</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Vanilla JavaScript Project</h1>
        <p>Welcome to your new vanilla JavaScript project!</p>
    </div>
    <script src="index.js"></script>
</body>
</html>`,
                    'README.md': `# Vanilla JavaScript Project

A simple vanilla JavaScript project template.

## Getting Started

1. Open index.html in a browser
2. Or run \`npm run dev\` to start a local server

## Scripts

- \`npm start\` - Run with Node.js
- \`npm run dev\` - Serve with local server`
                }
            },
            'react': {
                name: 'react-project',
                description: 'A React project',
                files: {
                    'package.json': {
                        name: 'react-project',
                        version: '1.0.0',
                        description: 'A React project',
                        main: 'src/index.js',
                        scripts: {
                            start: 'react-scripts start',
                            build: 'react-scripts build',
                            dev: 'react-scripts start'
                        },
                        dependencies: {
                            react: '^18.2.0',
                            'react-dom': '^18.2.0',
                            'react-scripts': '^5.0.1'
                        }
                    },
                    'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`,
                    'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
                    'src/App.js': `import React from 'react';

function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React Project</h1>
      <p>Welcome to your new React application!</p>
    </div>
  );
}

export default App;`,
                    'README.md': `# React Project

A React application template.

## Getting Started

1. Run \`npm install\` to install dependencies
2. Run \`npm start\` to start the development server

## Scripts

- \`npm start\` - Start development server
- \`npm run build\` - Build for production`
                }
            },
            'vite': {
                name: 'vite-project',
                description: 'A Vite project',
                files: {
                    'package.json': {
                        name: 'vite-project',
                        version: '1.0.0',
                        description: 'A Vite project',
                        main: 'main.js',
                        scripts: {
                            dev: 'vite',
                            build: 'vite build',
                            start: 'vite'
                        },
                        devDependencies: {
                            vite: '^4.0.0'
                        }
                    },
                    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vite Project</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
</body>
</html>`,
                    'main.js': `import './style.css'

document.querySelector('#app').innerHTML = \`
  <div>
    <h1>Vite Project</h1>
    <p>Welcome to your new Vite application!</p>
    <button id="counter" type="button">Count: 0</button>
  </div>
\`

let count = 0
document.querySelector('#counter').addEventListener('click', () => {
  count++
  document.querySelector('#counter').textContent = \`Count: \${count}\`
})`,
                    'style.css': `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 40px;
  background-color: #f5f5f5;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

button {
  background: #007acc;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #005999;
}`,
                    'README.md': `# Vite Project

A fast Vite-based project template.

## Getting Started

1. Run \`npm install\` to install dependencies
2. Run \`npm run dev\` to start the development server

## Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production`
                }
            },
            'express': {
                name: 'express-server',
                description: 'An Express.js server',
                files: {
                    'package.json': {
                        name: 'express-server',
                        version: '1.0.0',
                        description: 'An Express.js server',
                        main: 'server.js',
                        scripts: {
                            start: 'node server.js',
                            dev: 'nodemon server.js'
                        },
                        dependencies: {
                            express: '^4.18.2'
                        },
                        devDependencies: {
                            nodemon: '^3.0.1'
                        }
                    },
                    'server.js': `const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Express Server!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from API!' });
});

// Start server
app.listen(PORT, () => {
    console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});`,
                    'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Express Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Express Server</h1>
        <p>Your Express.js server is running!</p>
        <button onclick="testAPI()">Test API</button>
        <div id="result"></div>
    </div>
    
    <script>
        async function testAPI() {
            try {
                const response = await fetch('/api/hello');
                const data = await response.json();
                document.getElementById('result').innerHTML = 
                    '<p><strong>API Response:</strong> ' + JSON.stringify(data, null, 2) + '</p>';
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    '<p><strong>Error:</strong> ' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>`,
                    'README.md': `# Express Server

A simple Express.js server template.

## Getting Started

1. Run \`npm install\` to install dependencies
2. Run \`npm start\` to start the server
3. Visit http://localhost:3000

## Scripts

- \`npm start\` - Start the server
- \`npm run dev\` - Start with nodemon (auto-reload)

## Endpoints

- \`GET /\` - Welcome message
- \`GET /api/hello\` - API endpoint`
                }
            }
        };

        const templateConfig = templates[template];
        if (!templateConfig) {
            throw new Error(`Unknown template: ${template}`);
        }

        try {
            // Create project files
            await this.createTemplateFiles(templateConfig.files, templateConfig.name);
            
            const project = {
                name: templateConfig.name,
                description: templateConfig.description,
                type: template,
                files: Object.keys(templateConfig.files),
                created: new Date().toISOString()
            };

            this.currentProject = project;
            this.terminal.writeln(`✅ Created ${template} project successfully!`, 'success');
            
            return project;

        } catch (error) {
            this.terminal.writeln(`❌ Failed to create ${template} project: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Create template files
     * @param {object} files - Files to create
     * @param {string} projectName - Project name
     */
    async createTemplateFiles(files, projectName) {
        for (const [filePath, content] of Object.entries(files)) {
            // Use the WebContainerManager's writeFile method which handles objects properly
            await this.webcontainer.writeFile(filePath, content);
            
            this.projectFiles.set(filePath, {
                path: filePath,
                size: typeof content === 'string' ? content.length : JSON.stringify(content).length,
                type: this.getFileType(filePath),
                content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
            });
        }
    }

    /**
     * Get file type from extension
     * @param {string} filePath - File path
     * @returns {string} File type
     */
    getFileType(filePath) {
        const ext = filePath.split('.').pop();
        const typeMap = {
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'txt': 'text'
        };
        return typeMap[ext] || 'text';
    }
}