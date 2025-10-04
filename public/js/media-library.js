class MediaLibrary {
    constructor() {
        this.images = [];
        this.filteredImages = [];
        this.selectedImages = new Set();
        this.currentViewIndex = 0;
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isCropping = false;
        this.init();
    }

    async init() {
        await this.loadMediaLibrary();
        this.setupEventListeners();
        this.setupKeyboardNavigation();
    }

    setupEventListeners() {
        // Кнопки тулбара
        document.getElementById('uploadMediaBtn').addEventListener('click', () => this.showUploadModal());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('deselectAllBtn').addEventListener('click', () => this.deselectAll());
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Поиск и сортировка
        document.getElementById('searchMedia').addEventListener('input', () => this.filterAndSort());
        document.getElementById('sortMedia').addEventListener('change', () => this.filterAndSort());

        // Модальные окна
        document.querySelectorAll('.close[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal');
                this.hideModal(modalId);
            });
        });

        // Просмотрщик изображений
        document.getElementById('prevImage').addEventListener('click', () => this.showPreviousImage());
        document.getElementById('nextImage').addEventListener('click', () => this.showNextImage());
        document.getElementById('downloadImage').addEventListener('click', () => this.downloadCurrentImage());
        document.getElementById('cropImage').addEventListener('click', () => this.startCropping());
        document.getElementById('applyCrop').addEventListener('click', () => this.applyCrop());
        document.getElementById('cancelCrop').addEventListener('click', () => this.cancelCropping());
        document.getElementById('copyUrl').addEventListener('click', () => this.copyImageUrl());
        document.getElementById('replaceImage').addEventListener('click', () => this.replaceImage());
        document.getElementById('deleteCurrentImage').addEventListener('click', () => this.deleteCurrentImage());

        // Загрузка
        document.getElementById('uploadZone').addEventListener('click', () => document.getElementById('bulkUploadInput').click());
        document.getElementById('bulkUploadInput').addEventListener('change', (e) => this.handleBulkUpload(e.target.files));
        document.getElementById('startUpload').addEventListener('click', () => this.startBulkUpload());
        document.getElementById('replaceFileInput').addEventListener('change', (e) => this.handleReplaceImage(e.target.files[0]));

        // Drag & drop
        this.setupDragAndDrop();
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('imageViewerModal').style.display === 'block') {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.showPreviousImage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.showNextImage();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        if (this.isCropping) {
                            this.cancelCropping();
                        } else {
                            this.hideModal('imageViewerModal');
                        }
                        break;
                    case 'Delete':
                        e.preventDefault();
                        this.deleteCurrentImage();
                        break;
                }
            }
        });
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('uploadZone');

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            this.handleBulkUpload(e.dataTransfer.files);
        });
    }

    async loadMediaLibrary() {
        try {
            const response = await fetch('/api/media/gallery', {
                credentials: 'include'
            });

            if (!response.ok) {
                // Пытаемся прочитать ошибку от сервера
                let errorMessage = 'Ошибка загрузки медиатеки';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.details || errorMessage;
                } catch (e) {
                    // Если не удалось прочитать JSON ошибки
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            this.images = await response.json();
            this.filterAndSort();

        } catch (error) {
            console.error('Ошибка загрузки медиатеки:', error);
            this.showAlert('Ошибка загрузки медиатеки: ' + error.message, 'error');

            // Показываем пустую галерею при ошибке
            this.images = [];
            this.filteredImages = [];
            this.renderMediaGrid();
        }
    }

    filterAndSort() {
        const searchTerm = document.getElementById('searchMedia').value.toLowerCase();
        const sortBy = document.getElementById('sortMedia').value;

        // Фильтрация
        this.filteredImages = this.images.filter(image =>
            image.filename.toLowerCase().includes(searchTerm)
        );

        // Сортировка
        switch (sortBy) {
            case 'newest':
                this.filteredImages.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
                break;
            case 'oldest':
                this.filteredImages.sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));
                break;
            case 'name':
                this.filteredImages.sort((a, b) => a.filename.localeCompare(b.filename));
                break;
            case 'size':
                this.filteredImages.sort((a, b) => b.size - a.size);
                break;
        }

        this.renderMediaGrid();
        this.updateStats();
    }

    renderMediaGrid() {
        const container = document.getElementById('mediaGrid');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedImages = this.filteredImages.slice(startIndex, startIndex + this.itemsPerPage);

        if (paginatedImages.length === 0) {
            container.innerHTML = `
                <div class="empty-media">
                    <div class="empty-media-icon">🖼️</div>
                    <p>Изображения не найдены</p>
                    <p style="font-size: 0.9rem; color: #a0aec0;">
                        ${this.images.length === 0 ? 'Загрузите первое изображение' : 'Попробуйте изменить поисковый запрос'}
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = paginatedImages.map((image, index) => {
            // Экранируем имя файла для использования в JavaScript строке
            const safeFilename = image.filename.replace(/'/g, "\\'");

            return `
        <div class="media-item ${this.selectedImages.has(image.filename) ? 'selected' : ''}" 
             data-index="${startIndex + index}">
            <input type="checkbox" class="media-item-checkbox" 
                   ${this.selectedImages.has(image.filename) ? 'checked' : ''}
                   onchange="mediaLibrary.toggleSelection('${safeFilename}')">
            <img src="${image.url}" alt="${image.filename}" class="media-item-image"
                 onclick="mediaLibrary.openImageViewer(${startIndex + index})"
                 onerror="this.src='data:image/svg+xml,&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 100&quot;&gt;&lt;rect width=&quot;100&quot; height=&quot;100&quot; fill=&quot;#f7fafc&quot;/&gt;&lt;text x=&quot;50&quot; y=&quot;50&quot; font-size=&quot;14&quot; text-anchor=&quot;middle&quot; dy=&quot;.3em&quot; fill=&quot;#a0aec0&quot;&gt;🚫&lt;/text&gt;&lt;/svg&gt;'">
            <div class="media-item-info">
                <div class="media-item-name" title="${image.filename}">${image.filename}</div>
                <div class="media-item-meta">
                    <span>${image.formattedSize}</span>
                    <span>${new Date(image.uploaded).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `;
        }).join('');

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredImages.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Кнопка "Назад"
        paginationHTML += `<button onclick="mediaLibrary.previousPage()" ${this.currentPage === 1 ? 'disabled' : ''}>⬅️</button>`;

        // Номера страниц
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button onclick="mediaLibrary.goToPage(${i})" ${i === this.currentPage ? 'class="active"' : ''}>${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span>...</span>';
            }
        }

        // Кнопка "Вперед"
        paginationHTML += `<button onclick="mediaLibrary.nextPage()" ${this.currentPage === totalPages ? 'disabled' : ''}>➡️</button>`;

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderMediaGrid();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredImages.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    toggleSelection(filename) {
        if (this.selectedImages.has(filename)) {
            this.selectedImages.delete(filename);
        } else {
            this.selectedImages.add(filename);
        }
        this.updateSelectionUI();
    }

    selectAll() {
        this.filteredImages.forEach(image => this.selectedImages.add(image.filename));
        this.updateSelectionUI();
    }

    deselectAll() {
        this.selectedImages.clear();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        // Обновляем чекбоксы
        document.querySelectorAll('.media-item-checkbox').forEach(checkbox => {
            const filename = checkbox.parentElement.querySelector('.media-item-name').textContent;
            checkbox.checked = this.selectedImages.has(filename);
            checkbox.parentElement.classList.toggle('selected', this.selectedImages.has(filename));
        });

        // Обновляем кнопку удаления
        document.getElementById('deleteSelectedBtn').disabled = this.selectedImages.size === 0;

        // Обновляем статистику
        this.updateStats();
    }

    updateStats() {
        const selectedSize = Array.from(this.selectedImages).reduce((total, filename) => {
            const image = this.images.find(img => img.filename === filename);
            return total + (image ? image.size : 0);
        }, 0);

        document.getElementById('selectedCount').textContent = `Выбрано: ${this.selectedImages.size}`;
        document.getElementById('totalCount').textContent = `Всего: ${this.filteredImages.length}`;
        document.getElementById('totalSize').textContent = `Общий размер: ${this.formatFileSize(this.filteredImages.reduce((total, img) => total + img.size, 0))}`;
    }

    // ========== ПРОСМОТР ИЗОБРАЖЕНИЙ ==========

    openImageViewer(index) {
        this.currentViewIndex = index;
        this.showImageDetails();
        this.showModal('imageViewerModal');
    }

    showImageDetails() {
        const image = this.filteredImages[this.currentViewIndex];
        if (!image) return;

        const img = new Image();
        img.onload = () => {
            document.getElementById('viewerImage').src = image.url;
            document.getElementById('viewerImageName').textContent = image.filename;
            document.getElementById('viewerImageSize').textContent = image.formattedSize;
            document.getElementById('imageCounter').textContent = `${this.currentViewIndex + 1} / ${this.filteredImages.length}`;

            // Детальная информация
            document.getElementById('detailFilename').textContent = image.filename;
            document.getElementById('detailSize').textContent = image.formattedSize;
            document.getElementById('detailUploaded').textContent = new Date(image.uploaded).toLocaleString('ru-RU');
            document.getElementById('detailDimensions').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
            document.getElementById('detailType').textContent = this.getFileType(image.filename);
            document.getElementById('imageUrl').value = window.location.origin + image.url;
        };
        img.src = image.url;
    }

    showPreviousImage() {
        if (this.currentViewIndex > 0) {
            this.currentViewIndex--;
            this.showImageDetails();
        }
    }

    showNextImage() {
        if (this.currentViewIndex < this.filteredImages.length - 1) {
            this.currentViewIndex++;
            this.showImageDetails();
        }
    }

    // ========== ОПЕРАЦИИ С ИЗОБРАЖЕНИЯМИ ==========

    async deleteSelected() {
        if (this.selectedImages.size === 0) return;

        if (!confirm(`Удалить ${this.selectedImages.size} изображений?`)) return;

        const deletePromises = Array.from(this.selectedImages).map(filename =>
            fetch(`/api/upload/${filename}`, {
                method: 'DELETE',
                credentials: 'include'
            })
        );

        try {
            await Promise.all(deletePromises);
            this.showAlert('Изображения удалены', 'success');
            this.selectedImages.clear();
            await this.loadMediaLibrary();
        } catch (error) {
            console.error('Ошибка удаления изображений:', error);
            this.showAlert('Ошибка удаления изображений', 'error');
        }
    }

    async deleteCurrentImage() {
        const image = this.filteredImages[this.currentViewIndex];
        if (!image) return;

        if (!confirm(`Удалить изображение "${image.filename}"?`)) return;

        try {
            const response = await fetch(`/api/upload/${image.filename}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.showAlert('Изображение удалено', 'success');
                this.hideModal('imageViewerModal');
                await this.loadMediaLibrary();
            } else {
                throw new Error('Ошибка удаления');
            }
        } catch (error) {
            console.error('Ошибка удаления изображения:', error);
            this.showAlert('Ошибка удаления изображения', 'error');
        }
    }

    downloadCurrentImage() {
        const image = this.filteredImages[this.currentViewIndex];
        if (!image) return;

        const link = document.createElement('a');
        link.href = image.url;
        link.download = image.filename;
        link.click();
    }

    copyImageUrl() {
        const urlInput = document.getElementById('imageUrl');
        urlInput.select();
        document.execCommand('copy');
        this.showAlert('URL скопирован в буфер обмена', 'success');
    }

    // ========== ЗАГРУЗКА ==========

    showUploadModal() {
        this.showModal('uploadModal');
    }

    handleBulkUpload(files) {
        if (files.length === 0) return;

        if (files.length > 10) {
            this.showAlert('Максимум 10 файлов за раз', 'error');
            return;
        }

        const queueList = document.getElementById('queueList');
        queueList.innerHTML = '';

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const queueItem = document.createElement('div');
                queueItem.className = 'queue-item';
                queueItem.innerHTML = `
                    <img src="${e.target.result}" class="queue-preview">
                    <div class="queue-info">
                        <div class="queue-name">${file.name}</div>
                        <div class="queue-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <div class="queue-status">В очереди</div>
                `;
                queueItem.dataset.file = file.name;
                queueList.appendChild(queueItem);
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('uploadQueue').style.display = 'block';
    }

    async startBulkUpload() {
        const files = document.getElementById('bulkUploadInput').files;
        const queueItems = document.querySelectorAll('.queue-item');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const queueItem = queueItems[i];

            if (!file.type.startsWith('image/')) continue;

            queueItem.querySelector('.queue-status').textContent = 'Загрузка...';
            queueItem.querySelector('.queue-status').className = 'queue-status uploading';

            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                const result = await response.json();

                if (response.ok) {
                    queueItem.querySelector('.queue-status').textContent = 'Успешно';
                    queueItem.querySelector('.queue-status').className = 'queue-status success';
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                queueItem.querySelector('.queue-status').textContent = 'Ошибка';
                queueItem.querySelector('.queue-status').className = 'queue-status error';
                console.error('Ошибка загрузки:', error);
            }
        }

        setTimeout(async () => {
            this.hideModal('uploadModal');
            await this.loadMediaLibrary();
            this.showAlert('Загрузка завершена', 'success');
        }, 1000);
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            'jpg': 'JPEG Image',
            'jpeg': 'JPEG Image',
            'png': 'PNG Image',
            'gif': 'GIF Image',
            'webp': 'WebP Image',
            'svg': 'SVG Vector',
            'bmp': 'Bitmap Image'
        };
        return types[ext] || 'Unknown Type';
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
        this.cancelCropping();
    }

    showAlert(message, type = 'info') {
        // Создаем временное уведомление
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        const colors = {
            success: '#48bb78',
            error: '#e53e3e',
            warning: '#ed8936',
            info: '#667eea'
        };

        alert.style.background = colors[type] || colors.info;
        alert.textContent = message;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Ошибка выхода:', error);
            window.location.href = '/login';
        }
    }

    // ========== ФУНКЦИИ РЕДАКТИРОВАНИЯ ==========

    startCropping() {
        this.isCropping = true;
        document.getElementById('cropOverlay').style.display = 'flex';

        const image = document.getElementById('viewerImage');
        const container = image.parentElement;

        // Инициализация кроппинга
        this.initCropping(image, container);
    }

    initCropping(image, container) {
        // Базовая реализация кроппинга
        const cropArea = document.getElementById('cropArea');
        const minSize = 100;

        // Устанавливаем начальный размер области кроппинга
        const cropSize = Math.min(image.naturalWidth, image.naturalHeight, 300);
        cropArea.style.width = cropSize + 'px';
        cropArea.style.height = cropSize + 'px';

        // Центрируем область кроппинга
        cropArea.style.left = (container.offsetWidth - cropSize) / 2 + 'px';
        cropArea.style.top = (container.offsetHeight - cropSize) / 2 + 'px';

        this.setupCropDrag(cropArea);
    }

    setupCropDrag(cropArea) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        cropArea.addEventListener('mousedown', startDrag);
        cropArea.addEventListener('touchstart', startDrag);

        function startDrag(e) {
            e.preventDefault();
            isDragging = true;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            startLeft = parseInt(cropArea.style.left);
            startTop = parseInt(cropArea.style.top);

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }

        function drag(e) {
            if (!isDragging) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            cropArea.style.left = (startLeft + deltaX) + 'px';
            cropArea.style.top = (startTop + deltaY) + 'px';
        }

        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        }
    }

    async applyCrop() {
        const image = this.filteredImages[this.currentViewIndex];
        if (!image) return;

        this.showAlert('Функция кроппинга в разработке', 'info');
        this.cancelCropping();

        // Здесь будет реализация отправки данных кроппинга на сервер
        // const cropData = this.getCropData();
        // await fetch(`/api/upload/crop/${image.filename}`, {
        //     method: 'POST',
        //     body: JSON.stringify(cropData),
        //     headers: { 'Content-Type': 'application/json' }
        // });
    }

    cancelCropping() {
        this.isCropping = false;
        document.getElementById('cropOverlay').style.display = 'none';
    }

    async replaceImage() {
        document.getElementById('replaceFileInput').click();
    }

    async handleReplaceImage(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const originalImage = this.filteredImages[this.currentViewIndex];
        if (!originalImage) return;

        try {
            // Сначала загружаем новое изображение
            const formData = new FormData();
            formData.append('image', file);

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!uploadResponse.ok) throw new Error('Ошибка загрузки');

            // Затем удаляем старое изображение
            await fetch(`/api/upload/${originalImage.filename}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            this.showAlert('Изображение заменено', 'success');
            this.hideModal('imageViewerModal');
            await this.loadMediaLibrary();

        } catch (error) {
            console.error('Ошибка замены изображения:', error);
            this.showAlert('Ошибка замены изображения', 'error');
        }
    }

    getCropData() {
        // Возвращает данные для кроппинга
        const cropArea = document.getElementById('cropArea');
        const image = document.getElementById('viewerImage');

        return {
            x: parseInt(cropArea.style.left),
            y: parseInt(cropArea.style.top),
            width: parseInt(cropArea.style.width),
            height: parseInt(cropArea.style.height),
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight
        };
    }
}

// Инициализация медиатеки при загрузке страницы
let mediaLibrary;

document.addEventListener('DOMContentLoaded', () => {
    mediaLibrary = new MediaLibrary();
});

// Добавляем CSS анимации для алертов
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .media-item {
        transition: all 0.2s ease;
    }
    
    .media-item.selected {
        transform: scale(0.95);
    }
`;
document.head.appendChild(style);