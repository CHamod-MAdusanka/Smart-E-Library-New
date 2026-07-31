// =========================================
// BLOCK 1: Global Variables
// =========================================
let adminResTimerInterval = null;
let adminBorrowTimerInterval = null;
let adminBookScanner = null;
let currentReturnData = null;
let lastUnreadNotificationCount = 0;
let hasLoadedDashboardStats = false;
let isProcessingAddBook = false; // [FIXED] Prevent double click for Add Book

// =========================================
// BLOCK 2: Page Load Initialization
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    initUIEvents();
    
    loadUserProfileData();
    fetchDashboardStats();
    loadPreferences();
    loadTransferOfficers();

    setInterval(fetchDashboardStats, 10000);
    
    const homeEl = document.getElementById('home');
    if (homeEl) showSection('home');
});

// =========================================
// BLOCK 3: UI Events Setup
// =========================================
function initUIEvents() {
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => sidebar.classList.toggle('sidebar-collapsed'));
    }

    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('focus', function() { this.removeAttribute('readonly'); });
        searchInput.addEventListener('input', handleGlobalSearch);
    }

    const bellBtn = document.getElementById('bell-btn');
    if (bellBtn) bellBtn.addEventListener('click', onBellClick);
    
    const profileBtn = document.getElementById('profile-dropdown-btn');
    if (profileBtn) profileBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('profile-dropdown'); });

    const linkProfileSettings = document.getElementById('link-profile-settings');
    if (linkProfileSettings) {
        linkProfileSettings.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('settings'); 
        });
    }

    document.querySelectorAll('.nav-trigger').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const targetSection = this.getAttribute('data-section');
            if (targetSection) showSection(targetSection);
        });
    });

    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            let submenu = this.querySelector('.submenu');
            if (submenu) {
                if (e.target.closest('.submenu')) return;
                if (submenu.style.display === "block") {
                    submenu.style.display = "none";
                } else {
                    submenu.style.display = "block";
                }
            }
        });
    });

    const catSel = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    if (catSel) catSel.addEventListener('change', updateBookIdPreview);
    if (rackIn) rackIn.addEventListener('input', updateBookIdPreview);
    
    const addBookBtn = document.getElementById('book-add-button');
    if (addBookBtn) addBookBtn.addEventListener('click', addNewBook);

    const btnStartScanner = document.getElementById('btn-start-scanner');
    if (btnStartScanner) btnStartScanner.addEventListener('click', startAdminScanner);

    const btnUploadQr = document.getElementById('btn-upload-qr');
    const inputUploadQr = document.getElementById('qr-upload-file');
    if (btnUploadQr && inputUploadQr) {
        btnUploadQr.addEventListener('click', () => inputUploadQr.click());
        inputUploadQr.addEventListener('change', handleAdminQrFileUpload);
    }

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

    const btnUpdateProfile = document.getElementById('btn-update-profile');
    if (btnUpdateProfile) btnUpdateProfile.addEventListener('click', openProfileAuthModal);

    const btnSavePrefs = document.getElementById('btn-save-prefs');
    if (btnSavePrefs) btnSavePrefs.addEventListener('click', updatePreferences);

    const btnStartPwChange = document.getElementById('btn-start-pw-change');
    if (btnStartPwChange) btnStartPwChange.addEventListener('click', startPasswordChange);

    const btnVerifyPw = document.getElementById('btn-verify-pw');
    if (btnVerifyPw) btnVerifyPw.addEventListener('click', verifyCurrentPassword);

    const btnConfirmNewPw = document.getElementById('btn-confirm-new-pw');
    if (btnConfirmNewPw) btnConfirmNewPw.addEventListener('click', confirmUpdatePassword);

    document.querySelectorAll('.btn-cancel-pw').forEach(btn => {
        btn.addEventListener('click', cancelPasswordChange);
    });

    const btnCloseReturn = document.getElementById('btn-close-return');
    if (btnCloseReturn) btnCloseReturn.addEventListener('click', closeAdminReturnModal);

    const btnConfirmReturn = document.getElementById('btn-confirm-return');
    if (btnConfirmReturn) btnConfirmReturn.addEventListener('click', confirmProcessReturn);

    const btnCloseAuth = document.getElementById('btn-close-auth');
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeProfileAuthModal);

    const btnConfirmAuth = document.getElementById('btn-confirm-auth');
    if (btnConfirmAuth) btnConfirmAuth.addEventListener('click', confirmProfileAuth);

    const btnCloseSuccess = document.getElementById('btn-close-success');
    if (btnCloseSuccess) btnCloseSuccess.addEventListener('click', closePwSuccess);

    window.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            const notifDropdown = document.getElementById('notification-dropdown');
            const profDropdown = document.getElementById('profile-dropdown');
            if (notifDropdown) notifDropdown.classList.remove('show');
            if (profDropdown) profDropdown.classList.remove('show');
        }
    });
}

// =========================================
// BLOCK 4: Section Navigation
// =========================================
function showSection(sectionId) {
    document.querySelectorAll('.dynamic-section').forEach(section => {
        section.classList.remove('default-visible-section');
        section.classList.add('section-hidden');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('section-hidden');
        section.classList.add('default-visible-section');
    }

    const notifDropdown = document.getElementById('notification-dropdown');
    const profDropdown = document.getElementById('profile-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (profDropdown) profDropdown.classList.remove('show');

    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 900 && sidebar) sidebar.classList.add('sidebar-collapsed');

    if (sectionId !== 'return-books' && adminBookScanner) {
        adminBookScanner.clear().catch(e => console.log(e));
        const readerDiv = document.getElementById('admin-qr-reader');
        const closeBtn = document.getElementById('btn-close-scanner');
        if(readerDiv) { readerDiv.classList.add('hidden-element'); readerDiv.style.display = 'none'; }
        if(closeBtn) { closeBtn.style.display = 'none'; }
        adminBookScanner = null;
    }

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

// =========================================
// BLOCK 5: Search & Dropdown Functions
// =========================================
function handleGlobalSearch() {
    const filterText = this.value.toLowerCase().trim();
    const activeSection = document.querySelector('.dynamic-section.default-visible-section');
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
}

function toggleDropdown(id) {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('show');
}

// =========================================
// BLOCK 6: Dashboard Data & Notifications
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

            const unreadNotifications = parseInt(data.data.unread_notifications || 0);
            const unreadRegistrations = parseInt(data.data.unread_registrations || 0);
            const unreadReservations = parseInt(data.data.unread_reservations || 0);
            const unreadBorrows = parseInt(data.data.unread_borrows || 0);

            const badge = document.getElementById('notif-badge');
            const badgeManageStudents = document.getElementById('badge-manage-students');
            const badgeApprovals = document.getElementById('badge-approvals');
            const badgeReservations = document.getElementById('badge-reservations');
            const badgeActive = document.getElementById('badge-active');

            if (badge) {
                if (unreadNotifications > 0) { badge.classList.remove('hidden-element'); badge.innerText = unreadNotifications; } 
                else { badge.classList.add('hidden-element'); }
            }
            if (badgeManageStudents) {
                if (unreadRegistrations > 0) { badgeManageStudents.classList.remove('hidden-element'); badgeManageStudents.innerText = unreadRegistrations; }
                else { badgeManageStudents.classList.add('hidden-element'); }
            }
            if (badgeApprovals) {
                if (unreadRegistrations > 0) { badgeApprovals.classList.remove('hidden-element'); badgeApprovals.innerText = unreadRegistrations; }
                else { badgeApprovals.classList.add('hidden-element'); }
            }
            if (badgeReservations) {
                if (unreadReservations > 0) { badgeReservations.classList.remove('hidden-element'); badgeReservations.innerText = unreadReservations; }
                else { badgeReservations.classList.add('hidden-element'); }
            }
            if (badgeActive) {
                if (unreadBorrows > 0) { badgeActive.classList.remove('hidden-element'); badgeActive.innerText = unreadBorrows; }
                else { badgeActive.classList.add('hidden-element'); }
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
    try { await fetch('php/system_controller.php?action=mark_notifications_read', { method: 'POST' }); } 
    catch (e) { console.error('Mark notifications read failed', e); }
}

async function markSidebarBadgeSeen(section) {
    try {
        await fetch('php/system_controller.php?action=mark_sidebar_seen', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section })
        });
    } catch (e) { console.error('Mark sidebar badge section seen failed', e); }
}

function clearSidebarBadge(elementId) {
    const el = document.getElementById(elementId);
    if (el) { el.classList.add('hidden-element'); el.innerText = '0'; }
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
    e.stopPropagation();
    const notifDropdown = document.getElementById('notification-dropdown');
    if (!notifDropdown) return toggleDropdown('notification-dropdown');
    
    if (notifDropdown.classList.contains('show')) { 
        notifDropdown.classList.remove('show'); 
        return; 
    }
    
    fetchNotifications().then(() => {
        notifDropdown.classList.add('show');
        markNotificationsRead();
        const badge = document.getElementById('notif-badge'); 
        if (badge) badge.classList.add('hidden-element');
    });
}

// =========================================
// BLOCK 7: Officer & Student Management
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
                
                if(removeBody) removeBody.innerHTML += trHTML + `<td><button class="btn-danger" onclick="removeOfficer('${officer.work_id}')">Remove</button></td></tr>`;
                if(activeBody) activeBody.innerHTML += trHTML + `<td><span class="status-badge active">Active</span></td><td><button class="btn-secondary" onclick="resetOfficerPassword('${officer.work_id}')">Edit Password</button></td></tr>`;
            });
        } else {
            const noData = '<tr><td colspan="5" style="text-align:center;">No officers found.</td></tr>';
            if(viewBody) viewBody.innerHTML = noData;
            if(removeBody) removeBody.innerHTML = noData;
            if(activeBody) activeBody.innerHTML = noData;
        }
    } catch (e) { console.error("Fetch officers failed:", e); }
}

async function fetchPendingStudents() {
    try {
        const res = await fetch('php/user_controller.php?action=get_pending_students');
        const data = await res.json();
        const tbody = document.getElementById('pending-students-body');
        if(!tbody) return; tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(s => {
                let correctedPath = s.proof_doc;
                if (correctedPath && correctedPath.startsWith('../')) { correctedPath = correctedPath.substring(3); }
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

window.approveStudent = async function(id) {
    if(!confirm("Approve student " + id + "?")) return;
    try {
        const res = await fetch('php/user_controller.php?action=approve_student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) });
        const result = await res.json(); alert(result.message);
        if(result.status === 'success') { fetchPendingStudents(); fetchAllStudents(); fetchDashboardStats(); }
    } catch(e) {}
}

window.rejectStudent = async function(id) {
    if(!confirm("Remove student " + id + "?")) return;
    try {
        const res = await fetch('php/user_controller.php?action=remove_student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) });
        const result = await res.json(); alert(result.message);
        if(result.status === 'success') { fetchPendingStudents(); fetchAllStudents(); fetchDashboardStats(); }
    } catch(e) {}
}

// =========================================
// BLOCK 8: Book Management & QR System
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
    // [FIXED] Prevent double click from sending duplicate data
    if (isProcessingAddBook) return;

    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const category = document.getElementById('book-category').value;
    const bookId = document.getElementById('book-id').value;
    const coverInput = document.getElementById('book-cover');
    const addBookBtn = document.getElementById('book-add-button');

    if (!title || !author || !category || !bookId) {
        alert("Please fill in all book details (Title, Author, Category, Rack).");
        return;
    }

    isProcessingAddBook = true;
    if(addBookBtn) { addBookBtn.disabled = true; addBookBtn.innerText = "Adding..."; }

    let coverBase64 = null;
    if (coverInput.files && coverInput.files[0]) {
        const file = coverInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            coverBase64 = e.target.result;
            await executeAddBookApi(bookId, title, author, category, coverBase64);
        };
        reader.readAsDataURL(file);
    } else {
        await executeAddBookApi(bookId, title, author, category, null);
    }
}

async function executeAddBookApi(bookId, title, author, category, coverBase64) {
    try {
        const response = await fetch('php/library_controller.php?action=add_book', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId, title: title, author: author, category: category, cover_img: coverBase64 })
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
            fetchAdminBooks(); fetchDashboardStats();
        }
    } catch(e) { 
        alert("Error adding book to database."); 
    } finally {
        isProcessingAddBook = false;
        const addBookBtn = document.getElementById('book-add-button');
        if(addBookBtn) { addBookBtn.disabled = false; addBookBtn.innerText = "Add Book to Inventory"; }
    }
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
                if(removeBody) removeBody.innerHTML += `<tr><td><img src="${cover}" width="40" height="60" style="object-fit: cover;"></td><td><strong>${book.book_id}</strong></td><td>${book.title}</td><td>${book.author}</td><td><button class="btn-danger" onclick="confirmDeleteBook('${book.book_id}', '${book.title.replace(/'/g, "\\'")}')">✖ Remove</button></td></tr>`;
                
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(book.book_id)}`;
                
                if(invBody) invBody.innerHTML += `<tr>
                    <td><img src="${cover}" width="40" height="60" style="object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></td>
                    <td><strong>${book.book_id}</strong></td><td>${book.title}</td><td>${book.author}</td>
                    <td><span class="status-badge" style="background:#e2e8f0; color:#475569;">${book.category}</span></td>
                    <td style="text-align: center; vertical-align: middle;">
                        <img src="${qrUrl}" alt="QR" width="55" height="55" style="border: 2px solid #e2e8f0; border-radius: 6px; margin-bottom: 5px; padding: 2px; background: white;"><br>
                        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;" onclick="downloadBookQR('${qrUrl}', '${book.book_id}')">📥 Download</button>
                    </td></tr>`;
            });
        } else {
            if(invBody) invBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No books found in inventory.</td></tr>';
        }
    } catch(e) { console.error("Error fetching books:", e); }
}

window.downloadBookQR = async function(qrUrl, bookId) {
    try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl; link.download = `QR_${bookId}.png`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    } catch (e) { alert("Failed to download QR code. Please check your internet connection."); }
}

window.confirmDeleteBook = async function(id, title) {
    if (confirm(`Are you sure you want to delete:\n"${title}"?`)) {
        try {
            const response = await fetch('php/library_controller.php?action=remove_book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book_id: id }) });
            const result = await response.json(); alert(result.message);
            if (result.status === 'success') { fetchAdminBooks(); fetchDashboardStats(); }
        } catch (error) { alert("System Error: Could not delete the book."); }
    }
}

// =========================================
// BLOCK 9: Active Borrowed Books & Countdown Timers
// =========================================
async function fetchActiveBorrowedBooks() {
    try {
        const response = await fetch('php/library_controller.php?action=get_active_borrowings');
        const data = await response.json();
        const tbody = document.getElementById('active-books-body');
        if(!tbody) return; tbody.innerHTML = '';
        if (adminBorrowTimerInterval) clearInterval(adminBorrowTimerInterval);

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(b => {
                tbody.innerHTML += `<tr>
                    <td><strong>${b.title}</strong><br><small style="color: #64748b;">ID: ${b.book_id}</small></td>
                    <td>${b.student_name}</td><td>${b.email}</td>
                    <td><span class="timer-badge admin-borrow-timer" data-due="${b.due_date}">Calculating...</span></td>
                </tr>`;
            });
            startAdminBorrowTimers();
        } else { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No active borrowed books found.</td></tr>'; }
    } catch(e) { console.error(e); }
}

function startAdminBorrowTimers() {
    const timers = document.querySelectorAll('.admin-borrow-timer');
    adminBorrowTimerInterval = setInterval(() => {
        timers.forEach(timer => {
            const dueDateStr = timer.getAttribute('data-due');
            const expTime = new Date(dueDateStr + 'T23:59:59').getTime(); 
            const now = new Date().getTime(); const diff = expTime - now;

            if(diff <= 0) {
                timer.innerText = "OVERDUE!"; timer.style.background = "#fee2e2"; timer.style.color = "#ef4444";
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                timer.innerText = `${d}d ${h}h ${m}m ${s}s left`;
                timer.style.background = "#dbeafe"; timer.style.color = "#1e40af";
            }
        });
    }, 1000);
}

// =========================================
// BLOCK 10: Online Reservations
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
            const now = new Date().getTime(); const diff = expTime - now;

            if(diff <= 0) {
                timer.innerText = "Expired (Auto-canceling...)"; timer.style.background = "#fee2e2"; timer.style.color = "#ef4444";
            } else {
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24); const m = Math.floor((diff / 1000 / 60) % 60);
                timer.innerText = `${h}h ${m}m remaining`; timer.style.background = "#fef08a"; timer.style.color = "#854d0e";
            }
        });
    }, 1000);
}

window.approveReservation = async function(resId) {
    if(!confirm('Approve this reservation?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=approve_reservation', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') { fetchAdminReservations(); fetchDashboardStats(); fetchActiveBorrowedBooks(); }
    } catch(e) {}
}

window.cancelAdminReservation = async function(resId) {
    if(!confirm('Cancel this reservation?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=cancel_reservation', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') fetchAdminReservations();
    } catch(e) {}
}

// =========================================
// BLOCK 11: Returns Books (QR Scanner)
// =========================================
function startAdminScanner() {
    const readerDiv = document.getElementById('admin-qr-reader');
    const closeBtn = document.getElementById('btn-close-scanner');
    
    readerDiv.classList.remove('hidden-element');
    readerDiv.style.display = 'block';
    if(closeBtn) closeBtn.style.display = 'block';
    
    if (adminBookScanner && typeof adminBookScanner.stop === 'function') {
        adminBookScanner.stop().then(() => { try { adminBookScanner.clear(); } catch(e) {} initAdminScanner(); }).catch(e => { initAdminScanner(); });
    } else { initAdminScanner(); }
}

window.stopAdminScanner = function() {
    if(adminBookScanner) {
        if (typeof adminBookScanner.stop === 'function') {
            adminBookScanner.stop().then(() => { try { adminBookScanner.clear(); } catch(e) {} }).catch(e => { console.log(e); });
        } else if (typeof adminBookScanner.clear === 'function') {
            try { adminBookScanner.clear(); } catch(e) {}
        }
        adminBookScanner = null;
    }
    const readerDiv = document.getElementById('admin-qr-reader');
    const closeBtn = document.getElementById('btn-close-scanner');
    if(readerDiv) { readerDiv.classList.add('hidden-element'); readerDiv.style.display = 'none'; }
    if(closeBtn) { closeBtn.style.display = 'none'; }
}

function initAdminScanner() {
    const html5QrCode = new Html5Qrcode("admin-qr-reader");
    adminBookScanner = html5QrCode;
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            const cameraId = cameras[0].id;
            html5QrCode.start(cameraId, { fps: 10, qrbox: 250 }, (decodedText) => { onAdminScanSuccess(decodedText); }, (err) => {}).catch(err => { alert('Unable to access camera for scanning.'); });
        } else { alert('No camera devices found.'); }
    }).catch(err => { alert('Unable to access camera devices.'); });
}

function onAdminScanSuccess(decodedText) {
    const scannedBookId = decodedText.trim();
    const closeBtn = document.getElementById('btn-close-scanner');
    if(closeBtn) closeBtn.style.display = 'none';

    if(adminBookScanner) {
        if (typeof adminBookScanner.stop === 'function') {
            adminBookScanner.stop().then(() => { try { adminBookScanner.clear(); } catch(e) {} document.getElementById('admin-qr-reader').classList.add('hidden-element'); document.getElementById('admin-qr-reader').style.display = 'none'; adminBookScanner = null; }).catch(e => { console.log(e); });
        } else if (typeof adminBookScanner.clear === 'function') {
            try { adminBookScanner.clear(); } catch(e) {} document.getElementById('admin-qr-reader').classList.add('hidden-element'); document.getElementById('admin-qr-reader').style.display = 'none'; adminBookScanner = null;
        }
    }
    
    fetch('php/library_controller.php?action=get_return_details', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ book_id: scannedBookId }) })
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
        } else { alert(data.message); }
    }).catch(err => { alert("System Error!"); });
}

function handleAdminQrFileUpload(event) {
    if (event.target.files.length === 0) return;
    const file = event.target.files[0];
    const html5QrCode = new Html5Qrcode("admin-qr-reader");

    html5QrCode.scanFile(file, true).then(decodedText => {
            if (adminBookScanner && typeof adminBookScanner.stop === 'function') {
                adminBookScanner.stop().then(() => { try { adminBookScanner.clear(); } catch(e) {} }).catch(() => {});
                adminBookScanner = null; 
                document.getElementById('admin-qr-reader').classList.add('hidden-element');
                document.getElementById('admin-qr-reader').style.display = 'none';
            }
            onAdminScanSuccess(decodedText);
        }).catch(err => { alert("Unable to read QR code! Please select a clear image."); });
    event.target.value = ""; 
}

function closeAdminReturnModal() {
    document.getElementById('admin-return-modal').style.display = 'none';
    currentReturnData = null;
}

function confirmProcessReturn() {
    if(!currentReturnData) return;
    fetch('php/library_controller.php?action=process_return', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ borrowing_id: currentReturnData.borrowing_id, book_id: currentReturnData.book_id }) })
    .then(res => res.json())
    .then(data => {
        alert(data.message); closeAdminReturnModal();
        if(data.status === 'success') { fetchDashboardStats(); fetchActiveBorrowedBooks(); }
    });
}

// =========================================
// BLOCK 12: Settings, Profile & Password
// =========================================
function openProfileAuthModal() {
    document.getElementById('profile-auth-password').value = '';
    document.getElementById('profile-auth-error').classList.add('hidden-element');
    document.getElementById('profile-auth-modal').style.display = 'flex';
}

function closeProfileAuthModal() { document.getElementById('profile-auth-modal').style.display = 'none'; }

async function confirmProfileAuth() {
    const pass = document.getElementById('profile-auth-password').value;
    const name = document.getElementById('profile-name-input').value.trim();
    const email = document.getElementById('profile-email-input').value.trim();
    const errorMsg = document.getElementById('profile-auth-error');
    const fileInput = document.getElementById('profile-img-input');

    if(!pass) { errorMsg.innerText = "Please enter your password!"; errorMsg.classList.remove('hidden-element'); return; }

    // [FIXED] Send profile data via FormData for proper file handling
    const formData = new FormData();
    formData.append('action', 'update_admin_profile');
    formData.append('password', pass);
    formData.append('full_name', name);
    formData.append('email', email);

    if (fileInput && fileInput.files.length > 0) {
        formData.append('profile_pic', fileInput.files[0]);
    }

    try {
        const res = await fetch('php/user_controller.php', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        
        if(result.status === 'success') { 
            alert(result.message); 
            closeProfileAuthModal(); 
            loadUserProfileData(); 
        } else { 
            errorMsg.innerText = result.message; 
            errorMsg.classList.remove('hidden-element'); 
        }
    } catch(e) {
        alert("An error occurred while updating the profile.");
    }
}

function startPasswordChange() { document.getElementById('pw-step-0').classList.add('hidden-element'); document.getElementById('pw-step-1').classList.remove('hidden-element'); }
function cancelPasswordChange() { document.getElementById('pw-step-1').classList.add('hidden-element'); document.getElementById('pw-step-2').classList.add('hidden-element'); document.getElementById('pw-step-0').classList.remove('hidden-element'); }
function verifyCurrentPassword() {
    const curr = document.getElementById('pw-current').value;
    if(!curr) return alert("Enter current password!");
    document.getElementById('pw-step-1').classList.add('hidden-element'); document.getElementById('pw-step-2').classList.remove('hidden-element');
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
// BLOCK 13: System Preferences
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

async function loadTransferOfficers() {
    try {
        const res = await fetch('php/user_controller.php?action=get_officers');
        const data = await res.json();
        const select = document.getElementById('transfer-officer-select');
        if(!select) return;
        select.innerHTML = '<option value="">-- Choose Active Officer --</option>';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(officer => { select.innerHTML += `<option value="${officer.work_id}">${officer.full_name} (${officer.work_id})</option>`; });
        }
    } catch(e) {}
}

// =====================================================================
// Add New Officer Function
// =====================================================================
window.createNewOfficer = async function() {
    const fname = document.getElementById('add-officer-fname').value.trim();
    const lname = document.getElementById('add-officer-lname').value.trim();
    const email = document.getElementById('add-officer-email').value.trim();
    const workId = document.getElementById('add-officer-id').value.trim();
    const password = document.getElementById('add-officer-password').value;

    if (!fname || !lname || !email || !workId || !password) {
        alert("Please fill in all details!");
        return;
    }

    try {
        const response = await fetch('php/user_controller.php?action=add_officer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: fname, last_name: lname, email: email, work_id: workId, password: password })
        });

        const data = await response.json();
        if (data.status === 'success') {
            alert(data.message || "Officer account created successfully!");
            document.getElementById('add-officer-fname').value = '';
            document.getElementById('add-officer-lname').value = '';
            document.getElementById('add-officer-email').value = '';
            document.getElementById('add-officer-id').value = '';
            document.getElementById('add-officer-password').value = '';
            if (typeof fetchOfficers === 'function') { fetchOfficers(); }
        } else { alert("Error: " + (data.message || "Failed to create officer.")); }
    } catch (error) { console.error("Error creating officer:", error); alert("System Error. Please try again."); }
}

// =====================================================================
// Update Officer Temporary Password
// =====================================================================
window.resetOfficerPassword = async function(workId) {
    const newPassword = prompt(`Enter new temporary password for Officer: ${workId}`);
    if (!newPassword || newPassword.trim() === "") { return; }

    try {
        const response = await fetch('php/user_controller.php?action=update_officer_password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_id: workId, new_password: newPassword })
        });
        
        const data = await response.json();
        if (data.status === 'success') { alert("Password updated successfully!"); } 
        else { alert("Error: " + (data.message || "Could not update password.")); }
    } catch (error) { console.error("Error updating password:", error); alert("System Error. Please try again."); }
};

// =====================================================================
// Remove Officer Function
// =====================================================================
window.removeOfficer = async function(workId) {
    if(!confirm("Are you sure you want to completely remove Officer: " + workId + "?")) return;
    
    try {
        const response = await fetch('php/user_controller.php?action=remove_officer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_id: workId })
        });
        
        const data = await response.json();
        alert(data.message);
        
        if (data.status === 'success') {
            fetchOfficers();
        }
    } catch (error) {
        console.error("Error removing officer:", error);
        alert("System Error. Please try again.");
    }
};