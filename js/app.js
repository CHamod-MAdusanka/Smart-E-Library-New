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
    
    // Add Event Listeners for New Books
    const catSel = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    if (catSel) catSel.addEventListener('change', updateBookIdPreview);
    if (rackIn) rackIn.addEventListener('input', updateBookIdPreview);
    
    // Bind the missing Add Book Function!
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

    // Dynamic fetch mapping
    switch(sectionId) {
        case 'home': fetchDashboardStats(); break;
        case 'view-officers': 
        case 'remove-officer': fetchOfficers(); break;
        case 'view-members': 
        case 'remove-member': fetchAllStudents(); break;
        case 'approve-registrations': fetchPendingStudents(); break;
        case 'add-book': 
        case 'remove-book': fetchAdminBooks(); break;
        case 'book-reservations': fetchAdminReservations(); break;
        case 'active-borrowings': fetchActiveBorrowings(); break;
        case 'scan-requests': fetchScanRequests(); break;
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
            const badge = document.getElementById('notif-badge');
            const notifDropdown = document.getElementById('notification-dropdown');

            if (badge && notifDropdown) {
                if (pendingCount > 0) {
                    badge.style.display = 'inline-block';
                    badge.innerText = pendingCount;
                    notifDropdown.innerHTML = `
                        <div class="notif-item" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;" onclick="showSection('approve-registrations')">
                            <strong style="color: #ef4444;">🔔 ${pendingCount} New Registration(s)!</strong>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">You have ${pendingCount} student(s) waiting for verification. Click to review.</p>
                        </div>
                    `;
                } else {
                    badge.style.display = 'none';
                    notifDropdown.innerHTML = `
                        <div class="notif-item" style="text-align:center; padding: 15px; color:#94a3b8;">
                            <p style="margin: 0; font-size: 13px;">No new notifications right now.</p>
                        </div>
                    `;
                }
            }
        }
    } catch (e) {}
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
// === Book Management ===
// =========================================
function updateBookIdPreview() {
    const cat = document.getElementById('book-category')?.value;
    const rack = document.getElementById('book-rack')?.value.trim();
    if(cat && rack) {
        const code = { novel: 'nov', science: 'sci', history: 'his', education: 'edu' }[cat] || cat.substring(0, 3).toLowerCase();
        document.getElementById('book-id').value = `${code}${new Date().getTime().toString().slice(-4)}-${rack}`;
    }
}

// --- MISSING FUNCTION ADDED HERE ---
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
                if(removeBody) removeBody.innerHTML += `<tr><td><img src="${cover}" width="40" height="60" style="object-fit: cover;"></td><td><strong>${book.book_id}</strong></td><td>${book.title}</td><td>${book.author}</td><td><button class="btn-danger" onclick="confirmDeleteBook('${book.book_id}', '${book.title.replace(/'/g, "\\'")}')">✖ Remove</button></td></tr>`;
                if(invBody) invBody.innerHTML += `<tr><td><img src="${cover}" width="40" height="60" style="object-fit: cover;"></td><td>${book.book_id}</td><td>${book.title}</td><td>${book.author}</td><td>${book.category}</td><td>DB Data</td></tr>`;
            });
        }
    } catch(e) {}
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
// === Reservations and Borrowings ===
// =========================================
async function fetchAdminReservations() {
    try {
        const response = await fetch('php/library_controller.php?action=get_admin_reservations');
        const data = await response.json();
        const tbody = document.getElementById('admin-reservations-body');
        if(!tbody) return; tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(r => {
                const badge = r.status === 'Pending' ? `<span class="status-badge" style="background: #fef08a; color: #854d0e;">Pending</span>` : `<span class="status-badge active">Approved</span>`;
                const actionBtns = r.status === 'Pending' ? `<button class="btn-approve" onclick="approveReservation(${r.id})">✔ Approve</button> <button class="btn-danger" onclick="cancelAdminReservation(${r.id})">✖ Cancel</button>` : `<span style="color:#64748b;">Ready for Pickup</span>`;
                tbody.innerHTML += `<tr><td>${r.full_name} <br><small>${r.student_id}</small></td><td>${r.title}</td><td>${r.request_date}</td><td>${badge}</td><td>${actionBtns}</td></tr>`;
            });
        } else { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No reservations found.</td></tr>'; }
    } catch(e) {}
}

async function approveReservation(resId) {
    if(!confirm('Approve this reservation?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=approve_reservation', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') { fetchAdminReservations(); fetchDashboardStats(); fetchActiveBorrowings(); }
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

async function fetchActiveBorrowings() {
    try {
        const response = await fetch('php/library_controller.php?action=get_active_borrowings');
        const data = await response.json();
        const tbody = document.getElementById('borrowings-body');
        if(!tbody) return; tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(b => {
                tbody.innerHTML += `<tr><td>${b.title}</td><td><strong>${b.book_id}</strong></td><td>${b.student_name}</td>
                    <td>${b.days_left >= 0 ? `<span class="timer-badge timer-safe">${b.days_left} Days Left</span>` : `<span class="timer-badge timer-danger">Overdue</span>`}</td>
                    <td>${b.overdue_days} Days</td><td class="fine-text">Rs. ${b.fine.toFixed(2)}</td><td>${b.phone}</td></tr>`;
            });
        } else { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No active borrowings found.</td></tr>'; }
    } catch (e) {}
}

async function issueNewBook() {
    const studentId = document.getElementById('issue-student-id').value.trim();
    const bookId = document.getElementById('issue-book-id').value.trim();
    if(!studentId || !bookId) { alert("Please enter both IDs."); return; }
    
    try {
        const response = await fetch('php/library_controller.php?action=issue_book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentId, book_id: bookId }) });
        const result = await response.json(); alert(result.message);
        if(result.status === 'success') {
            document.getElementById('issue-student-id').value = '';
            document.getElementById('issue-book-id').value = '';
            fetchDashboardStats(); fetchActiveBorrowings(); showSection('active-borrowings');
        }
    } catch(e) {}
}

// =========================================
// === Scan Requests Management ===
// =========================================
async function fetchScanRequests() {
    try {
        const response = await fetch('php/library_controller.php?action=get_scan_requests');
        const data = await response.json();
        const tbody = document.getElementById('admin-scan-requests-body');
        if(!tbody) return; tbody.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(r => {
                const actionBtns = `<button class="btn-approve" onclick="approveScanRequest(${r.id})">✔ Approve & Issue</button>`;
                tbody.innerHTML += `<tr>
                    <td>${r.student_name} <br><small>${r.student_id}</small></td>
                    <td>${r.book_title} <br><small>${r.book_id}</small></td>
                    <td>${r.request_time}</td>
                    <td><span class="status-badge" style="background: #fef08a; color: #854d0e;">Pending</span></td>
                    <td>${actionBtns}</td>
                </tr>`;
            });
        } else { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No scan requests found.</td></tr>'; }
    } catch(e) {}
}

async function approveScanRequest(reqId) {
    if(!confirm('Are you sure you want to approve this request and issue the book for 14 days?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=approve_scan_request', { 
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({request_id: reqId}) 
        });
        const res = await response.json(); 
        alert(res.message);
        if(res.status === 'success') { fetchScanRequests(); fetchActiveBorrowings(); fetchDashboardStats(); }
    } catch(e) {}
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