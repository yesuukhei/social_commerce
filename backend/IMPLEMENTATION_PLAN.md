# 🎯 Implementation Plan - Social Commerce Automation

## Current Status: Foundation Complete ✅

### Already Implemented:

- ✅ Database models (Customer, Order, Conversation)
- ✅ MongoDB connection
- ✅ Express server with security middleware
- ✅ Environment configuration

---

## 🚀 Missing Functionalities (Priority Order)

### **PHASE 1: Core Backend API** (Week 1-2)

#### 1. **Messenger Webhook Integration** 🔴 CRITICAL

**Files to create:**

- `routes/webhook.js` - Facebook webhook endpoints
- `controllers/webhookController.js` - Handle incoming messages
- `services/messengerService.js` - Send/receive messages via FB API

**What it does:**

- Receives messages from Facebook Messenger
- Verifies webhook token
- Processes incoming customer messages
- Sends automated responses

**Status:** ❌ Not started

---

#### 2. **AI Order Extraction Service** 🔴 CRITICAL

**Files to create:**

- `services/aiService.js` - OpenAI integration
- `utils/promptTemplates.js` - Mongolian language prompts
- `utils/validators.js` - Validate extracted data

**What it does:**

- Takes Mongolian text message
- Extracts: item_name, quantity, phone_number, address
- Returns structured JSON with confidence score
- Flags incomplete orders for human review

**Status:** ❌ Not started

---

#### 3. **Order Management Routes** 🟡 HIGH PRIORITY

**Files to create:**

- `routes/orders.js`
- `controllers/orderController.js`
- `middleware/auth.js` - Store owner authentication

**Endpoints needed:**

```
POST   /api/orders              - Create order (from AI extraction)
GET    /api/orders              - List all orders (with filters)
GET    /api/orders/:id          - Get single order
PATCH  /api/orders/:id/status   - Update order status
PATCH  /api/orders/:id/verify   - Human verification (approve/reject)
DELETE /api/orders/:id          - Cancel order
```

**Status:** ❌ Not started

---

#### 4. **Customer Management Routes** 🟡 HIGH PRIORITY

**Files to create:**

- `routes/customers.js`
- `controllers/customerController.js`

**Endpoints needed:**

```
GET    /api/customers           - List all customers
GET    /api/customers/:id       - Get customer details
GET    /api/customers/:id/orders - Get customer order history
PATCH  /api/customers/:id       - Update customer info
```

**Status:** ❌ Not started

---

### **PHASE 2: Dashboard & Admin Panel** (Week 2-3)

#### 5. **Admin Dashboard Backend** 🟢 MEDIUM PRIORITY

**Files to create:**

- `routes/dashboard.js`
- `controllers/dashboardController.js`

**Endpoints needed:**

```
GET /api/dashboard/stats        - Overview statistics
GET /api/dashboard/pending      - Orders needing review
GET /api/dashboard/recent       - Recent activity
```

**Status:** ❌ Not started

---

#### 6. **Authentication System** 🟢 MEDIUM PRIORITY

**Files to create:**

- `models/User.js` - Store owner/admin model
- `routes/auth.js`
- `controllers/authController.js`
- `middleware/auth.js` - JWT verification

**Endpoints needed:**

```
POST /api/auth/register         - Create store account
POST /api/auth/login            - Login
POST /api/auth/logout           - Logout
GET  /api/auth/me               - Get current user
```

**Status:** ❌ Not started

---

### **PHASE 3: Integrations** (Week 3-4)

#### 7. **Google Sheets Integration** 🟢 MEDIUM PRIORITY

**Files to create:**

- `services/googleSheetsService.js`
- `config/googleSheets.js`

**What it does:**

- Auto-export orders to Google Sheets
- Real-time sync when order is created/updated
- Format: Order ID, Customer, Items, Phone, Address, Status, Date

**Status:** ❌ Not started

---

#### 8. **Notification System** 🔵 LOW PRIORITY

**Files to create:**

- `services/notificationService.js`

**What it does:**

- Send Messenger notification to customer (order confirmed)
- Send notification to store owner (new order pending)
- Email notifications (optional)

**Status:** ❌ Not started

---

### **PHASE 4: Testing & Optimization** (Week 4)

#### 9. **Unit Tests** 🔵 LOW PRIORITY

**Files to create:**

- `tests/aiService.test.js`
- `tests/orderController.test.js`
- `tests/webhook.test.js`

**Status:** ❌ Not started

---

#### 10. **Error Logging & Monitoring** 🔵 LOW PRIORITY

**Files to create:**

- `services/errorLogger.js` - Structured error logging
- `middleware/requestLogger.js` - API request logging

**Status:** ❌ Not started (winston was removed)

---

## 📋 Immediate Next Steps (This Week)

### **Step 1: Messenger Webhook** (Day 1-2)

1. Create webhook route and controller
2. Set up Facebook App and get credentials
3. Implement webhook verification
4. Test receiving messages

### **Step 2: AI Service** (Day 2-3)

1. Create OpenAI service
2. Write Mongolian extraction prompt
3. Test with sample messages
4. Handle edge cases (missing info)

### **Step 3: Order Routes** (Day 3-4)

1. Create order CRUD endpoints
2. Implement human verification flow
3. Test order creation from AI extraction

### **Step 4: Basic Dashboard** (Day 5-7)

1. Create simple admin endpoints
2. Build basic authentication
3. Test end-to-end flow

---

## 🎯 Success Criteria for MVP

- [ ] Bot receives Messenger messages
- [ ] AI extracts order info from Mongolian text
- [ ] Orders saved to database
- [ ] Store owner can review/approve orders via API
- [ ] Orders export to Google Sheets (optional for MVP)
- [ ] Basic authentication for store owner

---

## 🔧 Environment Variables Needed

Update `.env` with real values:

```env
OPENAI_API_KEY=sk-...                    # Get from OpenAI
FACEBOOK_PAGE_ACCESS_TOKEN=...           # Get from Facebook Developer
FACEBOOK_VERIFY_TOKEN=my_custom_token    # Create your own
FACEBOOK_APP_SECRET=...                  # Get from Facebook Developer
```

---

## 📚 Resources Needed

1. **Facebook Developer Account** - Create app, get Messenger permissions
2. **OpenAI API Key** - Sign up at platform.openai.com
3. **Google Cloud Project** - For Sheets API (Phase 3)
4. **Deployment Platform** - Railway, Render, or AWS Lambda

---

**Last Updated:** 2026-01-31  
**Current Phase:** Phase 1 - Core Backend API
