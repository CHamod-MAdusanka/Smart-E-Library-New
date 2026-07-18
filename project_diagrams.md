# Smart-E-Library Management System Architecture

This document contains diagrams explaining the structure and workflow of your Smart E-Library project.

*(Note: You can Right-Click any of these images and select "Save image as..." to download them!)*

## 1. System Architecture
This diagram illustrates how the Frontend, Backend, and Database interact with each other.

![Architecture Diagram](https://quickchart.io/mermaid?chart=graph%20TD%0A%20%20A%5BStudent%20Dashboard%5D%20--%3E%20D%5BLibrary%20Controller%5D%0A%20%20B%5BAdmin%20Dashboard%5D%20--%3E%20D%0A%20%20C%5BQR%20Scanner%5D%20--%3E%20A%0A%20%20C%20--%3E%20B%0A%20%20D%20--%3E%20E%5B(MySQL%20Database)%5D%0A%20%20E%20--%3E%20D&format=png)

---

## 2. Database Entity Relationship (ER Diagram)
This diagram shows the main tables in the database and the relationships between them.

![Database Diagram](https://quickchart.io/mermaid?chart=erDiagram%0A%20%20STUDENTS%20%7C%7C--o%7B%20BORROWINGS%20%3A%20borrows%0A%20%20BOOKS%20%7C%7C--o%7B%20BORROWINGS%20%3A%20in%0A%20%20STUDENTS%20%7B%20string%20id%20%7D%0A%20%20BOOKS%20%7B%20string%20id%20%7D%0A%20%20BORROWINGS%20%7B%20int%20id%20%7D&format=png)

---

## 3. QR Scanning Flow
This sequence diagram shows the step-by-step process of a student scanning a QR code to issue a book.

![Flow Diagram](https://quickchart.io/mermaid?chart=sequenceDiagram%0A%20%20Student-%3E%3EQR%20Scanner%3A%20Scan%20Book%0A%20%20QR%20Scanner-%3E%3EPHP%20Backend%3A%20Send%20ID%0A%20%20PHP%20Backend-%3E%3EDatabase%3A%20Query%20Book%0A%20%20Database--%3E%3EPHP%20Backend%3A%20Book%20Details%0A%20%20PHP%20Backend--%3E%3EStudent%3A%20Success&format=png)
