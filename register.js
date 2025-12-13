import { API_BASE_URL } from './config.js';

// Registration Modal Functions
function openRegisterModal() {
    document.getElementById('registerModal').classList.add('active');
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('active');
}

// Handle register form submission
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const passwordError = document.getElementById('passwordError');

            if (password !== confirmPassword) {
                passwordError.style.display = 'block';
                return;
            }

            passwordError.style.display = 'none';

            // Get form data
            const email = document.getElementById('regEmail').value;
            const name = document.getElementById('regName').value;

            // Here you would normally send data to backend
            console.log('Registration data:', { email, name, password });

            // Show success message
            alert('Pendaftaran berhasil! Silakan login dengan akun Anda.');

            // Close modal and reset form
            closeRegisterModal();
            registerForm.reset();
        });
    }

    // Add click handler to "Daftar Sekarang" link
    const registerLink = document.querySelector('a.text-primary');
    if (registerLink && registerLink.textContent.includes('Daftar Sekarang')) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            openRegisterModal();
        });
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('registerModal');
    if (e.target === modal) {
        closeRegisterModal();
    }
});

// Make functions globally available
// window.openRegisterModal = openRegisterModal;
// window.closeRegisterModal = closeRegisterModal;
