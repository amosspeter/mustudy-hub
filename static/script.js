function toggleForms(formType) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const formSubtitle = document.getElementById('form-subtitle');

    if (formType === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        formSubtitle.textContent = 'Create your academic space';
    } else {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        formSubtitle.textContent = 'Sign in to your account';
    }
}
document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();

            const fullname = document.getElementById('reg-fullname').value;
                const email = document.getElementById('reg-email').value;
                    const username = document.getElementById('reg-username').value;
                        const password = document.getElementById('reg-password').value;
                            const confirmPassword = document.getElementById('reg-confirm-password').value;
                                const submitBtn = this.querySelector('.submit-btn');

                                    if (password !== confirmPassword) {
                                            alert("Passwords do not match!");
                                                    return;
                                                        }

                                                            submitBtn.textContent = "Creating Account...";
                                                                submitBtn.disabled = true;

                                                                    try {
                                                                            const response = await fetch('/api/register', {
                                                                                        method: 'POST',
                                                                                                    headers: {
                                                                                                                    'Content-Type': 'application/json'
                                                                                                                                },
                                                                                                                                            body: JSON.stringify({
                                                                                                                                                            fullname: fullname,
                                                                                                                                                                            email: email,
                                                                                                                                                                                            username: username,
                                                                                                                                                                                                            password: password
                                                                                                                                                                                                                        })
                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                        const data = await response.json();

                                                                                                                                                                                                                                                if (response.ok) {
                                                                                                                                                                                                                                                            alert(data.message);
                                                                                                                                                                                                                                                                        document.getElementById('register-form').reset();
                                                                                                                                                                                                                                                                                    toggleForms('login');
                                                                                                                                                                                                                                                                                            } else {
                                                                                                                                                                                                                                                                                                        alert(data.message);
                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                                                                                                                            console.error('Error:', error);
                                                                                                                                                                                                                                                                                                                                    alert("An error occurred. Please try again.");
                                                                                                                                                                                                                                                                                                                                        } finally {
                                                                                                                                                                                                                                                                                                                                                submitBtn.textContent = "Create Account";
                                                                                                                                                                                                                                                                                                                                                        submitBtn.disabled = false;
                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                            });


function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault(); // Prevent form submission and URL data exposure

    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = this.querySelector('.submit-btn');

    submitBtn.textContent = "Signing In...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identifier: identifier,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Redirect user to dashboard on successful login
            window.location.href = '/dashboard';
        } else {
            // Display error message (invalid credentials, unverified email)
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert("An error occurred during login. Please try again.");
    } finally {
        submitBtn.textContent = "Sign In";
        submitBtn.disabled = false;
    }
});