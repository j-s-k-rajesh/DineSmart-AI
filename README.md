<div align="center">

# 🍽️ DineSmart AI

### Multi-Agent Restaurant Ordering & Management Platform

<p align="center">
An AI-powered restaurant ecosystem built with Google ADK, MCP, React, Node.js, MongoDB Atlas, and Socket.io.
</p>

<p align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-RealTime-black?style=for-the-badge&logo=socket.io)
![Google ADK](https://img.shields.io/badge/Google-ADK-4285F4?style=for-the-badge&logo=google)
![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge)
![MCP](https://img.shields.io/badge/MCP-Protocol-success?style=for-the-badge)

</p>

</div>

---

# 📖 Overview

DineSmart AI is a next-generation restaurant management platform that transforms the traditional dining experience using Artificial Intelligence, Multi-Agent Systems, and QR-based ordering.

Customers can simply scan a QR code assigned to their table, browse the digital menu, receive AI-powered food recommendations, place orders, and track order status in real time.

Restaurant staff can efficiently manage kitchen operations while administrators gain AI-powered business insights, sales analytics, and complete restaurant management through dedicated dashboards.

The project demonstrates the practical application of Google ADK, Model Context Protocol (MCP), and real-time communication using Socket.io.

---

# ✨ Features

## 👤 Customer Dashboard

- QR Code Based Menu
- AI Food Concierge
- Smart Food Recommendations
- Category Filtering
- Shopping Cart
- Place Orders
- Live Order Tracking
- Waiter Assistance
- Real-time Notifications

---

## 👨‍🍳 Kitchen Dashboard

- Live Incoming Orders
- Order Queue Management
- Accept Orders
- Preparing Orders
- Ready for Pickup
- Completed Orders
- Real-time Synchronization

---

## 👨‍💼 Admin Dashboard

- Restaurant Management
- Table Management
- Automatic QR Generation
- Menu Management
- Customer Management
- Staff Management
- Sales Analytics
- Revenue Dashboard
- AI Business Insights

---

# 🤖 AI Agents

## 🍕 Food Concierge Agent

Built using Google ADK.

Capabilities:

- Recommend dishes
- Budget-based suggestions
- Vegetarian recommendations
- Spicy/Family meal suggestions
- Menu Question Answering
- Popular Dish Discovery

---

## 📈 Business Intelligence Agent

Provides restaurant owners with:

- Daily Sales Report
- Revenue Analysis
- Peak Hours
- Best Selling Dishes
- Customer Trends
- AI Business Suggestions

---

# 🔌 MCP Servers

## Customer MCP Server

Tools

- Get Menu
- Place Order
- Track Order
- Food Recommendation
- Popular Dishes

---

## Admin MCP Server

Tools

- Create Tables
- Generate QR
- Update Order Status
- Sales Analytics
- Restaurant Insights

---

# ⚡ Real-Time Architecture

```
Customer
      │
      │ Place Order
      ▼

Socket.io Server

      │
      ▼

Kitchen Dashboard

      │
      ▼

Update Status

Accepted
Preparing
Ready
Completed

      │
      ▼

Customer receives instant updates
```

---

# 🏗️ Project Architecture

```
                 Google Gemini
                      │
              Google ADK Agents
                      │
      ┌───────────────┴───────────────┐
      │                               │
Customer MCP                  Admin MCP
      │                               │
      └───────────────┬───────────────┘
                      │
                Express Backend
                      │
       Socket.io + REST APIs
                      │
                MongoDB Atlas
                      │
     ┌─────────┬─────────┬─────────┐
     │         │         │
 Customer   Kitchen   Admin
 Dashboard Dashboard Dashboard
```

---

# 🛠 Technology Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- Axios
- Socket.io Client

### Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Socket.io

### Artificial Intelligence

- Google ADK
- Google Gemini
- Multi-Agent Architecture

### AI Communication

- Customer MCP Server
- Admin MCP Server

### Security

- JWT Authentication
- Helmet
- CORS
- Rate Limiting
- XSS Sanitization
- CSRF Protection
- Role-Based Access Control

---

# 📂 Project Structure

```
apps/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middlewares/
│   ├── services/
│   ├── sockets/
│   ├── mcp/
│   │
│   ├── customer-server/
│   └── admin-server/
│
└── README.md
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/yourusername/DineSmart-AI.git

cd DineSmart-AI
```

---

## Install Frontend

```bash
cd apps/frontend

npm install

npm run dev
```

---

## Install Backend

```bash
cd apps/backend

npm install

npm run dev
```

---

# 🔑 Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=3000

CLIENT_URL=http://localhost:5173

MONGODB_URI=your_mongodb_connection

JWT_ACCESS_SECRET=your_secret

JWT_REFRESH_SECRET=your_secret
```

---

# 👤 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | alice.morgan@gourmetbistro.com | SuperAdmin@123 |
| Admin | bob.chen@gourmetbistro.com | Admin@123456 |
| Kitchen | carlos.r@gourmetbistro.com | Kitchen@1234 |
| Waiter | ethan.b@gourmetbistro.com | Waiter@1234 |

---

# 🎯 Future Enhancements

- Online Payments
- Reservation Management
- Voice Ordering
- Inventory Prediction
- Demand Forecasting
- Multi-language Support
- Loyalty Rewards
- Restaurant Chain Support

---

# 📷 Screenshots

(Add screenshots here)

- Admin Dashboard
- Customer Dashboard
- Kitchen Dashboard
- QR Ordering
- Analytics Dashboard

---

# 🎥 Demo

(Add your YouTube Demo Link)

---

# 🌐 Live Demo

(Add your deployed frontend URL)

---

# 📄 License

This project was developed for the Kaggle AI Agents: Intensive Vibe Coding Capstone Project.

---

<div align="center">

### ⭐ If you like this project, don't forget to star the repository!

Built with ❤️ using Google ADK, MCP, Gemini AI, React, Node.js & MongoDB.

</div>
