# دليل الإعداد السريع

## الخطوات الأساسية

### 1. إعداد قاعدة البيانات

1. اذهب إلى [Neon](https://neon.tech) وأنشئ حساب جديد
2. أنشئ مشروع جديد وقاعدة بيانات
3. انسخ رابط الاتصال (Connection String)

### 2. إعداد المتغيرات البيئية

#### في مجلد `server`:
أنشئ ملف `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
```

#### في مجلد `client`:
أنشئ ملف `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. تثبيت الحزم

```bash
# من المجلد الجذر
npm install

# تثبيت حزم الخادم
cd server
npm install

# تثبيت حزم العميل
cd ../client
npm install
```

### 4. إعداد قاعدة البيانات

```bash
cd server

# توليد Prisma Client
npx prisma generate

# تشغيل Migrations
npx prisma migrate dev --name init
```

### 5. إنشاء بيانات أولية (اختياري)

يمكنك إنشاء مستخدم IT Manager أولي من خلال Prisma Studio:

```bash
cd server
npx prisma studio
```

أو يمكنك إنشاء مستخدم من خلال واجهة التسجيل ثم تعديله في قاعدة البيانات.

### 6. تشغيل التطبيق

من المجلد الجذر:

```bash
npm run dev
```

أو بشكل منفصل:

```bash
# Terminal 1 - الخادم
cd server
npm run dev

# Terminal 2 - العميل
cd client
npm run dev
```

## إنشاء الحسابات الأولية (Seed Data) ✅

**الطريقة الأسهل:** استخدم Seed Script:

```bash
cd server
npm run seed
```

هذا سينشئ:
- ✅ Super Admin: `admin@ticketing.com` / `admin123`
- ✅ IT Manager: `manager@ticketing.com` / `manager123`
- ✅ IT Admin: `itadmin@ticketing.com` / `admin123`
- ✅ Technician 1: `technician1@ticketing.com` / `tech123`
- ✅ Technician 2: `technician2@ticketing.com` / `tech123`
- ✅ 3 تخصصات افتراضية (Help Desk, Network, Server/Admin)

**⚠️ مهم:** غيّر كلمة مرور Super Admin بعد أول تسجيل دخول!

راجع ملف `SEED_INSTRUCTIONS.md` للتفاصيل الكاملة.

## إنشاء فنيين

1. اذهب إلى صفحة "المستخدمون" (IT Manager فقط)
2. انقر على "إضافة مستخدم"
3. اختر الدور "Technician"
4. اختر التخصص المناسب

## اختبار النظام

1. **إنشاء تذكرة كمستخدم عادي:**
   - سجل كمستخدم عادي
   - أنشئ تذكرة جديدة
   - اختر نوع "مشكلة محددة مسبقاً" واختر تخصص
   - يجب أن يتم تعيينها تلقائياً على فني متاح

2. **إنشاء تذكرة مخصصة:**
   - أنشئ تذكرة جديدة
   - اختر نوع "مشكلة مخصصة"
   - يجب أن تظهر لـ IT Admin فقط

3. **تحديث حالة التذكرة (فني):**
   - سجل كفني
   - افتح تذكرة مخصصة لك
   - غيّر الحالة من ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED

## استكشاف الأخطاء

### خطأ في الاتصال بقاعدة البيانات
- تأكد من أن `DATABASE_URL` صحيح
- تأكد من أن قاعدة البيانات على Neon نشطة
- تحقق من إعدادات SSL

### خطأ في Prisma
```bash
cd server
npx prisma generate
npx prisma migrate reset  # احذر: هذا سيحذف جميع البيانات
```

### خطأ في Port
- تأكد من أن Port 5000 و 3000 غير مستخدمين
- غيّر PORT في `.env` إذا لزم الأمر

## الإنتاج

### بناء التطبيق

```bash
cd client
npm run build
```

### تشغيل الإنتاج

```bash
# الخادم
cd server
npm start

# العميل
cd client
npm start
```

## ملاحظات مهمة

- **JWT_SECRET**: يجب أن يكون عشوائياً وقوياً في الإنتاج
- **DATABASE_URL**: استخدم Connection Pooling في الإنتاج
- **CORS**: تأكد من إعداد CORS بشكل صحيح في الإنتاج
- **Environment Variables**: لا ترفع ملفات `.env` إلى Git

