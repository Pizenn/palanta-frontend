// admin.js - Bagian paling atas

// 1. Cek Token & Role sebelum memuat halaman
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // Jika tidak ada token ATAU data user hilang
    if (!token || !userStr) {
        alert('Anda harus login sebagai admin!');
        window.location.href = '/index.html'; // Tendang ke home
        return;
    }

    const user = JSON.parse(userStr);

    // Jika token ada, tapi ROLE bukan admin
    if (user.role !== 'admin') {
        alert('Akses Ditolak! Halaman ini khusus Admin.');
        window.location.href = '/index.html'; // Tendang ke home
        return;
    }
}

// Jalankan pengecekan segera
checkAdminAuth();

import { API_BASE_URL } from './config.js';
import './style.css';
// Mock Data
const bookings = [
    { id: '#BK001', guest: 'Budi Santoso', room: 'Deluxe Garden View', checkIn: '15 Nov', checkOut: '17 Nov', total: 2000000, status: 'Terkonfirmasi', nights: 2 },
    { id: '#BK002', guest: 'Siti Aminah', room: 'Premium Villa', checkIn: '20 Nov', checkOut: '23 Nov', total: 6000000, status: 'Pending', nights: 3 },
    { id: '#BK003', guest: 'John Doe', room: 'Standard Room', checkIn: '01 Des', checkOut: '05 Des', total: 1000000, status: 'Terkonfirmasi', nights: 4 },
    { id: '#BK004', guest: 'Rina Wijaya', room: 'Family Room', checkIn: '10 Des', checkOut: '12 Des', total: 1500000, status: 'Dibatalkan', nights: 2 },
    { id: '#BK005', guest: 'Andi Pratama', room: 'Suite', checkIn: '15 Des', checkOut: '18 Des', total: 3500000, status: 'Berlangsung', nights: 3 },
    { id: '#BK006', guest: 'Dewi Lestari', room: 'Deluxe Garden View', checkIn: '20 Des', checkOut: '22 Des', total: 2000000, status: 'Pending', nights: 2 }
];

const stats = {
    totalPemesanan: 6,
    pembayaranPending: 2,
    terkonfirmasi: 2,
    totalPendapatan: '12.5jt'
};

async function renderOverview() {
    const content = document.getElementById('adminContent');
    // Tampilkan loading state
    content.innerHTML = '<div style="padding:40px; text-align:center;">Memuat Dashboard...</div>';

    try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}`, "ngrok-skip-browser-warning": "true" };

        // 1. Ambil Data Statistik Utama
        const statsRes = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, { headers });
        const statsJson = await statsRes.json();
        const stats = statsJson.data; // { totalBookings, pendingPayments, confirmedBookings, totalRevenue }

        // 2. Ambil Data Grafik Bulanan
        const graphRes = await fetch(`${API_BASE_URL}/admin/monthly-stats`, { headers });
        const graphJson = await graphRes.json();
        const graphData = graphJson.data; // [{ name: 'Nov 2025', total: 5 }, ...]

        // 3. Ambil 5 Booking Terbaru untuk tabel mini
        const recentRes = await fetch(`${API_BASE_URL}/admin/bookings`, { headers });
        const recentJson = await recentRes.json();
        const recentBookings = recentJson.data ? recentJson.data.slice(0, 5) : [];

        // --- RENDER HTML ---
        content.innerHTML = `
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 40px;">
            <div class="stat-card cyan">
              <div>
                <div class="stat-title">Total Pemesanan</div>
                <div class="stat-value cyan">${stats.totalBookings}</div>
              </div>
            </div>
            
            <div class="stat-card blue">
              <div>
                <div class="stat-title">Pembayaran Pending</div>
                <div class="stat-value blue">${stats.pendingPayments}</div>
              </div>
              <div class="stat-desc">Perlu Verifikasi</div>
            </div>

            <div class="stat-card green">
              <div>
                <div class="stat-title">Terkonfirmasi</div>
                <div class="stat-value green">${stats.confirmedBookings}</div>
              </div>
            </div>

            <div class="stat-card purple">
              <div>
                <div class="stat-title">Total Pendapatan</div>
                <div class="stat-value purple">Rp ${stats.totalRevenue.toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>

          <div style="background: #fff; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 24px;">
              <h3 style="margin-top:0; color:#00b894; font-size:16px;">Tren Pemesanan (30 Hari Terakhir)</h3>
              
              <div style="position: relative; height: 300px; width: 100%;">
                  <canvas id="grafikPemesanan"></canvas>
              </div>
              
            </div>
            <div style="background: #fff; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 24px;">
               <h3 style="margin-top:0; color:#333; font-size:16px; margin-bottom:15px;">Pemesanan Terbaru</h3>
               <div class="recent-orders">
                 ${recentBookings.map(b => `
                   <div style="padding:10px 0; border-bottom:1px solid #eee;">
                     <div style="font-weight:bold; font-size:14px;">${b.guestName}</div>
                     <div style="font-size:12px; color:#666;">${b.roomName}</div>
                     <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:12px;">
                        <span style="font-weight:bold; color:#00A8A8;">Rp ${b.final_price.toLocaleString('id-ID')}</span>
                        <span style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${b.status}</span>
                     </div>
                   </div>
                 `).join('')}
                 ${recentBookings.length === 0 ? '<div style="font-size:13px; color:#999;">Belum ada pemesanan.</div>' : ''}
               </div>
            </div>
          </div>
        `;

        // --- RENDER CHART (Chart.js) ---
        // Kita persiapkan data dari API backend
        const labels = graphData.map(d => d.name);
        const dataValues = graphData.map(d => d.total);

        import('./public/chart.js').then(mod => {
            mod.loadChartJs().then(() => {
                if (window.Chart) {
                    const ctx1 = document.getElementById('grafikPemesanan').getContext('2d');
                    
                    // --- PERBAIKAN UTAMA DI SINI ---
                    // 1. Cek apakah sudah ada grafik sebelumnya di variabel window
                    if (window.myOrderChart instanceof Chart) {
                        window.myOrderChart.destroy(); // HANCURKAN YANG LAMA
                    }
                    // -------------------------------

                    // 2. Simpan grafik baru ke variabel window
                    window.myOrderChart = new Chart(ctx1, {
                        type: 'line', 
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Jumlah Pemesanan',
                                data: dataValues,
                                borderColor: '#00b894',
                                backgroundColor: 'rgba(0,184,148,0.1)',
                                borderWidth: 3,
                                pointBackgroundColor: '#fff',
                                pointBorderColor: '#00b894',
                                pointRadius: 4,
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            
                            // 3. PENTING: Matikan rasio aspek agar ikut tinggi container CSS
                            maintainAspectRatio: false, 
                            
                            plugins: {
                                legend: { display: false },
                                tooltip: { mode: 'index', intersect: false }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: { stepSize: 1, precision: 0 },
                                    grid: { borderDash: [5, 5] }
                                },
                                x: {
                                    grid: { display: false }
                                }
                            }
                        }
                    });
                }
            });
        });

    } catch (error) {
        console.error("Error Dashboard:", error);
        content.innerHTML = `<div style="text-align:center; padding:40px; color:red;">Gagal memuat dashboard.<br><small>${error.message}</small></div>`;
    }
}

async function renderPemesanan() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div style="padding:40px; text-align:center;">Memuat data pemesanan...</div>';

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/admin/bookings`, {
            headers: { 'Authorization': `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
        });

        if (!response.ok) throw new Error("Gagal mengambil data");

        const json = await response.json();
        const bookings = json.data || [];

        content.innerHTML = `
            <div style="background:#fff; border-radius:16px; padding:32px 24px; box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-top:20px;">
                
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 style="font-size:22px; font-weight:600; color:#00b894; margin:0;">Data Pemesanan</h2>
                        <p style="color:#6b7280; font-size:13px; margin:4px 0 0 0;">Daftar tamu yang akan menginap.</p>
                    </div>
<button onclick="renderPemesanan()" title="Refresh Data" 
    style="background:white; border:1px solid #e5e7eb; color:#6b7280; width:36px; height:36px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05);"
    onmouseover="this.style.borderColor='#9ca3af'; this.style.color='#374151'; this.firstElementChild.style.transform='rotate(180deg)'"
    onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#6b7280'; this.firstElementChild.style.transform='rotate(0deg)'">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.4s ease;">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
</button>
                </div>
                
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f7fcfc;">
                                <th style="padding:12px 16px; font-weight:600; color:#212121; text-align:left; border-radius:8px 0 0 8px;">ID Booking</th>
                                <th style="padding:12px 16px; font-weight:600; color:#212121; text-align:left;">Tamu</th>
                                <th style="padding:12px 16px; font-weight:600; color:#212121; text-align:left;">Kamar</th>
                                <th style="padding:12px 16px; font-weight:600; color:#212121; text-align:left;">Check-in / Out</th>
                                <th style="padding:12px 16px; font-weight:600; color:#212121; text-align:left;">Total</th>
                                <th style="padding:12px 16px; font-weight:600; color:#212121; text-align:center; border-radius:0 8px 8px 0;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.length > 0 ? bookings.map(b => {
                                // 1. Format Tanggal Cantik (Contoh: 12 Des - 14 Des 25)
                                const checkIn = new Date(b.check_in_date).toLocaleDateString('id-ID', {day:'numeric', month:'short'});
                                const checkOut = new Date(b.check_out_date).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'2-digit'});
                                
                                // 2. Format Harga
                                const price = b.final_price ? b.final_price : b.total_price;
                                const priceDisplay = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

                                // 3. Format Status Warna
                                let statusStyle = 'background:#f3f4f6; color:#6b7280;'; // Default Abu
                                let statusText = b.status.toUpperCase();
                                
                                if (['confirmed', 'success', 'paid'].includes(b.status)) {
                                    statusStyle = 'background:#d1fae5; color:#059669;'; // Hijau
                                } else if (b.status === 'pending') {
                                    statusStyle = 'background:#fef3c7; color:#d97706;'; // Kuning
                                } else if (['cancelled', 'failed', 'expire'].includes(b.status)) {
                                    statusStyle = 'background:#fee2e2; color:#dc2626;'; // Merah
                                }

                                return `
                                <tr style="border-bottom:1px solid #eee; transition:background 0.2s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='white'">
                                    
                                    <td style="padding:16px; font-family:monospace; color:#6b7280; font-size:13px;">
                                        #${b.id.substring(0,8)}...
                                    </td>
                                    
                                    <td style="padding:16px;">
                                        <div style="font-weight:600; color:#1f2937;">${b.guestName || 'Tanpa Nama'}</div>
                                        <div style="font-size:12px; color:#9ca3af;">${b.user ? b.user.email : '-'}</div>
                                    </td>
                                    
                                    <td style="padding:16px; color:#4b5563;">
                                        ${b.roomName}
                                    </td>
                                    
                                    <td style="padding:16px; font-size:13px; color:#4b5563;">
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <span style="font-weight:500; color:#00b894;">${checkIn}</span> 
                                            <span style="color:#cbd5e1;">➝</span> 
                                            <span style="font-weight:500;">${checkOut}</span>
                                        </div>
                                    </td>
                                    
                                    <td style="padding:16px; font-weight:700; color:#1f2937;">
                                        ${priceDisplay}
                                    </td>
                                    
                                    <td style="padding:16px; text-align:center;">
                                        <span style="${statusStyle} padding:6px 12px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.5px;">
                                            ${statusText}
                                        </span>
                                    </td>
                                </tr>
                                `;
                            }).join('') : `<tr><td colspan="6" style="text-align:center; padding:40px; color:#9ca3af;">Belum ada data pemesanan.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    } catch (error) {
        console.error(error);
        content.innerHTML = `<div style="text-align:center; margin-top:50px;"><p style="color:red;">Gagal memuat data.</p></div>`;
    }
}

async function renderKamar() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Sedang memuat data kamar...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        const rawData = await response.json();
        const roomsData = (Array.isArray(rawData)) ? rawData : (rawData.data || []);

        content.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h2 class="section-title" style="margin:0; font-size:24px; color:var(--primary);">Manajemen Kamar</h2>
                    <p style="margin:4px 0 0 0; color:#6b7280; font-size:14px;">Kelola daftar kamar, harga, dan ketersediaan.</p>
                </div>
                <button class="btn btn-primary flex items-center gap-2" onclick="openRoomModal()" style="padding: 10px 20px;">
                    + Tambah Kamar
                </button>
            </div>

            <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px;">
                ${roomsData.map(room => {
                    // Logic Hitung
                    const total = room.total_quantity || 0;
                    const available = (room.current_available !== undefined) ? room.current_available : total;
                    const percent = total > 0 ? Math.round((available / total) * 100) : 0;
                    
                    // Logic Warna Badge
                    let badgeBg = '#d1fae5'; let badgeColor = '#059669'; let badgeText = 'TERSEDIA'; let barColor = '#00A8A8';
                    if (available === 0) {
                        badgeBg = '#fee2e2'; badgeColor = '#dc2626'; badgeText = 'PENUH'; barColor = '#dc2626';
                    } else if (percent < 50) {
                        badgeBg = '#fef3c7'; badgeColor = '#d97706'; badgeText = 'TERBATAS'; barColor = '#d97706';
                    }

                    // Logic Fasilitas
                    const feats = (room.facilities || []).slice(0, 4);
                    const facilitiesHtml = feats.map(f => `
                        <span style="display:inline-flex; align-items:center; gap:4px; background:#f9fafb; border:1px solid #e5e7eb; padding:2px 8px; border-radius:4px; font-size:11px; color:#555;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00A8A8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ${f}
                        </span>
                    `).join('');

                    // Escape data untuk parameter fungsi
                    const roomString = JSON.stringify(room).replace(/"/g, '&quot;');

                    return `
                    <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; position: relative; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0;">${room.name}</h3>
                            
                            <div style="display: flex; gap: 8px;">
                                <button onclick="openRoomModal(${roomString})" 
                                    style="background: #f3f4f6; border: none; border-radius: 8px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; cursor: pointer; color: #4b5563; transition: all 0.2s;" title="Edit">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button onclick="openDeleteConfirm(${room.id}, 'room')" 
                                    style="background: #fee2e2; border: none; border-radius: 8px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; cursor: pointer; color: #dc2626; transition: all 0.2s;" title="Hapus">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">
                                ${badgeText}
                            </span>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; color: #4b5563;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A8A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                <span style="font-size: 14px;">Kapasitas: <strong>${room.capacity} Orang</strong></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A8A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                <span style="font-size: 14px;">${available} / ${total} Unit Tersedia</span>
                            </div>
                        </div>

                        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
                            ${facilitiesHtml}
                        </div>

                        <div style="margin-bottom: 16px;">
                            <div style="font-size: 18px; font-weight: 700; color: #00A8A8;">
                                Rp ${room.price_per_night.toLocaleString('id-ID')} <span style="font-size: 12px; color: #9ca3af; font-weight: 400;">/ malam</span>
                            </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #6b7280;">
                                <span>Tingkat Ketersediaan</span>
                                <span>${percent}%</span>
                            </div>
                            <div style="width: 100%; background-color: #f3f4f6; height: 6px; border-radius: 10px; overflow: hidden;">
                                <div style="width: ${percent}%; background-color: ${barColor}; height: 100%; transition: width 0.5s ease;"></div>
                            </div>
                        </div>

                    </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch (error) {
        console.error("Gagal load kamar:", error);
        content.innerHTML = `<div style="text-align:center; margin-top:40px;">
            <p style="color:red; font-weight:bold;">Gagal memuat data.</p>
            <button class="btn btn-primary" onclick="location.reload()" style="margin-top:10px;">Coba Lagi</button>
        </div>`;
    }
}

async function renderPembayaran() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div style="padding:40px; text-align:center;">Memuat data...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments`, {
            headers: { 'Authorization': `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
        });
        const payments = await response.json();

        content.innerHTML = `
            <div style="background:white; border-radius:16px; padding:24px; box-shadow:0 2px 12px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                    <h2 style="font-size:20px; font-weight:700; color:#1f2937; margin:0;">Riwayat Pembayaran</h2>
                    <button onclick="renderPembayaran()" title="Refresh Data" 
                        style="background:white; border:1px solid #e5e7eb; color:#6b7280; width:36px; height:36px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05);"
                        onmouseover="this.style.borderColor='#9ca3af'; this.style.color='#374151'; this.firstElementChild.style.transform='rotate(180deg)'"
                        onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#6b7280'; this.firstElementChild.style.transform='rotate(0deg)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.4s ease;">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                    </button>
                </div>
                
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead style="background:#f9fafb; border-bottom:1px solid #e5e7eb;">
                            <tr>
                                <th style="padding:16px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase;">ID</th>
                                <th style="padding:16px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase;">Tamu</th>
                                <th style="padding:16px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase;">Jumlah</th>
                                <th style="padding:16px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase;">Metode</th>
                                <th style="padding:16px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase;">Status</th>
                                <th style="padding:16px; text-align:center; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payments.length > 0 ? payments.map(p => {
                                const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.amount);
                                
                                let statusBadge = '';
                                let actionButton = '';

                                // Tombol Hapus (Common Style)
                                const deleteBtn = `
                                    <button onclick="openDeletePaymentDialog('${p.id}')" title="Hapus Data" 
                                        style="background:white; border:1px solid #ef4444; color:#ef4444; width:36px; height:36px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;"
                                        onmouseover="this.style.background='#fef2f2'; this.style.boxShadow='0 2px 5px rgba(239, 68, 68, 0.2)'" 
                                        onmouseout="this.style.background='white'; this.style.boxShadow='none'">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                `;

                                if (p.status === 'pending') {
                                    statusBadge = `<span style="background:#fff7ed; color:#c2410c; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; border:1px solid #ffedd5;">PENDING</span>`;
                                    
                                    // Tombol Konfirmasi + Tombol Hapus
                                    actionButton = `
                                        <div style="display:flex; gap:8px; justify-content:center;">
                                            <button onclick="openConfirmDialog('${p.id}')" title="Konfirmasi Manual" 
                                                style="background:white; border:1px solid #10b981; color:#10b981; width:36px; height:36px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;"
                                                onmouseover="this.style.background='#ecfdf5'; this.style.boxShadow='0 2px 5px rgba(16, 185, 129, 0.2)'" 
                                                onmouseout="this.style.background='white'; this.style.boxShadow='none'">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </button>
                                            ${deleteBtn}
                                        </div>
                                    `;
                                } else if (['success', 'settlement', 'capture'].includes(p.status)) {
                                    statusBadge = `<span style="background:#ecfdf5; color:#047857; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; border:1px solid #d1fae5;">LUNAS</span>`;
                                    
                                    // Sudah Lunas: Icon Check + Tombol Hapus (Opsional)
                                    actionButton = `
                                        <div style="display:flex; gap:8px; justify-content:center; align-items:center;">
                                            <div style="display:flex; justify-content:center; align-items:center; width:36px; height:36px;">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            </div>
                                            ${deleteBtn} 
                                        </div>
                                    `;
                                } else {
                                    statusBadge = `<span style="background:#fef2f2; color:#b91c1c; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; border:1px solid #fee2e2;">GAGAL</span>`;
                                    
                                    // Gagal: Hanya Tombol Hapus
                                    actionButton = `
                                        <div style="display:flex; justify-content:center;">
                                            ${deleteBtn}
                                        </div>
                                    `;
                                }

                                return `
                                <tr style="border-bottom:1px solid #f3f4f6; transition:background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                                    <td style="padding:16px; font-family:monospace; font-size:12px; color:#6b7280;">#${p.id.slice(-6)}</td>
                                    <td style="padding:16px; font-weight:600; color:#374151;">${p.guestName}</td>
                                    <td style="padding:16px; color:#059669; font-weight:700;">${amount}</td>
                                    <td style="padding:16px;">
                                        <span style="font-size:12px; color:#4b5563; background:#f3f4f6; padding:4px 8px; border-radius:6px;">${p.method}</span>
                                    </td>
                                    <td style="padding:16px;">${statusBadge}</td>
                                    <td style="padding:16px; text-align:center;">${actionButton}</td>
                                </tr>
                                `;
                            }).join('') : '<tr><td colspan="6" style="text-align:center; padding:40px; color:#9ca3af;">Belum ada data pembayaran.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        console.error(e);
        content.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat data.</p>';
    }
}

function renderPembayaranRows(data) {
  const tbody = document.getElementById('pembayaranTableBody');
  tbody.innerHTML = data.map(p => `
    <tr style="border-bottom:1px solid #e0e0e0;">
      <td style="padding:10px 8px;">${p.id}</td>
      <td style="padding:10px 8px;">${p.booking}</td>
      <td style="padding:10px 8px;">${p.tamu}</td>
      <td style="padding:10px 8px; color:#00b894; font-weight:600;">Rp ${p.jumlah.toLocaleString('id-ID')}</td>
      <td style="padding:10px 8px;">${p.metode}</td>
      <td style="padding:10px 8px;">${p.waktu}</td>
      <td style="padding:10px 8px;">
        <span style="background:#ffe29c; color:#b48a00; border-radius:8px; padding:4px 14px; font-weight:600; font-size:13px;">${p.status}</span>
      </td>
      <td style="padding:10px 8px;">
        <button title="Lihat" style="background:#f7fcfc; border:none; border-radius:6px; padding:6px 10px; margin-right:4px; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#212121" viewBox="0 0 24 24"><path d="M12 5c-7.633 0-12 7-12 7s4.367 7 12 7 12-7 12-7-4.367-7-12-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"/></svg>
        </button>
        <button title="Konfirmasi" style="background:#00b894; border:none; color:#fff; border-radius:6px; padding:6px 10px; margin-right:4px; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24"><path d="M20.285 6.709l-11.285 11.285-5.285-5.285 1.414-1.414 3.871 3.871 9.871-9.871z"/></svg>
        </button>
        <button title="Tolak" style="background:#e74c3c; border:none; color:#fff; border-radius:6px; padding:6px 10px; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24"><path d="M6 19c0 1.104.896 2 2 2h8c1.104 0 2-.896 2-2v-14c0-1.104-.896-2-2-2h-8c-1.104 0-2 .896-2 2v14zm2-14h8v14h-8v-14zm-2 16c0 2.209 1.791 4 4 4h8c2.209 0 4-1.791 4-4v-14c0-2.209-1.791-4-4-4h-8c-2.209 0-4 1.791-4 4v14z"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Data dummy ulasan (dengan beberapa foto)
const ulasanData = [
  {
    id: '#REV001', tamu: 'Siti Aminah', kamar: 'Deluxe', rating: 5, komentar: 'Sangat nyaman dan bersih!', waktu: '2025-11-12 10:15', status: 'Tampil', foto: ['public/images/ulasan1.jpg','public/images/ulasan1b.jpg','public/images/ulasan1c.jpg'] },
  { id: '#REV002', tamu: 'Budi Santoso', kamar: 'Standard', rating: 4, komentar: 'Pelayanan ramah, lokasi strategis.', waktu: '2025-11-10 09:00', status: 'Tampil', foto: ['public/images/ulasan2.jpg','public/images/ulasan2b.jpg'] },
  { id: '#REV003', tamu: 'Rina Wijaya', kamar: 'Family', rating: 5, komentar: 'Kamar luas, cocok untuk keluarga.', waktu: '2025-12-12 11:00', status: 'Tampil', foto: ['public/images/ulasan3.jpg'] },
  { id: '#REV004', tamu: 'Andi Pratama', kamar: 'Suite', rating: 3, komentar: 'Fasilitas oke, tapi AC kurang dingin.', waktu: '2025-12-16 15:00', status: 'Tampil', foto: ['public/images/ulasan4.jpg','public/images/ulasan4b.jpg'] }
];

function renderUlasan() {
  const content = document.getElementById('adminContent');
  content.innerHTML = `
    <div style="background:#fff; border-radius:16px; padding:32px 24px; box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-top:32px;">
      <h2 style="font-size:22px; font-weight:600; color:#00b894; margin-bottom:18px;">Manajemen Ulasan</h2>
      <input id="searchUlasan" type="text" placeholder="Cari berdasarkan ID ulasan, nama tamu, atau kamar..." style="width:100%; padding:10px 16px; border-radius:8px; border:1px solid #e0e0e0; margin-bottom:18px; font-size:15px;">
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f7fcfc;">
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Foto</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">ID Ulasan</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Tamu</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Kamar</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Rating</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Komentar</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Waktu</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Status</th>
              <th style="padding:12px 8px; font-weight:600; color:#212121;">Aksi</th>
            </tr>
          </thead>
          <tbody id="ulasanTableBody"></tbody>
        </table>
      </div>
    </div>
    <div id="fotoModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); z-index:9999; align-items:center; justify-content:center;">
      <div style="background:#fff; border-radius:16px; max-width:420px; width:95%; margin:auto; padding:32px 24px; box-shadow:0 8px 32px rgba(0,0,0,0.18); position:relative; display:flex; flex-direction:column; align-items:center;">
        <button onclick="document.getElementById('fotoModal').style.display='none'" style="position:absolute; top:12px; right:12px; background:none; border:none; font-size:22px; cursor:pointer;">&times;</button>
        <div id="fotoModalContent"></div>
      </div>
    </div>
  `;
  renderUlasanRows(ulasanData);
  document.getElementById('searchUlasan').oninput = function(e) {
    const val = e.target.value.toLowerCase();
    const filtered = ulasanData.filter(u =>
      u.id.toLowerCase().includes(val) ||
      u.tamu.toLowerCase().includes(val) ||
      u.kamar.toLowerCase().includes(val)
    );
    renderUlasanRows(filtered);
  };
}

function renderUlasanRows(data) {
  const tbody = document.getElementById('ulasanTableBody');
  tbody.innerHTML = data.map((u, idx) => `
    <tr style="border-bottom:1px solid #e0e0e0;">
      <td style="padding:10px 8px; text-align:center;">
        <button onclick="showFotoModal(${idx})" style="background:none; border:none; cursor:pointer;">
          <img src="${u.foto[0]}" alt="Foto Ulasan" style="width:48px; height:48px; object-fit:cover; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        </button>
      </td>
      <td style="padding:10px 8px;">${u.id}</td>
      <td style="padding:10px 8px;">${u.tamu}</td>
      <td style="padding:10px 8px;">${u.kamar}</td>
      <td style="padding:10px 8px; color:#00b894; font-weight:600;">${'★'.repeat(u.rating)}${'☆'.repeat(5-u.rating)}</td>
      <td style="padding:10px 8px;">${u.komentar}</td>
      <td style="padding:10px 8px;">${u.waktu}</td>
      <td style="padding:10px 8px;">
        <span style="background:#e0ffe0; color:#00b894; border-radius:8px; padding:4px 14px; font-weight:600; font-size:13px;">${u.status}</span>
      </td>
      <td style="padding:10px 8px;">
        <button title="Lihat" style="background:#f7fcfc; border:none; border-radius:6px; padding:6px 10px; margin-right:4px; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#212121" viewBox="0 0 24 24"><path d="M12 5c-7.633 0-12 7-12 7s4.367 7 12 7 12-7 12-7-4.367-7-12-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"/></svg>
        </button>
        <button title="Sembunyikan" style="background:#e74c3c; border:none; color:#fff; border-radius:6px; padding:6px 10px; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24"><path d="M6 19c0 1.104.896 2 2 2h8c1.104 0 2-.896 2-2v-14c0-1.104-.896-2-2-2h-8c-1.104 0-2 .896-2 2v14zm2-14h8v14h-8v-14zm-2 16c0 2.209 1.791 4 4 4h8c2.209 0 4-1.791 4-4v-14c0-2.209-1.791-4-4-4h-8c-2.209 0-4 1.791-4 4v14z"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

window.showFotoModal = function(idx) {
  const modal = document.getElementById('fotoModal');
  const ulasan = ulasanData[idx];
  const fotoHtml = ulasan.foto.map(src => `<img src='${src}' style='width:100%; max-width:320px; margin-bottom:12px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);'>`).join('');
  document.getElementById('fotoModalContent').innerHTML = fotoHtml;
  modal.style.display = 'flex';
}

// Tab Switching
document.querySelectorAll('.admin-nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.dataset.tab;
        if (tabName === 'overview') renderOverview();
        else if (tabName === 'pemesanan') renderPemesanan();
        else if (tabName === 'kamar') renderKamar();
        else if (tabName === 'pembayaran') renderPembayaran();
        else if (tabName === 'ulasan') renderUlasan();
        else if (tabName === 'voucher') renderVoucher();
        else document.getElementById('adminContent').innerHTML = '<div class="text-center p-10" style="color: var(--text-muted);">Fitur ini sedang dalam pengembangan</div>';
    });
});

// Initialize
window.approveBooking = (id) => {
    const booking = bookings.find(b => b.id === id);
    if (booking) {
        booking.status = 'Terkonfirmasi';
        // Re-render based on current view, simple hack: click active tab
        document.querySelector('.admin-nav-tab.active').click();
    }
};

// --- LOGIKA LOGOUT ADMIN ---
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const logoutModal = document.getElementById('logoutModal');
const btnCancelLogout = document.getElementById('btnCancelLogout');
const btnConfirmLogout = document.getElementById('btnConfirmLogout');

// 1. Saat tombol Logout di menu diklik -> Tampilkan Modal
if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Tampilkan modal dengan flex agar ke tengah
        if (logoutModal) logoutModal.style.display = 'flex';
    });
}

// 2. Tombol "Batal" diklik -> Sembunyikan Modal
if (btnCancelLogout) {
    btnCancelLogout.addEventListener('click', () => {
        if (logoutModal) logoutModal.style.display = 'none';
    });
}

// 3. Tombol "Ya, Keluar" diklik -> Proses Logout
if (btnConfirmLogout) {
    btnConfirmLogout.addEventListener('click', () => {
        // Efek visual tombol ditekan
        btnConfirmLogout.innerText = "Keluar...";
        btnConfirmLogout.disabled = true;

        setTimeout(() => {
            // Hapus data sesi
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect ke halaman login/home
            window.location.href = './index.html'; 
        }, 800); // Beri sedikit delay agar terasa smooth
    });
}

// 4. (Opsional) Klik di luar area modal untuk menutup
window.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
        logoutModal.style.display = 'none';
    }
});

// 1. Definisikan Elemen DOM
const roomModal = document.getElementById('roomModal');
const roomForm = document.getElementById('roomForm');

// 2. Fungsi Buka Modal (Tambah / Edit)
window.openRoomModal = (data = null) => {
    roomModal.classList.add('active'); // Animasi Masuk

    if (data) {
        // --- MODE EDIT (Isi Form dengan Data Lama) ---
        document.getElementById('modalTitle').textContent = 'Edit Kamar';
        document.getElementById('roomId').value = data.id;
        
        // Perhatikan ID di sini sudah disesuaikan dengan HTML Anda (inputNama, inputHarga, dll)
        document.getElementById('inputNama').value = data.name;
        document.getElementById('inputHarga').value = data.price_per_night;
        document.getElementById('inputKapasitas').value = data.capacity;
        document.getElementById('inputStok').value = data.total_quantity;
        document.getElementById('inputDeskripsi').value = data.description || '';
        document.getElementById('inputFasilitas').value = (data.facilities || []).join(', ');
        
        // Ambil foto pertama jika ada
        document.getElementById('inputGambar').value = (data.photos && data.photos.length > 0) ? data.photos[0] : '';
    } else {
        // --- MODE TAMBAH (Reset Form) ---
        document.getElementById('modalTitle').textContent = 'Tambah Kamar Baru';
        roomForm.reset();
        document.getElementById('roomId').value = '';
    }
};

window.closeRoomModal = () => {
    roomModal.classList.remove('active');
};

// 3. Handle Submit Form (Simpan Data)
if (roomForm) {
    roomForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ambil Data dari Input (Gunakan ID yang Benar: inputNama, inputHarga, dst)
        const id = document.getElementById('roomId').value;
        const name = document.getElementById('inputNama').value;
        const price = parseInt(document.getElementById('inputHarga').value);
        const capacity = parseInt(document.getElementById('inputKapasitas').value);
        const quantity = parseInt(document.getElementById('inputStok').value);
        const desc = document.getElementById('inputDeskripsi').value;
        const image = document.getElementById('inputGambar').value;
        
        // Ubah string fasilitas "AC, TV" -> Array ["AC", "TV"]
        const facilitiesRaw = document.getElementById('inputFasilitas').value;
        const facilities = facilitiesRaw.split(',').map(item => item.trim()).filter(i => i);

        const payload = {
            name,
            price_per_night: price,
            capacity,
            total_quantity: quantity,
            description: desc,
            facilities: facilities,
            photos: [image]
        };

        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `/rooms/${id}` : '/rooms';
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: method,
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                // Gunakan showToast, bukan alert
                showToast(id ? "Kamar berhasil diperbarui" : "Kamar berhasil ditambahkan", "success");
                closeRoomModal();
                renderKamar();
            } else {
                showToast(result.message || "Gagal menyimpan data", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Terjadi kesalahan koneksi", "error");
        }
    });
}

async function downloadReport() {
    const month = document.getElementById('exportMonth').value;
    const year = document.getElementById('exportYear').value;
    const btn = document.querySelector('button[onclick="downloadReport()"]'); // Ambil tombolnya

    // Ubah tombol jadi loading
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sedang Mengunduh...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        
        // 1. Request ke Backend
        const response = await fetch(`${API_BASE_URL}/admin/export-report?month=${month}&year=${year}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true"
            }
        });

        if (!response.ok) throw new Error("Gagal mengambil laporan");

        // 2. Ubah Response jadi BLOB (File Mentah)
        const blob = await response.blob();

        // 3. Buat Link Download Palsu secara Virtual
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Bulanan_${month}_${year}.xlsx`; // Nama file
        document.body.appendChild(a); 
        a.click(); // Klik otomatis
        a.remove(); // Hapus linknya
        window.URL.revokeObjectURL(url); // Bersihkan memori

        // Notifikasi Sukses (jika ada fungsi showToast)
        if (typeof showToast === 'function') showToast("Laporan berhasil diunduh!", "success");

    } catch (error) {
        console.error(error);
        alert("Gagal mengunduh laporan. Pastikan data bulan tersebut ada.");
    } finally {
        // Balikin tombol seperti semula
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Jangan lupa tempel ke window agar bisa dipanggil onclick HTML
window.downloadReport = downloadReport;

window.deleteRoom = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kamar ini secara permanen?")) return;

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true"
            }
        });

        if (response.ok) {
            alert("Kamar dihapus.");
            renderKamar(); // Refresh tampilan
        } else {
            const err = await response.json();
            alert("Gagal menghapus kamar: " + (err.message || "Error server"));
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi.");
    }
};

async function renderVoucher() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div style="padding:40px; text-align:center;">Memuat data voucher...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/vouchers`);
        const raw = await response.json();
        const vouchers = (Array.isArray(raw)) ? raw : (raw.data || []);

        content.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h2 class="section-title" style="margin:0; font-size:24px; color:var(--primary);">Kode Promo & Voucher</h2>
                    <p style="margin:4px 0 0 0; color:#6b7280; font-size:14px;">Atur diskon untuk menarik lebih banyak tamu.</p>
                </div>
                <button class="btn btn-primary flex items-center gap-2" onclick="openVoucherModal()" style="padding: 10px 20px;">
                    + Buat Voucher
                </button>
            </div>

            <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                ${vouchers.length > 0 ? vouchers.map(v => {
                    const isPercent = v.type === 'PERCENT';
                    const valueDisplay = isPercent ? `${v.value}%` : `Rp ${v.value.toLocaleString('id-ID')}`;
                    const usedPercent = v.usageLimit > 0 ? Math.round((v.usedCount / v.usageLimit) * 100) : 0;
                    const start = new Date(v.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    const end = new Date(v.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    
                    const today = new Date();
                    const isExpired = new Date(v.endDate) < today;
                    const isFull = v.usedCount >= v.usageLimit;
                    
                    let statusBadge = '<span style="background:#d1fae5; color:#059669; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;">AKTIF</span>';
                    if (isExpired) statusBadge = '<span style="background:#f3f4f6; color:#6b7280; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;">BERAKHIR</span>';
                    else if (isFull) statusBadge = '<span style="background:#fee2e2; color:#dc2626; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;">HABIS</span>';

                    const vString = JSON.stringify(v).replace(/"/g, '&quot;');

                    return `
                    <div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; position: relative; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                        
                        <div style="background: linear-gradient(135deg, #00A8A8, #008e8e); padding: 16px; color: white; text-align: center;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">DISKON</div>
                            <div style="font-size: 24px; font-weight: 800;">${valueDisplay}</div>
                            <div style="font-size: 11px; margin-top: 4px;">Min. Blj: Rp ${v.minTransaction.toLocaleString('id-ID')}</div>
                        </div>
                        
                        <div style="padding: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                <div>
                                    <div style="font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 1px;">${v.code}</div>
                                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${statusBadge} ${v.forNewUser ? '• User Baru' : ''}</div>
                                </div>
                                
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="openVoucherModal(${vString})" 
                                        style="background: #f3f4f6; border: none; border-radius: 8px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; cursor: pointer; color: #4b5563; transition: all 0.2s;" title="Edit">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button onclick="openDeleteConfirm(${v.id}, 'voucher')" 
                                        style="background: #fee2e2; border: none; border-radius: 8px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; cursor: pointer; color: #dc2626; transition: all 0.2s;" title="Hapus">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                                </div>

                            <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                ${start} - ${end}
                            </div>

                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #4b5563;">
                                    <span>Terpakai: <strong>${v.usedCount}</strong> / ${v.usageLimit}</span>
                                    <span>${usedPercent}%</span>
                                </div>
                                <div style="width: 100%; background: #f3f4f6; height: 6px; border-radius: 10px; overflow: hidden;">
                                    <div style="width: ${usedPercent}%; background: ${isFull ? '#ef4444' : '#00A8A8'}; height: 100%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('') : '<div style="grid-column:1/-1; text-align:center; color:#9ca3af; padding:40px;">Belum ada voucher. Buat sekarang!</div>'}
            </div>
        `;
    } catch (error) {
        console.error(error);
        content.innerHTML = `<p style="color:red; text-align:center;">Gagal memuat data voucher.</p>`;
    }
}

// 2. Logic Modal Voucher
const voucherModal = document.getElementById('voucherModal');
const voucherForm = document.getElementById('voucherForm');

window.openVoucherModal = (data = null) => {
    voucherModal.classList.add('active');
    
    if (data) {
        // Mode Edit
        document.getElementById('voucherModalTitle').innerText = 'Edit Voucher';
        document.getElementById('voucherId').value = data.id;
        document.getElementById('vCode').value = data.code;
        document.getElementById('vType').value = data.type;
        document.getElementById('vValue').value = data.value;
        document.getElementById('vMinTrans').value = data.minTransaction;
        document.getElementById('vLimit').value = data.usageLimit;
        // Format tanggal ke YYYY-MM-DD untuk input date
        document.getElementById('vStartDate').value = data.startDate.split('T')[0];
        document.getElementById('vEndDate').value = data.endDate.split('T')[0];
        document.getElementById('vNewUser').checked = data.forNewUser;
        document.getElementById('vCode').readOnly = true; // Kode tidak boleh diganti saat edit
    } else {
        // Mode Tambah
        document.getElementById('voucherModalTitle').innerText = 'Buat Voucher Baru';
        voucherForm.reset();
        document.getElementById('voucherId').value = '';
        document.getElementById('vCode').readOnly = false;
        // Set default dates (hari ini & bulan depan)
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('vStartDate').value = today;
    }
};

window.closeVoucherModal = () => {
    voucherModal.classList.remove('active');
};

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    // Tentukan warna dan ikon SVG berdasarkan tipe
    let bgColor, borderColor, textColor, iconSvg;
    if (type === 'success') {
        bgColor = '#ecfdf5';   // Hijau muda pucat
        borderColor = '#10b981'; // Hijau terang
        textColor = '#065f46';   // Hijau tua
        // Ikon Centang Minimalis
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else {
        bgColor = '#fef2f2';   // Merah muda pucat
        borderColor = '#ef4444'; // Merah terang
        textColor = '#991b1b';   // Merah tua
        // Ikon Silang (X) Minimalis
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    }
    
    // Styling Toast Baru
    toast.style.cssText = `
        background: ${bgColor};
        border-left: 4px solid ${borderColor};
        color: ${textColor};
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 600;
        min-width: 300px;
        opacity: 0;
        transform: translateX(50px);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Efek sedikit memantul */
    `;
    
    // Masukkan Ikon dan Pesan
    toast.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; height:24px; width:24px;">
            ${iconSvg}
        </div>
        <div>${message}</div>
    `;
    container.appendChild(toast);

    // Animasi Masuk
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    // Hilang otomatis setelah 3.5 detik
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// 3. Submit Voucher
if (voucherForm) {
    voucherForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        // 1. Ambil Nilai
        const rawLimit = document.getElementById('vLimit').value;
        const rawValue = document.getElementById('vValue').value;
        const rawMinTrans = document.getElementById('vMinTrans').value;

        const limit = rawLimit ? parseInt(rawLimit) : 0; 
        const value = rawValue ? parseInt(rawValue) : 0;
        const minTrans = rawMinTrans ? parseInt(rawMinTrans) : 0;

        const payload = {
            code: document.getElementById('vCode').value.toUpperCase(),
            type: document.getElementById('vType').value,
            value: value,
            minTransaction: minTrans,
            usageLimit: limit,
            startDate: new Date(document.getElementById('vStartDate').value).toISOString(),
            endDate: new Date(document.getElementById('vEndDate').value).toISOString(),
            forNewUser: document.getElementById('vNewUser').checked
        };

        const id = document.getElementById('voucherId').value;
        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `/vouchers/${id}` : '/vouchers';
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: method,
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                // SUKSES: Ganti alert dengan showToast
                showToast(id ? "Voucher berhasil diperbarui" : "Voucher berhasil dibuat", "success");
                closeVoucherModal();
                renderVoucher(); 
            } else {
                // GAGAL: Ganti alert dengan showToast error
                showToast(result.message || "Gagal menyimpan voucher", "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showToast("Terjadi kesalahan koneksi", "error");
        }
    });
}



// 4. Hapus Voucher dan Room
let deleteTargetId = null;
let deleteType = null; // 'room' atau 'voucher'

const confirmModal = document.getElementById('confirmModal');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

// Fungsi Pemicu (Dipanggil dari tombol tong sampah)
window.openDeleteConfirm = (id, type) => {
    deleteTargetId = id;
    deleteType = type;

    // 1. Ambil Elemen Teks Modal
    const title = document.getElementById('confirmTitle');
    const desc = document.getElementById('confirmDesc');

    // 2. Ubah Teks Sesuai Tipe
    if (type === 'room') {
        title.innerText = "Hapus Kamar?";
        desc.innerText = "Kamar ini akan dihapus permanen. Data booking terkait mungkin akan kehilangan referensi kamar.";
    } else if (type === 'voucher') {
        title.innerText = "Hapus Voucher?";
        desc.innerText = "Voucher ini akan dihapus permanen dan tidak bisa digunakan lagi oleh user.";
    }

    // 3. Tampilkan Modal
    confirmModal.classList.add('active');
};

window.closeConfirmModal = () => {
    confirmModal.classList.remove('active');
    deleteTargetId = null;
    deleteType = null;
};

// Event Tombol "Ya, Hapus"
if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
        if (!deleteTargetId || !deleteType) return;

        const token = localStorage.getItem('token');
        // Tentukan Endpoint berdasarkan tipe
        const endpoint = deleteType === 'room' 
            ? `/rooms/${deleteTargetId}` 
            : `/vouchers/${deleteTargetId}`;

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
            });

            if (response.ok) {
                showToast("Data berhasil dihapus", "success");
                
                // Refresh halaman yang sesuai
                if (deleteType === 'room') renderKamar();
                else if (deleteType === 'voucher') renderVoucher();
                
            } else {
                const err = await response.json();
                showToast(err.message || "Gagal menghapus data", "error");
            }
        } catch (error) {
            showToast("Terjadi kesalahan koneksi", "error");
        }
        
        closeConfirmModal();
    });
}

let paymentIdToConfirm = null;

// 2. Fungsi Membuka Modal Konfirmasi (Custom Box)
window.openConfirmDialog = (id) => {
    paymentIdToConfirm = id;
    
    // Cek apakah modal sudah ada di HTML, kalau belum kita buat
    let modal = document.getElementById('customConfirmModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customConfirmModal';
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;
            backdrop-filter: blur(4px);
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 32px; width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); transform: scale(0.95); transition: transform 0.2s;">
                <div style="width: 64px; height: 64px; background: #ecfdf5; border-radius: 50%; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 20px; font-weight: 700;">Konfirmasi Pembayaran?</h3>
                <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    Pastikan Anda telah menerima dana dari tamu. Status akan diubah menjadi <strong>LUNAS</strong>.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="closeConfirmDialog()" style="padding: 10px 20px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-weight: 500;">Batal</button>
                    <button onclick="processPaymentConfirmation()" style="padding: 10px 20px; border: none; background: #059669; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">Ya, Konfirmasi</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Tampilkan Modal
    modal.style.display = 'flex';
    // Animasi kecil
    setTimeout(() => {
        modal.firstElementChild.style.transform = 'scale(1)';
    }, 10);
};

// 3. Fungsi Menutup Modal
window.closeConfirmDialog = () => {
    const modal = document.getElementById('customConfirmModal');
    if (modal) {
        modal.style.display = 'none';
        modal.firstElementChild.style.transform = 'scale(0.95)';
    }
    paymentIdToConfirm = null;
};

// 4. Fungsi Proses API (Dipanggil saat tombol "Ya" diklik)
window.processPaymentConfirmation = async () => {
    if (!paymentIdToConfirm) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentIdToConfirm}/confirm`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
        });

        const result = await response.json();

        if (response.ok) {
            closeConfirmDialog();
            // Ganti alert dengan Toast Notification (Pastikan fungsi showToast ada di admin.js Anda)
            showToast("Pembayaran berhasil dikonfirmasi!", "success");
            renderPembayaran(); // Refresh tabel
        } else {
            closeConfirmDialog();
            showToast(result.message || "Gagal mengupdate data.", "error");
        }
    } catch (error) {
        closeConfirmDialog();
        showToast("Terjadi kesalahan koneksi.", "error");
    }
};

// Render halaman kamar saat script dimuat
renderKamar();

// Expose functions to window supaya bisa dipanggil onclick HTML
window.renderKamar = renderKamar;

// Default view
renderOverview();

let paymentIdToDelete = null;

// 1. Fungsi Buka Modal Hapus
window.openDeletePaymentDialog = (id) => {
    paymentIdToDelete = id;
    
    // Cek apakah elemen modal sudah ada di HTML?
    let modal = document.getElementById('deletePaymentModal');
    
    // Jika belum ada, kita buat elemennya lewat JS (Dynamic Injection)
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deletePaymentModal';
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;
            backdrop-filter: blur(4px);
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 32px; width: 400px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); transform: scale(0.95); transition: transform 0.2s;">
                <div style="width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 20px; font-weight: 700;">Hapus Pembayaran?</h3>
                <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    Data ini akan dihapus permanen dan tidak bisa dikembalikan.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="closeDeletePaymentDialog()" style="padding: 10px 20px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-weight: 500; flex:1;">Batal</button>
                    <button onclick="processDeletePayment()" style="padding: 10px 20px; border: none; background: #ef4444; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2); flex:1;">Ya, Hapus</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Tampilkan Modal
    modal.style.display = 'flex';
    // Animasi Pop
    setTimeout(() => {
        modal.firstElementChild.style.transform = 'scale(1)';
    }, 10);
};

// 2. Fungsi Tutup Modal
window.closeDeletePaymentDialog = () => {
    const modal = document.getElementById('deletePaymentModal');
    if (modal) {
        modal.firstElementChild.style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 100);
    }
    paymentIdToDelete = null;
};

// 3. Fungsi Eksekusi ke API (Hapus)
window.processDeletePayment = async () => {
    if (!paymentIdToDelete) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentIdToDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            closeDeletePaymentDialog();
            
            // Panggil Toast (Pastikan fungsi showToast ada di admin.js Anda)
            if (typeof showToast === "function") {
                showToast("Pembayaran berhasil dihapus", "success");
            } else {
                alert("Pembayaran berhasil dihapus");
            }
            
            // Refresh Tabel
            renderPembayaran(); 
        } else {
            const err = await response.json();
            closeDeletePaymentDialog();
            alert("Gagal: " + (err.message || "Terjadi kesalahan"));
        }
    } catch (error) {
        console.error(error);
        closeDeletePaymentDialog();
        alert("Kesalahan koneksi server.");
    }
};
