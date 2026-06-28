# CivicPulse 🏛️ — Intelligent Smart City Grievance Redressal System

CivicPulse is a high-performance, full-stack, AI-powered citizen-to-government communication platform designed to close the feedback loop in municipal operations. It transforms how public grievances—such as road potholes, broken street lights, sanitation concerns, water leaks, and structural hazards—are reported, verified, routed, and resolved.

---

## 📋 Table of Contents
1. [Problem Statement Selected](#-problem-statement-selected)
2. [Solution Overview](#-solution-overview)
3. [How This Application Solves Major Problems](#-how-this-application-solves-major-problems)
4. [Key Features](#-key-features)
   - [For Citizens](#1-citizen-portal-features)
   - [For High-Command Municipal Authorities](#2-official-authority-high-command-portal)
5. [Tech Stack Used](#-tech-stack-used)
6. [Google Technologies Utilized](#-google-technologies-utilized)
7. [Futuristic Goals](#-futuristic-goals)
8. [Getting Started & Development Setup](#-getting-started--development-setup)
9. [Demo Credentials](#-demo-credentials)

---

## 🔍 Problem Statement Selected

### **The Broken Link in Urban Civic Operations**
In modern cities, citizen engagement is throttled by highly fragmented communication lines. When a resident notices a failing municipal service (such as a public sewer leak, broken infrastructure, or a hazardous pothole), they face:
1. **Department Ambiguity:** Citizens rarely know which department is responsible for a specific issue, leading to incorrectly routed complains.
2. **No Accountability / The Black Hole Effect:** Filed issues enter an opaque governmental pipeline without live status updates, SLA tracking, or clear worker assignments.
3. **Lack of Trust:** No gamified motivation or visible proof of repair work discourages proactive community civic reporting.
4. **Bureaucratic Congestion:** Municipal high-command officers spend valuable hours manually classifying issues and sorting through duplicates, with no direct way to command junior site inspectors or track field progress in real time.

---

## 💡 Solution Overview

**CivicPulse** is an end-to-end civic ecosystem that acts as a secure bridge between citizens and government officers. It leverages **Google Gemini AI** to automatically parse, classify, and verify reports while providing a modern, gamified UI for citizens.

For municipal bodies, it serves as a **High-Command Authority Portal** where senior officials can oversee active city problems, track geographic progress, assign specialized subordinate staff, mandate SLA deadlines, and enforce visual proof-of-resolution before closing a ticket.

---

## ⚡ How This Application Solves Major Problems

| **Urban Pain Point** | **CivicPulse Solution** |
| :--- | :--- |
| **Incorrect Department Routing** | **Automated AI Categorization:** The moment a photo/description is uploaded, Gemini models instantly classify the issue (e.g., *Pothole* is routed to *Public Works Department*). |
| **No Field Accountability** | **High-Command Delegation Hub:** Senior authority figures select domain specialists (Junior Engineers, Site Inspectors) and issue binding directives with concrete SLA dates. |
| **Citizen Disengagement** | **Civic XP Gamification:** Active contributors earn experience points (XP), advance through civic-rank tiers (e.g., *Community Guardian*), and track real-world impact. |
| **Fake / Spurious Close-outs** | **Verified Field Closing:** Officers are strictly required to upload an *After-Fix Field Photo* which is evaluated alongside official statements prior to ticket completion. |

---

## 🌟 Key Features

### 1. Citizen Portal Features
* **Interactive Civic Map & Feed:** Real-time visual dashboard showcasing active and resolved neighborhood reports.
* **Intelligent Reporting Engine:** Effortlessly upload images (drag-and-drop or device camera) with title, descriptions, and dynamic geo-tagging support.
* **Civic Gamification Tiers:** Track personal rank, complete civic challenges, upvote issues logged by neighbors to elevate regional priority, and earn XP badges.
* **Interactive Timeline:** Transparent timeline for every issue showing when it was assigned, who is working on it, what commands were issued, and the final repair photo.

### 2. Official Authority (High-Command) Portal
Accessible strictly to certified officers, containing key administrative tools:
* **Department Filtering:** Automatically segments views based on the logged-in officer's jurisdiction (e.g., Public Works, Sanitation, Electricity).
* **High-Command Delegation Hub:** 
  - Select and delegate tasks to **Domain-Specialist Junior Workers** (e.g., *Junior Engineer Amit Sharma*, *Pipeline Inspector Ajay Desai*).
  - Issue **Official Command Directives** explaining exact operational parameters.
  - Set strict **SLA Completion Target Dates**.
* **Real-time Metrics:** Live performance monitors showing **Open Cases**, **In-Progress Delegations**, **SLA Success Rates**, and **Total Issues Solved**.
* **Verified Resolution Verification:** To resolve a case, the inspector must upload the resolved image and log final notes, giving citizens a high-contrast visual comparison of Before vs. After.

---

## 🛠️ Tech Stack Used

### **Frontend Architecture**
* **React 18 & TypeScript:** Strict type-safe UI modules ensuring extreme performance and clean state management.
* **Vite:** High-speed, modern bundler.
* **Tailwind CSS:** Comprehensive visual utilities, custom colors, and fully responsive layouts.
* **Lucide React:** Iconography library.
* **Motion:** Animation frames for staggered entrances and clean modal transitions.

### **Backend Server**
* **Express (Node.js) & TypeScript:** Custom full-stack server supporting robust API proxy routes to protect sensitive credentials.
* **Local JSON File DB Engine:** Fast-access query and persistence layer allowing high-fidelity CRUD operations on auth states, issue histories, and timeline events.

---

## 🧠 Google Technologies Utilized

### 1. Google Gemini API (`@google/genai` TypeScript SDK)
* **Automated Dispatch Routing:** Translates user descriptions into formal municipal departments.
* **Intelligent Auto-Draft:** Generates final citizen notifications and official dispatch communications automatically from field logs.
* **Semantic Analysis:** Assists in evaluating the severity of reports based on natural language analysis.

### 2. Google AI Studio Ecosystem
* Bootstrapped server-side environment configured directly within the Google Cloud Run container structure.
* Standardized environment variables allowing developer-safe connection with the Gemini models.

---

## 🔮 Futuristic Goals

1. **Computer-Vision Pothole Identification:** Automated camera streaming on municipal vehicles to auto-detect and flag road cracks without manual reporting.
2. **IoT Integration:** Smart sensors on water pipes and street poles to auto-raise high-priority work orders directly in the Authority Portal.
3. **SMS Gateway Alerts:** Automated updates straight to registered mobile phones for non-smartphone users.
4. **Predictive Budget Allocation:** Big data modeling utilizing historical reports to identify recurring systemic failures, helping direct infrastructure budget to zones with the highest decay rates.

---

## 💻 Getting Started & Development Setup

### **Prerequisites**
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [npm](https://www.npmjs.com/) 

### **Installation**
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/civicpulse.git
   cd civicpulse
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   Create a `.env` file at the root level (see `.env.example` as reference):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
   *The local server will boot on port `3000`.*

---

## 🔑 Demo Credentials

To experience both pathways of the platform seamlessly, you can use these test accounts:

### 🏛️ **Official Department Login**
* **Portal tab:** Choose the **🏛️ Official** option in the Login page.
* **Official Email:** `admin@civicpulse.in`
* **Secret Password:** `admin123`
* *Allows full high-command access, worker deployment, SLA tracking, and resolution commands.*

### 🏙️ **Standard Citizen Login**
* **Email:** `demo@civicpulse.in`
* **Password:** `demo123` (or register a fresh account)
* *Allows logging new issues, upvoting, viewing XP ranks, and tracking resolution history.*

---
*Created with dedication to building cleaner, safer, and smarter urban cities.*
