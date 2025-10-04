class AdminApp {
    constructor() {
        this.places = [];
        this.backups = [];
        this.currentBackup = null;
        this.mediaLibrary = [];
        this.selectedMediaItem = null;
        this.uploadArea = null;
        this.imageFileInput = null;
        this.previewImage = null;
        this.imagePreview = null;
        this.imageUrlInput = null;
        this.init();
    }

    async init() {
        await this.loadPlaces();
        this.setupEventListeners();
        this.setupImageUpload();
    }

    setupImageUpload() {
        this.uploadArea = document.getElementById('uploadArea');
        this.imageFileInput = document.getElementById('imageFile');
        this.previewImage = document.getElementById('previewImage');
        this.imagePreview = document.getElementById('imagePreview');
        this.imageUrlInput = document.getElementById('image');
        this.removeImageBtn = document.getElementById('removeImage');

        // Обработчики для drag & drop
        this.uploadArea.addEventListener('click', () => this.imageFileInput.click());

        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.parentElement.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.parentElement.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.parentElement.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageSelect(files[0]);
            }
        });

        // Обработчик выбора файла
        this.imageFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageSelect(e.target.files[0]);
            }
        });

        // Обработчик удаления изображения
        this.removeImageBtn.addEventListener('click', () => {
            this.clearImage();
        });

        // Обработчик изменения URL
        this.imageUrlInput.addEventListener('input', () => {
            if (this.imageUrlInput.value) {
                this.hidePreview();
            }
        });
    }

    handleImageSelect(file) {
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            this.showAlert('Пожалуйста, выберите файл изображения', 'error');
            return;
        }

        // Проверка размера файла
        if (file.size > 5 * 1024 * 1024) {
            this.showAlert('Размер файла не должен превышать 5MB', 'error');
            return;
        }

        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showPreview(e.target.result, file.name);
        };
        reader.readAsDataURL(file);

        // Загружаем на сервер
        this.uploadImage(file);
    }

    showPreview(dataUrl, filename) {
        this.previewImage.src = dataUrl;
        this.imagePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
        this.imageUrlInput.value = ''; // Очищаем URL поле
    }

    hidePreview() {
        this.imagePreview.style.display = 'none';
        this.uploadArea.style.display = 'block';
    }

    clearImage() {
        this.hidePreview();
        this.imageFileInput.value = '';
        this.imageUrlInput.value = '';
        this.selectedMediaItem = null;
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            this.showUploadProgress(0);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                this.showUploadProgress(100);
                this.imageUrlInput.value = result.url; // Устанавливаем URL в поле
                this.showAlert('Изображение успешно загружено', 'success');
            } else {
                throw new Error(result.error || 'Ошибка загрузки');
            }

        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            this.showAlert('Ошибка загрузки изображения: ' + error.message, 'error');
            this.clearImage();
        } finally {
            setTimeout(() => {
                this.hideUploadProgress();
            }, 2000);
        }
    }

    showUploadProgress(percent) {
        // Создаем или находим элемент прогресса
        let progressContainer = this.uploadArea.querySelector('.upload-progress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'upload-progress';
            progressContainer.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="upload-status">Загрузка: 0%</div>
            `;
            this.uploadArea.appendChild(progressContainer);
        }

        const progressFill = progressContainer.querySelector('.progress-fill');
        const uploadStatus = progressContainer.querySelector('.upload-status');

        progressFill.style.width = percent + '%';
        uploadStatus.textContent = percent === 100 ? 'Загрузка завершена!' : `Загрузка: ${percent}%`;
    }

    hideUploadProgress() {
        const progressContainer = this.uploadArea.querySelector('.upload-progress');
        if (progressContainer) {
            progressContainer.remove();
        }
    }

    // Обновите метод showModal чтобы сбрасывать состояние загрузки
    showModal(modalId, place = null) {
        if (modalId === 'mediaLibraryModal') {
            this.selectedMediaItem = null; // Сбрасываем выбор при открытии
        }
        if (modalId === 'placeModal') {
            document.getElementById('modalTitle').textContent = place ? 'Редактировать место' : 'Добавить место';

            if (place) {
                document.getElementById('placeId').value = place.id;
                document.getElementById('name').value = place.name;
                document.getElementById('description').value = place.description || '';
                document.getElementById('category').value = place.category;
                document.getElementById('address').value = place.address || '';
                document.getElementById('price').value = place.price || '';
                document.getElementById('rating').value = place.rating || '';

                // Обработка изображения
                if (place.image) {
                    if (place.image.startsWith('/images/')) {
                        // Локальное изображение - показываем превью
                        this.previewImage.src = place.image;
                        this.imagePreview.style.display = 'block';
                        this.uploadArea.style.display = 'none';
                        this.imageUrlInput.value = place.image;
                    } else {
                        // Внешний URL - скрываем превью
                        this.hidePreview();
                        this.imageUrlInput.value = place.image;
                    }
                } else {
                    // Нет изображения - показываем область загрузки
                    this.clearImage();
                }
            } else {
                this.form.reset();
                document.getElementById('placeId').value = '';
                this.clearImage(); // Сбрасываем изображение
            }
        }

        document.getElementById(modalId).style.display = 'block';
        document.body.classList.add('no-scroll');
    }

    // Обновите метод hideModal
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.classList.remove('no-scroll');

        if (modalId === 'placeModal') {
            this.form.reset();
            this.clearImage(); // Сбрасываем изображение при закрытии
        }
    }

    async loadPlaces() {
        try {
            const response = await fetch('/api/places', {
                credentials: 'include'
            });
            if (response.status === 401) {
                window.location.href = '/auth';
                return;
            }

            if (!response.ok) throw new Error('Ошибка загрузки');

            this.places = await response.json();
            this.renderPlaces();
        } catch (error) {
            this.showAlert('Ошибка загрузки мест', 'error');
        }
    }

    renderPlaces() {
        const tbody = document.getElementById('placesTableBody');

        if (this.places.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет мест для отображения</td></tr>';
            return;
        }

        tbody.innerHTML = this.places.map(place => `
            <tr data-place-id="${place.id}">
                <td>${this.escapeHtml(place.name)}</td>
                <td>${this.escapeHtml(place.category)}</td>
                <td>${this.escapeHtml(place.address || '-')}</td>
                <td>${place.price ? place.price + ' руб.' : '-'}</td>
                <td>${place.rating || '-'} ★</td>
                <td class="actions" style="padding: 1.6rem 1rem;">
                    <button class="btn btn-primary edit-btn" data-id="${place.id}">✏️</button>
                    <button class="btn btn-danger delete-btn" data-id="${place.id}">🗑️</button>
                </td>
            </tr>
        `).join('');

        this.attachEventHandlers();
    }

    attachEventHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const placeId = e.target.getAttribute('data-id');
                this.editPlace(parseInt(placeId));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const placeId = e.target.getAttribute('data-id');
                this.deletePlace(parseInt(placeId));
            });
        });
    }

    setupEventListeners() {
        this.modal = document.getElementById('placeModal');
        this.form = document.getElementById('placeForm');

        // Основные кнопки
        document.getElementById('addPlaceBtn').addEventListener('click', () => this.showModal('placeModal'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('cleanupBackupsBtn').addEventListener('click', () => this.cleanupBackups());
        document.getElementById('viewBackupsBtn').addEventListener('click', () => this.showBackupsModal());

        // Кнопки модальных окон
        document.querySelector('.close').addEventListener('click', () => this.hideModal('placeModal'));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal('placeModal'));

        // Кнопки для бэкапов
        document.getElementById('refreshBackupsBtn').addEventListener('click', () => this.loadBackups());
        document.getElementById('cleanupBackupsModalBtn').addEventListener('click', () => this.cleanupBackups());
        document.getElementById('restoreBackupBtn').addEventListener('click', () => this.restoreBackup());

        // Форма
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Закрытие модальных окон
        document.querySelectorAll('.close[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal');
                this.hideModal(modalId);
            });
        });

        // Закрытие при клике вне модального окна
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal('placeModal');
        });

        document.getElementById('backupsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('backupsModal')) this.hideModal('backupsModal');
        });

        document.getElementById('backupContentModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('backupContentModal')) this.hideModal('backupContentModal');
        });

        // Обработчики для медиатеки
        document.getElementById('browseMediaBtn').addEventListener('click', () => this.showMediaLibrary());
        document.getElementById('refreshLibraryBtn').addEventListener('click', () => this.loadMediaLibrary());
        document.getElementById('uploadToLibraryBtn').addEventListener('click', () => this.uploadToLibrary());
        document.getElementById('selectImageBtn').addEventListener('click', () => this.selectMediaItem());
        document.getElementById('libraryUploadInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleLibraryUpload(e.target.files[0]);
            }
        });
    }

    // ========== МЕТОДЫ ДЛЯ МЕСТ ==========

    showModal(modalId, place = null) {
        if (modalId === 'placeModal') {
            document.getElementById('modalTitle').textContent = place ? 'Редактировать место' : 'Добавить место';

            if (place) {
                document.getElementById('placeId').value = place.id;
                document.getElementById('name').value = place.name;
                document.getElementById('description').value = place.description || '';
                document.getElementById('category').value = place.category;
                document.getElementById('address').value = place.address || '';
                document.getElementById('price').value = place.price || '';
                document.getElementById('rating').value = place.rating || '';
                document.getElementById('image').value = place.image || '';
            } else {
                this.form.reset();
                document.getElementById('placeId').value = '';
            }
        }

        document.getElementById(modalId).style.display = 'block';
        document.body.classList.add('no-scroll');
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.classList.remove('no-scroll');

        if (modalId === 'placeModal') {
            this.form.reset();
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const placeData = {
            name: document.getElementById('name').value.trim(),
            description: document.getElementById('description').value.trim(),
            category: document.getElementById('category').value.trim(),
            address: document.getElementById('address').value.trim(),
            image: document.getElementById('image').value.trim()
        };

        const price = document.getElementById('price').value;
        const rating = document.getElementById('rating').value;

        if (price && !isNaN(parseFloat(price))) {
            placeData.price = parseFloat(price);
        }

        if (rating && !isNaN(parseFloat(rating))) {
            placeData.rating = parseFloat(rating);
        }

        if (!placeData.name || !placeData.category) {
            this.showAlert('Название и категория обязательны для заполнения', 'error');
            return;
        }

        const placeId = document.getElementById('placeId').value;
        const url = placeId ? `/api/places/${placeId}` : '/api/places';
        const method = placeId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(placeData),
                credentials: 'include'
            });

            if (response.status === 401) {
                this.showAlert('Сессия завершена. Пожалуйста, войдите снова.', 'error');
                setTimeout(() => {
                    window.location.href = '/auth';
                }, 2000);
                return;
            }

            const result = await response.json();

            if (!response.ok) {
                if (result.errors) {
                    const errorMessages = result.errors.map(err => err.msg).join(', ');
                    throw new Error(`Ошибки валидации: ${errorMessages}`);
                }
                throw new Error(result.error || 'Ошибка сохранения');
            }

            this.hideModal('placeModal');
            await this.loadPlaces();
            this.showAlert('Место успешно сохранено', 'success');

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showAlert(error.message, 'error');
        }
    }

    editPlace(id) {
        const place = this.places.find(p => p.id === id);
        if (place) {
            this.showModal('placeModal', place);
        }
    }

    async deletePlace(id) {
        if (!confirm('Вы уверены, что хотите удалить это место?')) return;

        try {
            const response = await fetch(`/api/places/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.status === 401) {
                window.location.href = '/auth';
                return;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка удаления');
            }

            await this.loadPlaces();
            this.showAlert('Место успешно удалено', 'success');
        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.showAlert('Ошибка удаления места', 'error');
        }
    }

    // ========== МЕТОДЫ ДЛЯ БЭКАПОВ ==========

    async showBackupsModal() {
        this.showModal('backupsModal');
        await this.loadBackups();
    }

    async loadBackups() {
        try {
            const response = await fetch('/api/places/backups', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Ошибка загрузки бэкапов');

            this.backups = await response.json();
            this.renderBackupsList();

        } catch (error) {
            console.error('Ошибка загрузки бэкапов:', error);
            this.showAlert('Ошибка загрузки бэкапов', 'error');
        }
    }

    renderBackupsList() {
        const container = document.getElementById('backupsList');

        if (this.backups.length === 0) {
            container.innerHTML = `
                <div class="empty-backups">
                    <p>📭 Бэкапы не найдены</p>
                    <p style="font-size: 0.9rem; color: #718096;">
                        Бэкапы создаются автоматически при каждом изменении данных
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.backups.map(backup => `
            <div class="backup-item">
                <div class="backup-header">
                    <div class="backup-filename">${backup.filename}</div>
                    <div class="backup-size">${this.formatFileSize(backup.size)}</div>
                </div>
                <div class="backup-date">Создан: ${backup.formattedDate}</div>
                <div class="backup-actions">
                    <button class="btn btn-primary" onclick="admin.viewBackupContent('${backup.filename}')">
                        👁️ Просмотр
                    </button>
                    <button class="btn btn-success" onclick="admin.restoreBackupPrompt('${backup.filename}')">
                        🔄 Восстановить
                    </button>
                    <button class="btn btn-danger" onclick="admin.deleteBackupPrompt('${backup.filename}')">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    async viewBackupContent(filename) {
        try {
            const response = await fetch(`/api/places/backups/${filename}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Ошибка загрузки содержимого');

            const content = await response.json();
            this.currentBackup = filename;

            document.getElementById('backupContent').innerHTML = `
                <div><strong>Файл:</strong> ${filename}</div>
                <div style="margin-top: 1rem;">
                    <strong>Содержимое:</strong>
                    <pre class="backup-content">${JSON.stringify(content, null, 2)}</pre>
                </div>
            `;

            this.showModal('backupContentModal');

        } catch (error) {
            console.error('Ошибка просмотра бэкапа:', error);
            this.showAlert('Ошибка просмотра бэкапа', 'error');
        }
    }

    async restoreBackupPrompt(filename) {
        if (confirm(`Восстановить данные из бэкапа "${filename}"? Текущие данные будут сохранены в новый бэкап.`)) {
            await this.restoreBackup(filename);
        }
    }

    async restoreBackup(filename = null) {
        const backupFilename = filename || this.currentBackup;

        try {
            const response = await fetch(`/api/places/backups/${backupFilename}/restore`, {
                method: 'POST',
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Данные успешно восстановлены из бэкапа', 'success');
                this.hideModal('backupContentModal');
                this.hideModal('backupsModal');
                await this.loadPlaces(); // Перезагружаем текущие данные
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Ошибка восстановления:', error);
            this.showAlert('Ошибка восстановления из бэкапа', 'error');
        }
    }

    async deleteBackupPrompt(filename) {
        if (confirm(`Удалить бэкап "${filename}"?`)) {
            await this.deleteBackup(filename);
        }
    }

    async deleteBackup(filename) {
        try {
            const response = await fetch(`/api/places/backups/${filename}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Бэкап успешно удален', 'success');
                await this.loadBackups(); // Обновляем список
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Ошибка удаления бэкапа:', error);
            this.showAlert('Ошибка удаления бэкапа', 'error');
        }
    }

    async cleanupBackups() {
        if (confirm('Очистить бэкапы старше 14 дней?')) {
            try {
                const response = await fetch('/api/places/cleanup-backups', {
                    method: 'POST',
                    credentials: 'include'
                });

                const result = await response.json();

                if (response.ok) {
                    this.showAlert(result.message, 'success');
                    await this.loadBackups(); // Обновляем список
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('Ошибка очистки бэкапов:', error);
                this.showAlert('Ошибка очистки бэкапов', 'error');
            }
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    async logout() {
        if (!confirm('Вы уверены, что хотите выйти?')) {
            return;
        }

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                alert('Вы успешно вышли из системы');
                window.location.href = data.redirect || '/';
            } else {
                throw new Error('Ошибка при выходе');
            }
        } catch (error) {
            console.error('Ошибка выхода:', error);
            this.showAlert('Ошибка при выходе из системы', 'error');
        }
    }

    showAlert(message, type) {
        const container = document.getElementById('alertContainer');
        container.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;

        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ========== МЕТОДЫ ДЛЯ МЕДИАТЕКИ ==========

    async showMediaLibrary() {
        this.showModal('mediaLibraryModal');
        await this.loadMediaLibrary();
    }

    async loadMediaLibrary() {
        try {
            const response = await fetch('/api/upload/gallery', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки медиатеки');
            
            this.mediaLibrary = await response.json();
            this.renderMediaLibrary();
            
        } catch (error) {
            console.error('Ошибка загрузки медиатеки:', error);
            this.showAlert('Ошибка загрузки медиатеки', 'error');
        }
    }

    renderMediaLibrary() {
        const container = document.getElementById('mediaLibraryGrid');
        const selectButton = document.getElementById('selectImageBtn');
        
        if (this.mediaLibrary.length === 0) {
            container.innerHTML = `
                <div class="empty-media">
                    <div class="empty-media-icon">🖼️</div>
                    <p>Медиатека пуста</p>
                    <p style="font-size: 0.9rem; color: #a0aec0;">
                        Загрузите первое изображение
                    </p>
                </div>
            `;
            selectButton.disabled = true;
            return;
        }

        container.innerHTML = this.mediaLibrary.map(image => `
            <div class="media-item ${this.selectedMediaItem === image.url ? 'selected' : ''}" 
                 data-url="${image.url}" 
                 data-filename="${image.filename}">
                <img src="${image.url}" alt="${image.filename}" class="media-item-image" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23f7fafc\"/><text x=\"50\" y=\"50\" font-size=\"14\" text-anchor=\"middle\" dy=\".3em\" fill=\"%23a0aec0\">🚫</text></svg>'">
                <div class="media-item-info">
                    <div class="media-item-filename" title="${image.filename}">${image.filename}</div>
                    <div class="media-item-size">${image.formattedSize}</div>
                </div>
                <div class="media-item-actions">
                    <button class="btn btn-danger btn-sm" onclick="admin.deleteMediaItem('${image.filename}')" title="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // Добавляем обработчики выбора
        container.querySelectorAll('.media-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.media-item-actions')) {
                    this.selectMediaInLibrary(item);
                }
            });
        });

        selectButton.disabled = !this.selectedMediaItem;
    }

    selectMediaInLibrary(item) {
        // Снимаем выделение со всех элементов
        document.querySelectorAll('.media-item').forEach(i => i.classList.remove('selected'));
        
        // Выделяем текущий элемент
        item.classList.add('selected');
        this.selectedMediaItem = item.getAttribute('data-url');
        
        // Активируем кнопку выбора
        document.getElementById('selectImageBtn').disabled = false;
    }

    selectMediaItem() {
        if (this.selectedMediaItem) {
            this.imageUrlInput.value = this.selectedMediaItem;
            this.previewImage.src = this.selectedMediaItem;
            this.imagePreview.style.display = 'block';
            this.uploadArea.style.display = 'none';
            this.hideModal('mediaLibraryModal');
            this.showAlert('Изображение выбрано', 'success');
        }
    }

    uploadToLibrary() {
        document.getElementById('libraryUploadInput').click();
    }

    async handleLibraryUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showAlert('Пожалуйста, выберите файл изображения', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showAlert('Размер файла не должен превышать 5MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Изображение успешно загружено в медиатеку', 'success');
                await this.loadMediaLibrary(); // Обновляем галерею
                
                // Автоматически выбираем новое изображение
                this.selectedMediaItem = result.url;
                this.renderMediaLibrary();
                
            } else {
                throw new Error(result.error || 'Ошибка загрузки');
            }

        } catch (error) {
            console.error('Ошибка загрузки в медиатеку:', error);
            this.showAlert('Ошибка загрузки изображения: ' + error.message, 'error');
        }
    }

    async deleteMediaItem(filename) {
        if (!confirm(`Удалить изображение "${filename}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/upload/${filename}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Изображение удалено из медиатеки', 'success');
                
                // Если удаляем выбранное изображение - сбрасываем выбор
                if (this.selectedMediaItem && this.selectedMediaItem.includes(filename)) {
                    this.selectedMediaItem = null;
                }
                
                await this.loadMediaLibrary(); // Обновляем галерею
                
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Ошибка удаления изображения:', error);
            this.showAlert('Ошибка удаления изображения', 'error');
        }
    }
}

// Инициализация админ-панели
const admin = new AdminApp();