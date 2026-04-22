

document.addEventListener('DOMContentLoaded', function() {
    const captchaCheckbox = document.getElementById('captcha');
    const captchaInitial = document.getElementById('captchaInitial');
    const captchaSuccess = document.getElementById('captchaSuccess');

    if (captchaCheckbox) {
        captchaCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Pequeño retraso para simular "procesamiento"
                setTimeout(() => {
                    captchaInitial.style.display = 'none';
                    captchaSuccess.style.display = 'flex';
                }, 600);
            }
        });
    }

    // Mantén aquí tu lógica anterior del loginForm.addEventListener...
});

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const captcha = document.getElementById('captcha').checked;

        if(!captcha) {
            alert('Por favor, confirma que no eres un robot.');
            return;
        }
        
        // Simulación de carga
        const submitBtn = this.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'VERIFICANDO...';
        
        console.log('Intento de login:', { user, pass });

        setTimeout(() => {
            alert('¡Bienvenido, ' + user + '!');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Iniciar Sesión';
        }, 1500);
    });
});