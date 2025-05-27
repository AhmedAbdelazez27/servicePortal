# 🚀  Angular Starter

A modern, multilingual, responsive Angular 19+ starter kit built with scalability and developer productivity in mind.

This starter is designed for real-world admin portals and dashboards. It includes pre-configured support for:
- Arabic/English localization
- RTL/LTR layout switching
- Bootstrap 5.3 integration
- FontAwesome icons
- Global loading spinner (Ngx Spinner)
- Toastr notification system
- Modular routing and standalone components

---

## 📁 Project Structure

```
src/
│
├── app/
│   ├── core/               # Services, guards, interceptors, constants
│   ├── features/           # Feature modules like auth, dashboard, etc.
│   ├── shared/             # Shared components, directives, pipes
│   ├── assets/i18n/        # en.json / ar.json translation files
│   ├── app.config.ts       # Angular standalone configuration
│   └── app.routes.ts       # Application routing
│
├── styles.scss             # Global styles and RTL overrides
├── index.html              # Main entry point with <base href>
└── main.ts                 # Bootstraps the AppComponent
```

---

## 🛠 Technologies Used

| Tool | Version | Purpose |
|------|---------|---------|
| Angular | 19+ | Core SPA Framework |
| Bootstrap 5.3 | Latest | UI Styling (RTL/LTR support) |
| FontAwesome | Latest | Icon support |
| @ngx-translate/core | ^14 | Dynamic i18n |
| ngx-spinner | ^13 | Global loading indicator |
| ngx-toastr | ^17 | Toaster notifications |
| SCSS | - | Global styling |

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the project

```bash
ng serve
```

App will be available at [http://localhost:4200](http://localhost:4200)

---

## 🌍 Language & Layout Direction

- Default language: **English**
- Supports: **English 🇬🇧 / Arabic 🇸🇦**
- Direction is automatically switched (`dir="rtl"` or `dir="ltr"`) based on the current language
- Language preference is stored in `localStorage` under key: `lang`

You can toggle language by calling:
```ts
translationService.toggleLanguage();
```

---

## 🔄 Global Loader

To show/hide loader anywhere:

```ts
constructor(private spinner: NgxSpinnerService) {}

this.spinner.show();
setTimeout(() => this.spinner.hide(), 2000);
```

Loader type: `line-scale`, background: semi-transparent dark overlay.

You can customize the spinner via `NgxSpinnerModule.forRoot()` inside `app.config.ts`.

---

## 🔔 Toast Notifications

To show success or error messages globally:

```ts
constructor(private toastr: ToastrService) {}

this.toastr.success('Success message', 'Title');
this.toastr.error('Something went wrong', 'Error');
```

> 📍 Toastr position changes dynamically based on language (right for EN, left for AR).

---

## 📌 Notes

- This starter uses **standalone components** and **Angular modern providers API**
- Ideal for dashboards, portals, and enterprise applications

---

## ✨ Coming Enhancements

- Auth module + login form
- Layout system (Sidebar + Topbar)
- Global HTTP error handling
- Reusable NotificationService

---

## 👨‍💻 Maintained by:
Ahmed Abdelaziz