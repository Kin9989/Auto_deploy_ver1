window.GitHub = {
    CONFIG: {
        GITHUB_TOKEN: null,
        GITHUB_USERNAME: null
    },

    async initialize() {
        try {
            console.log('Initializing GitHub...');
            const response = await fetch('http://localhost:3000/api/config');

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Server error');
            }

            const config = await response.json();
            this.CONFIG.GITHUB_TOKEN = config.githubToken;
            this.CONFIG.GITHUB_USERNAME = config.githubUsername;

            console.log('GitHub initialized with:', {
                username: this.CONFIG.GITHUB_USERNAME,
                tokenLength: this.CONFIG.GITHUB_TOKEN?.length
            });
        } catch (error) {
            console.error('Lỗi khởi tạo GitHub:', error);
            throw error;
        }
    },

    async createOrUpdateRepo(files, repoName) {
        try {
            if (!this.CONFIG.GITHUB_TOKEN || !this.CONFIG.GITHUB_USERNAME) {
                throw new Error('GitHub chưa được khởi tạo');
            }

            const repoExists = await this.checkRepoExists(repoName);

            if (!repoExists) {
                await this.createRepo(repoName);
                await this.createDefaultReadme(repoName);
            }

            for (const file of files) {
                document.getElementById('status').textContent =
                    `Đang tải lên file: ${file.name}...`;
                const content = await this.readFileContent(file);

                const fileExists = await this.checkFileExists(repoName, file.name);
                if (fileExists) {
                    const sha = await this.getFileSha(repoName, file.name);
                    await this.updateFile(repoName, file.name, content, sha);
                } else {
                    await this.uploadFile(repoName, file.name, content);
                }
            }

            return `https://github.com/${this.CONFIG.GITHUB_USERNAME}/${repoName}`;
        } catch (error) {
            console.error('Lỗi khi xử lý với GitHub:', error);
            throw error;
        }
    },

    async checkRepoExists(repoName) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.CONFIG.GITHUB_USERNAME}/${repoName}`,
                {
                    headers: {
                        'Authorization': `token ${this.CONFIG.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            return response.status === 200;
        } catch (error) {
            return false;
        }
    },

    async createRepo(repoName) {
        try {
            if (!this.CONFIG.GITHUB_TOKEN || !this.CONFIG.GITHUB_USERNAME) {
                throw new Error('GitHub chưa được khởi tạo');
            }

            console.log('Creating repo:', repoName);
            const response = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: repoName,
                    private: false,
                    auto_init: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Create repo error:', data);
                throw new Error(`Không thể tạo repository: ${data.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in createRepo:', error);
            throw error;
        }
    },

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(btoa(e.target.result));
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        });
    },

    async uploadFile(repoName, path, content) {
        const response = await fetch(
            `https://api.github.com/repos/${this.CONFIG.GITHUB_USERNAME}/${repoName}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Upload ${path}`,
                    content: content,
                    branch: 'main'
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Không thể upload file ${path}: ${errorData.message}`);
        }
    },

    async deleteRepository(repoUrl) {
        try {
            if (!this.CONFIG.GITHUB_TOKEN || !this.CONFIG.GITHUB_USERNAME) {
                throw new Error('GitHub chưa được khởi tạo đúng cách');
            }

            const repoName = repoUrl.split('/').pop();

            const response = await fetch(
                `https://api.github.com/repos/${this.CONFIG.GITHUB_USERNAME}/${repoName}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.CONFIG.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Không thể xóa repository: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error('Lỗi khi xóa repository:', error);
            throw error;
        }
    },

    async createDefaultReadme(repoName) {
        const content = btoa(`# ${repoName}
This is a repository created by Auto Deploy Tool.

## Description
Add your description here.

## Features
- Feature 1
- Feature 2
- Feature 3

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`
`);

        await this.uploadFile(repoName, 'README.md', content);
    },

    async checkFileExists(repoName, path) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.CONFIG.GITHUB_USERNAME}/${repoName}/contents/${path}`,
                {
                    headers: {
                        'Authorization': `token ${this.CONFIG.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            return response.status === 200;
        } catch (error) {
            return false;
        }
    },

    async getFileSha(repoName, path) {
        const response = await fetch(
            `https://api.github.com/repos/${this.CONFIG.GITHUB_USERNAME}/${repoName}/contents/${path}`,
            {
                headers: {
                    'Authorization': `token ${this.CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Không thể lấy thông tin file');
        }

        const data = await response.json();
        return data.sha;
    },

    async updateFile(repoName, path, content, sha) {
        const response = await fetch(
            `https://api.github.com/repos/${this.CONFIG.GITHUB_USERNAME}/${repoName}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Update ${path}`,
                    content: content,
                    sha: sha,
                    branch: 'main'
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Không thể cập nhật file ${path}: ${errorData.message}`);
        }
    }
};

// Đợi DOM load xong mới khởi tạo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await GitHub.initialize();
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
    }
}); 