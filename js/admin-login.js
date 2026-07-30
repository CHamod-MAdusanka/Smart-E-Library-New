/**
 * Admin Login Logic
 * Handles multi-step login validation and UI updates
 */

document.addEventListener("DOMContentLoaded", function() {
    const adminIdInput = document.getElementById("adminId");
    const nextBtn = document.getElementById("nextBtn");
    const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");
    const displayId = document.getElementById("display-id");
    
    adminIdInput.addEventListener("paste", e => e.preventDefault());
    adminIdInput.addEventListener("drop", e => e.preventDefault());
    
    adminIdInput.addEventListener("input", function() {
        this.value = this.value.replace(/[^a-zA-Z0-9\-]/g, '');
    });

    // [FIXED] Perform AJAX check before showing Step 2 to avoid hidden UI vulnerabilities
    nextBtn.addEventListener("click", async function() {
        const typedId = adminIdInput.value.trim().toUpperCase();
        const validPattern = /^[A-Z0-9\-]+$/;
        
        if (typedId === "") {
            alert("Please enter your Admin ID first!");
            return;
        }
        
        if (!validPattern.test(typedId)) {
            alert("Security Alert: Invalid characters detected! Please use only letters, numbers, and hyphens (-).");
            return;
        }

        nextBtn.disabled = true;
        nextBtn.textContent = "Checking...";
        
        try {
            const response = await fetch('php/auth_controller.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_admin_id', adminId: typedId })
            });

            const result = await response.json();

            if(result.status === 'success') {
                displayId.textContent = "Hi, " + typedId;
                step1.style.display = "none";
                step2.style.display = "block";
            } else {
                alert(result.message || "Admin ID not found.");
            }
        } catch (error) {
            console.error("Error verifying ID:", error);
            alert("System Error: Cannot verify Admin ID at the moment.");
        } finally {
            nextBtn.disabled = false;
            nextBtn.textContent = "Next";
        }
    });

    forgotPasswordBtn.addEventListener("click", function(e) {
        e.preventDefault(); 
        const typedId = adminIdInput.value.trim().toUpperCase();
        window.location.href = "forgot-password.html?id=" + encodeURIComponent(typedId);
    });
});