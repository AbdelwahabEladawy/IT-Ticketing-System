# IT Ticketing System

نظام إدارة تذاكر IT كامل باستخدام Next.js, Express, Prisma, و Neon (PostgreSQL).

## المميزات

- ✅ نظام أدوار متعدد (User, Technician, IT Admin, IT Manager)
- ✅ توزيع تلقائي للتذاكر (Round Robin)
- ✅ تتبع SLA (Service Level Agreement)
- ✅ إدارة حالة الفنيين (Available/Busy/Offline)
- ✅ نظام إشعارات
- ✅ سجل تدقيق (Audit Log)
- ✅ لوحات تحكم مخصصة لكل دور
- ✅ دعم اللغة العربية

## التقنيات المستخدمة

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma

## التثبيت

### 1. تثبيت المتطلبات

```bash
# تثبيت dependencies للجذر
npm install

# تثبيت dependencies للخادم
cd server
npm install

# تثبيت dependencies للعميل
cd ../client
npm install
```

### 2. إعداد قاعدة البيانات

1. أنشئ قاعدة بيانات على [Neon](https://neon.tech)
2. انسخ ملف `.env.example` في مجلد `server` إلى `.env`
3. أضف رابط قاعدة البيانات في `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
JWT_SECRET="your-secret-key-change-in-production"
PORT=5000
FIREWALL_TICKET_SYSTEM_EMAIL="firewall-bot@globalenergy-eg.com"
# Optional hardening for FortiGate internal endpoint:
# FIREWALL_ALLOWED_ORIGINS="https://fortigate.local,https://blocked.globalenergy-eg.net"
# FIREWALL_TRUST_X_FORWARDED_FOR=false
# FIREWALL_DUPLICATE_WINDOW_MINUTES=30
```

### 3. إعداد Prisma

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

### 4. إعداد العميل

في مجلد `client`، أنشئ ملف `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## التشغيل

### تشغيل التطبيق بالكامل

من المجلد الجذر:

```bash
npm run dev
```

هذا سيشغل:
- الخادم على `http://localhost:5000`
- العميل على `http://localhost:3000`

### تشغيل منفصل

```bash
# الخادم فقط
npm run dev:server

# العميل فقط
npm run dev:client
```

## الأدوار والصلاحيات

### User (مستخدم)
- إنشاء تذاكر
- عرض تذاكره الخاصة
- متابعة حالة التذاكر

### Technician (فني)
- استلام التذاكر المخصصة تلقائياً
- تحديث حالة التذاكر
- إدارة حالة التوفر

### IT Admin (مدير IT)
- عرض التذاكر المخصصة فقط
- تعيين التذاكر المخصصة على الفنيين
- تغيير حالة الفنيين

### IT Manager (مدير IT)
- عرض جميع التذاكر
- إعادة تعيين التذاكر
- إدارة التخصصات
- إدارة المستخدمين
- تغيير حالة الفنيين

## SLA (Service Level Agreement)

- **Low Priority**: 48 ساعة
- **Medium Priority**: 24 ساعة
- **High Priority**: 4 ساعات

النظام يرسل تنبيهات تلقائية قبل انتهاء الوقت.

## Round Robin Assignment

التذاكر المحددة مسبقاً يتم توزيعها تلقائياً على الفنيين المتاحين حسب:
1. التخصص
2. حالة التوفر (Available أولاً)
3. عدد التذاكر النشطة (Round Robin)

## البنية

```
.
├── client/          # Next.js Frontend
│   ├── pages/       # صفحات التطبيق
│   ├── components/  # المكونات
│   └── utils/       # الأدوات المساعدة
├── server/          # Express Backend
│   ├── routes/      # مسارات API
│   ├── middleware/  # Middleware
│   ├── utils/       # الأدوات المساعدة
│   └── prisma/      # Prisma Schema
└── package.json     # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - إنشاء حساب
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/me` - المستخدم الحالي

### Tickets
- `GET /api/tickets` - جميع التذاكر (مفلترة حسب الدور)
- `POST /api/tickets` - إنشاء تذكرة
- `GET /api/tickets/:id` - تفاصيل التذكرة
- `PATCH /api/tickets/:id/status` - تحديث الحالة
- `POST /api/tickets/:id/assign` - تعيين تذكرة (IT Admin)
- `POST /api/tickets/:id/reassign` - إعادة تعيين (IT Manager)

### Internal (Firewall Integration)
- `POST /internal/firewall-ticket` - إنشاء تذكرة تلقائياً من صفحة الحظر (بدون login)
- `GET /internal/fortigate-block-page.html` - صفحة حظر جاهزة مع إرسال تلقائي للتيكت

### Users
- `GET /api/users` - جميع المستخدمين (IT Manager)
- `GET /api/users/technicians` - الفنيين
- `POST /api/users` - إنشاء مستخدم (IT Manager)
- `PATCH /api/users/:id/status` - تحديث حالة الفني

### Specializations
- `GET /api/specializations` - جميع التخصصات
- `POST /api/specializations` - إنشاء تخصص (IT Manager)
- `PATCH /api/specializations/:id` - تحديث تخصص (IT Manager)

### Dashboard
- `GET /api/dashboard` - بيانات لوحة التحكم (حسب الدور)

### Notifications
- `GET /api/notifications` - الإشعارات
- `PATCH /api/notifications/:id/read` - تحديد كمقروء
- `PATCH /api/notifications/read-all` - تحديد الكل كمقروء

## التطوير

### Prisma Studio

لعرض وإدارة قاعدة البيانات:

```bash
cd server
npm run prisma:studio
```

### Migrations

```bash
cd server
npx prisma migrate dev
```

## الإنتاج

### بناء التطبيق

```bash
cd client
npm run build
```

### تشغيل الإنتاج

```bash
cd server
npm start
```

## الترخيص

MIT

