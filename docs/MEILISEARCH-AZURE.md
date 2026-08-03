# ☁️ نشر Meilisearch على Azure — Deploy Meilisearch on Azure

للموقع المستضاف على **Azure** بدون أي خادم محلّي.
For the site hosted on **Azure**, with no local server at all.

---

## الخيار A — Azure Container Instances (تحكّم كامل / full control)

خادم Meilisearch دائم مع تخزين Azure Files حتّى لا تضيع الفهارس عند إعادة التشغيل.

```bash
RG=docmathdz-rg
LOC=francecentral
SA=docmathmeili$RANDOM
KEY="docmath_meili_$(openssl rand -hex 16)"

az group create -n $RG -l $LOC

az storage account create -n $SA -g $RG -l $LOC --sku Standard_LRS
SAKEY=$(az storage account keys list -g $RG -n $SA --query "[0].value" -o tsv)
az storage share create -n meilidata --account-name $SA --account-key $SAKEY

az container create \
  -g $RG -n docmath-meili \
  --image getmeili/meilisearch:v1.11 \
  --cpu 1 --memory 2 \
  --ports 7700 \
  --ip-address Public \
  --dns-name-label docmath-meili \
  --environment-variables MEILI_ENV=production MEILI_NO_ANALYTICS=true \
  --secure-environment-variables MEILI_MASTER_KEY="$KEY" \
  --azure-file-volume-account-name $SA \
  --azure-file-volume-account-key "$SAKEY" \
  --azure-file-volume-share-name meilidata \
  --azure-file-volume-mount-path /meili_data \
  --restart-policy Always

echo "MEILI_HOST=http://docmath-meili.$LOC.azurecontainer.io:7700"
echo "MEILI_MASTER_KEY=$KEY"
```

الأمان / Security:

- المفتاح لا يصل المتصفّح أبداً — كل طلب يمرّ عبر `/api/theses/search` من جهة الخادم.
- للحصول على HTTPS وعزل شبكي كامل، انشر نفس الحاوية داخل VNet واربطها بـ App Service عبر VNet Integration.

---

## الخيار B — Azure Web App for Containers (HTTPS جاهز)

```bash
RG=docmathdz-rg
PLAN=docmath-meili-plan
APP=docmath-meili
KEY="docmath_meili_$(openssl rand -hex 16)"

az appservice plan create -g $RG -n $PLAN --is-linux --sku B1
az webapp create -g $RG -p $PLAN -n $APP --deployment-container-image-name getmeili/meilisearch:v1.11
az webapp config appsettings set -g $RG -n $APP --settings \
  WEBSITES_PORT=7700 \
  MEILI_ENV=production \
  MEILI_NO_ANALYTICS=true \
  MEILI_MASTER_KEY="$KEY" \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE=true \
  MEILI_DB_PATH=/home/meili_data

echo "MEILI_HOST=https://$APP.azurewebsites.net"
echo "MEILI_MASTER_KEY=$KEY"
```

✅ يعطي HTTPS تلقائياً وتخزيناً دائماً في `/home`.

---

## الخيار C — Meilisearch Cloud (بدون إدارة / zero ops)

<https://cloud.meilisearch.com> — أنشئ مشروعاً، خذ `Host` و `Default Admin API Key`.

---

## ربط الموقع — Wire it to the site

```bash
az webapp config appsettings set \
  -g docmathdz-rg -n <اسم-موقعك> \
  --settings MEILI_HOST="https://docmath-meili.azurewebsites.net" \
             MEILI_MASTER_KEY="<المفتاح>"

az webapp restart -g docmathdz-rg -n <اسم-موقعك>
```

---

## المزامنة بدون خادم محلّي — Sync without a local server

سكربت المزامنة يقرأ من MongoDB ويكتب إلى Meilisearch السحابي، ويمكن تشغيله:

**من Azure Cloud Shell** (لا حاجة لجهازك):

```bash
git clone https://github.com/abdelouahabmostafaetu-bot/doctorate-topics-platform.git
cd doctorate-topics-platform
npm install
export MONGODB_URI="<رابط-مونغو>"
export MEILI_HOST="https://docmath-meili.azurewebsites.net"
export MEILI_MASTER_KEY="<المفتاح>"
npm run meili:sync
```

**أو تلقائياً عبر GitHub Actions** — `.github/workflows/meili-sync.yml`:

```yaml
name: meili-sync
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run meili:sync
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          MEILI_HOST: ${{ secrets.MEILI_HOST }}
          MEILI_MASTER_KEY: ${{ secrets.MEILI_MASTER_KEY }}
```

أضف الأسرار الثلاثة في: Repo → Settings → Secrets and variables → Actions.

---

## التحقّق — Verify

```bash
curl -H "Authorization: Bearer <المفتاح>" https://docmath-meili.azurewebsites.net/health
curl -H "Authorization: Bearer <المفتاح>" https://docmath-meili.azurewebsites.net/indexes/theses/stats
```

ثم افتح `https://www.docmathdz.dev/theses` — إن ظهر البحث الفوري فكل شيء يعمل.
