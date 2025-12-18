import './style.css';
import { openBookingModal } from './booking.js';

import { API_BASE_URL } from './config.js';
// Room Data
export let rooms = [];

// ---------------------------------------------------------
// 1. FUNGSI FETCH DATA (Dari Backend)
// ---------------------------------------------------------
async function fetchRooms() {
    const grid = document.getElementById('room-grid');
    if (!grid) return;
    
    // Loading State yang cantik
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">Sedang memuat daftar kamar terbaik...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        const rawData = await response.json();

        // Deteksi format data (Array vs Object) agar anti-error
        let backendData = [];
        if (Array.isArray(rawData)) {
            backendData = rawData;
        } else if (rawData.data && Array.isArray(rawData.data)) {
            backendData = rawData.data;
        }

        // Mapping Data Backend ke Format Frontend
        rooms = backendData.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price_per_night, // Mapping harga
            capacity: item.capacity,
            total: item.total_quantity, // Total fisik
            // Jika backend belum kirim sisa, anggap sisa = total
            available: (item.current_available !== undefined) ? item.current_available : item.total_quantity,
            description: item.description || 'Deskripsi belum tersedia.',
            // Ambil foto pertama, atau placeholder jika kosong
            image: (item.photos && item.photos.length > 0) ? item.photos[0] : '/images/placeholder.png', 
            rating: 4.8, // Hardcode rating dulu
            features: item.facilities || ['AC', 'WiFi', 'Sarapan']
        }));

        renderRooms(); // Render tampilan setelah data siap

    } catch (error) {
        console.error("Error fetching rooms:", error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Gagal memuat data kamar. Pastikan server menyala.</div>';
    }
}

// USER AUTH
let pendingBookingRoomId = null; // Store room ID while user logs in
function checkLoginStatus() {
    return localStorage.getItem('token') !== null;
}
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNavUser();
    alert('Anda telah berhasil keluar.');
    window.location.reload(); // Reload agar state bersih
}
function updateNavUser() {
    const userDisplay = document.getElementById('userStatus');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (checkLoginStatus()) {
        if (userDisplay) userDisplay.textContent = 'Selamat datang, User';
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userDropdown) userDropdown.style.display = '';
    } else {
        if (userDisplay) userDisplay.textContent = 'Silakan login';
        if (loginBtn) loginBtn.style.display = '';
        if (registerBtn) registerBtn.style.display = '';
        if (userDropdown) userDropdown.style.display = 'none';
    }
}

// MODAL VISIBILITY
function showAnimatedModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        const card = modal.querySelector('.login-card, .modal-content');
        if (card) {
            card.classList.remove('animate-slide-up', 'animate-fade-in');
            void card.offsetWidth; // Force reflow for restart
            card.classList.add('animate-modal-in');
        }
    }
}
export function openLoginModal() {
    showAnimatedModal('loginModal');
}
function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}
function openRegisterModal() {
    closeLoginModal(); // Close login when opening register
    showAnimatedModal('registerModal');
}
function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('active');
}

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;

// Render Rooms
function renderRooms() {
    const grid = document.getElementById('room-grid');
    if (!grid) return;

    if (rooms.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">Belum ada kamar yang tersedia saat ini.</div>';
        return;
    }

    grid.innerHTML = rooms.map(room => {
        // --- 1. LOGIC HITUNGAN ---
        const total = room.total || 0;
        const available = (room.available !== undefined) ? room.available : total;
        const percent = total > 0 ? Math.round((available / total) * 100) : 0;
        const isFull = available === 0;

        // --- 2. LOGIC WARNA & TEKS ---
        let badgeBg = '#d1fae5'; let badgeColor = '#059669'; let badgeText = 'TERSEDIA'; let barColor = '#10b981';

        if (isFull) {
            // Ubah teks agar tidak terkesan permanen
            badgeBg = '#fee2e2'; badgeColor = '#dc2626'; badgeText = 'PENUH HARI INI'; barColor = '#ef4444';
        } else if (percent < 40) {
            badgeBg = '#fef3c7'; badgeColor = '#d97706'; badgeText = 'SISA SEDIKIT'; barColor = '#f59e0b';
        }

        // --- 3. LOGIC FASILITAS ---
        const facilitiesHtml = room.features.slice(0, 4).map(f => `
            <span style="display:inline-flex; align-items:center; gap:4px; background:#f9fafb; border:1px solid #e5e7eb; padding:4px 8px; border-radius:6px; font-size:11px; color:#555;">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00A8A8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${f}
            </span>
        `).join('');

        // Persiapkan Data Room untuk dikirim ke Modal (hindari error kutip)
        const roomData = JSON.stringify(room).replace(/"/g, '&quot;');

        return `
        <div class="dashboard-card" style="height: 100%; padding: 0; overflow: hidden; display: flex; flex-direction: column; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; transition: transform 0.3s ease;">
            
            <div style="position: relative; height: 220px; flex-shrink: 0; overflow:hidden;">
                <img src="${room.image}" alt="${room.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            </div>

            <div style="padding: 24px; flex: 1; display: flex; flex-direction: column;">
                
                <h3 style="font-size: 20px; margin: 0 0 8px 0; font-weight: 700; color: #1f2937;">${room.name}</h3>
                
                <div style="margin-bottom: 16px;">
                    <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${badgeText}
                    </span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; color: #6b7280; font-size: 13px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A8A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span style="font-weight: 500;">Kapasitas: ${room.capacity} Orang</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A8A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        <span style="font-weight: 500;">${available} Unit Sisa Hari Ini</span>
                    </div>
                </div>
                
                <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px; line-height: 1.5; 
                          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 38px;">
                    ${room.description}
                </p>

                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
                    ${facilitiesHtml}
                </div>

                <div style="margin-top: auto;">
                    
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 20px; font-weight: 800; color: #00A8A8;">
                            Rp ${room.price.toLocaleString('id-ID')} <span style="font-size: 12px; color: #9ca3af; font-weight: 400;">/ malam</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #6b7280;">
                            <span>Ketersediaan Hari Ini</span>
                            <span>${percent}%</span>
                        </div>
                        <div style="width: 100%; background-color: #f3f4f6; height: 6px; border-radius: 10px; overflow: hidden;">
                            <div style="width: ${percent}%; background-color: ${barColor}; height: 100%; transition: width 0.5s ease;"></div>
                        </div>
                    </div>

                    <button class="btn btn-primary" onclick='openBookingModal(${roomData})' 
                        style="width: 100%; padding: 12px; font-weight: 600; font-size: 14px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 168, 168, 0.2); background-color: var(--primary); color: white; border: none; cursor: pointer;">
                        Pesan / Cek Tanggal
                    </button>
                </div>

            </div>
        </div>
        `;
    }).join('');
}

// Notification Logic
function showNotification(message, type = 'success') {
    let notif = document.createElement('div');
    notif.className = `popup-notif ${type}`;
    notif.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.classList.add('show');
    }, 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 400);
    }, 2200);
}
function showCenterNotification(message, type = 'success') {
    let notif = document.createElement('div');
    notif.className = `center-popup-notif ${type}`;
    notif.innerHTML = `
        <div class="login-card animate-modal-in" style="max-width: 350px; margin: auto;">
            <div class="logo-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 8px; color: var(--primary);">Login Berhasil!</h2>
            <p style="color: var(--text-light); font-size: 14px; margin-bottom: 10px;">Selamat datang di Palanta House</p>
        </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.classList.add('show');
    }, 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 600);
    }, 1800);
}
function showCopyNotification(code) {
    let notif = document.createElement('div');
    notif.className = 'copy-popup-notif';
    notif.innerHTML = `
        <div class="copy-content">
            <div class="logo-icon">
                <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'></polyline></svg>
            </div>
            <div class="copy-text">Berhasil Disalin!</div>
            <div class="copy-code">Kode <span style='color:var(--primary); font-weight:700;'>${code}</span></div>
        </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 400);
    }, 1600);
}

// Login Logic (from popup)
const popupLoginForm = document.getElementById('popupLoginForm');
if (popupLoginForm) {
    popupLoginForm.addEventListener('submit', async (e) => { // Tambahkan async
        e.preventDefault();

        // Ambil input (pastikan di HTML input email punya ID atau ambil by index)
        const inputs = popupLoginForm.querySelectorAll('input'); 
        const email = inputs[0].value; 
        const password = inputs[1].value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                // SIMPAN TOKEN & DATA USER
                // Kita gunakan localStorage agar login tidak hilang saat refresh/tutup tab
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                if (result.user.role === 'admin') {
                    // Jika Admin, langsung lempar ke dashboard
                    window.location.href = '/admin.html';
                    return; // Hentikan proses agar kode di bawah tidak dijalankan
                }
                
                // Update UI
                updateNavUser();
                closeLoginModal();
                showCenterNotification(`Selamat datang, ${result.user.name}!`);

                // Reset state booking
                pendingBookingRoomId = null;
            } else {
                showNotification(result.message || 'Email atau password salah.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Gagal terhubung ke server.', 'error');
        }
    });
}

// Logout Logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logout(); // Panggil fungsi logout yang baru kita buat
    });
}

// Track which room's review modal is currently open
let currentReviewRoomId = null;

function getReviewsForRoom(roomId) {
    const key = `reviews_room_${roomId}`;
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse reviews from localStorage', e);
    }
    // return a shallow copy of sampleReviews so mutations don't affect original
    return sampleReviews.slice();
}

function saveReviewForRoom(roomId, review) {
    const key = `reviews_room_${roomId}`;
    const list = getReviewsForRoom(roomId);
    list.unshift(review);
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save review to localStorage', e);
    }
}

// Compress an image File to a data URL using canvas, returns Promise<string>
function compressImageFileToDataURL(file, maxWidth = 1024, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = () => {
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Use JPEG for compression if original is not PNG
                const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(mime, quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Open review modal for a room
function openReviewModal(roomId) {
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    const modalContent = modal.querySelector('.modal-content');
    // Activate modal with animation
    modal.classList.add('active');
    if (modalContent) {
        modalContent.classList.remove('animate-modal-in');
        void modalContent.offsetWidth;
        modalContent.classList.add('animate-modal-in');
        modalContent.style.maxWidth = '1000px';
        modalContent.style.width = '95%';
        modalContent.style.borderRadius = '20px';
    }
    // Clear previous content
    modalBody.innerHTML = '';

    const room = rooms.find(r => r.id === roomId) || { name: 'Kamar', description: '' };
    currentReviewRoomId = roomId;

    // Container: left = reviews (scrollable), right = form (if logged in)
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '28px';
    container.style.alignItems = 'flex-start';

    // Left column
    const left = document.createElement('div');
    left.style.flex = '2';
    left.style.minWidth = '0';

    const header = document.createElement('div');
    header.style.padding = '18px 14px';
    header.style.borderRadius = '12px';
    header.style.background = 'linear-gradient(90deg,#00A8A8,#F59E0B)';
    header.style.color = 'white';
    header.innerHTML = `<h3 style="margin:0 0 6px 0; font-size:20px;">Ulasan untuk ${room.name}</h3><div style='font-size:13px; opacity:0.95'>${room.description}</div>`;

    left.appendChild(header);

    const listWrap = document.createElement('div');
    listWrap.style.marginTop = '16px';
    listWrap.style.maxHeight = '420px';
    listWrap.style.overflowY = 'auto';
    listWrap.style.paddingRight = '6px';

    // Render reviews (from storage per room)
    const reviews = getReviewsForRoom(roomId);
    reviews.forEach(r => {
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.gap = '14px';
        card.style.alignItems = 'flex-start';
        card.style.background = 'rgba(255,255,255,0.95)';
        card.style.padding = '12px 14px';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.04)';
        card.style.marginBottom = '12px';

        const avatarWrap = document.createElement('div');
        avatarWrap.style.width = '56px';
        avatarWrap.style.height = '56px';
        avatarWrap.style.flex = '0 0 56px';
        avatarWrap.style.borderRadius = '50%';
        avatarWrap.style.overflow = 'hidden';
        avatarWrap.innerHTML = `<img src="${r.avatar}" style="width:100%;height:100%;object-fit:cover;">`;

        const body = document.createElement('div');
        body.style.flex = '1';
        body.style.minWidth = '0';
        body.innerHTML = `<div style='display:flex;align-items:center;gap:8px;flex-wrap:wrap'><strong style='color:#006b68'>${r.name}</strong><span style='color:#f59e0b'>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span><small style='color:#6b7280;margin-left:auto'>${r.date}</small></div><p style='margin:8px 0 0 0;color:#111'>${r.comment}</p>`;

        // photos
        if (r.photos && r.photos.length) {
            const photos = document.createElement('div');
            photos.style.display = 'grid';
            photos.style.gridTemplateColumns = 'repeat(auto-fit, minmax(60px, 1fr))';
            photos.style.gap = '8px';
            photos.style.marginTop = '8px';
            r.photos.forEach(p => {
                const img = document.createElement('img');
                img.src = p;
                img.style.width = '100%';
                img.style.height = '44px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                photos.appendChild(img);
            });
            body.appendChild(photos);
        }

        card.appendChild(avatarWrap);
        card.appendChild(body);
        listWrap.appendChild(card);
    });

    left.appendChild(listWrap);

    // Right column (form if logged in)
    const right = document.createElement('div');
    right.style.flex = '1';
    right.style.minWidth = '0';

    if (checkLoginStatus()) {
        const form = document.createElement('form');
        form.style.background = 'rgba(255,255,255,0.98)';
        form.style.padding = '16px';
        form.style.borderRadius = '12px';
        form.style.boxShadow = '0 6px 18px rgba(0,0,0,0.04)';

        form.innerHTML = `
            <h4 style='margin:0 0 10px 0;color:#006b68'>Tulis Ulasan Anda</h4>
            <input name='name' placeholder='Nama Anda' required style='width:100%;padding:10px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:10px'>
            <div style='display:flex;gap:6px;align-items:center;margin-bottom:10px' class='rating-stars'>
                ${[1,2,3,4,5].map(i => `<span class='star' data-value='${i}' style='font-size:20px;color:#e5e7eb;cursor:pointer'>★</span>`).join('')}
            </div>
            <textarea name='comment' placeholder='Komentar Anda' required style='width:100%;padding:10px;border-radius:8px;border:1px solid #e5e7eb;min-height:100px;margin-bottom:10px'></textarea>
            <label style='display:block;margin-bottom:8px;font-size:13px;color:#374151'>Lampirkan foto (opsional)</label>
            <input type='file' accept='image/jpeg,image/png' multiple class='review-photos-input' style='margin-bottom:10px'>
            <div class='photo-previews' style='display:grid;grid-template-columns:repeat(auto-fit,minmax(60px,1fr));gap:8px;margin-bottom:10px'></div>
            <button type='submit' class='btn btn-primary' style='width:100%'>Kirim Ulasan</button>
        `;

        let selectedRating = 0;
        const photoInput = form.querySelector('.review-photos-input');
        const previews = form.querySelector('.photo-previews');

        // Handle image previews with deletion and limits
        const MAX_FILES = 4;
        const MAX_BYTES = 2 * 1024 * 1024; // 2 MB per file
        let selectedFiles = [];

        function renderPreviews() {
            previews.innerHTML = '';
            selectedFiles.forEach((file, idx) => {
                const reader = new FileReader();
                const wrap = document.createElement('div');
                wrap.style.position = 'relative';
                wrap.style.borderRadius = '8px';
                wrap.style.overflow = 'hidden';

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.innerHTML = '✕';
                removeBtn.title = 'Hapus lampiran';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '6px';
                removeBtn.style.right = '6px';
                removeBtn.style.background = 'rgba(0,0,0,0.5)';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '22px';
                removeBtn.style.height = '22px';
                removeBtn.style.cursor = 'pointer';

                removeBtn.addEventListener('click', () => {
                    selectedFiles.splice(idx, 1);
                    renderPreviews();
                });

                reader.onload = () => {
                    const img = document.createElement('img');
                    img.src = reader.result;
                    img.style.width = '100%';
                    img.style.height = '54px';
                    img.style.objectFit = 'cover';
                    img.style.display = 'block';
                    wrap.appendChild(img);
                    wrap.appendChild(removeBtn);
                    previews.appendChild(wrap);
                };
                reader.readAsDataURL(file);
            });
        }

        photoInput.addEventListener('change', (ev) => {
            const files = Array.from(ev.target.files || []);
            const allowed = ['image/jpeg', 'image/png'];
            for (const file of files) {
                if (!allowed.includes(file.type)) {
                    showNotification(`Tipe file ${file.type} tidak didukung. Hanya JPEG/PNG.`, 'error');
                    continue;
                }
                if (selectedFiles.length >= MAX_FILES) {
                    showNotification(`Batas lampiran ${MAX_FILES} foto`, 'error');
                    break;
                }
                if (file.size > MAX_BYTES) {
                    showNotification(`File ${file.name} terlalu besar (max 2MB)`, 'error');
                    continue;
                }
                selectedFiles.push(file);
            }
            // clear the native input so selecting same file again works
            photoInput.value = '';
            renderPreviews();
        });

        form.addEventListener('mouseover', (e) => {
            if (e.target.classList && e.target.classList.contains('star')) {
                const v = Number(e.target.getAttribute('data-value'));
                form.querySelectorAll('.star').forEach((s, idx) => s.style.color = idx < v ? '#f59e0b' : '#e5e7eb');
            }
        });
        form.addEventListener('mouseout', () => {
            form.querySelectorAll('.star').forEach((s, idx) => s.style.color = idx < selectedRating ? '#f59e0b' : '#e5e7eb');
        });
        form.addEventListener('click', (e) => {
            if (e.target.classList && e.target.classList.contains('star')) {
                selectedRating = Number(e.target.getAttribute('data-value'));
                form.querySelectorAll('.star').forEach((s, idx) => s.style.color = idx < selectedRating ? '#f59e0b' : '#e5e7eb');
            }
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const name = formData.get('name') || 'Tamu';
            const comment = formData.get('comment') || '';
            // Compress selectedFiles to data URLs before saving
            const filesToProcess = selectedFiles.slice(0, 4);
            const compressPromises = filesToProcess.map(f => compressImageFileToDataURL(f, 1024, 0.75));
            Promise.all(compressPromises).then(dataUrls => {
                const newReview = {
                    name,
                    rating: selectedRating || 5,
                    comment,
                    date: 'Baru saja',
                    avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
                    photos: dataUrls
                };
                saveReviewForRoom(roomId, newReview);
                // Re-open modal to refresh list and show the new review on top
                openReviewModal(roomId);
                showNotification('Ulasan berhasil dikirim!');
            }).catch(err => {
                console.error(err);
                showNotification('Terjadi kesalahan saat memproses gambar', 'error');
            });
        });

        right.appendChild(form);
    } else {
        // Placeholder when not logged in
        const notice = document.createElement('div');
        notice.style.padding = '18px';
        notice.style.borderRadius = '12px';
        notice.style.background = 'rgba(255,255,255,0.95)';
        notice.style.boxShadow = '0 6px 18px rgba(0,0,0,0.04)';
        notice.innerHTML = `<p style='margin:0 0 8px 0;color:#111;font-weight:600'>Masuk untuk menulis ulasan</p><p style='margin:0;color:#6b7280'>Silakan <a href='#' onclick='openLoginModal(); return false;' style='color:#006b68'>masuk</a> agar dapat mengirim ulasan.</p>`;
        right.appendChild(notice);
    }

    container.appendChild(left);
    container.appendChild(right);
    modalBody.appendChild(container);

    // Close button behavior
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => { modal.classList.remove('active'); modalBody.innerHTML = ''; };
    }
}

// ---------------------------------------------------------
// FUNGSI VOUCHER (USER)
// ---------------------------------------------------------
async function fetchVouchers() {
    const grid = document.getElementById('promoGrid');
    if (!grid) return;

    try {
        // Ambil data dari Backend
        const response = await fetch(`${API_BASE_URL}/vouchers`);
        const rawData = await response.json();
        
        let vouchers = [];
        if (Array.isArray(rawData)) {
            vouchers = rawData;
        } else if (rawData.data && Array.isArray(rawData.data)) {
            vouchers = rawData.data;
        }

        // Filter hanya voucher yang AKTIF (Belum expired & Kuota masih ada)
        const today = new Date();
        const activeVouchers = vouchers.filter(v => {
            const endDate = new Date(v.endDate);
            const isExpired = endDate < today;
            const isFull = v.usedCount >= v.usageLimit;
            return !isExpired && !isFull;
        });

        renderVouchers(activeVouchers);

    } catch (error) {
        console.error("Gagal load voucher:", error);
        // Jangan tampilkan error merah di user, biarkan kosong atau default
        grid.innerHTML = '<div style="color:var(--text-light); text-align:center; grid-column:1/-1;">Tidak ada promo tersedia saat ini.</div>';
    }
}

function renderVouchers(vouchers) {
    const grid = document.getElementById('promoGrid');
    if (!grid) return;

    if (vouchers.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-light); text-align:center; padding:20px; width:100%;">Nantikan promo menarik segera!</div>';
        return;
    }

    grid.innerHTML = vouchers.map((v, index) => {
        // Tentukan Tampilan Kartu
        const isPercent = v.type === 'PERCENT';
        const nilai = isPercent ? `${v.value}%` : `Rp ${v.value / 1000}rb`; // Singkat 'rb' agar muat
        const desc = v.minTransaction > 0 
            ? `Min. transaksi Rp ${v.minTransaction.toLocaleString('id-ID')}` 
            : 'Tanpa minimum transaksi';
        
        // Warna-warni Gradient (Agar tidak monoton)
        const gradients = [
            'linear-gradient(135deg, #6366f1, #a855f7)', // Ungu
            'linear-gradient(135deg, #f59e0b, #ef4444)', // Orange-Merah
            'linear-gradient(135deg, #10b981, #3b82f6)', // Hijau-Biru
            'linear-gradient(135deg, #f43f5e, #f59e42)'  // Pink-Orange
        ];
        const bgGradient = gradients[index % gradients.length];

        return `
        <div class="promo-card" style="--gradient: ${bgGradient};">
            <div class="promo-content">
                <div class="promo-tag">${v.forNewUser ? 'New User' : 'Spesial Promo'}</div>
                <h3 style="font-size: 24px;">Diskon ${nilai}</h3>
                <p>${desc}</p>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.8;">
                    Berakhir: ${new Date(v.endDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                </div>
            </div>
            <div class="promo-divider"></div>
            <div class="promo-action" onclick="copyPromoCode('${v.code}')">
                <span class="code">${v.code}</span>
                <span class="copy-text">Salin</span>
            </div>
        </div>
        `;
    }).join('');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateNavUser();
    renderRooms();
    fetchRooms();
    fetchRooms();    // <--- Fetch Kamar
    fetchVouchers(); // <--- TAMBAHKAN INI (Fetch Voucher)

    // Bind Lihat Ulasan buttons (delegated) so modal opens with reviews
    const roomGridEl = document.getElementById('room-grid');
    if (roomGridEl) {
        roomGridEl.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('.lihat-ulasan-btn');
            if (btn) {
                const id = parseInt(btn.getAttribute('data-roomid')) || null;
                if (id) openReviewModal(id);
            }
        });
    }

    // Ensure bookingModal close clears any dynamic content
    const bookingModalEl = document.getElementById('bookingModal');
    if (bookingModalEl) {
        const closeBtn = bookingModalEl.querySelector('.close-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            bookingModalEl.classList.remove('active');
            const mb = document.getElementById('modalBody');
            if (mb) mb.innerHTML = '';
        });
    }

    // Promo grid: use manual navigation (prev/next) instead of auto-duplication/animation
    const promoGrid = document.getElementById('promoGrid');
    if (promoGrid) {
        // Ensure horizontal scroll behavior will be handled by CSS; attach nav handlers
        const promoPrev = document.getElementById('promoPrev');
        const promoNext = document.getElementById('promoNext');

        // Reduce jump distance so navigation feels smoother and less jarring
        const scrollAmount = () => Math.max(160, Math.round(promoGrid.clientWidth * 0.45));

        if (promoPrev) {
            promoPrev.addEventListener('click', () => {
                promoGrid.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
            });
            promoPrev.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); promoPrev.click(); }
            });
        }

        if (promoNext) {
            promoNext.addEventListener('click', () => {
                promoGrid.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
            });
            promoNext.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); promoNext.click(); }
            });
        }
    }

    // Expose booking function globally
    window.openBooking = (roomId) => {
        if (!checkLoginStatus()) {
            pendingBookingRoomId = roomId;
            openLoginModal();
            return;
        }
        // Jika baru login, harus klik ulang tombol pesan sekarang
        if (pendingBookingRoomId === roomId) {
            // Sudah login, reset dan jangan buka modal
            pendingBookingRoomId = null;
            return;
        }
        const room = rooms.find(r => r.id === roomId);
        if (room) openBookingModal(room);
    };

    // Slider Logic
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.style.opacity = i === index ? '1' : '0';
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    }

    if (prevBtn && nextBtn && slides.length > 0) {
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);

        // Auto slide every 5 seconds
        setInterval(nextSlide, 5000);
    }

    // Registration Modal Logic
    const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => { // Tambahkan async
        e.preventDefault();
        
        // 1. Ambil Value
        const name = document.getElementById('regName').value; // Sesuai schema: name
        const email = document.getElementById('regEmail').value; // Sesuai schema: email
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const passwordError = document.getElementById('passwordError');

        // 2. Validasi Frontend
        if (password !== confirmPassword) {
            passwordError.style.display = 'block';
            return;
        }
        passwordError.style.display = 'none';

        // 3. Integrasi ke Backend
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (response.ok) {
                showNotification('Pendaftaran berhasil! Silakan login.');
                closeRegisterModal();
                openLoginModal();
                registerForm.reset();
            } else {
                // Tampilkan pesan error dari backend (misal: Email sudah terdaftar)
                showNotification(result.message || 'Pendaftaran gagal.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Terjadi kesalahan koneksi.', 'error');
        }
    });
}

    // Back to Top Button Logic
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            openLoginModal();
        });
    }
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            openRegisterModal();
        });
    }

    // Pastikan semua modal pakai animasi profesional
    const style = document.createElement('style');
    style.innerHTML = `
    @keyframes modalIn {
        0% { opacity: 0; transform: translateY(40px) scale(0.96); }
        60% { opacity: 1; transform: translateY(-8px) scale(1.02); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-modal-in {
        animation: modalIn 0.6s cubic-bezier(.4,1.4,.6,1) both;
    }
    `;
    document.head.appendChild(style);

    window.copyPromoCode = function(code) {
        navigator.clipboard.writeText(code).then(() => {
            showCopyNotification(code);
        });
    };
});
