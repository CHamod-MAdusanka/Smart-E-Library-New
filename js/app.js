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
    if (section) section.style.display = 'block';

    const notifDropdown = document.getElementById('notification-dropdown');
    const profDropdown = document.getElementById('profile-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (profDropdown) profDropdown.classList.remove('show');

    if (window.innerWidth < 900 && sidebar) {
        sidebar.classList.add('closed');
    }

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
// REAL DATABASE BOOK MANAGEMENT
// =========================================
function getCategoryCode(cat) {
    const map = { novel: 'nov', science: 'sci', history: 'his', education: 'edu' };
    return map[cat] || cat.substring(0, 3).toLowerCase();
}

function generateBookId(cat, rack) {
    if (!cat || !rack) return '';
    const code = getCategoryCode(cat);
    const timestamp = new Date().getTime().toString().slice(-4); 
    return `${code}${timestamp}-${rack}`;
}

function updateBookIdPreview() {
    const catEl = document.getElementById('book-category');
    const rackEl = document.getElementById('book-rack');
    const idEl = document.getElementById('book-id');
    if(catEl && rackEl && idEl) {
        idEl.value = generateBookId(catEl.value, rackEl.value.trim());
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
                
                if(removeBody) {
                    removeBody.innerHTML += `
                        <tr>
                            <td><img src="${cover}" width="40" height="60" style="border-radius: 4px; object-fit: cover;"></td>
                            <td><strong>${book.book_id}</strong></td>
                            <td>${book.title}</td>
                            <td>${book.author}</td>
                            <td>
                                <button class="btn-danger" onclick="confirmDeleteBook('${book.book_id}', '${book.title.replace(/'/g, "\\'")}')">✖ Remove</button>
                            </td>
                        </tr>
                    `;
                }
                if(invBody) {
                    invBody.innerHTML += `
                        <tr>
                            <td><img src="${cover}" width="40" height="60" style="border-radius: 4px; object-fit: cover;"></td>
                            <td>${book.book_id}</td>
                            <td>${book.title}</td>
                            <td>${book.author}</td>
                            <td>${book.category}</td>
                            <td>DB Data</td>
                        </tr>
                    `;
                }
                if(rfidBody) {
                    rfidBody.innerHTML += `
                        <tr>
                            <td>${book.title}</td>
                            <td>${book.book_id}</td>
                            <td><button class="btn-save" onclick="openRfidModal('${book.book_id}', '${book.title.replace(/'/g, "\\'")}', 'Book')">Write RFID</button></td>
                        </tr>
                    `;
                }
            });
        } else {
            if(removeBody) removeBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No books found.</td></tr>';
            if(invBody) invBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No books found.</td></tr>';
            if(rfidBody) rfidBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No books found.</td></tr>';
        }
    } catch(e) { console.error(e); }
}

async function addNewBook() {
    const titleIn = document.getElementById('book-title').value.trim();
    const authorIn = document.getElementById('book-author').value.trim();
    const catIn = document.getElementById('book-category').value;
    const rackIn = document.getElementById('book-rack').value.trim(); 
    const idIn = document.getElementById('book-id').value.trim();
    const coverIn = document.getElementById('book-cover');

    if (!titleIn || !authorIn || !catIn || !rackIn || !idIn) {
        alert("Please fill all necessary fields!"); return;
    }

    const sendDataToDB = async (coverData) => {
        try {
            const response = await fetch('php/add_book.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ book_id: idIn, title: titleIn, author: authorIn, category: catIn, cover_img: coverData })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                document.getElementById('book-title').value = '';
                document.getElementById('book-author').value = '';
                document.getElementById('book-category').value = '';
                document.getElementById('book-rack').value = '';
                document.getElementById('book-id').value = '';
                document.getElementById('book-cover').value = '';
                fetchAdminBooks();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error("Error adding book:", error);
            alert("System Error: Could not connect to database.");
        }
    };

    if (coverIn && coverIn.files[0]) {
        const reader = new FileReader(); 
        reader.onload = () => sendDataToDB(reader.result); 
        reader.readAsDataURL(coverIn.files[0]);
    } else {
        sendDataToDB(null);
    }
}

async function confirmDeleteBook(id, title) {
    if (confirm(`Are you sure you want to delete:\n"${title}"?`)) {
        try {
            const response = await fetch('php/remove_book.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ book_id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                fetchAdminBooks(); 
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error("Error removing book:", error);
            alert("System Error: Could not connect to database.");
        }
    }
}

// =========================================
// HOOKS & INIT
// =========================================
const originalShowSectionBooks = showSection;
showSection = function(sectionId) {
    if(typeof originalShowSectionBooks === 'function') {
        originalShowSectionBooks(sectionId);
    }
    if(sectionId === 'remove-book' || sectionId === 'add-book' || sectionId === 'books-rfid') {
        fetchAdminBooks();
    }
}

window.addEventListener('DOMContentLoaded', function() {
    fetchAdminBooks();
    
    const catSel = document.getElementById('book-category');
    const rackIn = document.getElementById('book-rack');
    const addBtn = document.getElementById('book-add-button');
    if (catSel) catSel.addEventListener('change', updateBookIdPreview);
    if (rackIn) rackIn.addEventListener('input', updateBookIdPreview);
    if (addBtn) addBtn.addEventListener('click', addNewBook);

    const homeEl = document.getElementById('home') || document.getElementById('dashboard-home');
    if (homeEl) { showSection(homeEl.id); } 
});