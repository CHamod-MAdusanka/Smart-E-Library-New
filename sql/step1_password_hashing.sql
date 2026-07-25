ALTER TABLE students MODIFY password VARCHAR(255) NULL;
ALTER TABLE admins MODIFY password VARCHAR(255) NULL;

-- Optional: keep the current data and let the PHP migration script hash it.
-- Run the script at http://localhost/Smart-E-Library-New/php/hash_existing_passwords.php once.
