class AdminLogin {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));

        // Проверяем, может пользователь уже авторизован
        this.checkExistingAuth();
    }

    async checkExistingAuth() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();

            if (data.authenticated) {
                // Уже авторизован, редирект в админку
                window.location.href = '/admin.html';
            }
        } catch (error) {
            // Ошибка - остаемся на странице логина
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Успешный вход, редирект в админку
                window.location.href = '/admin.html';
            } else {
                // Показываем модальное окно с ошибкой
                this.showErrorModal(data.error);
            }
        } catch (error) {
            this.showErrorModal('Ошибка соединения с сервером');
        }
    }

    showErrorModal(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').style.display = 'block';
    }
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
    // Очищаем поле пароля при закрытии ошибки
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', (e) => {
    const modal = document.getElementById('errorModal');
    if (e.target === modal) {
        closeErrorModal();
    }
});

// Инициализация формы логина
new AdminLogin();