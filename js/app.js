// =========================================
// SIDEBAR & SECTION SWITCHING
// =========================================
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');

if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('closed');
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.dynamic-section').forEach(section => {
        section.style.display = 'none';
    });

    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }

    const notifDropdown = document.getElementById('notification-dropdown');
    const profDropdown = document.getElementById('profile-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (profDropdown) profDropdown.classList.remove('show');

    if (window.innerWidth < 900 && sidebar) {
        sidebar.classList.add('closed');
    }

    // Refresh student tables when section opens
    if (sectionId === 'approve-registrations') {
        if (typeof fetchPendingStudents === "function") fetchPendingStudents();
    } else if (sectionId === 'view-members' || sectionId === 'remove-member') {
        if (typeof fetchAllStudents === "function") fetchAllStudents();
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
// GLOBAL SEARCH FUNCTIONALITY
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
                    rowContainsText = true;
                    break;
                }
            }
            row.style.display = rowContainsText ? '' : 'none';
        });
    });
}

// =========================================
// DROPDOWN & NOTIFICATION LOGIC
// =========================================
function toggleDropdown(id) {
    document.getElementById(id).classList.toggle('show');
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
// PROFILE SYNCHRONIZATION LOGIC (Connected to DB)
// =========================================
let localProfileData = {};

async function loadUserProfileData() {
    try {
        // අලුත් PHP ෆයිල් එකෙන් දත්ත ඉල්ලනවා
        const response = await fetch('php/get_admin_profile.php');
        const result = await response.json();

        // කවුරුහරි හොරෙන් ලොග් වෙන්න හැදුවොත් කෙලින්ම ලොගින් පිටුවට විසි කරනවා
        if (result.status === "error") {
            window.location.href = "admin-login.html";
            return;
        }

        // ඩේටාබේස් එකෙන් ආපු දත්ත අපේ localProfileData එකට දාගන්නවා
        localProfileData = result.data;

        // තිරයේ තියෙන අදාළ කොටු වලට ඇත්තම දත්ත යවනවා
        const headerName = document.getElementById('header-profile-name');
        const headerImg = document.getElementById('header-profile-img');
        const settingsName = document.getElementById('profile-name-input');
        const settingsEmail = document.getElementById('profile-email-input');
        const settingsPreview = document.getElementById('settings-profile-preview');
        const settingsId = document.getElementById('settings-profile-id');

        if (headerName) headerName.textContent = localProfileData.name;
        if (headerImg) headerImg.src = localProfileData.avatar;
        if (settingsName) settingsName.value = localProfileData.name;
        if (settingsEmail) settingsEmail.value = localProfileData.email;
        if (settingsPreview) settingsPreview.src = localProfileData.avatar;
        if (settingsId) settingsId.textContent = localProfileData.id;
        
    } catch (error) {
        console.error("Error loading profile data:", error);
    }
}

function saveProfileChanges() {
    const nameInput = document.getElementById('profile-name-input');
    const emailInput = document.getElementById('profile-email-input');
    const imgInput = document.getElementById('profile-img-input');
    const headerName = document.getElementById('header-profile-name');
    const headerImg = document.getElementById('header-profile-img');
    const settingsPreview = document.getElementById('settings-profile-preview');

    if (nameInput && nameInput.value.trim() !== "") {
        localProfileData.name = nameInput.value.trim();
        if(headerName) headerName.textContent = localProfileData.name;
    }

    if (emailInput && emailInput.value.trim() !== "") {
        const emailValue = emailInput.value.trim();
        if (!emailValue.includes('@') || !emailValue.includes('.')) {
            alert("Professional Error: Please enter a valid email address!");
            return;
        }
        localProfileData.email = emailValue;
    }

    if (imgInput && imgInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            localProfileData.avatar = e.target.result;
            if(headerImg) headerImg.src = localProfileData.avatar;
            if(settingsPreview) settingsPreview.src = localProfileData.avatar;
        };
        reader.readAsDataURL(imgInput.files[0]);
    }
    alert("Profile configurations updated locally! (DB update pending)");
}

function openProfileAuthModal() {
    document.getElementById('profile-auth-password').value = '';
    document.getElementById('profile-auth-error').style.display = 'none';
    document.getElementById('profile-auth-modal').style.display = 'flex';
}
function closeProfileAuthModal() { document.getElementById('profile-auth-modal').style.display = 'none'; }

function confirmProfileAuth() {
    const passInput = document.getElementById('profile-auth-password').value;
    if (passInput === "admin123") {
        closeProfileAuthModal();
        saveProfileChanges(); 
    } else {
        document.getElementById('profile-auth-error').style.display = 'block';
    }
}

// =========================================
// MULTI-STEP DYNAMIC PASSWORD CHANGE LOGIC
// =========================================
function startPasswordChange() {
    document.getElementById('pw-step-0').style.display = 'none';
    document.getElementById('pw-step-1').style.display = 'block';
    document.getElementById('pw-current').value = '';
}

function verifyCurrentPassword() {
    const currentPw = document.getElementById('pw-current').value.trim();
    if (currentPw === "") {
        alert("Please enter your current password!");
        return;
    }
    
    if (currentPw === "admin123") {
        document.getElementById('pw-step-1').style.display = 'none';
        document.getElementById('pw-step-2').style.display = 'block';
        document.getElementById('pw-new').value = '';
        document.getElementById('pw-confirm').value = '';
    } else {
        alert("Incorrect current password! Please try again or use 'Forgot Password'.");
    }
}

function confirmUpdatePassword() {
    const newPw = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;

    if (newPw === "" || confirmPw === "") {
        alert("Please fill in both password fields!");
        return;
    }

    if (newPw !== confirmPw) {
        alert("New password and confirm password do not match!");
        return;
    }

    document.getElementById('pw-success-modal').style.display = 'flex';
}

function cancelPasswordChange() {
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'none';
    document.getElementById('pw-step-0').style.display = 'block';
}

function closePwSuccess() {
    document.getElementById('pw-success-modal').style.display = 'none';
    cancelPasswordChange();
}

// =========================================
// DANGER ZONE: TRANSFER & DELETE ACCOUNT
// =========================================
let isOwnershipTransferred = false;

function executeOwnershipTransfer() {
    const selector = document.getElementById('transfer-officer-select');
    if (!selector || selector.value === "") {
        alert("Please select an active library officer to delegate ownership!");
        return;
    }
    isOwnershipTransferred = true;
    const deleteBtn = document.getElementById('btn-delete-account');
    if (deleteBtn) {
        deleteBtn.style.opacity = "1";
        deleteBtn.style.cursor = "pointer";
    }
    alert(`Administration ownership rights successfully migrated to ${selector.value}! Delete Account option active.`);
}

function executeAccountDeletion() {
    if (!isOwnershipTransferred) {
        alert("Action Denied: Please transfer ownership first!");
        return;
    }
    if (confirm("CRITICAL WARNING: Are you sure you want to permanently erase your Head Admin account?")) {
        alert("Account purged successfully. Redirecting to landing portal...");
        window.location.href = "index.html";
    }
}

// =========================================
// LOCAL STORAGE & DATA BACKUP SIMULATION
// =========================================
function getStoredBooks() {
    try {
        const stored = localStorage.getItem('libraryBooks');
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
}
function saveStoredBooks(books) { localStorage.setItem('libraryBooks', JSON.stringify(books)); }

function downloadDatabaseBackup() {
    const books = getStoredBooks();
    const backupObj = {
        exportedAt: new Date().toISOString(),
        systemInventory: books,
        metaLogs: { totalMembers: 1250, activeStaff: 12 }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "Smart_Library_Backup.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}

// =========================================
// BOOK CIRCULATION (ISSUE, ACTIVE BORROWINGS & RETURNS)
// =========================================
let activeBorrowings = [
    { bookId: "nov01-r1", title: "Madol Doova", studentId: "STU-001", studentName: "Saman Perera", phone: "0771234567", issueDate: "2026-06-15" }
];

let pendingReturns = [
    { bookId: "sci02-r2", title: "Brief History of Time", studentId: "STU-002", studentName: "Kumari Fernando", phone: "0719876543", issueDate: "2026-05-20", returnDate: "2026-06-18" }
];

function renderBorrowings() {
    const tbody = document.getElementById('borrowings-body');
    if(!tbody) return;
    
    const prefDays = parseInt(document.getElementById('pref-days').value) || 14;
    const prefFine = parseInt(document.getElementById('pref-fine').value) || 20;
    const today = new Date("2026-06-18"); 

    tbody.innerHTML = activeBorrowings.map(b => {
        const iDate = new Date(b.issueDate);
        const diffTime = Math.abs(today - iDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        let daysLeft = 0; let overdueDays = 0; let fine = 0;
        let rowClass = ""; let leftBadge = ""; let overBadge = "";

        if (diffDays <= prefDays) {
            daysLeft = prefDays - diffDays;
            leftBadge = `<span class="timer-badge timer-safe">${daysLeft} Days</span>`;
            overBadge = `<span class="timer-badge timer-neutral">0 Days</span>`;
        } else {
            overdueDays = diffDays - prefDays;
            fine = overdueDays * prefFine; 
            rowClass = "overdue-row"; 
            leftBadge = `<span class="timer-badge timer-danger">Expired</span>`;
            overBadge = `<span class="timer-badge timer-danger">+${overdueDays} Days</span>`;
        }

        return `<tr class="${rowClass}">
            <td>${b.title}</td>
            <td><strong>${b.bookId}</strong></td>
            <td>${b.studentName}</td>
            <td>${leftBadge}</td>
            <td>${overBadge}</td>
            <td style="font-weight:bold; color:${fine > 0 ? '#dc2626' : '#0f172a'}">Rs. ${fine}.00</td>
            <td>${b.phone}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;">No active borrowings found.</td></tr>';
}

function issueNewBook() {
    const sId = document.getElementById('issue-student-id').value.trim();
    const bId = document.getElementById('issue-book-id').value.trim();
    if(!sId || !bId) { alert("Please enter both Student ID and Book ID."); return; }
    
    const todayStr = new Date("2026-06-18").toISOString().split('T')[0];
    activeBorrowings.unshift({ 
        bookId: bId, title: "Scanned Issued Book", studentId: sId, studentName: "Student " + sId, phone: "07XXXXXXXX", issueDate: todayStr 
    });
    renderBorrowings(); 
    alert(`Success! Book ${bId} officially issued to Student ${sId}.`);
    document.getElementById('issue-student-id').value = '';
    document.getElementById('issue-book-id').value = '';
    showSection('active-borrowings');
}

function renderReturns() {
    const tbody = document.getElementById('returns-body');
    if(!tbody) return;

    const prefDays = parseInt(document.getElementById('pref-days').value) || 14;
    const prefFine = parseInt(document.getElementById('pref-fine').value) || 20;

    tbody.innerHTML = pendingReturns.map(b => {
        const iDate = new Date(b.issueDate);
        const rDate = new Date(b.returnDate);
        const diffDays = Math.ceil(Math.abs(rDate - iDate) / (1000 * 60 * 60 * 24));

        let overdueDays = 0; let fine = 0;
        let fineBadge = `<span class="status-badge" style="background:#dcfce7; color:#166534;">No Fine</span>`;

        if (diffDays > prefDays) {
            overdueDays = diffDays - prefDays;
            fine = overdueDays * prefFine;
            fineBadge = `<span class="status-badge" style="background:#fee2e2; color:#dc2626;">Overdue ${overdueDays} Days<br>Fine: Rs.${fine}.00</span>`;
        }

        return `<tr>
            <td>${b.studentName} <br><small>${b.studentId}</small></td>
            <td>${b.title} <br><small>${b.bookId}</small></td>
            <td>${b.returnDate}</td>
            <td>${fineBadge}</td>
            <td><span class="status-badge" style="background: #fef08a; color: #854d0e;">IoT Pending</span></td>
            <td>
                <button class="btn-approve" onclick="confirmReturn('${b.bookId}', ${overdueDays}, ${fine})">✔ Confirm</button>
                <button class="btn-danger" onclick="rejectReturn('${b.bookId}')">✖ Reject</button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;">No pending returns.</td></tr>';
}

function confirmReturn(bookId, overdueDays, fine) {
    let msg = `System Notification:\nBook successfully confirmed as returned!\n\nBook ID: ${bookId}`;
    if(fine > 0) msg += `\n⚠️ Overdue: ${overdueDays} Days Late\n💰 Fine Collected: Rs. ${fine}.00`;
    else msg += `\n✅ Status: Returned on time. No fines.`;
    
    alert(msg);
    pendingReturns = pendingReturns.filter(b => b.bookId !== bookId);
    activeBorrowings = activeBorrowings.filter(b => b.bookId !== bookId);
    renderReturns(); renderBorrowings();
}

function rejectReturn(bookId) {
    if(confirm("Are you sure you want to reject this IoT return?")) {
        pendingReturns = pendingReturns.filter(b => b.bookId !== bookId);
        renderReturns();
    }
}

// =========================================
// RFID ASSIGNMENT LOGIC (STUDENTS, BOOKS, RACKS)
// =========================================
let currentRfidTarget = { id: '', type: '' };
let systemRacks = [
    { id: "RCK-001", name: "Novel Section - Rack 01", rfid: "Not Assigned" }
];

function openRfidModal(targetId, targetName, targetType) {
    currentRfidTarget = { id: targetId, type: targetType };
    document.getElementById('rfid-modal-title').textContent = `Assign RFID: ${targetType}`;
    document.getElementById('rfid-modal-text').textContent = `Please tap the card to link with ${targetName} (${targetId}).`;
    
    const scanInput = document.getElementById('rfid-scanner-input');
    scanInput.value = ''; 
    document.getElementById('rfid-modal').style.display = 'flex';
    
    setTimeout(() => { scanInput.focus(); }, 100);
}

function closeRfidModal() { document.getElementById('rfid-modal').style.display = 'none'; }

function saveRfidData() {
    const scannedCode = document.getElementById('rfid-scanner-input').value.trim();
    if (!scannedCode) { alert("Warning: No RFID detected!"); return; }

    if (currentRfidTarget.type === 'Student') {
        alert(`Success! RFID [${scannedCode}] linked to Student [${currentRfidTarget.id}].`);
    } else if (currentRfidTarget.type === 'Book') {
        alert(`Success! RFID [${scannedCode}] linked to Book [${currentRfidTarget.id}].`);
    } else if (currentRfidTarget.type === 'Rack') {
        const rack = systemRacks.find(r => r.id === currentRfidTarget.id);
        if(rack) { rack.rfid = scannedCode; renderRacks(); }
        alert(`Success! RFID [${scannedCode}] linked to Rack [${currentRfidTarget.id}].`);
    }
    closeRfidModal();
}

function renderRacks() {
    const tbody = document.getElementById('racks-body');
    if(!tbody) return;
    tbody.innerHTML = systemRacks.map(r => `
        <tr>
            <td><strong>${r.id}</strong></td>
            <td>${r.name}</td>
            <td style="color:${r.rfid === 'Not Assigned' ? '#ef4444' : '#10b981'}; font-weight:bold;">${r.rfid}</td>
            <td><button class="btn-save" onclick="openRfidModal('${r.id}', '${r.name}', 'Rack')">Write RFID</button></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;">No racks registered.</td></tr>';
}

function addNewRack() {
    const nameInput = document.getElementById('rack-name-input').value.trim();
    if(!nameInput) { alert("Please enter a valid Rack Name."); return; }
    const newId = "RCK-" + String(systemRacks.length + 1).padStart(3, '0');
    systemRacks.push({ id: newId, name: nameInput, rfid: "Not Assigned" });
    renderRacks();
    document.getElementById('rack-name-input').value = '';
}

// =========================================
// BOOK MANAGEMENT & RENDERING
// =========================================
function getCategoryCode(cat) {
    const map = { novel: 'nov', science: 'sci', history: 'his', education: 'edu' };
    return map[cat] || cat.substring(0, 3).toLowerCase();
}
function generateBookId(cat, rack) {
    if (!cat || !rack) return '';
    const code = getCategoryCode(cat);
    const books = getStoredBooks();
    const matching = books.filter(b => b.category === cat && b.rack.toLowerCase() === rack.toLowerCase());
    const maxIndex = matching.reduce((max, current) => {
        const match = current.bookId.match(/(\d{2,})$/);
        if (!match) return max;
        return Math.max(max, Number(match[1]));
    }, 0);
    return `${code}${String(maxIndex + 1).padStart(2, '0')}-${rack}`;
}
function updateBookIdPreview() {
    const cat = document.getElementById('book-category').value;
    const rack = document.getElementById('book-rack').value.trim();
    document.getElementById('book-id').value = generateBookId(cat, rack);
}

function renderTables() {
    const books = getStoredBooks();
    const invBody = document.querySelector('#book-inventory-table tbody');
    if (invBody) {
        invBody.innerHTML = books.map(b => `
            <tr>
                <td>${b.cover ? `<img src="${b.cover}" class="book-cover-thumb">` : 'No Image'}</td>
                <td>${b.bookId}</td>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td>${b.category}</td>
                <td>${b.rack}</td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;">No books stored yet.</td></tr>';
    }

    const rfidBody = document.getElementById('books-rfid-body');
    if (rfidBody) {
        rfidBody.innerHTML = books.map(b => `
            <tr>
                <td>${b.title}</td>
                <td>${b.bookId}</td>
                <td><button class="btn-save" onclick="openRfidModal('${b.bookId}', '${b.title.replace(/'/g, "\\'")}', 'Book')">Write RFID</button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;">No books available.</td></tr>';
    }

    const removeBody = document.getElementById('remove-book-body');
    const removeCatFilter = document.getElementById('remove-book-category');
    if (removeBody && removeCatFilter) {
        const filterVal = removeCatFilter.value;
        let filteredBooks = books;
        if (filterVal !== 'all') filteredBooks = books.filter(b => b.category === filterVal);

        removeBody.innerHTML = filteredBooks.map(b => `
            <tr>
                <td>${b.cover ? `<img src="${b.cover}" class="book-cover-thumb">` : 'No Image'}</td>
                <td style="font-weight:bold;">${b.bookId}</td>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td><button class="btn-danger" onclick="confirmDeleteBook('${b.bookId}', '${b.title.replace(/'/g, "\\'")}')">✖ Remove</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No books available.</td></tr>';
    }
}

function addNewBook() {
    const titleIn = document.getElementById('book-title');
    const authorIn = document.getElementById('book-author');
    const catIn = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    const coverIn = document.getElementById('book-cover');
    const idIn = document.getElementById('book-id');

    if (!titleIn.value.trim() || !authorIn.value.trim() || !catIn.value || !rackIn.value.trim()) {
        alert("Please fill all necessary fields."); return;
    }

    const saveAction = (coverData) => {
        const books = getStoredBooks();
        books.push({ bookId: idIn.value, title: titleIn.value.trim(), author: authorIn.value.trim(), category: catIn.value, rack: rackIn.value.trim(), cover: coverData });
        saveStoredBooks(books); renderTables();
        titleIn.value = ''; authorIn.value = ''; catIn.value = ''; rackIn.value = ''; idIn.value = ''; coverIn.value = '';
        alert("Book successfully added!");
    };

    if (coverIn.files[0]) {
        const reader = new FileReader(); reader.onload = () => saveAction(reader.result); reader.readAsDataURL(coverIn.files[0]);
    } else saveAction(null);
}

function confirmDeleteBook(id, title) {
    if (confirm(`Are you sure you want to delete:\n"${title}"?`)) {
        let books = getStoredBooks().filter(b => b.bookId !== id);
        saveStoredBooks(books); renderTables(); alert("Book removed successfully!");
    }
}

function openDeleteModal() { document.getElementById('delete-modal').style.display = 'flex'; }
function closeDeleteModal() { document.getElementById('delete-modal').style.display = 'none'; }
function openPasswordModal() { document.getElementById('password-modal').style.display = 'flex'; }
function closePasswordModal() { document.getElementById('password-modal').style.display = 'none'; }
function confirmPasswordChange() { alert("Temporary password changed!"); closePasswordModal(); }

// =========================================
// INITIALIZATION 
// =========================================
window.addEventListener('DOMContentLoaded', function() {
    loadUserProfileData(); 

    const catSel = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    const addBtn = document.getElementById('book-add-button');
    const removeCatFilter = document.getElementById('remove-book-category');

    if (catSel) catSel.addEventListener('change', updateBookIdPreview);
    if (rackIn) rackIn.addEventListener('input', updateBookIdPreview);
    if (addBtn) addBtn.addEventListener('click', addNewBook);
    if (removeCatFilter) removeCatFilter.addEventListener('change', renderTables);

    renderTables(); renderBorrowings(); renderReturns(); renderRacks();
});
// =========================================
// STUDENT MANAGEMENT DYNAMIC LOGIC
// =========================================

async function fetchPendingStudents() {
    try {
        const response = await fetch('php/get_pending_students.php');
        const data = await response.json();
        const tbody = document.getElementById('pending-students-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(student => {
                const tr = document.createElement('tr');
                let proofLink = student.proof_doc ? `<a href="${student.proof_doc}" target="_blank" class="btn-proof" style="text-decoration:none; padding:5px; background:#e2e8f0; color:#334155; border-radius:4px;">View ID / Proof</a>` : 'No Document';
                
                tr.innerHTML = `
                    <td>${student.full_name}</td>
                    <td>${student.email}</td>
                    <td>${proofLink}</td>
                    <td>
                        <button class="btn-approve" onclick="approveStudent('${student.student_id}')">✔ Approve</button>
                        <button class="btn-danger" onclick="rejectStudent('${student.student_id}')">✖ Reject</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending registrations found.</td></tr>';
        }
    } catch (e) {
        console.error("Error fetching pending students", e);
    }
}

async function fetchAllStudents() {
    try {
        const response = await fetch('php/get_all_students.php');
        const data = await response.json();
        
        const allTbody = document.getElementById('all-students-body');
        const removeTbody = document.getElementById('remove-students-body');
        
        if(allTbody) allTbody.innerHTML = '';
        if(removeTbody) removeTbody.innerHTML = '';

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(student => {
                const pic = student.profile_pic ? student.profile_pic : 'static/chamod.png';
                
                // For View All
                if(allTbody) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><div class="student-profile"><img src="${pic}" alt="Student" class="student-avatar"/><span class="student-id">${student.student_id}</span></div></td>
                        <td>${student.full_name}</td>
                        <td>${student.email}</td>
                        <td><span class="status-badge active">${student.status}</span></td>
                    `;
                    allTbody.appendChild(tr);
                }

                // For Remove
                if(removeTbody) {
                    const tr2 = document.createElement('tr');
                    tr2.innerHTML = `
                        <td><div class="student-profile"><img src="${pic}" alt="Student" class="student-avatar"/><span class="student-id">${student.student_id}</span></div></td>
                        <td>${student.full_name}</td>
                        <td>${student.email}</td>
                        <td><button class="btn-danger" onclick="rejectStudent('${student.student_id}')">Remove</button></td>
                    `;
                    removeTbody.appendChild(tr2);
                }
            });
        } else {
             if(allTbody) allTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
             if(removeTbody) removeTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
        }
    } catch (e) {
        console.error("Error fetching all students", e);
    }
}

async function approveStudent(studentId) {
    if(!confirm("Are you sure you want to approve " + studentId + "?")) return;
    try {
        const response = await fetch('php/approve_student.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId })
        });
        const result = await response.json();
        alert(result.message);
        if(result.status === 'success') {
            fetchPendingStudents();
            fetchAllStudents();
        }
    } catch(e) {
        console.error(e);
    }
}

async function rejectStudent(studentId) {
    if(!confirm("Are you sure you want to remove " + studentId + "?")) return;
    try {
        const response = await fetch('php/remove_student.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId })
        });
        const result = await response.json();
        alert(result.message);
        if(result.status === 'success') {
            fetchPendingStudents();
            fetchAllStudents();
        }
    } catch(e) {
        console.error(e);
    }
}

// =========================================
// PHASE 2: ADMIN DYNAMIC LOGIC
// =========================================

async function fetchDashboardStats() {
    try {
        const response = await fetch('php/get_dashboard_stats.php');
        const data = await response.json();
        if(data.status === 'success') {
            document.getElementById('stat-total-members').innerText = "Total Members: " + data.data.total_members;
            document.getElementById('stat-pending-approvals').innerText = "Pending Approvals: " + data.data.pending_approvals;
            document.getElementById('stat-total-books').innerText = "Total Books: " + data.data.total_books;
            document.getElementById('stat-books-issued').innerText = "Books Issued: " + data.data.books_issued;
        }
    } catch (e) {
        console.error("Error fetching dashboard stats", e);
    }
}

async function fetchActiveBorrowings() {
    try {
        const response = await fetch('php/get_active_borrowings.php');
        const data = await response.json();
        const tbody = document.getElementById('borrowings-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${b.title}</td>
                    <td><strong>${b.book_id}</strong></td>
                    <td>${b.student_name}</td>
                    <td>${b.days_left >= 0 ? `<span class="timer-badge timer-safe">${b.days_left} Days Left</span>` : `<span class="timer-badge" style="background:#fee2e2; color:#ef4444;">Overdue</span>`}</td>
                    <td>${b.overdue_days} Days</td>
                    <td class="fine-text">Rs. ${b.fine.toFixed(2)}</td>
                    <td>${b.phone}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No active borrowings found.</td></tr>';
        }
    } catch (e) {
        console.error("Error fetching borrowings", e);
    }
}

async function issueNewBook() {
    const studentId = document.getElementById('issue-student-id').value.trim();
    const bookId = document.getElementById('issue-book-id').value.trim();
    
    if(!studentId || !bookId) {
        alert("Please enter both Student ID and Book ID.");
        return;
    }
    
    try {
        const response = await fetch('php/issue_book.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, book_id: bookId })
        });
        const result = await response.json();
        alert(result.message);
        if(result.status === 'success') {
            document.getElementById('issue-student-id').value = '';
            document.getElementById('issue-book-id').value = '';
            fetchDashboardStats();
            fetchActiveBorrowings();
        }
    } catch(e) {
        console.error(e);
    }
}

// Hook into showSection for Phase 2
const originalShowSectionPhase2 = showSection;
showSection = function(sectionId) {
    originalShowSectionPhase2(sectionId);
    if(sectionId === 'home') {
        fetchDashboardStats();
    } else if (sectionId === 'active-borrowings') {
        fetchActiveBorrowings();
    }
}

// Fetch stats on load
window.addEventListener('DOMContentLoaded', () => {
    fetchDashboardStats();
});

// =========================================
// PHASE 5: ADMIN RESERVATIONS
// =========================================
async function fetchAdminReservations() {
    try {
        const response = await fetch('php/get_admin_reservations.php');
        const data = await response.json();
        const tbody = document.getElementById('admin-reservations-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(r => {
                const tr = document.createElement('tr');
                const badge = r.status === 'Pending' ? `<span class="status-badge" style="background: #fef08a; color: #854d0e;">Pending</span>` : `<span class="status-badge active">Approved</span>`;
                const actionBtns = r.status === 'Pending' ? `
                    <button class="btn-approve" onclick="approveReservation(${r.id})">✔ Approve</button>
                    <button class="btn-danger" onclick="cancelAdminReservation(${r.id})">✖ Cancel</button>
                ` : `<span style="color:#64748b;">Ready for Pickup</span>`;
                tr.innerHTML = `
                    <td>${r.full_name} <br><small style="color: #64748b; font-weight: bold;">${r.student_id}</small></td>
                    <td>${r.title}</td>
                    <td>${r.request_date}</td>
                    <td>${badge}</td>
                    <td>${actionBtns}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No reservations found.</td></tr>';
        }
    } catch(e) { console.error(e); }
}

async function approveReservation(resId) {
    if(!confirm('Approve this reservation? The book will be marked as Ready for Pickup.')) return;
    try {
        const response = await fetch('php/approve_reservation.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reservation_id: resId})
        });
        const res = await response.json();
        if(res.status === 'success') {
            alert(res.message);
            fetchAdminReservations();
        } else {
            alert(res.message);
        }
    } catch(e) { console.error(e); }
}

async function cancelAdminReservation(resId) {
    if(!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
        const response = await fetch('php/cancel_reservation.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reservation_id: resId})
        });
        const res = await response.json();
        if(res.status === 'success') {
            alert("Reservation cancelled successfully.");
            fetchAdminReservations();
        } else {
            alert(res.message);
        }
    } catch(e) { console.error(e); }
}

// Hook into Admin showSection
const originalAdminShowSectionPhase5 = showSection;
showSection = function(sectionId) {
    if(typeof originalAdminShowSectionPhase5 === 'function') {
        originalAdminShowSectionPhase5(sectionId);
    }
    
    if(sectionId === 'book-reservations') {
        fetchAdminReservations();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAdminReservations();
});

// =========================================
// FETCH ADMIN BOOKS LIST
// =========================================
async function fetchAdminBooks() {
    try {
        const response = await fetch('php/get_books.php');
        const data = await response.json();
        const tbody = document.getElementById('remove-book-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(book => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><img src="${book.cover_img}" width="40" height="60" style="border-radius: 4px; object-fit: cover;"></td>
                    <td><strong>${book.book_id}</strong></td>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>
                        <button class="btn-danger-sm" onclick="alert('Delete book feature coming soon!')">Remove</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No books found.</td></tr>';
        }
    } catch(e) { console.error(e); }
}

const originalAdminShowSectionPhase5_2 = showSection;
showSection = function(sectionId) {
    if(typeof originalAdminShowSectionPhase5_2 === 'function') {
        originalAdminShowSectionPhase5_2(sectionId);
    }
    
    if(sectionId === 'remove-book') {
        fetchAdminBooks();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // If the remove book section is visible by default (it's usually hidden), fetch books.
    // We'll fetch it just in case.
    fetchAdminBooks();
});
