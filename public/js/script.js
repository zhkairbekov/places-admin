class PlacesApp {
    constructor() {
        this.places = [];
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadPlaces();
        this.renderPlaces();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/check');
            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = data.authenticated;
            }
        } catch (error) {
            console.log('Ошибка проверки авторизации:', error);
            this.isAuthenticated = false;
        }
    }

    async loadPlaces() {
        try {
            const response = await fetch('/api/places');
            if (!response.ok) throw new Error('Ошибка загрузки данных');

            this.places = await response.json();
            this.hideLoading();
        } catch (error) {
            this.showError('Не удалось загрузить данные мест');
            console.error('Ошибка:', error);
        }
    }

    renderPlaces() {
        const grid = document.getElementById('placesGrid');

        if (this.places.length === 0) {
            grid.innerHTML = '<div class="error">Нет доступных мест</div>';
            return;
        }

        grid.innerHTML = this.places.map(place => `
        <div class="place-card">
            ${place.image ? `
                <img src="${this.getImageUrl(place.image)}" 
                     alt="${place.name}" 
                     class="place-image"
                     onerror="this.style.display='none'">
            ` : '<div class="placeholder-image">🏞️</div>'}
            <div class="place-content">
                <span class="place-category">${this.escapeHtml(place.category)}</span>
                <h3 class="place-name">${this.escapeHtml(place.name)}</h3>
                <p class="place-description">${this.escapeHtml(place.description || '')}</p>
                <div class="place-details">
                    ${place.price ? `<span class="place-price">${place.price} руб.</span>` : ''}
                    ${place.rating ? `<span class="place-rating">★ ${place.rating}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    }

    getImageUrl(imagePath) {
        // Если это полный URL (http/https), используем как есть
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }

        // Если это data URI, используем как есть
        if (imagePath.startsWith('data:')) {
            return imagePath;
        }

        // Локальные изображения - добавляем /images/ перед путем
        if (imagePath.startsWith('/')) {
            return imagePath; // Уже абсолютный путь
        }

        // Относительные пути - обслуживаем из папки /images
        return `/images/${imagePath}`;
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new PlacesApp();
});