// ==========================================
// 🧭 UI Layout, Sidebar Toggle & Navigation
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Sidebar Toggle Animation Logic
    const menuBtn = document.getElementById('menu-btn');
    const container = document.querySelector('.dashboard-container');

    if (menuBtn && container) {
        menuBtn.addEventListener('click', function() {
            container.classList.toggle('sidebar-collapsed');
        });
    }

    // 2. Initialize Search & Filters
    initializeSearchAndFilters();
    
    // 3. Initialize File Upload listener
    initializeProfilePictureListener();

    // 4. Start Countdown Timer for Home Page
    startReturnTimer();

    // 5. ඩේටාබේස් එකෙන් ප්‍රොෆයිල් දත්ත ගෙන ඒම
    loadStudentProfileData();
});

// Navigation controller
function showSection(sectionId) {
    document.querySelectorAll('.dynamic-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if(target) target.style.display = 'block';

    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if(window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

function toggleDropdown(id) {
    document.getElementById(id).classList.toggle('show');
}

// ==========================================
// ⏳ Home Page Countdown Timer Logic
// ==========================================
function startReturnTimer() {
    const timerElement = document.getElementById('return-timer');
    if (!timerElement) return;

    // Demo deadline: 7 days from now
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    setInterval(() => {
        const now = new Date();
        const diff = deadline - now;

        if (diff <= 0) {
            timerElement.innerText = "OVERDUE!";
            timerElement.style.color = "#EF4444";
            timerElement.style.background = "#FEE2E2";
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);

        // Format to always show 2 digits (e.g., 05m 09s)
        const format = (num) => num.toString().padStart(2, '0');

        timerElement.innerText = `${d}d : ${format(h)}h : ${format(m)}m : ${format(s)}s`;
    }, 1000);
}

// ==========================================
// 🔍 Search & Category Filter Logic
// ==========================================
function initializeSearchAndFilters() {
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const bookCards = document.querySelectorAll('.book-card');
            if(searchTerm.length > 0) { showSection('browse-books'); }
            bookCards.forEach(card => {
                const title = card.querySelector('.book-title').textContent.toLowerCase();
                const author = card.querySelector('.author').textContent.toLowerCase();
                if (title.includes(searchTerm) || author.includes(searchTerm)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    const catButtons = document.querySelectorAll('.cat-btn');
    catButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            catButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filterValue = this.getAttribute('data-filter');
            const bookCards = document.querySelectorAll('.book-card');
            bookCards.forEach(card => {
                if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// ==========================================
// 🙎‍♂️ Profile Management (Connected to DB)
// ==========================================
let localStudentData = {};

async function loadStudentProfileData() {
    try {
        const response = await fetch('php/get_student_profile.php');
        const result = await response.json();

        if (result.status === "error") {
            window.location.href = "student-login.html";
            return;
        }

        localStudentData = result.data;

        // Header එකේ දත්ත පිරවීම
        const headerName = document.getElementById('header-profile-name');
        const headerImg = document.getElementById('header-profile-img');
        if (headerName) headerName.textContent = localStudentData.name;
        if (headerImg) headerImg.src = localStudentData.avatar;

        // Settings Profile ටැබ් එකේ දත්ත පිරවීම
        const dispName = document.getElementById('disp-name');
        const dispEmail = document.getElementById('disp-email');
        const dispPhone = document.getElementById('disp-phone');
        const dispDob = document.getElementById('disp-dob');
        const profilePreview = document.getElementById('settings-profile-preview'); // මේ අයිඩී එක HTML එකේ තියෙනවද බලන්න

        if (dispName) dispName.textContent = localStudentData.name;
        if (dispEmail) dispEmail.textContent = localStudentData.email;
        if (dispPhone) dispPhone.textContent = localStudentData.phone;
        if (dispDob) dispDob.textContent = localStudentData.dob;
        if (profilePreview) profilePreview.src = localStudentData.avatar;

    } catch (error) {
        console.error("Error loading student profile data:", error);
    }
}

function triggerProfilePictureUpload() {
    const wrapper = document.getElementById('profile-picture-container');
    const fileInput = document.getElementById('profile-upload-input');
    
    if (wrapper.classList.contains('editable') && fileInput) {
        fileInput.click();
    }
}

function initializeProfilePictureListener() {
    const fileInput = document.getElementById('profile-upload-input');
    const settingsPreview = document.getElementById('settings-profile-preview');
    const headerImg = document.getElementById('header-profile-img');

    if (fileInput && settingsPreview && headerImg) {
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    settingsPreview.src = event.target.result;
                    headerImg.src = event.target.result;
                    alert("Preview updated! (Local only. Database update pending).");
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
}

function showProfileEdit() {
    document.getElementById('edit-name').value = document.getElementById('disp-name').innerText;
    document.getElementById('edit-email').value = document.getElementById('disp-email').innerText;
    document.getElementById('edit-phone').value = document.getElementById('disp-phone').innerText;
    document.getElementById('edit-dob').value = document.getElementById('disp-dob').innerText;

    document.getElementById('profile-picture-container').classList.add('editable');

    document.getElementById('profile-view-state').style.display = 'none';
    document.getElementById('profile-edit-state').style.display = 'block';
    document.getElementById('profile-auth-state').style.display = 'none';
}

function cancelProfileEdit() {
    document.getElementById('profile-picture-container').classList.remove('editable');

    document.getElementById('profile-edit-state').style.display = 'none';
    document.getElementById('profile-view-state').style.display = 'block';
}

function showProfileAuth() {
    document.getElementById('profile-edit-state').style.display = 'none';
    document.getElementById('profile-auth-state').style.display = 'block';
    document.getElementById('auth-password').value = '';
}

function cancelProfileAuth() {
    document.getElementById('profile-auth-state').style.display = 'none';
    document.getElementById('profile-edit-state').style.display = 'block';
}

function saveProfileChanges() {
    const pw = document.getElementById('auth-password').value;
    if(pw.trim() === '') {
        alert('Please enter your current password to save changes!');
        return;
    }
    
    // දැනට මේක UI එකේ විතරක් වෙනස් වෙනවා (පස්සේ මේකත් PHP වලින් DB එකට යවමු)
    document.getElementById('profile-picture-container').classList.remove('editable');

    document.getElementById('disp-name').innerText = document.getElementById('edit-name').value;
    document.getElementById('disp-email').innerText = document.getElementById('edit-email').value;
    document.getElementById('disp-phone').innerText = document.getElementById('edit-phone').value;
    document.getElementById('disp-dob').innerText = document.getElementById('edit-dob').value;
    document.getElementById('header-profile-name').innerText = document.getElementById('edit-name').value;

    alert('Profile updated temporarily! (Database save pending)');
    document.getElementById('profile-auth-state').style.display = 'none';
    document.getElementById('profile-view-state').style.display = 'block';
}

// ==========================================
// 🔑 Change Security Password Logic
// ==========================================
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
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'block';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
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
    alert("Password Changed Successfully! (Pending Database Update)");
    cancelPasswordChange();
}

function cancelPasswordChange() {
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'none';
    document.getElementById('pw-step-0').style.display = 'block';
}
// =========================================
// PHASE 2 & 5: STUDENT DYNAMIC LOGIC
// =========================================

async function fetchBooks() {
    try {
        const response = await fetch('php/get_books.php');
        const data = await response.json();
        const grid = document.getElementById('student-books-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(book => {
                const isAvail = book.status === 'Available';
                const badge = isAvail ? `<span class="status-badge active">Available</span>` : `<span class="status-badge borrowed">${book.status}</span>`;
                const btn = isAvail ? `<button class="btn-action btn-reserve" onclick="reserveBook('${book.book_id}')">Reserve Book</button>` : `<button class="btn-action btn-disabled" disabled>Not Available</button>`;
                
                const card = document.createElement('div');
                card.className = 'book-card';
                card.setAttribute('data-category', book.category.toLowerCase());
                
                card.innerHTML = `
                    <div class="book-cover-placeholder" style="background-image: url('${book.cover_img}'); background-size: cover; background-position: center; color: transparent;">Book</div>
                    <div class="book-details">
                        <h4 class="book-title">${book.title}</h4>
                        <p class="author">${book.author}</p>
                        <p class="category">Category: ${book.category}</p>
                        ${badge}
                        ${btn}
                    </div>
                `;
                grid.appendChild(card);
            });
            if (window.filterCatalog) window.filterCatalog();
        }
    } catch(e) {
        console.error("Error fetching books", e);
    }
}

async function fetchStudentBorrowings() {
    try {
        const response = await fetch('php/get_student_borrowings.php');
        const data = await response.json();
        
        const tbody = document.getElementById('student-active-borrowings');
        const list = document.getElementById('student-borrowed-list');
        const overdueDaysElem = document.getElementById('student-overdue-days');
        const totalFineElem = document.getElementById('student-total-fine');
        
        if(tbody) tbody.innerHTML = '';
        if(list) list.innerHTML = '';
        
        if(data.status === 'success') {
            if(overdueDaysElem) overdueDaysElem.innerText = data.max_overdue_days + " Days";
            if(totalFineElem) totalFineElem.innerText = "Rs. " + data.total_fine.toFixed(2);
            
            if(data.data.length > 0) {
                let counter = 1;
                data.data.forEach(b => {
                    if(tbody) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${b.title}</td>
                            <td><strong>${b.book_id}</strong></td>
                            <td>${b.issue_date}</td>
                            <td>${b.days_left >= 0 ? `<span class="timer-badge timer-safe">${b.days_left} Days Left</span>` : `<span class="timer-badge" style="background:#fee2e2; color:#ef4444;">Overdue</span>`}</td>
                            <td class="fine-text">Rs. ${b.fine.toFixed(2)}</td>
                        `;
                        tbody.appendChild(tr);
                    }
                    if(list) {
                        list.innerHTML += `<p>${counter}. ${b.title}</p>`;
                    }
                    counter++;
                });
            } else {
                if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No active borrowings found.</td></tr>';
                if(list) list.innerHTML = '<p>No books borrowed this week.</p>';
            }
        }
    } catch(e) {
        console.error("Error fetching student borrowings", e);
    }
}

async function fetchStudentReservations() {
    try {
        const response = await fetch('php/get_student_reservations.php');
        const data = await response.json();
        const tbody = document.getElementById('student-reservations-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(r => {
                const tr = document.createElement('tr');
                const badge = r.status === 'Pending' ? `<span class="status-badge" style="background: #fef08a; color: #854d0e;">Pending</span>` : `<span class="status-badge active">Approved</span>`;
                tr.innerHTML = `
                    <td>${r.title}</td>
                    <td>${r.request_date}</td>
                    <td>${badge}</td>
                    <td><button class="btn-danger-sm" onclick="cancelReservation(${r.id})">Cancel</button></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No reservations found.</td></tr>';
        }
    } catch(e) { console.error(e); }
}

async function reserveBook(bookId) {
    if(!confirm('Are you sure you want to reserve this book?')) return;
    try {
        const response = await fetch('php/reserve_book.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({book_id: bookId})
        });
        const res = await response.json();
        if(res.status === 'success') {
            alert(res.message);
            fetchBooks();
            fetchStudentReservations();
        } else {
            alert(res.message);
        }
    } catch(e) { console.error(e); }
}

async function cancelReservation(resId) {
    if(!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
        const response = await fetch('php/cancel_reservation.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reservation_id: resId})
        });
        const res = await response.json();
        if(res.status === 'success') {
            alert(res.message);
            fetchStudentReservations();
            fetchBooks();
        } else {
            alert(res.message);
        }
    } catch(e) { console.error(e); }
}

// Hook into showSection for Phase 2 & 5
const originalShowSectionPhase2 = showSection;
showSection = function(sectionId) {
    if(typeof originalShowSectionPhase2 === 'function') {
        originalShowSectionPhase2(sectionId);
    }
    
    if(sectionId === 'home') {
        fetchStudentBorrowings();
    } else if (sectionId === 'browse-books') {
        fetchBooks();
    } else if (sectionId === 'my-borrowings') {
        fetchStudentBorrowings();
    } else if (sectionId === 'my-reservations') {
        fetchStudentReservations();
    }
}

// =========================================
// PHASE 3: SEARCH & FILTER LOGIC
// =========================================
window.filterCatalog = function() {
    const searchInput = document.getElementById('catalog-search');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const activeBtn = document.querySelector('.cat-btn.active');
    const catFilter = activeBtn ? activeBtn.getAttribute('data-filter').toLowerCase() : 'all';

    const cards = document.querySelectorAll('#student-books-grid .book-card');
    cards.forEach(card => {
        const title = card.querySelector('.book-title').innerText.toLowerCase();
        const author = card.querySelector('.author').innerText.toLowerCase();
        const category = card.getAttribute('data-category').toLowerCase();
        
        const matchesSearch = title.includes(query) || author.includes(query) || category.includes(query);
        const matchesCategory = catFilter === 'all' || category === catFilter;

        if(matchesSearch && matchesCategory) {
            card.style.display = 'flex';
            card.style.animation = 'none';
            card.offsetHeight;
            card.style.animation = 'fadeInUp 0.4s ease-out forwards';
        } else {
            card.style.display = 'none';
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    fetchStudentBorrowings();
    fetchBooks(); 
    fetchStudentReservations();

    const searchInput = document.getElementById('catalog-search');
    const catBtns = document.querySelectorAll('.cat-btn');

    if(searchInput) {
        searchInput.addEventListener('input', window.filterCatalog);
    }

    catBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            catBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            window.filterCatalog();
        });
    });
});
