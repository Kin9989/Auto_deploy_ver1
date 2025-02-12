const Vercel = {
    CONFIG: {
        VERCEL_TOKEN: null
    },

    async initialize() {
        try {
            console.log('Initializing Vercel...');
            const response = await fetch('http://localhost:3000/api/config');

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Server error');
            }

            const config = await response.json();
            this.CONFIG.VERCEL_TOKEN = config.vercelToken;

            console.log('Vercel initialized with token length:', this.CONFIG.VERCEL_TOKEN?.length);
        } catch (error) {
            console.error('Không thể lấy cấu hình Vercel:', error);
            throw error;
        }
    },

    async deployToVercel(githubUrl) {
        try {
            if (!this.CONFIG.VERCEL_TOKEN) {
                throw new Error('Vercel chưa được khởi tạo');
            }

            // Lấy tên repo từ GitHub URL và format theo yêu cầu của Vercel
            const repoName = githubUrl.split('/').pop()
                .toLowerCase()
                .replace(/[^a-z0-9.-_]/g, '-')
                .replace(/---+/g, '-');

            // Lấy thông tin repository từ GitHub API
            const githubResponse = await fetch(`https://api.github.com/repos/${GitHub.CONFIG.GITHUB_USERNAME}/${repoName}`);

            if (!githubResponse.ok) {
                throw new Error('Không thể tìm thấy repository trên GitHub');
            }

            const repoData = await githubResponse.json();
            const repoId = repoData.id.toString();

            // Tạo project mới trên Vercel
            const createProject = await fetch('https://api.vercel.com/v9/projects', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.CONFIG.VERCEL_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: repoName,
                    gitRepository: {
                        type: 'github',
                        repo: `${GitHub.CONFIG.GITHUB_USERNAME}/${repoName}`,
                        repoId: repoId
                    }
                })
            });

            await createProject.json().catch(() => { });

            // Tạo deployment mới
            const createDeployment = await fetch('https://api.vercel.com/v13/deployments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.CONFIG.VERCEL_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: repoName,
                    gitSource: {
                        type: 'github',
                        repo: `${GitHub.CONFIG.GITHUB_USERNAME}/${repoName}`,
                        ref: 'main',
                        repoId: repoId
                    }
                })
            });

            if (!createDeployment.ok) {
                const error = await createDeployment.json();
                console.error('Deployment error:', error);
                throw new Error(`Lỗi tạo deployment: ${error.error?.message || 'Unknown error'}`);
            }

            const deployData = await createDeployment.json();

            // Đợi cho đến khi deployment hoàn thành
            let status = 'INITIALIZING';
            let deployUrl = '';
            let projectUrl = '';

            while (status !== 'READY' && status !== 'ERROR') {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const checkStatus = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.CONFIG.VERCEL_TOKEN}`,
                    }
                });

                const statusData = await checkStatus.json();
                status = statusData.readyState;
                deployUrl = statusData.url;
                projectUrl = `${repoName}.vercel.app`;

                document.getElementById('status').textContent =
                    `Đang triển khai: ${status}...`;
            }

            if (status === 'ERROR') {
                throw new Error('Deployment thất bại');
            }

            return {
                deployUrl: deployUrl,
                projectUrl: projectUrl
            };
        } catch (error) {
            console.error('Lỗi khi triển khai lên Vercel:', error);
            throw error;
        }
    }
};

// Khởi tạo khi load script
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Vercel.initialize();
    } catch (error) {
        console.error('Lỗi khởi tạo Vercel:', error);
    }
}); 