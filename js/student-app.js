// ==========================================
// === Navigation and Layout ===
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menu-btn');
    const container = document.querySelector('.dashboard-container');

    if (menuBtn && container) {
        menuBtn.addEventListener('click', function() {
            container.classList.toggle('sidebar-collapsed');
        });
    }

    initializeSearchAndFilters();
    initializeProfilePictureListener();
    loadStudentProfileData();

    // Load initial data
    fetchStudentBorrowings();
    fetchBooks(); 
    fetchStudentReservations();

    const homeEl = document.getElementById('home');
    if (homeEl) showSection('home');
});

function showSection(sectionId) {
    document.querySelectorAll('.dynamic-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if(target) target.style.display = 'block';

    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if(window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }

    // Fetch data dynamically based on the active section
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

function toggleDropdown(id) {
    document.getElementById(id).classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.profile-btn') && !event.target.closest('.profile-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// ==========================================
// === Borrowing Countdown ===
// ==========================================
let countdownInterval = null;

function updateCountdownTimer(dueDates) {
    const timerElement = document.getElementById('return-timer');
    if (!timerElement) return;

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    if (!dueDates || dueDates.length === 0) {
        timerElement.innerText = "No active books";
        timerElement.style.color = "var(--text-dark)";
        timerElement.style.background = "transparent";
        return;
    }

    const closestDate = new Date(Math.min(...dueDates.map(d => new Date(d + 'T23:59:59').getTime())));

    countdownInterval = setInterval(() => {
        const now = new Date();
        const diff = closestDate - now;

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

        const format = (num) => num.toString().padStart(2, '0');
        timerElement.innerText = `${d}d : ${format(h)}h : ${format(m)}m : ${format(s)}s`;
        
        timerElement.style.color = "";
        timerElement.style.background = "";
    }, 1000);
}

// ==========================================
// === Catalog Search and Filters ===
// ==========================================
function initializeSearchAndFilters() {
    const searchInput = document.getElementById('global-search');
    const catalogSearch = document.getElementById('catalog-search');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            if(searchTerm.length > 0) { showSection('browse-books'); }
            if(catalogSearch) catalogSearch.value = searchTerm;
            window.filterCatalog();
        });
    }

    if(catalogSearch) {
        catalogSearch.addEventListener('input', window.filterCatalog);
    }

    const catButtons = document.querySelectorAll('.cat-btn');
    catButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            catButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            window.filterCatalog();
        });
    });
}

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
        } else {
            card.style.display = 'none';
        }
    });
};

// ==========================================
// === Profile Management ===
// ==========================================
let localStudentData = {};

async function loadStudentProfileData() {
    try {
        const response = await fetch('php/user_controller.php?action=get_student_profile');
        const result = await response.json();

        if (result.status === "error") {
            window.location.href = "student-login.html"; // Redirect if unauthorized
            return;
        }

        localStudentData = result.data;

        document.getElementById('header-profile-name').textContent = localStudentData.name;
        document.getElementById('header-profile-img').src = localStudentData.avatar;
        document.getElementById('disp-name').textContent = localStudentData.name;
        document.getElementById('disp-email').textContent = localStudentData.email;
        document.getElementById('disp-phone').textContent = localStudentData.phone;
        document.getElementById('disp-dob').textContent = localStudentData.dob;
        document.getElementById('settings-profile-preview').src = localStudentData.avatar;
        document.getElementById('settings-profile-id').textContent = localStudentData.id;

        const qrImage = document.getElementById('student-qr-code');
        if (qrImage && localStudentData.id) {
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${localStudentData.id}`;
            qrImage.onload = function() { qrImage.style.display = 'block'; };
        }

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

    if (fileInput && settingsPreview) {
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    settingsPreview.src = event.target.result;
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

async function saveProfileChanges() {
    const pw = document.getElementById('auth-password').value;
    if(pw.trim() === '') {
        alert('Please enter your current password to save changes!');
        return;
    }
    
    const formData = new FormData();
    formData.append('password', pw);
    formData.append('name', document.getElementById('edit-name').value);
    formData.append('email', document.getElementById('edit-email').value);
    formData.append('phone', document.getElementById('edit-phone').value);
    formData.append('dob', document.getElementById('edit-dob').value);

    const fileInput = document.getElementById('profile-upload-input');
    if(fileInput.files.length > 0) {
        formData.append('profile_pic', fileInput.files[0]);
    }

    try {
        const response = await fetch('php/user_controller.php?action=update_student_profile', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert('Profile updated successfully!');
            document.getElementById('profile-picture-container').classList.remove('editable');
            document.getElementById('profile-auth-state').style.display = 'none';
            document.getElementById('profile-view-state').style.display = 'block';
            loadStudentProfileData(); 
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('An error occurred while updating the profile. Please try again.');
    }
}

// ==========================================
// === Password Change ===
// ==========================================
function startPasswordChange() {
    document.getElementById('pw-step-0').style.display = 'none';
    document.getElementById('pw-step-1').style.display = 'block';
    document.getElementById('pw-current').value = '';
}

function verifyCurrentPassword() {
    const currentPw = document.getElementById('pw-current').value.trim();
    if (currentPw === "") { alert("Please enter your current password!"); return; }
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'block';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
}

async function confirmUpdatePassword() {
    const currentPw = document.getElementById('pw-current').value.trim();
    const newPw = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;

    if (newPw === "" || confirmPw === "") { alert("Please fill in both password fields!"); return; }
    if (newPw !== confirmPw) { alert("New password and confirm password do not match!"); return; }
    
    try {
        const response = await fetch('php/auth_controller.php?action=change_student_password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ current_password: currentPw, new_password: newPw })
        });
        const result = await response.json();
        alert(result.message);
        if (result.status === 'success') cancelPasswordChange();
    } catch (error) {
        alert("Something went wrong while updating the password.");
    }
}

function cancelPasswordChange() {
    document.getElementById('pw-step-1').style.display = 'none';
    document.getElementById('pw-step-2').style.display = 'none';
    document.getElementById('pw-step-0').style.display = 'block';
}

// =========================================
// === Library Data Loading ===
// =========================================
async function fetchBooks() {
    try {
        const response = await fetch('php/library_controller.php?action=get_books');
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
            window.filterCatalog();
        }
    } catch(e) { console.error("Error fetching books", e); }
}

async function fetchStudentBorrowings() {
    try {
        const response = await fetch('php/library_controller.php?action=get_student_borrowings');
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
                const dueDates = [];
                
                data.data.forEach(b => {
                    dueDates.push(b.due_date);
                    if(tbody) {
                        tbody.innerHTML += `<tr>
                            <td>${b.title}</td>
                            <td><strong>${b.book_id}</strong></td>
                            <td>${b.issue_date}</td>
                            <td>${b.days_left >= 0 ? `<span class="timer-badge timer-safe">${b.days_left} Days Left</span>` : `<span class="timer-badge" style="background:#fee2e2; color:#ef4444;">Overdue</span>`}</td>
                            <td class="fine-text">Rs. ${b.fine.toFixed(2)}</td>
                        </tr>`;
                    }
                    if(list) list.innerHTML += `<p>${counter}. ${b.title}</p>`;
                    counter++;
                });
                updateCountdownTimer(dueDates);
            } else {
                if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No active borrowings found.</td></tr>';
                if(list) list.innerHTML = '<p>No books borrowed this week.</p>';
                updateCountdownTimer([]); 
            }
        }
    } catch(e) { console.error("Error fetching student borrowings", e); }
}

async function fetchStudentReservations() {
    try {
        const response = await fetch('php/library_controller.php?action=get_student_reservations');
        const data = await response.json();
        const tbody = document.getElementById('student-reservations-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(r => {
                const badge = r.status === 'Pending' ? `<span class="status-badge" style="background: #fef08a; color: #854d0e;">Pending</span>` : `<span class="status-badge active">Approved</span>`;
                tbody.innerHTML += `<tr>
                    <td>${r.title}</td>
                    <td>${r.request_date}</td>
                    <td>${badge}</td>
                    <td><button class="btn-danger-sm" onclick="cancelReservation(${r.id})">Cancel</button></td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No reservations found.</td></tr>';
        }
    } catch(e) {}
}

async function reserveBook(bookId) {
    if(!confirm('Are you sure you want to request this book?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=reserve_book', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({book_id: bookId})
        });
        const res = await response.json();
        alert(res.message);
        if(res.status === 'success') {
            fetchBooks();
            fetchStudentReservations();
        }
    } catch(e) {}
}

async function cancelReservation(resId) {
    if(!confirm('Are you sure you want to cancel this request?')) return;
    try {
        const response = await fetch('php/library_controller.php?action=cancel_reservation', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reservation_id: resId})
        });
        const res = await response.json();
        alert(res.message);
        if(res.status === 'success') {
            fetchStudentReservations();
            fetchBooks();
        }
    } catch(e) {}
}

// =========================================
// === Self Checkout (Scan & Get Book) ===
// =========================================
let bookScanner = null;
let scannedBookId = "";

function startBookScanner() {
    const readerDiv = document.getElementById('student-qr-reader');
    readerDiv.style.display = 'block';
    if (bookScanner) bookScanner.clear();

    bookScanner = new Html5QrcodeScanner("student-qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    bookScanner.render(onScanSuccess, onScanError);
}

function onScanSuccess(decodedText, decodedResult) {
    scannedBookId = decodedText.trim();
    if(bookScanner) bookScanner.pause(true);
    
    fetch('php/library_controller.php?action=get_books')
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            const book = data.data.find(b => b.book_id === scannedBookId);
            if(book) {
                if(book.status !== 'Available') {
                    alert("Sorry, this book is currently unavailable.");
                    restartScanner(); return;
                }
                document.getElementById('qr-modal-title').innerText = book.title;
                document.getElementById('qr-modal-author').innerText = book.author;
                document.getElementById('qr-modal-cover').src = book.cover_img ? book.cover_img : 'static/covers/default.png';
                document.getElementById('qr-book-modal').style.display = 'flex';
            } else {
                alert("Book not found in the Library Database!");
                restartScanner();
            }
        } else {
            alert(data.message); restartScanner();
        }
    }).catch(err => { alert("System Error!"); restartScanner(); });
}

function onScanError(errorMessage) {}

function confirmGetBook() {
    const btn = document.getElementById('btn-confirm-get');
    btn.innerText = "Processing...";
    btn.disabled = true;

    fetch('php/library_controller.php?action=submit_scan_request', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ book_id: scannedBookId })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        document.getElementById('qr-book-modal').style.display = 'none';
        btn.innerText = "Get Book";
        btn.disabled = false;
        
        if(data.status === 'success') {
            fetchBooks();
            fetchStudentBorrowings();
            showSection('my-borrowings');
            if(bookScanner) {
                bookScanner.clear();
                document.getElementById('student-qr-reader').style.display = 'none';
            }
        } else { restartScanner(); }
    });
}

function restartScanner() {
    if(bookScanner) bookScanner.resume();
}