# Bhargava Phytolab — Sales Command Center v5
## Complete Setup Guide

---

## STEP 1 — Google Sheet Setup

Create a new Google Sheet. Add these 5 tabs (exact names, case-sensitive):

| Tab Name         | Import File                          |
|------------------|--------------------------------------|
| Hierarchy        | google_script/Hierarchy_seed.csv     |
| POB              | google_script/POB_seed.csv           |
| Secondary Sales  | google_script/SecondarySales_seed.csv|
| Stock            | google_script/Stock_seed.csv         |
| Passwords        | google_script/Passwords_seed.csv     |

**How to import CSV:**
File → Import → Upload → select the CSV → "Replace current sheet" → Import

---

## STEP 2 — Apps Script Deploy

1. In Google Sheet: **Extensions → Apps Script**
2. Delete any existing code in Code.gs
3. Paste the entire contents of `google_script/Code.gs`
4. Click **Save (Ctrl+S)**
5. Click **Deploy → New Deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** → Authorize when prompted
7. **Copy the Web App URL** (ends with `/exec`)

---

## STEP 3 — Update Frontend URL

Open `app.js` in VS Code. Line 8:
```
const API_URL = "PASTE_YOUR_URL_HERE";
```
Replace with your actual URL from Step 2.

---

## STEP 4 — Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → Login → **Add new site → Deploy manually**
2. Drag and drop the entire `v5` folder contents (index.html, app.js, style.css, logo.jpg)
3. Site goes live in ~30 seconds
4. Open the Netlify URL → Login → Done!

---

## Login Credentials

Default password = EMP Code for everyone.

| Role | Name | EMP Code | Password |
|------|------|----------|----------|
| GM | SUMEET CHANDNA | BP1780 | BP1780 |
| ZSM (East) | SUMIT CHATTERJEE | BP1887 | BP1887 |
| SM (South) | BUNTUPALLI SURYA BHASKAR RAO | BP1649 | BP1649 |
| ZSM (West) | DEEPAK JAISWAL | BP1673 | BP1673 |
| ZSM (North 3) | ASHISH NAGAR | BP1894 | BP1894 |
| ZSM (North 1-2) | PREET KUMAR | BP1899 | BP1899 |
| DRSM (Bihar/JH) | PRABHASH KUMAR SHARMA | BP1683 | BP1683 |
| RSM | SOUMYAJIT ROY | BP1578 | BP1578 |
| RSM | GAURAV SHARMA | BP1895 | BP1895 |
| ASM | ABHIMANYU BHARATI | BP1678 | BP1678 |
| FSO | HEMANT KUMAR SAHOO | BP1605 | BP1605 |

**To change a password:** Edit the `Passwords` sheet in Google Sheets — column D = password.

---

## Features

### FSO Login
- POB (Primary Order Booking) entry with live deficit calculation
- Secondary Sale entry
- Stock entry
- Real-time target vs achieved vs deficit tracking per product
- One-click save — auto-syncs to Google Sheet

### Manager Login (ASM/DRSM/RSM/ZSM/SM/GM)
- Expandable hierarchy tree — click + to expand, − to collapse
- Zone tabs for GM/SM/ZSM (East / North 1-2 / North 3-4 / South / West)
- Each node shows: FSO count, POB%, total POB, deficit
- Search by name or HQ
- Expand All / Collapse All buttons
- **Details button** on each node → 4-tab modal:
  - Summary: KPIs + progress bar
  - Products: Full 22-product table (target/POB/secondary/stock/deficit/%)
  - Team: Direct reportees sorted by performance
  - Info: Contact details, designation, zone, reporting chain

### Hierarchy
Tree built from "Immediate Reporting Manager" column — correct chain:
**GM → SM/ZSM → RSM/DRSM → ASM → FSO**

---

## Adding New Employees

Just add a new row in the **Hierarchy** sheet:
- Fill columns: HQ CODE, STATUS, EMP CODE, NAME, NEW HQ, DESIGN, DOJ, MOB, EMAIL
- **Most important:** Column K = IMMEDIATE REPORTING MANAGER (exact name of their manager)
- Then add a row in **Passwords** sheet (col A=EMP CODE, col D=password)
- If they are a seller (FSO/BDE/SR.FSO), also add a row in POB, Secondary Sales, Stock sheets

No code changes needed — the tree rebuilds automatically from the sheet data.
