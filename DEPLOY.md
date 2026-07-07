# نشر الموقع + لوحة التحكم (Railway)

لوحة التحكم على `raheeqkanjo.com/admin` تعمل الآن بكلمة مرور بسيطة بدل مفتاح GitHub.
هذا يتطلب تشغيل الموقع على **Railway** (خادم Next.js) بدل GitHub Pages الثابت.

## كلمة المرور
```
raheeq2026
```
يمكن تغييرها في أي وقت من متغيّرات Railway دون تعديل الكود.

## الخطوات (مرة واحدة)

### 1) الربط بـ Railway
- أنشئي مشروعًا جديدًا في https://railway.app واختاري *Deploy from GitHub repo*.
- اختاري المستودع: `sawafilms20-debug/sawafilms20-debug.github.io`.
- سيكتشف Railway ملف `railway.json` تلقائيًا ويشغّل `npm run start`.

### 2) ضبط المتغيّرات (Railway → Variables)
| المتغيّر | القيمة |
|---|---|
| `ADMIN_PASSWORD` | `raheeq2026` (أو أي كلمة تختارينها) |
| `GITHUB_TOKEN` | مفتاح GitHub دقيق الصلاحيات، صلاحية **Contents: Read & write** على المستودع نفسه |

> يُضبط `GITHUB_TOKEN` مرة واحدة فقط من مدير الموقع. رحيق لن تحتاج إليه أبدًا — تدخل بكلمة المرور فقط.
> إنشاء المفتاح: https://github.com/settings/tokens?type=beta → Generate → Repository access: هذا المستودع → Permissions → Contents: Read and write.

### 3) توجيه النطاق إلى Railway
- في Railway → Settings → Networking → *Custom Domain* → أضيفي `raheeqkanjo.com`.
- انسخي عنوان CNAME الذي يعطيه Railway.
- في إعدادات DNS للنطاق، استبدلي سجلّ GitHub Pages الحالي بسجلّ CNAME الجديد من Railway.

بعد اكتمال الخطوات الثلاث، افتحي `raheeqkanjo.com/admin`، أدخلي كلمة المرور، وابدئي النشر.

## تشغيل محلي
```
npm install
npm run dev
```
اضبطي ملف `.env.local` (غير مرفوع للمستودع):
```
ADMIN_PASSWORD=raheeq2026
GITHUB_TOKEN=<مفتاح-github>
```
