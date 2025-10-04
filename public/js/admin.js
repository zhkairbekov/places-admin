class AdminApp {
    constructor() {
        this.places = [];
        this.init();
    }

    async init() {
        await this.loadPlaces();
        this.setupEventListeners();
        // Убраны setupActivityTracking() и setupAuthCheck()
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
                <td>${place.rating || '-'}</td>
                <td class="actions">
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
        
        document.getElementById('addPlaceBtn').addEventListener('click', () => this.showModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        document.querySelector('.close').addEventListener('click', () => this.hideModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
    }

    showModal(place = null) {
        this.modal.style.display = 'block';
        document.body.classList.add('no-scroll');
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

    hideModal() {
        this.modal.style.display = 'none';
        document.body.classList.remove('no-scroll');
        this.form.reset();
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

            this.hideModal();
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
            this.showModal(place);
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
}

// Инициализация админ-панели
const admin = new AdminApp();