#!/usr/bin/env bash
# إقلاع Azure App Service
# صورة Node الرسمية نحيفة ولا تحوي مكتبات النظام التي يرتبط بها Chromium
# (libnss3 وغيرها) — فنثبّتها هنا قبل تشغيل الخادم.
#
# ملاحظات:
# - نفحص أولًا هل المكتبات موجودة حتى لا نؤخّر إعادة التشغيل بلا داعٍ.
# - فشل apt لا يوقف الموقع: يبقى كل شيء عاملًا عدا تصدير PDF.
# - الخطوط ضرورية: بدونها يُطبع النص العربي مربعات فارغة.

set -u

say() { echo "[startup] $*"; }

if ldconfig -p 2>/dev/null | grep -q "libnss3.so"; then
  say "chromium libraries already present - skipping apt"
else
  say "installing chromium system libraries..."
  export DEBIAN_FRONTEND=noninteractive

  apt-get update -qq || say "apt-get update failed"

  apt-get install -y -qq --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxcb1 \
    libx11-6 \
    libxext6 \
    libexpat1 \
    libglib2.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    || say "core library install failed - PDF export will stay unavailable"

  # اسم حزمة ALSA تغيّر بين إصدارات ديبيان — نجرّب الاسمين
  apt-get install -y -qq --no-install-recommends libasound2 \
    || apt-get install -y -qq --no-install-recommends libasound2t64 \
    || say "libasound2 unavailable - harmless for printing"

  # خطوط: لاتينية للمعادلات وعربية لمتن المواضيع
  apt-get install -y -qq --no-install-recommends \
    fonts-liberation \
    fonts-noto-core \
    || say "font install failed - exported text may render as boxes"

  if ldconfig -p 2>/dev/null | grep -q "libnss3.so"; then
    say "chromium libraries installed"
  else
    say "WARNING: libnss3 still missing after install"
  fi
fi

say "starting Next.js server"
exec node server.js
