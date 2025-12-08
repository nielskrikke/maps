
# Manual User Management Guide

This application uses a simplified "Username Only" login flow. Behind the scenes, it maps usernames to dummy email addresses and deterministic passwords.

If you cannot use the "Add New User" button within the application (e.g., due to specific Supabase configurations), you can add users manually via the Supabase Dashboard.

## The Pattern

The application expects users to follow this strict pattern:

*   **Username:** `Aragorn` (Input by user)
*   **Email:** `aragorn@dnd-map-login.local` (Generated automatically)
*   **Password:** `DUMMY_PASSWORD_FOR_aragorn` (Generated automatically)

*Note: The email and password generation converts the username to lowercase.*

## Step-by-Step Manual Creation

1.  **Log in to Supabase**: Go to your project dashboard.
2.  **Go to Authentication**: Click on the "Authentication" icon in the left sidebar.
3.  **Add User**:
    *   Click "Add User".
    *   **Email**: Enter `[username_lowercase]@dnd-map-login.local`
    *   **Password**: Enter `DUMMY_PASSWORD_FOR_[username_lowercase]`
    *   *Example*: For user "Gandalf", email is `gandalf@dnd-map-login.local` and password is `DUMMY_PASSWORD_FOR_gandalf`.
    *   Ensure "Auto Confirm User" is checked (or manually confirm them after creation).
4.  **Create Profile (Critical)**:
    *   Go to the **Table Editor**.
    *   Open the `users` table (in the `public` schema).
    *   Click "Insert Row".
    *   **id**: Paste the `User UID` from the Authentication tab (the one you just created).
    *   **username**: Enter the display name (e.g., "Gandalf").
    *   **role**: Enter either "DM" or "Player".
    *   Click "Save".

The user can now log in using just their username.
