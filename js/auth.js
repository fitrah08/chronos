// ═══════════════════════════════════════════════════════════════
// CHRONOS • AUTHENTICATION (FINAL)
// ═══════════════════════════════════════════════════════════════

function switchTab(tab) {
  var tabs = document.querySelectorAll('.tab');
  var loginForm = document.getElementById('loginForm');
  var registerForm = document.getElementById('registerForm');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  
  if (tab === 'login') {
    tabs[0].classList.add('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    tabs[1].classList.add('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
  
  hideMessages();
}

function togglePassword(inputId) {
  var input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showError(message, isModal) {
  isModal = isModal || false;
  var el = isModal ? document.getElementById('modalError') : document.getElementById('errorMessage');
  var successEl = isModal ? document.getElementById('modalSuccess') : document.getElementById('successMessage');
  if (successEl) successEl.classList.remove('show');
  if (el) {
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 4000);
  }
}

function showSuccess(message, isModal) {
  isModal = isModal || false;
  var el = isModal ? document.getElementById('modalSuccess') : document.getElementById('successMessage');
  var errorEl = isModal ? document.getElementById('modalError') : document.getElementById('errorMessage');
  if (errorEl) errorEl.classList.remove('show');
  if (el) {
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 4000);
  }
}

function hideMessages() {
  var errorEl = document.getElementById('errorMessage');
  var successEl = document.getElementById('successMessage');
  if (errorEl) errorEl.classList.remove('show');
  if (successEl) successEl.classList.remove('show');
}

async function handleLogin(e) {
  e.preventDefault();
  
  var username = document.getElementById('loginUsername').value.trim();
  var password = document.getElementById('loginPassword').value;
  
  if (!username || !password) {
    showError('Username and password required');
    return;
  }
  
  console.log('🔐 Login attempt:', username);
  
  var result = await STORE.login(username, password);
  
  console.log('📦 Login result:', result);
  
  if (result.success) {
    console.log('✅ Login success! Role:', result.user.role);
    
    showSuccess('Login successful!');
    
    // Redirect langsung tanpa setTimeout
    if (result.user.role === 'superadmin' || result.user.role === 'admin') {
      console.log('🚀 Redirecting to admin.html');
      window.location.replace('admin.html');
    } else {
      console.log('🚀 Redirecting to dashboard.html');
      window.location.replace('dashboard.html');
    }
  } else {
    showError(result.error || 'Invalid username or password');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  var fullName = document.getElementById('regFullName').value.trim();
  var username = document.getElementById('regUsername').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var password = document.getElementById('regPassword').value;
  var confirmPassword = document.getElementById('regConfirmPassword').value;
  
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (password.length < 8) {
    showError('Password must be at least 8 characters');
    return;
  }
  
  console.log('📝 Register attempt:', username);
  
  var result = await STORE.register({
    fullName: fullName,
    username: username,
    email: email,
    password: password
  });
  
  console.log('📦 Register result:', result);
  
  if (result.success) {
    showSuccess('Account created! Please login.');
    setTimeout(function() {
      switchTab('login');
    }, 1500);
    
    document.getElementById('regFullName').value = '';
    document.getElementById('regUsername').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
  } else {
    showError(result.error || 'Registration failed');
  }
}

function openForgotPassword() {
  document.getElementById('forgotPasswordModal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function handleForgotPassword(e) {
  e.preventDefault();
  var email = document.getElementById('resetEmail').value.trim();
  showSuccess('If an account exists, reset instructions will be sent.', true);
  setTimeout(function() {
    closeModal('forgotPasswordModal');
  }, 2000);
}