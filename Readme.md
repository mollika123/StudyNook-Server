# StudyNook Backend API

StudyNook is a backend RESTful API built using Node.js, Express, and MongoDB. It manages study room listings, bookings, and user allocations with remote JWKS token verification for authentication.

---

## 🚀 Features

* **Room Management:** Full CRUD operations for study room listings with advanced filtering capabilities (search, amenities, hourly rates, and floor).
* **Booking Management:** Allows authenticated users to book rooms and delete existing bookings.
* **JWT Authentication:** Implements secure route guarding using JSON Web Tokens (JWT) verified against a remote JWKS (JSON Web Key Set) endpoint via `jose-cjs`.
* **DNS Resolution Fix:** Pre-configured custom DNS servers to bypass potential local MongoDB connection lookup issues.

---

## 🛠️ Prerequisites

Before running the server, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v16+ recommended)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and cluster setup

---

