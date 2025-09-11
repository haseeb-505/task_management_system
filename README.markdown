# Task Management System

A comprehensive task management system with role-based access control, file attachments, and company-specific data isolation.

## Scripts to Run this Project
- `npm start` - Start the server in production mode
- `npm run dev` - Start in development mode with nodemon
- `npm run seed` - Run the database seeding script

## Postman Api Endpoint Testing
Here is the link to postman folder which contains the request to test these api endpoints. 
```
[task_management_backend_postman_testing](https://web.postman.co/workspace/Backend-Node-API-testing~79c5c830-8e6a-452f-ac52-344dcf2336b9/collection/37379793-d55a7973-4516-486e-87e8-30619ba443c6?action=share&source=copy-link&creator=37379793)
```

## Features
- 🔐 **Role-Based Access Control**: Supports `SuperAdmin`, `CompanyUser`, and `EndUser` roles with distinct permissions.
- 🏢 **Company Isolation**: Ensures data separation between different companies.
- 📋 **Task Management**: Create, assign, update, and track tasks with status tracking.
- 📎 **File Attachments**: Upload and manage files associated with tasks.
- 🔒 **JWT Authentication**: Secure token-based authentication for API access.
- 🗃️ **MySQL Database**: Relational database with proper foreign key constraints.
- 📊 **RESTful API**: Comprehensive endpoints for all operations.

## Prerequisites
Before running the project, ensure the following are installed:
- **Node.js** (v14 or higher)
- **MySQL** (v5.7 or higher)
- **npm** or **yarn** package manager

## Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/haseeb-505/task_management_system.git
   cd task_management_system
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=task_management_db

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here

   # File Upload Configuration
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10485760
   ```
   Replace `your_mysql_password` with your MySQL password and `your_super_secret_jwt_key_here` with a strong JWT secret.

4. **Database Setup**:

   - **Schema & Models**:  
     The database schema is defined in the `models/schema.sql` file.  

   - **DB Connection**:  
     Connection pooling is configured in `config/db.js`.  

   - **Initialization**:  
     To initialize the database and create required tables, run:  
     ```bash
     node src/config/initDB.js
     ```

   - **Seeding Test Data** (Optional):  
     To insert sample users, tasks, and files for testing, run:  
     ```bash
     node scripts/seedTestData.js
     ```
     Or run the following command (this command was used in this project):
     ```bash
      npm run seed
    ```
     ⚠️ This script is for local development only. 
     If you want to delete any all the records from existing tables, un comment the `TRUNCATE` statements in file `task_management_system/scripts/seedTestData.js`.
     ```javascript
    // Comment these lines after first run:
    // await pool.execute('TRUNCATE TABLE task_files;');
    // await pool.execute('TRUNCATE TABLE tasks;');
    // await pool.execute('TRUNCATE TABLE users;');
   ```
    **⚠️ Important**: After first run, you may want to comment out or remove any `TRUNCATE` statements inside `seedTestData.js` to prevent accidental data loss.

6. **Start the Server**:
   - Development mode with auto-restart using `nodemon`:
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```
   The server will start on `http://localhost:3000`.

## API Usage
### Authentication
All endpoints (except login) require JWT authentication in the request header:
```
Authorization: Bearer <your_jwt_token>
```

### Available Endpoints
- **Authentication**:
  - `POST /api/auth/login` - User login
  - `POST /api/auth/register` - User registration (SuperAdmin only)
- **Task Assignment (SuperAdmin Only)**:
  - `GET /api/task-assignment/unassigned` - Get all unassigned tasks
  - `GET /api/task-assignment/company-users` - Get all company users
  - `PATCH /api/task-assignment/:taskId/assign` - Assign task to a user
- **Tasks**:
  - `GET /api/tasks` - Get all tasks (filtered by user role)
  - `POST /api/tasks` - Create a new task
  - `GET /api/tasks/:id` - Get a specific task
  - `PUT /api/tasks/:id` - Update a task
  - `DELETE /api/tasks/:id` - Delete a task
- **Files**:
  - `POST /api/tasks/:id/files` - Upload a file to a task
  - `GET /api/tasks/:id/files` - Get files for a task
  - `DELETE /api/files/:id` - Delete a file

## Role Permissions
- **SuperAdmin**:
  - Full system access across all companies
  - Can assign tasks to any user
  - Can manage all users and tasks
- **CompanyUser**:
  - Access to tasks within their company only
  - Can be assigned tasks
  - Can create and update tasks for their company
- **EndUser**:
  - Access to tasks within their company only
  - Can create and update tasks, update title, description, due_date only
  - Cannot assign tasks (SuperAdmin or CompanyUser must assign tasks via endpoint)

## Database Schema
- **Users Table**:
  - Columns: `id`, `name`, `email`, `password`, `role`, `company`, `created_on`
- **Tasks Table**:
  - Columns: `id`, `title`, `description`, `due_date`, `status`, `created_by`, `assigned_to`, `created_on`, `assigned_on`, `completed_on`
- **Task Files Table**:
  - Columns: `id`, `task_id`, `filename`, `file_path`, `uploaded_by`, `uploaded_at`

## File Uploads
File uploads are stored in the `uploads/` directory with the following structure:
```
uploads/
  tasks/
    files here
```

## Scripts
- `npm start` - Start the server in production mode
- `npm run dev` - Start in development mode with nodemon
- `npm run seed` - Run the database seeding script

## Troubleshooting
### Common Issues
- **MySQL Connection Error**:
  - Verify MySQL is running.
  - Check database credentials in `.env`.
  - Ensure the database exists.
- **JWT Authentication Error**:
  - Verify `JWT_SECRET` is set in `.env`.
  - Check the token in the `Authorization` header.
- **File Upload Issues**:
  - Ensure the `uploads` directory exists and is writable.
  - Check file size limits (`MAX_FILE_SIZE` in `.env`).
- **Permission Errors**:
  - Verify user roles match endpoint requirements.

### Reset Database
To completely reset the database:
1. Drop and recreate the database:
   ```sql
   DROP DATABASE task_management_db;
   CREATE DATABASE task_management_db;
   ```
2. Run the seeding script again:
   ```bash
   npm run seed
   ```

## Support
For issues or questions, please check:
- Database connection settings
- Environment variables configuration
- User role permissions
- API endpoint documentation

## License
This project is for demonstration purposes.