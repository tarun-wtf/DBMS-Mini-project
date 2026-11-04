const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const authTitle = document.getElementById('authTitle');
const nextPage = new URLSearchParams(window.location.search).get('next');

function showAuthMode(mode) {
  const isLogin = mode === 'login';
  loginForm.classList.toggle('hidden', !isLogin); registerForm.classList.toggle('hidden', isLogin);
  loginTab.classList.toggle('active', isLogin); registerTab.classList.toggle('active', !isLogin); authTitle.textContent = isLogin ? 'Welcome back' : 'Create your account';
}
loginTab.addEventListener('click', () => showAuthMode('login')); registerTab.addEventListener('click', () => showAuthMode('register'));

async function completeAuth(form, url, errorElement) {
  const body = Object.fromEntries(new FormData(form));
  try { const result = await pageApi.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); localStorage.setItem('freshkartToken', result.token); localStorage.setItem('freshkartUsername', result.username); localStorage.setItem('freshkartRole', result.role); window.location.href = nextPage === 'payment' ? 'payment.html' : nextPage === 'admin' ? 'admin.html' : 'account.html'; } catch (error) { errorElement.textContent = error.message; }
}
loginForm.addEventListener('submit', (event) => { event.preventDefault(); completeAuth(loginForm, '/api/auth/login', document.getElementById('loginError')); });
registerForm.addEventListener('submit', (event) => { event.preventDefault(); completeAuth(registerForm, '/api/auth/register', document.getElementById('registerError')); });