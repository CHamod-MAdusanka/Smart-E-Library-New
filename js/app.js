let adminResTimerInterval = null;
let adminBorrowTimerInterval = null;
let adminBookScanner = null;
let currentReturnData = null;
let lastUnreadNotificationCount = 0;
let hasLoadedDashboardStats = false;

// =========================================
// === UI and Section Navigation ===
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => sidebar.classList.toggle('closed'));
    }

    loadUserProfileData();
    fetchDashboardStats();
    loadPreferences();
    loadTransferOfficers();

    // Poll dashboard stats periodically to update notification badge counts
    setInterval(fetchDashboardStats, 10000);
    
    // Add Event Listeners for New Books
    const catSel = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    if (catSel) catSel.addEventListener('change', updateBookIdPreview);
    if (rackIn) rackIn.addEventListener('input', updateBookIdPreview);
    
    // Bind the Add Book Function
    const addBookBtn = document.getElementById('book-add-button');
    if(addBookBtn) addBookBtn.addEventListener('click', addNewBook);

    const homeEl = document.getElementById('home');
    if (homeEl) showSection('home');
});

function showSection(sectionId) {
    document.querySelectorAll('.dynamic-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const section = document.getElementById(sectionId);
    if (section) section.style.display = 'block';

    const notifDropdown = document.getElementById('notification-dropdown');
    const profDropdown = document.getElementById('profile-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (profDropdown) profDropdown.classList.remove('show');

    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 900 && sidebar) sidebar.classList.add('closed');

    // Dynamically stop scanner if leaving return section
    if (sectionId !== 'return-books' && adminBookScanner) {
        adminBookScanner.clear().catch(e => console.log(e));
        document.getElementById('admin-qr-reader').style.display = 'none';
        adminBookScanner = null;
    }

    // Clear specific badges when viewing the corresponding section
    switch(sectionId) {
        case 'home': fetchDashboardStats(); break;
        case 'view-officers':
        case 'remove-officer': fetchOfficers(); break;
        case 'view-members':
        case 'remove-member':
            fetchAllStudents();
            markSidebarBadgeSeen('pending_registrations');
            clearSidebarBadge('badge-manage-students');
            break;
        case 'approve-registrations':
            fetchPendingStudents();
            markSidebarBadgeSeen('pending_registrations');
            clearSidebarBadge('badge-approvals');
            clearSidebarBadge('badge-manage-students');
            break;
        case 'add-book':
        case 'remove-book': fetchAdminBooks(); break;
        case 'book-reservations':
            fetchAdminReservations();
            markSidebarBadgeSeen('book_reservations');
            clearSidebarBadge('badge-reservations');
            break;
        case 'active-books':
            fetchActiveBorrowedBooks();
            markSidebarBadgeSeen('active_borrowings');
            clearSidebarBadge('badge-active');
            break;
    }
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
        const sub = this.querySelector('.submenu');
        if (sub) {
            e.stopPropagation();
            sub.classList.toggle('active');
        }
    });
});

// =========================================
// === Search functionality ===
// =========================================
const globalSearchInput = document.getElementById('global-search');
if (globalSearchInput) {
    globalSearchInput.addEventListener('input', function() {
        const filterText = this.value.toLowerCase().trim();
        const activeSection = document.querySelector('.dynamic-section[style*="display: block"]');
        if (!activeSection) return;

        const rows = activeSection.querySelectorAll('table tbody tr');
        rows.forEach(row => {
            if (row.cells.length === 1) return;
            let rowContainsText = false;
            for (let i = 0; i < row.cells.length; i++) {
                if (row.cells[i].textContent.toLowerCase().includes(filterText)) {
                    rowContainsText = true; break;
                }
            }
            row.style.display = rowContainsText ? '' : 'none';
        });
    });
}

function toggleDropdown(id) {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('show');
}

window.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        const notifDropdown = document.getElementById('notification-dropdown');
        const profDropdown = document.getElementById('profile-dropdown');
        if (notifDropdown) notifDropdown.classList.remove('show');
        if (profDropdown) profDropdown.classList.remove('show');
    }
});

// =========================================
// === Dashboard Data and Profile ===
// =========================================
async function loadUserProfileData() {
    try {
        const response = await fetch('php/user_controller.php?action=get_admin_profile');
        const result = await response.json();
        if (result.status === "success") {
            const data = result.data;
            document.getElementById('header-profile-name').textContent = data.name;
            document.getElementById('header-profile-img').src = data.avatar;
            document.getElementById('profile-name-input').value = data.name;
            document.getElementById('profile-email-input').value = data.email;
            document.getElementById('settings-profile-id').textContent = data.id;
            document.getElementById('settings-profile-preview').src = data.avatar;
        }
    } catch (error) { console.error("Profile Load Error:", error); }
}

async function fetchDashboardStats() {
    try {
        const response = await fetch('php/system_controller.php?action=get_dashboard_stats');
        const data = await response.json();
        
        if(data.status === 'success') {
            document.getElementById('stat-total-members').innerText = "Total Members: " + data.data.total_members;
            document.getElementById('stat-pending-approvals').innerText = "Pending Approvals: " + data.data.pending_approvals;
            document.getElementById('stat-total-books').innerText = "Total Books: " + data.data.total_books;
            document.getElementById('stat-books-issued').innerText = "Books Issued: " + data.data.books_issued;

            const pendingCount = parseInt(data.data.pending_approvals);
            const pendingResCount = parseInt(data.data.pending_reservations || 0);
            const activeBorrowCount = parseInt(data.data.active_borrowings || 0);
            const unreadNotifications = parseInt(data.data.unread_notifications || 0);
            const unreadRegistrations = parseInt(data.data.unread_registrations || 0);
            const unreadReservations = parseInt(data.data.unread_reservations || 0);
            const unreadBorrows = parseInt(data.data.unread_borrows || 0);

            const badge = document.getElementById('notif-badge');
            const badgeManageStudents = document.getElementById('badge-manage-students');
            const badgeApprovals = document.getElementById('badge-approvals');
            const badgeReservations = document.getElementById('badge-reservations');
            const badgeActive = document.getElementById('badge-active');

            // Update main bell (unread notifications only). Dropdown content is loaded on bell click.
            if (badge) {
                if (unreadNotifications > 0) {
                    badge.style.display = 'inline-block';
                    badge.innerText = unreadNotifications;
                } else {
                    badge.style.display = 'none';
                }
            }

            // Update sidebar badges using persistent unread/seen notification state
            if (badgeManageStudents) {
                if (unreadRegistrations > 0) { badgeManageStudents.style.display = 'inline-block'; badgeManageStudents.innerText = unreadRegistrations; }
                else { badgeManageStudents.style.display = 'none'; }
            }
            if (badgeApprovals) {
                if (unreadRegistrations > 0) { badgeApprovals.style.display = 'inline-block'; badgeApprovals.innerText = unreadRegistrations; }
                else { badgeApprovals.style.display = 'none'; }
            }
            if (badgeReservations) {
                if (unreadReservations > 0) { badgeReservations.style.display = 'inline-block'; badgeReservations.innerText = unreadReservations; }
                else { badgeReservations.style.display = 'none'; }
            }
            if (badgeActive) {
                if (unreadBorrows > 0) { badgeActive.style.display = 'inline-block'; badgeActive.innerText = unreadBorrows; }
                else { badgeActive.style.display = 'none'; }
            }

            if (hasLoadedDashboardStats && unreadNotifications > lastUnreadNotificationCount) {
                const newCount = unreadNotifications - lastUnreadNotificationCount;
                showToast(`You have ${newCount} new notification${newCount === 1 ? '' : 's'}.`);
            }
            lastUnreadNotificationCount = unreadNotifications;
            hasLoadedDashboardStats = true;
        }
    } catch (e) {}
}

// =========================================
// === Notifications Fetch / Mark Read ===
// =========================================
// Connected to admin bell UI in admin-dashboard.html / head-dashboard.html
async function fetchNotifications() {
    try {
        const res = await fetch('php/system_controller.php?action=get_notifications');
        const data = await res.json();
        if (data.status === 'success') {
            const notifDropdown = document.getElementById('notification-dropdown');
            if (!notifDropdown) return data;
            if (data.data.notifications.length === 0) {
                notifDropdown.innerHTML = `<div class="notif-item" style="text-align:center; padding: 15px; color:#94a3b8;"><p style="margin: 0; font-size: 13px;">No recent notifications.</p></div>`;
                return data;
            }
            let html = '';
            data.data.notifications.forEach(n => {
                const when = new Date(n.created_at).toLocaleString();
                html += `<div class="notif-item" style="cursor:default; padding:10px; border-bottom:1px solid #eee;"><strong style="color:#0f172a;">${n.message}</strong><p style="margin:5px 0 0 0; font-size:12px;color:#64748b;">${when}</p></div>`;
            });
            notifDropdown.innerHTML = html;
            return data;
        }
    } catch (e) { console.error('Fetch notifications failed', e); }
    return null;
}

async function markNotificationsRead() {
    try {
        await fetch('php/system_controller.php?action=mark_notifications_read', { method: 'POST' });
    } catch (e) { console.error('Mark notifications read failed', e); }
}

async function markNotificationsReadByType(type) {
    try {
        await fetch('php/system_controller.php?action=mark_notifications_read_by_type', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
    } catch (e) { console.error('Mark notifications read by type failed', e); }
}

async function markSidebarBadgeSeen(section) {
    try {
        await fetch('php/system_controller.php?action=mark_sidebar_seen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section })
        });
    } catch (e) {
        console.error('Mark sidebar badge section seen failed', e);
    }
}

function clearSidebarBadge(elementId) {
    const el = document.getElementById(elementId);
    if (el) { el.style.display = 'none'; el.innerText = '0'; }
}

function showToast(message) {
    const container = document.getElementById('notification-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerText = message;
    container.appendChild(toast);
    window.setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        window.setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 4000);
}

function onBellClick(e) {
    const notifDropdown = document.getElementById('notification-dropdown');
    if (!notifDropdown) return toggleDropdown('notification-dropdown');
    // If already open, just close
    if (notifDropdown.classList.contains('show')) { notifDropdown.classList.remove('show'); return; }
    // Open, fetch latest notifications, and mark them read (hide badge)
    fetchNotifications().then(() => {
        notifDropdown.classList.add('show');
        markNotificationsRead();
        const badge = document.getElementById('notif-badge'); if (badge) badge.style.display = 'none';
    });
}

// =========================================
// === Officer Management ===
// =========================================
async function fetchOfficers() {
    try {
        const response = await fetch('php/user_controller.php?action=get_officers');
        const data = await response.json();
        
        const viewBody = document.getElementById('view-officers-body');
        const removeBody = document.getElementById('remove-officer-body');
        const activeBody = document.getElementById('active-officers-directory-body');
        
        if(viewBody) viewBody.innerHTML = '';
        if(removeBody) removeBody.innerHTML = '';
        if(activeBody) activeBody.innerHTML = '';

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(officer => {
                const trHTML = `<tr><td>${officer.work_id}</td><td>${officer.full_name}</td><td>${officer.email}</td>`;
                if(viewBody) viewBody.innerHTML += trHTML + `</tr>`;
                if(removeBody) removeBody.innerHTML += trHTML + `<td><button class="btn-danger">Remove</button></td></tr>`;
                if(activeBody) activeBody.innerHTML += trHTML + `<td><span class="status-badge active">Active</span></td><td><button class="btn-secondary">Edit</button></td></tr>`;
            });
        } else {
            const noData = '<tr><td colspan="5" style="text-align:center;">No officers found.</td></tr>';
            if(viewBody) viewBody.innerHTML = noData;
            if(removeBody) removeBody.innerHTML = noData;
            if(activeBody) activeBody.innerHTML = noData;
        }
    } catch (e) {}
}

async function createNewOfficer() {
    const fName = document.getElementById('add-officer-fname').value.trim();
    const lName = document.getElementById('add-officer-lname').value.trim();
    const email = document.getElementById('add-officer-email').value.trim();
    const workId = document.getElementById('add-officer-id').value.trim();
    const password = document.getElementById('add-officer-password').value;

    if (!fName || !lName || !email || !workId || !password) {
        alert("Please fill in all the required fields!"); return;
    }

    try {
        const response = await fetch('php/user_controller.php?action=add_officer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_id: workId, first_name: fName, last_name: lName, email: email, password: password })
        });
        const result = await response.json();
        alert(result.message);
        if (result.status === 'success') {
            document.getElementById('add-officer-fname').value = '';
            document.getElementById('add-officer-lname').value = '';
            document.getElementById('add-officer-email').value = '';
            document.getElementById('add-officer-id').value = '';
            document.getElementById('add-officer-password').value = '';
            fetchOfficers();
        }
    } catch (error) { alert("System Error."); }
}

// =========================================
// === Student Management ===
// =========================================
async function fetchPendingStudents() {
    try {
        const res = await fetch('php/user_controller.php?action=get_pending_students');
        const data = await res.json();
        const tbody = document.getElementById('pending-students-body');
        if(!tbody) return; tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(s => {
                let correctedPath = s.proof_doc;
                if (correctedPath && correctedPath.startsWith('../')) {
                    correctedPath = correctedPath.substring(3);
                }
                let proofLink = correctedPath ? `<a href="${correctedPath}" target="_blank" class="btn-secondary">View Proof</a>` : 'No Document';
                tbody.innerHTML += `<tr><td>${s.full_name}</td><td>${s.email}</td><td>${proofLink}</td>
                    <td><button class="btn-approve" onclick="approveStudent('${s.student_id}')">✔ Approve</button>
                    <button class="btn-danger" onclick="rejectStudent('${s.student_id}')">✖ Reject</button></td></tr>`;
            });
        } else { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending registrations.</td></tr>'; }
    } catch (e) {}
}

async function fetchAllStudents() {
    try {
        const res = await fetch('php/user_controller.php?action=get_all_students');
        const data = await res.json();
        const allTb = document.getElementById('all-students-body');
        const remTb = document.getElementById('remove-students-body');
        if(allTb) allTb.innerHTML = ''; if(remTb) remTb.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(s => {
                const pic = s.profile_pic ? s.profile_pic : 'static/admin.png';
                const tr = `<tr><td><div class="student-profile"><img src="${pic}" class="student-avatar"/><span class="student-id">${s.student_id}</span></div></td>
                    <td>${s.full_name}</td><td>${s.email}</td>`;
                if(allTb) allTb.innerHTML += tr + `<td><span class="status-badge active">${s.status}</span></td></tr>`;
                if(remTb) remTb.innerHTML += tr + `<td><button class="btn-danger" onclick="rejectStudent('${s.student_id}')">Remove</button></td></tr>`;
            });
        } else {
            if(allTb) allTb.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
            if(remTb) remTb.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
        }
    } catch (e) {}
}

async function approveStudent(id) {
    if(!confirm("Approve student " + id + "?")) return;
    try {
        const res = await fetch('php/user_controller.php?action=approve_student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) });
        const result = await res.json(); alert(result.message);
        if(result.status === 'success') { fetchPendingStudents(); fetchAllStudents(); fetchDashboardStats(); }
    } catch(e) {}
}

async function rejectStudent(id) {
    if(!confirm("Remove student " + id + "?")) return;
    try {
        const res = await fetch('php/user_controller.php?action=remove_student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) });
        const result = await res.json(); alert(result.message);
        if(result.status === 'success') { fetchPendingStudents(); fetchAllStudents(); fetchDashboardStats(); }
    } catch(e) {}
}

// =========================================
// === Book Management & Auto QR ===
// =========================================
function updateBookIdPreview() {
    const cat = document.getElementById('book-category')?.value;
    const rack = document.getElementById('book-rack')?.value.trim();
    if(cat && rack) {
        const code = { novel: 'nov', science: 'sci', history: 'his', education: 'edu' }[cat] || cat.substring(0, 3).toLowerCase();
        document.getElementById('book-id').value = `${code}${new Date().getTime().toString().slice(-4)}-${rack}`;
    }
}

async function addNewBook() {
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const category = document.getElementById('book-category').value;
    const bookId = document.getElementById('book-id').value;
    const coverInput = document.getElementById('book-cover');

    if (!title || !author || !category || !bookId) {
        alert("Please fill in all book details (Title, Author, Category, Rack).");
        return;
    }

    let coverBase64 = null;
    if (coverInput.files && coverInput.files[0]) {
        const file = coverInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            coverBase64 = e.target.result;
            executeAddBookApi(bookId, title, author, category, coverBase64);
        };
        reader.readAsDataURL(file);
    } else {
        executeAddBookApi(bookId, title, author, category, null);
    }
}

async function executeAddBookApi(bookId, title, author, category, coverBase64) {
    try {
        const response = await fetch('php/library_controller.php?action=add_book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book_id: bookId,
                title: title,
                author: author,
                category: category,
                cover_img: coverBase64
            })
        });
        const result = await response.json();
        alert(result.message);
        
        if (result.status === 'success') {
            document.getElementById('book-title').value = '';
            document.getElementById('book-author').value = '';
            document.getElementById('book-category').value = '';
            document.getElementById('book-rack').value = '';
            document.getElementById('book-id').value = '';
            document.getElementById('book-cover').value = '';
            fetchAdminBooks();
            fetchDashboardStats();
        }
    } catch(e) { alert("Error adding book to database."); }
}

async function fetchAdminBooks() {
    try {
        const response = await fetch('php/library_controller.php?action=get_books');
        const data = await response.json();
        
        const removeBody = document.getElementById('remove-book-body');
        const invBody = document.querySelector('#book-inventory-table tbody');
        
        if(removeBody) removeBody.innerHTML = '';
        if(invBody) invBody.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(book => {
                const cover = book.cover_img ? book.cover_img : 'static/covers/default.png';
                
                // Remove book table row
                if(removeBody) removeBody.innerHTML += `<tr><td><img src="${cover}" width="40" height="60" style="object-fit: cover;"></td><td><strong>${book.book_id}</strong></td><td>${book.title}</td><td>${book.author}</td><td><button class="btn-danger" onclick="confirmDeleteBook('${book.book_id}', '${book.title.replace(/'/g, "\\'")}')">✖ Remove</button></td></tr>`;
                
                // Inventory table row (with Auto-Generated QR Code & Download Button)
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(book.book_id)}`;
                
                if(invBody) invBody.innerHTML += `<tr>
                    <td><img src="${cover}" width="40" height="60" style="object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></td>
                    <td><strong>${book.book_id}</strong></td>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td><span class="status-badge" style="background:#e2e8f0; color:#475569;">${book.category}</span></td>
                    <td style="text-align: center; vertical-align: middle;">
                        <img src="${qrUrl}" alt="QR" width="55" height="55" style="border: 2px solid #e2e8f0; border-radius: 6px; margin-bottom: 5px; padding: 2px; background: white;"><br>
                        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;" onclick="downloadBookQR('${qrUrl}', '${book.book_id}')">
                            📥 Download
                        </button>
                    </td>
                </tr>`;
            });
        } else {
            if(invBody) invBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No books found in inventory.</td></tr>';
        }
    } catch(e) { console.error("Error fetching books:", e); }
}

// Function to Download the QR Code Image
async function downloadBookQR(qrUrl, bookId) {
    try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `QR_${bookId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(blobUrl);
    } catch (e) {
        alert("Failed to download QR code. Please check your internet connection.");
    }
}

async function confirmDeleteBook(id, title) {
    if (confirm(`Are you sure you want to delete:\n"${title}"?`)) {
        try {
            const response = await fetch('php/library_controller.php?action=remove_book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book_id: id }) });
            const result = await response.json(); alert(result.message);
            if (result.status === 'success') { fetchAdminBooks(); fetchDashboardStats(); }
        } catch (error) {}
    }
}

// =========================================
// === Active Borrowed Books & Timer ===
// =========================================
async function fetchActiveBorrowedBooks() {
    try {
        const response = await fetch('php/library_controller.php?action=get_active_borrowings');
        const data = await response.json();
        const tbody = document.getElementById('active-books-body');
        if(!tbody) return; 
        tbody.innerHTML = '';
        
        if (adminBorrowTimerInterval) clearInterval(adminBorrowTimerInterval);

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(b => {
                tbody.innerHTML += `<tr>
                    <td><strong>${b.title}</strong><br><small style="color: #64748b;">ID: ${b.book_id}</small></td>
                    <td>${b.student_name}</td>
                    <td>${b.email}</td>
                    <td><span class="timer-badge admin-borrow-timer" data-due="${b.due_date}">Calculating...</span></td>
                </tr>`;
            });
            startAdminBorrowTimers();
        } else { 
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No active borrowed books found.</td></tr>'; 
        }
    } catch(e) { console.error(e); }
}

function startAdminBorrowTimers() {
    const timers = document.querySelectorAll('.admin-borrow-timer');
    adminBorrowTimerInterval = setInterval(() => {
        timers.forEach(timer => {
            const dueDateStr = timer.getAttribute('data-due');
            const expTime = new Date(dueDateStr + 'T23:59:59').getTime(); 
            const now = new Date().getTime();
            const diff = expTime - now;

            if(diff <= 0) {
                timer.innerText = "OVERDUE!";
                timer.style.background = "#fee2e2"; 
                timer.style.color = "#ef4444";
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                
                timer.innerText = `${d}d ${h}h ${m}m ${s}s left`;
                timer.style.background = "#dbeafe"; 
                timer.style.color = "#1e40af";
            }
        });
    }, 1000);
}

// =========================================
// === Reservations ===
// =========================================
async function fetchAdminReservations() {
    try {
        const response = await fetch('php/library_controller.php?action=get_admin_reservations');
        const data = await response.json();
        const tbody = document.getElementById('admin-reservations-body');
        if(!tbody) return; tbody.innerHTML = '';
        
        if (adminResTimerInterval) clearInterval(adminResTimerInterval);

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(r => {
                const actionBtns = `<button class="btn-approve" onclick="approveReservation(${r.id})">✔ Approve</button> <button class="btn-danger" onclick="cancelAdminReservation(${r.id})">✖ Cancel</button>`;
                tbody.innerHTML += `<tr>
                    <td>${r.full_name} <br><small>${r.student_id}</small></td>
                    <td>${r.title}</td>
                    <td><span class="timer-badge admin-res-timer" data-time="${r.request_date}">Calculating...</span></td>
                    <td>${actionBtns}</td>
                </tr>`;
            });
            startAdminReservationTimers();
        } else { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No reservations found.</td></tr>'; }
    } catch(e) {}
}

function startAdminReservationTimers() {
    const timers = document.querySelectorAll('.admin-res-timer');
    adminResTimerInterval = setInterval(() => {
        timers.forEach(timer => {
            const reqTime = new Date(timer.getAttribute('data-time')).getTime();
            const expTime = reqTime + (24 * 60 * 60 * 1000);
            const now = new Date().getTime();
            const diff = expTime - now;

            if(diff <= 0) {
                timer.innerText = "Expired (Auto-canceling...)";
                timer.style.background = "#fee2e2"; timer.style.color = "#ef4444";
            } else {
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                timer.innerText = `${h}h ${m}m remaining`;
                timer.style.background = "#fef08a"; timer.style.color = "#854d0e";
            }
        });
    }, 1000);
}

async function approveReservation(resId) {
    if(!confirm('Approve this reservation?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=approve_reservation', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') { fetchAdminReservations(); fetchDashboardStats(); fetchActiveBorrowedBooks(); }
    } catch(e) {}
}

async function cancelAdminReservation(resId) {
    if(!confirm('Cancel this reservation?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=cancel_reservation', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') fetchAdminReservations();
    } catch(e) {}
}

// =========================================
// === Returns Books (QR Scanner) ===
// =========================================

function startAdminScanner() {
    const readerDiv = document.getElementById('admin-qr-reader');
    readerDiv.style.display = 'block';
    if (adminBookScanner && typeof adminBookScanner.stop === 'function') {
        adminBookScanner.stop().then(() => {
            try { adminBookScanner.clear(); } catch(e) {}
            initAdminScanner();
        }).catch(e => { initAdminScanner(); });
    } else {
        initAdminScanner();
    }
}

function initAdminScanner() {
    // Use Html5Qrcode to start camera explicitly for more reliable live scanning
    const html5QrCode = new Html5Qrcode("admin-qr-reader");
    adminBookScanner = html5QrCode;

    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            const cameraId = cameras[0].id;
            html5QrCode.start(cameraId, { fps: 10, qrbox: 250 }, (decodedText) => {
                onAdminScanSuccess(decodedText);
            }, (err) => {
                // scan error callback
            }).catch(err => {
                console.error('Failed to start camera scanner:', err);
                alert('Unable to access camera for scanning.');
            });
        } else {
            alert('No camera devices found.');
        }
    }).catch(err => {
        console.error('Camera query failed', err);
        alert('Unable to access camera devices.');
    });
}

function onAdminScanSuccess(decodedText) {
    const scannedBookId = decodedText.trim();
    
    if(adminBookScanner) {
        // Stop camera and clear UI
        if (typeof adminBookScanner.stop === 'function') {
            adminBookScanner.stop().then(() => {
                try { adminBookScanner.clear(); } catch(e) {}
                document.getElementById('admin-qr-reader').style.display = 'none';
                adminBookScanner = null;
            }).catch(e => { console.log(e); });
        } else if (typeof adminBookScanner.clear === 'function') {
            try { adminBookScanner.clear(); } catch(e) {}
            document.getElementById('admin-qr-reader').style.display = 'none';
            adminBookScanner = null;
        }
    }
    
    fetch('php/library_controller.php?action=get_return_details', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ book_id: scannedBookId })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            currentReturnData = data.data;
            document.getElementById('ret-book-title').innerText = currentReturnData.title;
            document.getElementById('ret-book-id').innerText = currentReturnData.book_id;
            document.getElementById('ret-student-name').innerText = currentReturnData.full_name;
            document.getElementById('ret-student-id').innerText = currentReturnData.student_id;
            document.getElementById('ret-fine-amount').innerText = currentReturnData.fine.toFixed(2);
            
            document.getElementById('admin-return-modal').style.display = 'flex';
        } else {
            alert(data.message); 
        }
    }).catch(err => { 
        alert("System Error!"); 
    });
}

function closeAdminReturnModal() {
    document.getElementById('admin-return-modal').style.display = 'none';
    currentReturnData = null;
}

function confirmProcessReturn() {
    if(!currentReturnData) return;
    
    fetch('php/library_controller.php?action=process_return', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ borrowing_id: currentReturnData.borrowing_id, book_id: currentReturnData.book_id })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        closeAdminReturnModal();
        if(data.status === 'success') {
            fetchDashboardStats();
            fetchActiveBorrowedBooks();
        }
    });
}

// =========================================
// === QR File Upload Handler ===
// =========================================
function handleAdminQrFileUpload(event) {
    if (event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const html5QrCode = new Html5Qrcode("admin-qr-reader");

    html5QrCode.scanFile(file, true)
        .then(decodedText => {
            // If a live scanner was running, stop and clear it
            if (adminBookScanner && typeof adminBookScanner.stop === 'function') {
                adminBookScanner.stop().then(() => { try { adminBookScanner.clear(); } catch(e) {} }).catch(() => {});
                adminBookScanner = null;
                document.getElementById('admin-qr-reader').style.display = 'none';
            }
            onAdminScanSuccess(decodedText);
        })
        .catch(err => {
            alert("QR කේතය කියවීමට නොහැකි විය! කරුණාකර පැහැදිලි පින්තූරයක් තෝරන්න.");
            console.error("QR Scan Error:", err);
        });
        
    event.target.value = ""; 
}

// =========================================
// === Settings and Profile ===
// =========================================
const profileImgInput = document.getElementById('profile-img-input');
if(profileImgInput) {
    profileImgInput.addEventListener('change', function(e) {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('settings-profile-preview').src = event.target.result;
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

function openProfileAuthModal() {
    document.getElementById('profile-auth-password').value = '';
    document.getElementById('profile-auth-error').style.display = 'none';
    document.getElementById('profile-auth-modal').style.display = 'flex';
}
function closeProfileAuthModal() { document.getElementById('profile-auth-modal').style.display = 'none'; }

async function confirmProfileAuth() {
    const pass = document.getElementById('profile-auth-password').value;
    const name = document.getElementById('profile-name-input').value.trim();
    const email = document.getElementById('profile-email-input').value.trim();
    const imgSrc = document.getElementById('settings-profile-preview').src;

    if(!pass) {
        document.getElementById('profile-auth-error').innerText = "Please enter your password!";
        document.getElementById('profile-auth-error').style.display = 'block'; return;
    }

    try {
        const res = await fetch('php/user_controller.php?action=update_admin_profile', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: pass, full_name: name, email: email, profile_pic: imgSrc })
        });
        const result = await res.json();
        
        if(result.status === 'success') {
            alert(result.message); closeProfileAuthModal(); loadUserProfileData(); 
        } else {
            document.getElementById('profile-auth-error').innerText = result.message;
            document.getElementById('profile-auth-error').style.display = 'block';
        }
    } catch(e) {}
}

function startPasswordChange() {
    document.getElementById('pw-step-0').style.display = 'none';
    document.getElementById('pw-step-1').style.display = 'block';
}
function cancelPasswordChange() {
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'none';
    document.getElementById('pw-step-0').style.display = 'block';
}
function verifyCurrentPassword() {
    const curr = document.getElementById('pw-current').value;
    if(!curr) return alert("Enter current password!");
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'block';
}
async function confirmUpdatePassword() {
    const curr = document.getElementById('pw-current').value;
    const newPw = document.getElementById('pw-new').value;
    const confPw = document.getElementById('pw-confirm').value;

    if(!newPw || newPw !== confPw) return alert("New passwords do not match!");

    try {
        const res = await fetch('php/auth_controller.php?action=change_admin_password', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ current_password: curr, new_password: newPw })
        });
        const result = await res.json();
        if(result.status === 'success') { document.getElementById('pw-success-modal').style.display = 'flex'; } 
        else { alert(result.message); }
    } catch(e) {}
}
function closePwSuccess() { document.getElementById('pw-success-modal').style.display = 'none'; cancelPasswordChange(); }

// =========================================
// === Preferences and Backup ===
// =========================================
async function loadPreferences() {
    try {
        const res = await fetch('php/system_controller.php?action=get_preferences');
        const result = await res.json();
        if(result.status === 'success') {
            const pDays = document.getElementById('pref-days');
            const pFine = document.getElementById('pref-fine');
            if(pDays) pDays.value = result.data.borrowing_period;
            if(pFine) pFine.value = result.data.late_fine;
        }
    } catch(e) {}
}

async function updatePreferences() {
    const days = document.getElementById('pref-days').value;
    const fine = document.getElementById('pref-fine').value;
    try {
        const res = await fetch('php/system_controller.php?action=update_preferences', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ borrow_days: days, fine_amount: fine })
        });
        const result = await res.json(); alert(result.message);
    } catch(e) { alert("System Error: Could not save preferences."); }
}

function downloadDatabaseBackup() { window.location.href = 'php/backup_database.php'; }

// =========================================
// === Account Management ===
// =========================================
async function loadTransferOfficers() {
    try {
        const res = await fetch('php/user_controller.php?action=get_officers');
        const data = await res.json();
        const select = document.getElementById('transfer-officer-select');
        if(!select) return;
        select.innerHTML = '<option value="">-- Choose Active Officer --</option>';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(officer => {
                select.innerHTML += `<option value="${officer.work_id}">${officer.full_name} (${officer.work_id})</option>`;
            });
        }
    } catch(e) {}
}

async function executeOwnershipTransfer() {
    const select = document.getElementById('transfer-officer-select');
    const newHeadId = select ? select.value : null;
    
    if(!newHeadId) { alert("Please select an officer."); return; }
    
    if(confirm("Are you sure? You will lose Head Admin privileges.")) {
        try {
            const res = await fetch('php/user_controller.php?action=transfer_ownership', {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ new_head_id: newHeadId })
            });
            const result = await res.json(); alert(result.message);
            if(result.status === 'success') { window.location.href = 'index.html'; }
        } catch(e) { alert("Error transferring ownership."); }
    }
}

async function executeAccountDeletion() {
    if(confirm("DANGER: Are you sure you want to completely delete your account?")) {
        try {
            const res = await fetch('php/user_controller.php?action=delete_account');
            const result = await res.json(); alert(result.message);
            if(result.status === 'success') { window.location.href = 'index.html'; }
        } catch(e) { alert("Error deleting account."); }
    }
}