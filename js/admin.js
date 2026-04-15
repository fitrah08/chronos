// ═══════════════════════════════════════════════════════════════
// CHRONOS • ADMIN PANEL (With Photo Upload)
// ═══════════════════════════════════════════════════════════════

let users = [];
let deleteUserId = null;
let editingUserId = null;
let tempAdminPhotoData = null;

async function init() {
  console.log('🚀 Admin initializing...');
  
  // TUNGGU STORE INIT
  await STORE.init();
  
  const user = STORE.getCurrentUser();
  console.log('🔍 Admin - currentUser:', user);
  
  if (!user) {
    console.log('❌ No user, redirecting to login');
    window.location.replace('index.html');
    return;
  }
  
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    console.log('❌ Not admin, redirecting to dashboard');
    window.location.replace('dashboard.html');
    return;
  }
  
  document.getElementById('adminName').textContent = user.fullName;
  document.getElementById('adminRole').textContent = user.role === 'superadmin' ? 'Super Admin' : 'Admin';
  
  await loadUsers();
  console.log('✅ Admin ready!');
}


async function loadUsers() {
  try {
    const data = await STORE.getAllUsers();
    users = data.users || [];
    console.log('📊 Loaded', users.length, 'users');
    
    // DEBUG: Cek semua user dan photoURL mereka
    users.forEach(u => {
      console.log(`👤 ${u.username} - Photo: ${u.photoURL ? 'YES' : 'NO'}`);
    });
    
    renderUsersTable();
    updateStats();
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

function updateStats() {
  document.getElementById('totalUsers').textContent = users.length;
  document.getElementById('activeToday').textContent = Math.min(users.length, Math.floor(Math.random() * users.length) + 1);
  document.getElementById('totalQuests').textContent = users.reduce((sum, u) => sum + (u.questsCompleted?.length || 0), 0);
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text3)">No users found</td></tr>`;
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    // Debug: cek photoURL
    console.log('User:', user.username, 'PhotoURL:', user.photoURL);
    
    return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px">
          ${user.photoURL ? 
            `<img src="${user.photoURL}" class="user-avatar-small" alt="${user.full_name}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` : 
            `<div style="width:32px;height:32px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${(user.full_name || 'U').charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div style="font-weight:600">${user.full_name || 'Unknown'}</div>
            <div style="font-size:12px;color:var(--text2)">@${user.username}</div>
          </div>
        </div>
      </td>
      <td style="padding:12px;border-bottom:1px solid var(--border);color:var(--text2)">${user.email || '-'}</td>
      <td style="padding:12px;border-bottom:1px solid var(--border);color:var(--text2)">${user.phone || '-'}</td>
      <td style="padding:12px;border-bottom:1px solid var(--border)">
        <span style="background:${user.role === 'superadmin' ? 'var(--danger)' : user.role === 'admin' ? 'var(--warn)' : 'var(--accent)'}22;color:${user.role === 'superadmin' ? 'var(--danger)' : user.role === 'admin' ? 'var(--warn)' : 'var(--accent)'};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600">${user.role}</span>
      </td>
      <td style="padding:12px;border-bottom:1px solid var(--border)">Level ${user.level || 1}</td>
      <td style="padding:12px;border-bottom:1px solid var(--border)">${user.xp || 0} XP</td>
      <td style="padding:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="openEditUser('${user.id}')">✏️ Edit</button>
          ${user.role !== 'superadmin' ? `<button class="btn btn-danger btn-sm" onclick="openDeleteModal('${user.id}')">🗑️ Delete</button>` : ''}
        </div>
      </td>
    </tr>
  `}).join('');
}

function openEditUser(id) {
  const user = users.find(u => u.id === id);
  if (!user) return;
  
  editingUserId = id;
  tempAdminPhotoData = user.photoURL || null;
  
  document.getElementById('modalTitle').textContent = 'Edit User';
  document.getElementById('userFullName').value = user.full_name || '';
  document.getElementById('userUsername').value = user.username || '';
  document.getElementById('userEmail').value = user.email || '';
  document.getElementById('userPhone').value = user.phone || '';
  document.getElementById('userRole').value = user.role || 'user';
  document.getElementById('userPassword').value = '';
  
  updateAdminAvatarPreview(user.photoURL, user.full_name || 'User');
  document.getElementById('adminRemovePhotoBtn').style.display = user.photoURL ? 'inline' : 'none';
  
  document.getElementById('userModal').classList.add('active');
}

function updateAdminAvatarPreview(photoData, fullName) {
  const previewImg = document.getElementById('adminAvatarPreviewImg');
  const previewText = document.getElementById('adminAvatarPreviewText');
  
  if (photoData) {
    previewImg.src = photoData;
    previewImg.style.display = 'block';
    previewText.style.display = 'none';
  } else {
    previewText.textContent = fullName.charAt(0).toUpperCase();
    previewImg.style.display = 'none';
    previewText.style.display = 'flex';
  }
}

function handleAdminPhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    alert('Photo size must be less than 2MB');
    return;
  }
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    tempAdminPhotoData = e.target.result;
    
    const fullName = document.getElementById('userFullName').value || 'User';
    updateAdminAvatarPreview(tempAdminPhotoData, fullName);
    
    document.getElementById('adminRemovePhotoBtn').style.display = 'inline';
  };
  
  reader.readAsDataURL(file);
}

function removeAdminPhoto() {
  tempAdminPhotoData = null;
  
  const fullName = document.getElementById('userFullName').value || 'User';
  updateAdminAvatarPreview(null, fullName);
  
  document.getElementById('adminRemovePhotoBtn').style.display = 'none';
  document.getElementById('adminPhotoUpload').value = '';
}

async function saveUser() {
  const fullName = document.getElementById('userFullName').value.trim();
  const username = document.getElementById('userUsername').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const phone = document.getElementById('userPhone').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  
  if (!fullName || !username || !email) {
    alert('Please fill all required fields');
    return;
  }
  
  const updates = {
    id: editingUserId,
    fullName,
    username,
    email,
    phone,
    role,
    photoURL: tempAdminPhotoData !== undefined ? tempAdminPhotoData : null
  };
  
  if (password) {
    updates.password = password;
  }

  // Disable tombol saat saving
  const saveBtn = document.querySelector('#userModal [type="submit"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
  
  // FIX: harus await karena STORE.updateUser adalah async (fetch ke API)
  const result = await STORE.updateUser(updates);
  
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }

  if (result && result.success) {
    closeModal('userModal');
    await loadUsers();
    showAdminNotif('✅ User updated successfully!', 'success');
  } else {
    const msg = result?.error || 'Failed to update user. Check console for details.';
    showAdminNotif('❌ ' + msg, 'danger');
  }
}

function openDeleteModal(id) {
  deleteUserId = id;
  document.getElementById('deleteModal').classList.add('active');
}

async function confirmDelete() {
  if (deleteUserId) {
    const delBtn = document.querySelector('#deleteModal .btn-danger');
    if (delBtn) { delBtn.disabled = true; delBtn.textContent = 'Deleting...'; }

    // FIX: harus await karena STORE.deleteUser adalah async (fetch ke API)
    const result = await STORE.deleteUser(deleteUserId);

    if (delBtn) { delBtn.disabled = false; delBtn.textContent = 'Delete User'; }

    if (result && result.success) {
      closeModal('deleteModal');
      await loadUsers();
      showAdminNotif('🗑️ User has been removed', 'warn');
    } else {
      showAdminNotif('❌ ' + (result?.error || 'Failed to delete user'), 'danger');
    }
  }
  deleteUserId = null;
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  if (id === 'userModal') {
    tempAdminPhotoData = null;
    editingUserId = null;
    const photoUpload = document.getElementById('adminPhotoUpload');
    if (photoUpload) photoUpload.value = '';
  }
}

// Notifikasi ringan tanpa alert()
function showAdminNotif(message, type = 'info') {
  // Hapus notif lama jika ada
  const old = document.getElementById('adminNotif');
  if (old) old.remove();

  const colors = { success: '#3dd68c', warn: '#ffb547', danger: '#ff5f7e', info: '#4f8fff' };
  const div = document.createElement('div');
  div.id = 'adminNotif';
  div.style.cssText = `
    position:fixed;top:24px;right:24px;z-index:9999;
    background:#1e2640;border:1px solid ${colors[type] || colors.info};
    color:${colors[type] || colors.info};
    padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:slideIn 0.3s ease;
  `;
  div.textContent = message;

  // Tambah style animasi jika belum ada
  if (!document.getElementById('adminNotifStyle')) {
    const style = document.createElement('style');
    style.id = 'adminNotifStyle';
    style.textContent = `@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}`;
    document.head.appendChild(style);
  }

  document.body.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.remove(); }, 4000);
}

function logout() {
  STORE.logout();
}

// Update preview when name changes
document.addEventListener('DOMContentLoaded', function() {
  const nameInput = document.getElementById('userFullName');
  if (nameInput) {
    nameInput.addEventListener('input', function(e) {
      if (!tempAdminPhotoData) {
        const previewText = document.getElementById('adminAvatarPreviewText');
        if (previewText) {
          previewText.textContent = e.target.value.charAt(0).toUpperCase();
        }
      }
    });
  }
});

window.addEventListener('DOMContentLoaded', init);