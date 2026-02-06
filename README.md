

# Jobify – Project Structure

**Jobify** is a full-stack web application built with:

* **ASP.NET Core (C#)** – Backend API
* **React + Vite** – Frontend
* **Entity Framework Core** – Database
* **JWT + Google/GitHub OAuth** – Authentication


## 📁 Root Structure

```
Jobify/
├── Jobify/          # Backend (ASP.NET Core)
├── pages/           # Frontend pages (React)
├── styles/          # Frontend CSS
├── public/          # Static assets
├── Jobify.sln       # Visual Studio solution
├── package.json     # Frontend dependencies
└── README.md
```



## 🔹 Backend – `Jobify/`

```
Jobify/
├── Controllers/
├── Data/
├── Migrations/
├── Models/
├── Services/
├── Program.cs
├── Jobify.csproj
└── appsettings.Development.example.json
```

### Controllers/

* Handle API requests
* `AuthController.cs` → Login, Register, JWT, Google/GitHub OAuth
* `UserController.cs` → User-related endpoints

### Data/

* `AppDbContext.cs`
* Database configuration using Entity Framework

### Migrations/

* Database schema changes (EF Core migrations)

### Models/

* Database entities (e.g. Opportunity, Skills, PasswordResetToken)

### Services/

* Business logic (auth, tokens, email, helpers)

### Program.cs

* App entry point
* Configures authentication, database, CORS, middleware



## 🔹 Frontend – React

### pages/

* `LoginPage.jsx`
* `SignupPage.jsx`
* `ForgotPasswordPage.jsx`
* `ResetPasswordPage.jsx`
* `OAuthCallbackPage.jsx`

### styles/

* CSS files for UI styling

### App.jsx / main.jsx

* Routing and app bootstrap


## 🔐 Authentication

* JWT-based authentication
* Google OAuth
* GitHub OAuth
* Password reset via tokens


## ✅ Summary

* **Controllers** → API endpoints
* **Services** → Business logic
* **Models** → Database tables
* **Frontend pages** → UI & user flows
