# 🌳 Family Tree - Full Stack Genealogy Application

A beautiful, modern family tree management application built with React and Node.js. Create, visualize, and manage your family genealogy with an intuitive drag-and-drop interface.

![Family Tree Demo](./demo-screenshot.png)

## ✨ Features

### 🎨 **Modern UI/UX**
- **Glassmorphism Design**: Beautiful semi-transparent interfaces with blur effects
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Smooth Animations**: Hover effects, loading states, and transitions
- **Color-Coded Generations**: Purple (Grandparents), Blue (Parents), Green (You), Yellow (Children)

### 👨‍👩‍👧‍👦 **Family Tree Visualization**
- **Hierarchical Layout**: Grandparents → Parents → You & Siblings → Children
- **Smart Positioning**: Siblings appear alongside you with connection lines
- **Relationship Mapping**: Father, Mother, Brother, Sister, Spouse, and Child relationships
- **Interactive Cards**: Click + buttons to add family members

### 🖼️ **Advanced Image Handling**
- **Anonymous Avatars**: Auto-generated SVG avatars with user initials and colors
- **Profile Pictures**: Upload and display family member photos
- **Loading States**: Smooth loading animations and error handling
- **Optimized Performance**: Efficient image loading and caching

### 🔐 **Secure Authentication**
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Protected Routes**: Middleware protection for sensitive operations
- **Session Management**: Automatic login/logout handling

### 📊 **Database Design**
- **PostgreSQL**: Robust relational database
- **Relationship Mapping**: Foreign keys for complex family relationships
- **User Isolation**: Each user has their own family tree
- **Data Integrity**: Proper constraints and referential integrity

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sutharparemeshwer-ai/family-tree.git
   cd family-tree
   ```

2. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb family_tree_db

   # Run the schema
   psql -d family_tree_db -f database/tables.sql
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

5. **Configure environment variables**

   Create `.env` file in the server directory:
   ```env
   PORT=5000
   JWT_SECRET=your_secure_jwt_secret_here
   DATABASE_URL=postgresql://username:password@localhost:5432/family_tree_db
   ```

6. **Start the application**

   **Terminal 1 - Backend:**
   ```bash
   cd server
   npm start
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd client
   npm start
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Project Structure

```
family-tree/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # API utilities
│   │   └── App.jsx        # Main app component
│   └── package.json
├── server/                 # Express backend
│   ├── controllers/       # Route controllers
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication middleware
│   ├── db/               # Database connection
│   ├── uploads/          # Uploaded images
│   └── server.js         # Main server file
├── database/              # Database schema
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 19.2.1** - UI framework
- **React Router 7.10.0** - Navigation
- **Axios 1.13.2** - HTTP client
- **CSS3** - Styling with modern features

### Backend
- **Express.js 5.2.1** - Web framework
- **PostgreSQL 8.16.3** - Database
- **JWT 9.0.2** - Authentication
- **bcrypt 6.0.0** - Password hashing
- **Multer 2.0.2** - File uploads

### DevOps
- **Git** - Version control
- **npm** - Package management

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Family Members
- `GET /api/members` - Get all family members
- `POST /api/members` - Add new family member

### Request Examples

**Signup:**
```json
POST /api/auth/signup
Content-Type: multipart/form-data

{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword",
  "profile_image": "[file]"
}
```

**Add Family Member:**
```json
POST /api/members
Authorization: Bearer <jwt_token>

{
  "firstName": "Jane",
  "lastName": "Doe",
  "relationType": "Sister",
  "relativeToId": 1
}
```

**Supported Relation Types:**
- `Father`, `Mother` - Parent relationships
- `Brother`, `Sister` - Sibling relationships (share same parents)
- `Spouse` - Marriage relationship
- `Child` - Parent-child relationship

## 🎨 UI Components

### MemberCard
Interactive family member cards with:
- Profile image/avatar display
- Add family member button (+)
- Hover effects and animations
- Responsive design

### AddMemberForm
Modal form for adding family members:
- Profile image upload
- Relationship selection
- Form validation
- Success/error feedback

### Tree Visualization
Hierarchical family tree layout:
- Generation-based organization
- Connection lines between relatives
- Color-coded relationship groups
- Mobile-responsive design

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure authentication tokens
- **Input Validation**: Server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configured for frontend domain
- **File Upload Security**: Type and size restrictions

## 📱 Responsive Design

- **Desktop**: Full hierarchical layout with connection lines
- **Tablet**: Optimized spacing and touch targets
- **Mobile**: Stacked layout with collapsible sections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Community** for the amazing framework
- **PostgreSQL** for the robust database
- **Express.js** for the flexible backend framework
- **Material Design** for UI inspiration

## 📞 Support

If you have any questions or issues, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ by Paremeshwer Suthar**

*Create and manage your family legacy digitally!* 🌟
