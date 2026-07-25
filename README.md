# GradeQuest Frontend

React + TypeScript frontend for GradeQuest, a SaaS school management platform for African schools. The app connects to the Laravel GradeQuest API and provides portals for Admin, Teacher, Parent, Student, Bursar, and Super Admin users.

## Core Features

- Modern dashboards for Admin, Teacher, Parent, Student, Bursar, and Super Admin roles.
- Student, teacher, class, subject, term, session, department, and section management.
- Result entry, result upload, report cards, promotion, result monitoring, and academic alerts.
- Billing dashboard, GradeQuest invoices, package management, and subscription checkout.
- Parent school-fee payment link flow with student lookup and Paystack payment.
- Staff attendance using live school-generated QR codes and browser location permission.
- School bank/payment mode settings for online and offline collection.
- Super Admin pages for subscribers, packages, billing policy, blogs, testimonials, and demo bookings.

## Tech Stack

- React 19
- TypeScript
- Vite / Rolldown Vite
- Bootstrap 5
- Bootstrap Icons
- Lucide React
- Chart.js
- Axios
- QR scanner and QR generation libraries

## Local Setup

```bash
npm install
npm run dev
```

The frontend runs by default at:

```text
http://localhost:5173
```

The backend API should be running at:

```text
http://localhost:8000
```

## Environment Variables

Create a local `.env` file for development. Do not commit real secrets or local machine values.

Typical values:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_URL=http://localhost:5173
VITE_PAYSTACK_PUBLIC_KEY=
```

## Staff Attendance Flow

The old personal teacher QR page has been removed. The secure flow is now:

1. Admin goes to Attendance Settings and saves the school location.
2. Admin opens Staff Attendance and generates a live QR.
3. Teacher logs in with their own account.
4. Teacher opens Staff Attendance and scans the school QR.
5. Browser asks for location permission.
6. The backend confirms the teacher login, QR validity, school ownership, and distance from school.

For local mobile testing, browser location usually requires HTTPS unless testing directly on `localhost`.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run sass:build
```

## Deployment Notes

- Set the frontend API base URL to the production backend.
- Use HTTPS in production so camera and location permissions work reliably.
- Keep `.env` out of Git.
- Run `npm run build` before deploying.
- Confirm Paystack public key and callback URLs are set for the correct environment.
