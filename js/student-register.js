/**
 * ==========================================
 * Student Registration Validation Logic
 * ==========================================
 * This file checks if the user inputs are correct 
 * before sending data to the server.
 */

document.addEventListener("DOMContentLoaded", function() {
    
    // Get the registration form element
    const registerForm = document.getElementById("studentRegisterForm");

    // Listen for the form submission
    registerForm.addEventListener("submit", function(event) {
        
        // Get values from input fields
        const pass = document.getElementById('regPassword').value;
        const confirmPass = document.getElementById('regConfirmPassword').value;
        const phone = document.getElementById('phone').value;

        // 1. Validate Phone Number (Check for 10 digits starting with 0)
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            alert("Please enter a valid 10-digit phone number starting with 0 (e.g., 0712345678).");
            event.preventDefault(); // Stop form submission
            return false;
        }

        // 2. Validate Password Strength (Strong Password Rule)
        // Rule: >= 6 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
        if (!strongPasswordRegex.test(pass)) {
            alert("Security Alert: Your password is too weak!\nIt must contain at least 6 characters, including one uppercase letter, one lowercase letter, one number, and one special character (e.g., @, $, !, %).");
            event.preventDefault(); // Stop form submission
            return false;
        }

        // 3. Check if both passwords match
        if (pass !== confirmPass) {
            alert("Passwords do not match! Please try again.");
            event.preventDefault(); // Stop form submission
            return false;
        }

        // 4. Validate File Upload (Must be PDF & Max Size 5MB)
        const fileInput = document.getElementById('proofFile');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Check if file is a PDF
            if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
                alert("Security Alert: Invalid file type! Only PDF files are allowed for the Birth Certificate.");
                event.preventDefault(); // Stop form submission
                return false;
            }

            // Check if file size is less than 5MB
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                alert("File is too large! Please upload a PDF smaller than 5MB.");
                event.preventDefault(); // Stop form submission
                return false;
            }
        }

        // If all checks pass, the form will submit successfully
    });
});

/**
 * ==========================================
 * Password Visibility Toggle Function
 * ==========================================
 * This changes the input field from 'password' to 'text'
 * to let the user see what they typed.
 */
function togglePasswordVisibility(inputId) {
    // Get the input field by ID
    const passwordInput = document.getElementById(inputId);
    
    // Switch between showing and hiding text
    if (passwordInput.type === "password") {
        passwordInput.type = "text"; // Show password
    } else {
        passwordInput.type = "password"; // Hide password
    }
}