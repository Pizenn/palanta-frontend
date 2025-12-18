import { API_BASE_URL } from './config.js';
import { openLoginModal } from './main.js';
import { showNotification } from './main.js';

// --- LOAD SCRIPT MIDTRANS ---
async function loadMidtransScript() {
    // Kalau sudah ada window.snap, tidak perlu load lagi
    if (window.snap) return true; 

    // Cek kalau tag script sudah ada tapi belum selesai loading
    if (document.getElementById('midtrans-script')) {
        return new Promise((resolve) => {
            const script = document.getElementById('midtrans-script');
            script.addEventListener('load', () => resolve(true));
        });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/config`);
        if (!response.ok) throw new Error("Gagal mengambil config payment");
        
        const config = await response.json();
        
        // Debugging: Cek di console browser apakah key-nya ada
        // console.log("Client Key Midtrans:", config.clientKey); 

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'midtrans-script';
            script.src = config.snapUrl; 
            script.setAttribute('data-client-key', config.clientKey);
            script.async = true; // Load secara asinkron

            // PENTING: Tunggu sampai script benar-benar selesai di-load
            script.onload = () => {
                console.log("Midtrans script ready!");
                resolve(true);
            };
            
            script.onerror = () => {
                console.error("Gagal download script Midtrans");
                reject(false);
            };

            document.head.appendChild(script);
        });
    } catch (error) {
        console.error("Gagal load Midtrans:", error);
        return false;
    }
}

export function openBookingModal(room) {
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.close-modal');

    // 1. Cek Login (Wajib ada Token)
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("Silakan Login Terlebih Dahulu", 'netral');
        //alert("Silakan login terlebih dahulu untuk melakukan pemesanan.");
        window.openLoginModal();
        return;
    }

    loadMidtransScript();

    if (!modal || !modalBody) return;

    // --- STATE ---
    let step = 1;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
    
    let checkIn = today;
    let checkOut = tomorrow;
    
    let guestName = '';
    let guestEmail = '';
    let guestPhone = '';
    
    let appliedVoucher = null; 
    let discountAmount = 0;   
    let isSubmitting = false;

    // --- HELPER ---
    const calculateNights = () => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // --- LOGIC VOUCHER ---
    const handleApplyVoucher = async () => {
        const codeInput = document.getElementById('voucherInput').value.trim().toUpperCase();
        const msgBox = document.getElementById('voucherMessage');
        const applyBtn = document.getElementById('applyVoucherBtn');

        if (!codeInput) return;
        applyBtn.innerText = "Cek...";
        applyBtn.disabled = true;
        msgBox.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/vouchers`);
            const rawData = await response.json();
            const vouchers = Array.isArray(rawData) ? rawData : (rawData.data || []);
            const found = vouchers.find(v => v.code === codeInput);
            
            const nights = calculateNights();
            const currentTotal = room.price * nights;
            const now = new Date();

            if (!found) throw new Error("Kode tidak ditemukan");
            if (new Date(found.endDate) < now) throw new Error("Voucher kadaluarsa");
            if (found.usedCount >= found.usageLimit) throw new Error("Kuota habis");
            if (currentTotal < found.minTransaction) throw new Error(`Min. transaksi Rp ${found.minTransaction.toLocaleString('id-ID')}`);

            let discount = (found.type === 'PERCENT') ? (currentTotal * found.value) / 100 : found.value;
            if (discount > currentTotal) discount = currentTotal;

            appliedVoucher = found;
            discountAmount = discount;
            renderStep2(); 

        } catch (error) {
            msgBox.innerHTML = `<span style="color:#dc2626; font-size:12px;">❌ ${error.message}</span>`;
            applyBtn.disabled = false;
            applyBtn.innerText = "Gunakan";
        }
    };

    // --- STEP 1: DATA DIRI & TANGGAL ---
const renderStep1 = () => {
        const nights = calculateNights();
        const total = room.price * nights;
        
        // Kita pindahkan validasi ke fungsi terpisah agar bisa dipanggil saat ngetik
        const checkValidity = () => {
            const isDateValid = !isNaN(new Date(checkIn).getTime()) && !isNaN(new Date(checkOut).getTime()) && new Date(checkOut) > new Date(checkIn);
            const isFormValid = isDateValid && guestName.trim() && guestEmail.trim() && guestPhone.trim();
            
            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn) {
                if (isFormValid) {
                    nextBtn.removeAttribute('disabled');
                    nextBtn.style.opacity = '1';
                    nextBtn.style.cursor = 'pointer';
                } else {
                    nextBtn.setAttribute('disabled', 'true');
                    nextBtn.style.opacity = '0.6';
                    nextBtn.style.cursor = 'not-allowed';
                }
            }
            return isFormValid;
        };

        modalBody.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="color: var(--primary); font-size: 24px; font-weight: bold;">Pemesanan Kamar</h2>
            </div>
            
            <div style="background: #F0FDFA; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="font-size: 18px; font-weight: 600;">${room.name}</h3>
                <p style="color: var(--primary);">Rp ${room.price.toLocaleString('id-ID')} / malam</p>
            </div>

            <div class="flex gap-4 mb-4">
                <div style="flex:1;">
                    <label style="font-size:13px; font-weight:600;">Check-in</label>
                    <input type="date" id="checkInInput" value="${checkIn}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
                <div style="flex:1;">
                    <label style="font-size:13px; font-weight:600;">Check-out</label>
                    <input type="date" id="checkOutInput" value="${checkOut}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
            </div>

            <h4 style="font-size:14px; font-weight:700; margin-bottom:10px;">Data Tamu</h4>
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                <input type="text" id="guestNameInput" value="${guestName}" placeholder="Nama Lengkap" style="padding:10px; border:1px solid #ddd; border-radius:8px;">
                <div class="flex gap-4">
                    <input type="email" id="guestEmailInput" value="${guestEmail}" placeholder="Email" style="flex:1; padding:10px; border:1px solid #ddd; border-radius:8px;">
                    <input type="tel" id="guestPhoneInput" value="${guestPhone}" placeholder="WhatsApp" style="flex:1; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
            </div>

            <div style="background:#f9fafb; padding:15px; border-radius:8px; margin-bottom:20px; display:flex; justify-content:space-between;">
                <strong>Total (${nights} Malam)</strong>
                <strong style="color:var(--primary)">Rp ${total.toLocaleString('id-ID')}</strong>
            </div>

            <div class="flex gap-3">
                <button id="cancelBtn" style="flex:1; padding:12px; background:white; border:1px solid #ddd; border-radius:8px; cursor:pointer;">Batal</button>
                <button id="nextBtn" style="flex:1; padding:12px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:not-allowed; opacity:0.6" disabled>Lanjut Bayar</button>
            </div>
        `;

        // Panggil checkValidity sekali di awal untuk set status tombol
        checkValidity();

        // --- EVENT LISTENERS YANG BENAR ---
        // Tanggal berubah -> Boleh render ulang karena kalkulasi harga berubah
        document.getElementById('checkInInput').onchange = (e) => { checkIn = e.target.value; render(); };
        document.getElementById('checkOutInput').onchange = (e) => { checkOut = e.target.value; render(); };
        
        // Input Teks -> HANYA Update Variabel & Cek Tombol (JANGAN RENDER ULANG!)
        document.getElementById('guestNameInput').oninput = (e) => { 
            guestName = e.target.value; 
            checkValidity(); 
        };
        document.getElementById('guestEmailInput').oninput = (e) => { 
            guestEmail = e.target.value; 
            checkValidity(); 
        };
        document.getElementById('guestPhoneInput').oninput = (e) => { 
            guestPhone = e.target.value; 
            checkValidity(); 
        };
        
        document.getElementById('cancelBtn').onclick = closeModal;
        document.getElementById('nextBtn').onclick = () => { 
            if(checkValidity()) { step = 2; render(); } 
        };
    };

    // --- STEP 2: KONFIRMASI (METODE BAYAR OTOMATIS) ---
    const renderStep2 = () => {
        const nights = calculateNights();
        const subtotal = room.price * nights;
        const finalTotal = subtotal - discountAmount;

        modalBody.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="color: var(--primary); font-size: 20px; font-weight: bold;">Rincian Pembayaran</h2>
            </div>

            <div style="background: #F0FDFA; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #CCFBF1;">
                <div class="flex justify-between mb-1"><span style="color:#666">Subtotal (${nights} malam)</span> <b>Rp ${subtotal.toLocaleString('id-ID')}</b></div>
                ${appliedVoucher ? `<div class="flex justify-between mb-1" style="color:green"><span>Diskon (${appliedVoucher.code})</span> <b>-Rp ${discountAmount.toLocaleString('id-ID')}</b></div>` : ''}
                <hr style="margin:10px 0; border:0; border-top:1px solid #CCFBF1;">
                <div class="flex justify-between" style="font-size:18px;"><b>Total Bayar</b> <b style="color:var(--primary)">Rp ${finalTotal.toLocaleString('id-ID')}</b></div>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="font-size:13px; font-weight:600;">Kode Voucher</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="voucherInput" value="${appliedVoucher ? appliedVoucher.code : ''}" placeholder="Punya kode?" ${appliedVoucher ? 'disabled' : ''} style="flex:1; padding:10px; border:1px solid #ddd; border-radius:8px; text-transform:uppercase;">
                    ${appliedVoucher ? 
                        `<button id="removeVoucherBtn" style="padding:0 15px; background:#fee2e2; color:red; border:none; border-radius:8px; cursor:pointer;">Hapus</button>` : 
                        `<button id="applyVoucherBtn" style="padding:0 15px; background:var(--secondary); color:white; border:none; border-radius:8px; cursor:pointer;">Pakai</button>`
                    }
                </div>
                <div id="voucherMessage" style="font-size:12px; margin-top:5px;">
                    ${appliedVoucher ? `<span style="color:green">✅ Hemat Rp ${discountAmount.toLocaleString('id-ID')}</span>` : ''}
                </div>
            </div>

            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 24px; border: 1px dashed #cbd5e1; font-size: 13px; color: #475569; text-align: center;">
                <p style="margin:0;">Klik <b>"Pilih Metode Pembayaran"</b> untuk memilih opsi pembayaran (Transfer Bank, GoPay, ShopeePay, dll).</p>
            </div>

            <div class="flex gap-3">
                <button id="backBtn" style="flex:1; padding:12px; background:white; border:1px solid #ddd; border-radius:8px; cursor:pointer;">Kembali</button>
                <button id="confirmBtn" style="flex:1; padding:12px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer;">${isSubmitting ? 'Memuat Midtrans...' : 'Pilih Metode Pembayaran'}</button>
            </div>
        `;

        document.getElementById('backBtn').onclick = () => { step = 1; render(); };

        if (!appliedVoucher) {
            const btn = document.getElementById('applyVoucherBtn'); if(btn) btn.onclick = handleApplyVoucher;
        } else {
            const btn = document.getElementById('removeVoucherBtn'); if(btn) btn.onclick = () => { appliedVoucher = null; discountAmount = 0; renderStep2(); };
        }

        // --- TOMBOL KONFIRMASI (Manggil Midtrans) ---
        document.getElementById('confirmBtn').onclick = async () => {
            if (isSubmitting) return;
            isSubmitting = true;
            document.getElementById('confirmBtn').innerText = 'Memuat Midtrans...';

            const payload = {
                room_type_id: room.id, 
                customerName: guestName,
                customerEmail: guestEmail,
                customerPhone: guestPhone,
                check_in_date: checkIn,
                check_out_date: checkOut,
                voucher_code: appliedVoucher ? appliedVoucher.code : null
            };

            try {
                // AMBIL TOKEN AUTH (PENTING!)
                const token = localStorage.getItem('token'); 

                const response = await fetch(`${API_BASE_URL}/bookings`, {
                    method: 'POST',
                    headers: { 
                        "ngrok-skip-browser-warning": "true",
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.payment_token) {
                    // Cek apakah snap sudah terload
                    if (window.snap) {
                        window.snap.pay(result.payment_token, {
                            onSuccess: function(res) { showSuccessModal(); },
                            onPending: function(res) { alert("Menunggu pembayaran."); closeModal(); },
                            onError: function(res) { alert("Pembayaran Gagal!"); isSubmitting = false; render(); },
                            onClose: function() { isSubmitting = false; render(); }
                        });
                    } else {
                        alert("Sistem pembayaran belum siap. Silakan refresh halaman.");
                        isSubmitting = false;
                        render();
                    }
                } else {
                    alert("Gagal: " + (result.message || "Error"));
                    isSubmitting = false;
                    render();
                }
            } catch (error) {
                console.error(error);
                alert("Koneksi gagal. Cek backend/jaringan Anda.");
                isSubmitting = false;
                render();
            }
        };
    };

    // --- STEP 3: SUKSES ---
    const renderStep3 = () => {
        modalBody.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:50px;">✅</div>
                <h2>Pembayaran Berhasil!</h2>
                <p>Terima kasih telah memesan.</p>
                <button id="finishBtn" style="margin-top:20px; padding:10px 20px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer;">Selesai</button>
            </div>
        `;
        document.getElementById('finishBtn').onclick = closeModal;
    };

    const render = () => {
        if (step === 1) renderStep1(); else if (step === 2) renderStep2(); else if (step === 3) renderStep3();
    };

    const closeModal = () => { modal.classList.remove('active'); };
    closeBtn.onclick = closeModal;
    modal.classList.add('active');
    render();
}

// Fungsi untuk memunculkan notifikasi
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // 1. Buat elemen div
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // 2. Tambahkan Ikon (Opsional tapi bagus)
    let icon = '';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    // 3. Masukkan ke container
    container.appendChild(toast);
    
    // 4. Trigger animasi masuk (perlu delay sedikit biar transisi jalan)
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 5. Hilangkan otomatis setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
        // Tunggu animasi keluar selesai baru hapus dari DOM
        setTimeout(() => {
            toast.remove();
        }, 300); 
    }, 3000);
}

// Expose ke window agar bisa dipanggil dari mana saja
window.showToast = showToast;

function showBookingErrorModal(title, message) {
    // 1. Cek apakah modal sudah ada
    let modal = document.getElementById('bookingErrorModal');

    // 2. Jika belum ada, buat elemennya
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bookingErrorModal';
        
        // Style CSS langsung di sini (Glassmorphism & Clean)
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 10000; justify-content: center; align-items: center;
            backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 32px; width: 380px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); transform: scale(0.95); transition: transform 0.2s; position: relative;">
                
                <div style="width: 70px; height: 70px; background: #fff7ed; border-radius: 50%; color: #f97316; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>

                <h3 id="modalErrTitle" style="margin: 0 0 10px; color: #1f2937; font-size: 22px; font-weight: 700;"></h3>
                <p id="modalErrMessage" style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.5;"></p>

                <button onclick="closeBookingErrorModal()" style="width: 100%; padding: 12px; border: none; background: #1f2937; color: white; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#374151'" onmouseout="this.style.background='#1f2937'">
                    Mengerti, Saya akan cari tanggal lain
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 3. Set Teks Dinamis
    document.getElementById('modalErrTitle').innerText = title;
    document.getElementById('modalErrMessage').innerText = message;

    // 4. Tampilkan dengan Animasi
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.firstElementChild.style.transform = 'scale(1)';
    }, 10);
}

// Fungsi Tutup Modal
function closeBookingErrorModal() {
    const modal = document.getElementById('bookingErrorModal');
    if (modal) {
        modal.firstElementChild.style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 100);
    }
}

function showSuccessModal() {
    // 1. Cek apakah modal sudah ada
    let modal = document.getElementById('bookingSuccessModal');

    // 2. Jika belum ada, buat elemennya
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bookingSuccessModal';
        
        // Style CSS (Glassmorphism & Clean)
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 10000; justify-content: center; align-items: center;
            backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 24px; padding: 40px; width: 400px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); transform: scale(0.95); transition: transform 0.2s; position: relative;">
                
                <div style="width: 80px; height: 80px; background: #ecfdf5; border-radius: 50%; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>

                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Pembayaran Berhasil!</h3>
                <p style="margin: 0 0 32px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                    Terima kasih telah memesan.<br>Bukti pemesanan telah dikirim ke email Anda.
                </p>

                <button onclick="finishBookingProcess()" style="width: 100%; padding: 14px; border: none; background: #10b981; color: white; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);" 
                onmouseover="this.style.background='#059669'; this.style.transform='translateY(-1px)'" 
                onmouseout="this.style.background='#10b981'; this.style.transform='translateY(0)'">
                    Selesai
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 3. Tampilkan dengan Animasi
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.firstElementChild.style.transform = 'scale(1)';
    }, 10);
}

// Fungsi Menutup Modal & Reload
function finishBookingProcess() {
    const modal = document.getElementById('bookingSuccessModal');
    if (modal) {
        modal.firstElementChild.style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.style.display = 'none';
            window.location.reload(); // Reload halaman setelah tutup
        }, 100);
    }
}

window.openBookingModal = openBookingModal;
window.finishBookingProcess = finishBookingProcess;
window.closeBookingErrorModal = closeBookingErrorModal;