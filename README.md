# Zumma — Personal Finance Management Platform

![JavaScript](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow)
![Node](https://img.shields.io/badge/Backend-Node.js-green)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue)
![JWT](https://img.shields.io/badge/Auth-JWT-black)

Full-stack web application for personal finance tracking, budgeting, and financial insights.  
Designed to simulate a real-world SaaS product with secure authentication, dynamic dashboards, and data export capabilities.

---

## 🚀 Demo

🎥 Video Walkthrough: https://drive.google.com/file/d/1kXgqCZ-lllq-KLpj3di_8Q6R9OpjL3Ke/view?usp=drive_link

> Live deployment coming soon

---

## ✨ Key Features

### 📊 Financial Dashboard
- Real-time balance overview (income vs expenses)
- Dynamic charts using Chart.js
- Monthly financial insights

### 💸 Transaction Management (CRUD)
- Add, edit, and delete financial records
- Categorized income and expenses
- Advanced filtering by date, type, and category

### 🎯 Budget Control
- Monthly budget limits per category
- Smart alerts when spending exceeds limits

### 🔐 Security
- JWT-based authentication
- Password hashing with bcrypt
- Email-based account recovery (Nodemailer)

### 📤 Data Export
- Export financial reports to Excel (XLSX)
- Binary file handling from backend

---

## 🧠 Architecture

Decoupled client-server architecture:

- **Frontend:** Vanilla JavaScript SPA
- **Backend:** Node.js + Express REST API
- **Database:** MySQL relational model
- **Authentication:** Stateless JWT sessions

---

## 🛠 Tech Stack

### Frontend
- JavaScript (ES6+)
- Chart.js
- HTML5 & CSS3
- Fetch API

### Backend
- Node.js
- Express.js
- JSON Web Tokens (JWT)
- bcrypt
- Nodemailer

### Database
- MySQL
- MySQL2 (async/await support)

---

## 📸 Screenshots

### Dashboard
![dashboard](./screenshots/zumma5.png)

### Statistics
![stats](./screenshots/zumma9.png)

---

## ⚙️ Local Setup

### 1. Clone repository

git clone https://github.com/victoriadetrocchi/ZummaX


### 2. Backend
cd backend
npm install
node index.js

### 3. Frontend
# Open with Live Server or any static server

### 4. Database
- Create a MySQL database named `zumma_db`
- Import the provided SQL schema
- Configure environment variables if needed

---

## 📈 Key Learnings
- Implemented stateless authentication using JWT
- Designed relational schema for budgeting logic
- Built secure REST API with Node.js
- Implemented Excel export from backend
- Developed a responsive, UX-focused interface

---

## 💡 Future Improvements
- Multi-currency support
- Recurring transactions
- Docker containerization
- Cloud deployment

---

## 📬 Contact
🔗 LinkedIn: https://linkedin.com/in/victoria-de-trocchi  
💼 Portfolio: https://victoriadetrocchi-portfolio.netlify.app  
📧 Email: mvictoriadetrocchi@gmail.com
