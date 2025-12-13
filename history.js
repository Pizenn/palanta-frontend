import { API_BASE_URL } from './config.js';

async function loadHistory() {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("Silakan login terlebih dahulu.");
                window.location.href = 'login.html';
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/bookings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const rawData = await response.json();
                
                if (!response.ok) {
                    throw new Error(rawData.message || "Gagal memuat data");
                }

                document.getElementById('loading').style.display = 'none';

                const bookings = Array.isArray(rawData) ? rawData : (rawData.data || []);

                // [FILTER PENTING] 
                // Buang data sampah yang tidak punya tanggal atau tidak punya kamar (ID #1, #2, dll)
                const validBookings = bookings.filter(item => {
                    return item.check_in_date && item.roomType; 
                });

                if (validBookings.length === 0) {
                    document.getElementById('emptyState').style.display = 'block';
                } else {
                    document.getElementById('historyTable').style.display = 'table';
                    const tbody = document.getElementById('tableBody');
                    
                    // Gunakan 'validBookings' bukan 'bookings'
                    tbody.innerHTML = validBookings.map(item => {
                        
                        // Format Tanggal
                        const formatDate = (dateStr) => {
                            if (!dateStr) return '-';
                            const d = new Date(dateStr);
                            return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        };

                        const checkIn = formatDate(item.check_in_date);
                        const checkOut = formatDate(item.check_out_date);
                        
                        // Format Harga
                        const price = item.final_price || item.total_price || 0;
                        const total = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
                        
                        // Status Badge
                        let badgeClass = 'bg-yellow';
                        let statusText = String(item.status || 'unknown').toUpperCase();
                        
                        if(statusText === 'CONFIRMED' || statusText === 'SUCCESS') badgeClass = 'bg-green';
                        if(statusText === 'CANCELLED' || statusText === 'FAILED' || statusText === 'DENIED') badgeClass = 'bg-red';

                        const roomName = item.roomType ? item.roomType.name : 'Kamar';

                        // Format ID (Ambil 6 karakter terakhir)
                        const displayId = String(item.id).length > 10 ? String(item.id).slice(-6) : String(item.id);

                        return `
                            <tr>
                                <td style="font-family: monospace; color: #64748b;">#${displayId}</td>
                                <td style="font-weight: 600; color: #334155;">${roomName}</td>
                                <td>${checkIn} → ${checkOut}</td>
                                <td style="font-weight: 700; color: #00A8A8;">${total}</td>
                                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                            </tr>
                        `;
                    }).join('');
                }

            } catch (error) {
                console.error(error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('emptyState').style.display = 'block';
                document.getElementById('emptyState').innerHTML = `
                    <h3 style="color:red">Terjadi Kesalahan</h3>
                    <p>${error.message}</p>
                `;
            }
        }
        loadHistory();