# Free Tarot Deck Generator

## 🔑 How to Add Your API Key

This app requires a Google Gemini API Key to generate cards. You must create a special configuration file to store this key securely.

### Step 1: Get your Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **"Get API key"**.
3. Copy the key string (it usually starts with `AIza...`).

### Step 2: Create the File (VS Code Instructions)
1.  Open your project in VS Code.
2.  Look at the **File Explorer** on the left (the list of files).
3.  **Right-click** in the empty space below your files.
4.  Select **"New File"**.
5.  Type exactly: `.env`
    *(Make sure you include the dot at the start!)*
6.  Press **Enter**.

### Step 3: Paste the Key
1.  Click on the new `.env` file to open it.
2.  Paste your key inside like this:
    ```env
    API_KEY=your_copied_key_string_here
    ```
3.  **Save the file** (Ctrl+S or Cmd+S).

### Step 4: Restart the App
If your terminal is currently running the app:
1.  Click in the terminal window.
2.  Press `Ctrl + C` to stop it.
3.  Run `npm run dev` (or your start command) again.

---

## ⚠️ Important Notes

*   **Never share your `.env` file.**
*   The `.gitignore` file included in this project prevents the `.env` file from being uploaded to GitHub.
*   If you see an error saying "API Key is missing", double-check that the file is named `.env` and not `.env.txt`.
