const History = {
    async saveDeployHistory(githubUrl, vercelUrls, type = 'github') {
        try {
            const response = await fetch('https://auto-deploy-ver1.onrender.com/api/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    githubUrl,
                    vercelUrls,
                    type
                })
            });

            if (!response.ok) {
                throw new Error('Không thể lưu lịch sử');
            }

            // Cập nhật hiển thị sau khi lưu
            await this.updateHistoryDisplay();
        } catch (error) {
            console.error('Lỗi khi lưu lịch sử:', error);
            throw error;
        }
    },

    async updateHistoryDisplay() {
        try {
            const response = await fetch('https://auto-deploy-ver1.onrender.com/api/history');
            if (!response.ok) {
                throw new Error('Không thể tải lịch sử');
            }

            const history = await response.json();
            const historyList = document.getElementById('history-list');
            
            if (!historyList) {
                console.error('Không tìm thấy element history-list');
                return;
            }

            historyList.innerHTML = history.map(entry => `
                <div class="bg-gray-50 rounded-lg p-4 shadow border border-gray-200">
                    <h3 class="text-lg font-semibold mb-2">
                        <a href="${entry.githubUrl}" target="_blank" 
                           class="text-blue-600 hover:text-blue-800">
                            ${entry.githubUrl}
                        </a>
                    </h3>
                    ${this.renderHistoryItemContent(entry)}
                    <p class="text-sm text-gray-500 mt-2">
                        Thời gian: ${new Date(entry.timestamp).toLocaleString('vi-VN')}
                    </p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Lỗi khi tải lịch sử:', error);
            const historyList = document.getElementById('history-list');
            if (historyList) {
                historyList.innerHTML = `
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <p class="font-bold">Không thể tải lịch sử</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    },

    renderHistoryItemContent(entry) {
        switch (entry.type) {
            case 'vercel':
                return `
                    <div class="space-y-2">
                        <p class="flex items-center">
                            <span class="font-semibold mr-2">Latest Deployment:</span>
                            <a href="https://${entry.vercelUrls.deployUrl}" target="_blank" 
                               class="text-blue-600 hover:text-blue-800 underline">
                                https://${entry.vercelUrls.deployUrl}
                            </a>
                        </p>
                        <p class="flex items-center">
                            <span class="font-semibold mr-2">Production URL:</span>
                            <a href="https://${entry.vercelUrls.projectUrl}" target="_blank"
                               class="text-blue-600 hover:text-blue-800 underline">
                                https://${entry.vercelUrls.projectUrl}
                            </a>
                        </p>
                    </div>
                `;
            case 'delete':
                return `<p class="text-red-600 font-semibold">Repository đã bị xóa</p>`;
            default: // github
                return `<p class="text-green-600 font-semibold">GitHub Repository đã được tạo thành công</p>`;
        }
    },

    // Khởi tạo và cập nhật lịch sử khi load trang
    initialize() {
        // Cập nhật lịch sử khi chuyển tab
        document.querySelector('button[onclick="showSection(\'history-section\')"]')
            ?.addEventListener('click', () => this.updateHistoryDisplay());

        // Cập nhật lịch sử lần đầu khi load trang
        if (document.getElementById('history-section').classList.contains('active')) {
            this.updateHistoryDisplay();
        }
    }
};

// Khởi tạo khi DOM đã load
document.addEventListener('DOMContentLoaded', () => {
    History.initialize();
}); 