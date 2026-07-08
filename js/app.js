// =========================================
// 1. UI, SIDEBAR & SECTION SWITCHING
// =========================================
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');

if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('closed'));
}

// ඩෑෂ්බෝඩ් එකේ මෙනු මාරු කරන ප්‍රධාන ෆන්ක්ෂන් එක
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

    if (window.innerWidth < 900 && sidebar) sidebar.classList.add('closed');

    // මෙනු එකට අදාළ ඩේටා ටික Database එකෙන් ලෝඩ් කිරීම
    switch(sectionId) {
        case 'home': fetchDashboardStats(); break;
        case 'view-officers': 
        case 'remove-officer': fetchOfficers(); break;
        case 'view-members': 
        case 'remove-member': fetchAllStudents(); break;
        case 'approve-registrations': fetchPendingStudents(); break;
        case 'add-book': 
        case 'remove-book': 
        case 'books-rfid': fetchAdminBooks(); break;
        case 'book-reservations': fetchAdminReservations(); break;
        case 'active-borrowings': fetchActiveBorrowings(); break;
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

// Global Search
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

// =========================================
// 2. DASHBOARD STATS & PROFILE
// =========================================
async function loadUserProfileData() {
    try {
        const response = await fetch('php/get_admin_profile.php');
        const result = await response.json();
        if (result.status === "success") {
            const data = result.data;
            const hName = document.getElementById('header-profile-name');
            const hImg = document.getElementById('header-profile-img');
            const sName = document.getElementById('profile-name-input');
            const sEmail = document.getElementById('profile-email-input');
            const sId = document.getElementById('settings-profile-id');
            const sPreview = document.getElementById('settings-profile-preview');

            if (hName) hName.textContent = data.name;
            if (hImg && data.avatar) hImg.src = data.avatar;
            if (sName) sName.value = data.name;
            if (sEmail) sEmail.value = data.email;
            if (sId) sId.textContent = data.id;
            if (sPreview && data.avatar) sPreview.src = data.avatar;
        }
    } catch (error) { console.error("Profile Load Error:", error); }
}

async function fetchDashboardStats() {
    try {
        const response = await fetch('php/get_dashboard_stats.php');
        const data = await response.json();
        if(data.status === 'success') {
            const m = document.getElementById('stat-total-members');
            const p = document.getElementById('stat-pending-approvals');
            const b = document.getElementById('stat-total-books');
            const i = document.getElementById('stat-books-issued');
            if(m) m.innerText = "Total Members: " + data.data.total_members;
            if(p) p.innerText = "Pending Approvals: " + data.data.pending_approvals;
            if(b) b.innerText = "Total Books: " + data.data.total_books;
            if(i) i.innerText = "Books Issued: " + data.data.books_issued;
        }
    } catch (e) { console.error("Stats Error:", e); }
}

// =========================================
// 3. OFFICER MANAGEMENT (ADD & FETCH)
// =========================================
async function fetchOfficers() {
    try {
        const response = await fetch('php/get_officers.php');
        const data = await response.json();
        
        const viewBody = document.getElementById('view-officers-body');
        const removeBody = document.getElementById('remove-officer-body');
        const activeBody = document.getElementById('active-officers-directory-body'); // අලුත් ID එක
        
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
    } catch (e) { console.error("Officers Error:", e); }
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
        const response = await fetch('php/add_officer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_id: workId, first_name: fName, last_name: lName, email: email, password: password })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(result.message);
            document.getElementById('add-officer-fname').value = '';
            document.getElementById('add-officer-lname').value = '';
            document.getElementById('add-officer-email').value = '';
            document.getElementById('add-officer-id').value = '';
            document.getElementById('add-officer-password').value = '';
            fetchOfficers();
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) { alert("System Error."); }
}

// =========================================
// 4. STUDENT MANAGEMENT
// =========================================
async function fetchPendingStudents() {
    try {
        const res = await fetch('php/get_pending_students.php');
        const data = await res.json();
        const tbody = document.getElementById('pending-students-body');
        if(!tbody) return; tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(s => {
                let proofLink = s.proof_doc ? `<a href="${s.proof_doc}" target="_blank" class="btn-secondary">View Proof</a>` : 'No Document';
                tbody.innerHTML += `<tr><td>${s.full_name}</td><td>${s.email}</td><td>${proofLink}</td>
                    <td><button class="btn-approve" onclick="approveStudent('${s.student_id}')">✔ Approve</button>
                    <button class="btn-danger" onclick="rejectStudent('${s.student_id}')">✖ Reject</button></td></tr>`;
            });
        } else { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending registrations.</td></tr>'; }
    } catch (e) {}
}

async function fetchAllStudents() {
    try {
        const res = await fetch('php/get_all_students.php');
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
        const res = await fetch('php/approve_student.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) });
        const result = await res.json(); alert(result.message);
        if(result.status === 'success') { fetchPendingStudents(); fetchAllStudents(); fetchDashboardStats(); }
    } catch(e) {}
}

async function rejectStudent(id) {
    if(!confirm("Remove student " + id + "?")) return;
    try {
        const res = await fetch('php/remove_student.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) });
        const result = await res.json(); alert(result.message);
        if(result.status === 'success') { fetchPendingStudents(); fetchAllStudents(); fetchDashboardStats(); }
    } catch(e) {}
}

// =========================================
// 5. BOOK MANAGEMENT
// =========================================
function updateBookIdPreview() {
    const cat = document.getElementById('book-category')?.value;
    const rack = document.getElementById('book-rack')?.value.trim();
    if(cat && rack) {
        const code = { novel: 'nov', science: 'sci', history: 'his', education: 'edu' }[cat] || cat.substring(0, 3).toLowerCase();
        document.getElementById('book-id').value = `${code}${new Date().getTime().toString().slice(-4)}-${rack}`;
    }
}

async function fetchAdminBooks() {
    try {
        const response = await fetch('php/get_books.php');
        const data = await response.json();
        
        const removeBody = document.getElementById('remove-book-body');
        const invBody = document.querySelector('#book-inventory-table tbody');
        const rfidBody = document.getElementById('books-rfid-body');
        
        if(removeBody) removeBody.innerHTML = '';
        if(invBody) invBody.innerHTML = '';
        if(rfidBody) rfidBody.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(book => {
                const cover = book.cover_img ? book.cover_img : 'static/covers/default.png';
                if(removeBody) removeBody.innerHTML += `<tr><td><img src="${cover}" width="40" height="60" style="object-fit: cover;"></td><td><strong>${book.book_id}</strong></td><td>${book.title}</td><td>${book.author}</td><td><button class="btn-danger" onclick="confirmDeleteBook('${book.book_id}', '${book.title.replace(/'/g, "\\'")}')">✖ Remove</button></td></tr>`;
                if(invBody) invBody.innerHTML += `<tr><td><img src="${cover}" width="40" height="60" style="object-fit: cover;"></td><td>${book.book_id}</td><td>${book.title}</td><td>${book.author}</td><td>${book.category}</td><td>DB Data</td></tr>`;
                if(rfidBody) rfidBody.innerHTML += `<tr><td>${book.title}</td><td>${book.book_id}</td><td><button class="btn-save">Write RFID</button></td></tr>`;
            });
        }
    } catch(e) {}
}

async function confirmDeleteBook(id, title) {
    if (confirm(`Are you sure you want to delete:\n"${title}"?`)) {
        try {
            const response = await fetch('php/remove_book.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book_id: id }) });
            const result = await response.json(); alert(result.message);
            if (result.status === 'success') fetchAdminBooks(); 
        } catch (error) {}
    }
}

// =========================================
// 6. RESERVATIONS & BORROWINGS
// =========================================
async function fetchAdminReservations() {
    try {
        const response = await fetch('php/get_admin_reservations.php');
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
        const response = await fetch('php/approve_reservation.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') fetchAdminReservations();
    } catch(e) {}
}

async function cancelAdminReservation(resId) {
    if(!confirm('Cancel this reservation?')) return;
    try {
        const response = await fetch('php/cancel_reservation.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({reservation_id: resId}) });
        const res = await response.json(); alert(res.message);
        if(res.status === 'success') fetchAdminReservations();
    } catch(e) {}
}

async function fetchActiveBorrowings() {
    try {
        const response = await fetch('php/get_active_borrowings.php');
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
        const response = await fetch('php/issue_book.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentId, book_id: bookId }) });
        const result = await response.json(); alert(result.message);
        if(result.status === 'success') {
            document.getElementById('issue-student-id').value = '';
            document.getElementById('issue-book-id').value = '';
            fetchDashboardStats(); fetchActiveBorrowings(); showSection('active-borrowings');
        }
    } catch(e) {}
}

// =========================================
// 7. INITIALIZATION ON LOAD
// =========================================
window.addEventListener('DOMContentLoaded', function() {
    // ඩෑෂ්බෝඩ් එක ඕපන් වෙද්දිම අවශ්‍ය දේවල් ලෝඩ් කරනවා
    loadUserProfileData();
    fetchDashboardStats();
    
    // Event listeners
    const catSel = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    if (catSel) catSel.addEventListener('change', updateBookIdPreview);
    if (rackIn) rackIn.addEventListener('input', updateBookIdPreview);

    // මුල් පිටුව (Home Section) පෙන්නන්න
    const homeEl = document.getElementById('home') || document.getElementById('dashboard-home');
    if (homeEl) showSection(homeEl.id);
});