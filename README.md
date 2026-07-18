# Smart-E-Library Management System

A web-based Smart E-Library Management system with QR Code scanning capabilities for issuing and returning books.

## Project Structure

```text
Smart-E-Library-New/
├── admin-dashboard.html        # Main dashboard for Admin
├── head-dashboard.html         # Dashboard for Head Librarian (Includes Returns)
├── student-dashboard.html      # Dashboard for Students (Borrowing, QR Scanner)
├── admin-login.html            # Admin login page
├── student-login.html          # Student login page
├── student-register.html       # Student registration page
├── index.html                  # Landing page
├── README.md                   # Project documentation (You are here)
├── smart_e_library.sql         # MySQL database schema dump
├── css/                        # CSS stylesheets
├── js/
│   ├── app.js                  # Logic for Admin/Head dashboards & QR generation
│   ├── student-app.js          # Logic for Student dashboard
│   └── scanner.js              # HTML5-QRCode scanner wrapper logic
├── php/
│   └── library_controller.php  # Backend API controller for DB operations
├── static/                     # Static assets (images, icons)
└── uploads/                    # Uploaded files (e.g., book covers)
```

## Features
- **QR Code Scanning**: Issue and return books simply by scanning dynamic QR codes using a camera or by uploading an image.
- **Role-based Dashboards**: Separate User Interfaces for Students, Head Librarians, and Admins.
- **Live Inventory**: Real-time book availability tracking.
- **Fines & Returns**: Automatically calculate return dates and track borrowed books.