# منصات التعليم عن بعد (E-Learning / Moodle) — الجامعات الجزائرية

> دليل لجمع المحاضرات لموقع docmathdz.dev — مرتّب حسب slug الجامعة في `math-programs.json`
> ومجلدات `D:\lectures-library`.
>
> ⚠️ بعض الجامعات تغيّر عنوان منصتها من سنة لأخرى. إذا لم يعمل رابط، ابحث في Google بهذه الصيغة:
> `elearning أو moodle + اسم الجامعة` أو `site:*.dz elearning <اسم الجامعة>`

## كيف تستعمل هذه المنصات؟

1. افتح رابط المنصة → ابحث عن قسم **Faculté des Sciences / Mathématiques / MI**.
2. جرّب زر **« Se connecter en tant qu'invité » (الدخول كضيف)** — كثير من الدروس مفتوحة للقراءة فقط.
3. حمّل ملفات PDF وضعها في المجلد المناسب:
   `D:\lectures-library\<slug>\<L1|L2>\<المقياس>\` أو `D:\lectures-library\<slug>\<L3|M1|M2>\<التخصص>\<المقياس>\`
4. ثم ارفع كل شيء للموقع:

```powershell
cd D:\doctorate-topics-platform
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library" --dry
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"
```

---

## الجامعات الكبرى (روابط مؤكدة أو شبه مؤكدة)

| slug | الجامعة | منصة E-Learning |
|---|---|---|
| usthb | جامعة هواري بومدين USTHB | https://elearning.usthb.dz |
| alger-1 | جامعة الجزائر 1 بن يوسف بن خدة | https://elearning.univ-alger.dz |
| ensm | المدرسة العليا للرياضيات NHSM | https://www.nhsm.edu.dz |
| ens-kouba | المدرسة العليا للأساتذة القبة | https://elearning.ens-kouba.dz |
| constantine-1 | جامعة قسنطينة 1 الإخوة منتوري | https://telecom.umc.edu.dz |
| oran-1 | جامعة وهران 1 أحمد بن بلة | https://elearn.univ-oran1.dz |
| usto | جامعة وهران للعلوم والتكنولوجيا USTO | https://elearning.univ-usto.dz |
| annaba | جامعة باجي مختار عنابة | https://elearning.univ-annaba.dz |
| setif-1 | جامعة فرحات عباس سطيف 1 | https://cte.univ-setif.dz |
| tlemcen | جامعة أبو بكر بلقايد تلمسان | https://elearn.univ-tlemcen.dz |
| tizi-ouzou | جامعة مولود معمري تيزي وزو | https://elearning.ummto.dz |
| bejaia | جامعة عبد الرحمان ميرة بجاية | https://elearning.univ-bejaia.dz |
| batna-1 | جامعة باتنة 1 الحاج لخضر | https://elearning.univ-batna.dz |
| batna-2 | جامعة باتنة 2 مصطفى بن بولعيد | https://elearning.univ-batna2.dz |
| blida-1 | جامعة البليدة 1 سعد دحلب | https://elearning.univ-blida.dz |
| blida-2 | جامعة البليدة 2 لونيسي علي | https://elearning.univ-blida2.dz |
| boumerdes | جامعة أمحمد بوقرة بومرداس | https://elearning.univ-boumerdes.dz |
| biskra | جامعة محمد خيضر بسكرة | https://elearning.univ-biskra.dz |
| ouargla | جامعة قاصدي مرباح ورقلة | https://moodle.univ-ouargla.dz ✅ |
| msila | جامعة محمد بوضياف المسيلة | https://virtuelcampus.univ-msila.dz |

## باقي الجامعات (النمط القياسي `elearning.univ-<slug>.dz`)

| slug | الجامعة | منصة E-Learning |
|---|---|---|
| adrar | جامعة أحمد دراية أدرار | https://elearning.univ-adrar.edu.dz |
| chlef | جامعة حسيبة بن بوعلي الشلف | https://elearning.univ-chlef.dz |
| laghouat | جامعة عمار ثليجي الأغواط | https://elearning.lagh-univ.dz |
| oum-el-bouaghi | جامعة أم البواقي | https://elearning.univ-oeb.dz |
| bechar | جامعة طاهري محمد بشار | https://elearning.univ-bechar.dz |
| bouira | جامعة أكلي محند أولحاج البويرة | https://elearning.univ-bouira.dz |
| tamanghasset | جامعة تمنراست | https://elearning.univ-tam.dz |
| tebessa | جامعة العربي التبسي تبسة | https://elearning.univ-tebessa.dz |
| tiaret | جامعة ابن خلدون تيارت | https://moodle.univ-tiaret.dz |
| djelfa | جامعة زيان عاشور الجلفة | https://elearning.univ-djelfa.dz |
| jijel | جامعة محمد الصديق بن يحيى جيجل | https://elearning.univ-jijel.dz |
| saida | جامعة مولاي الطاهر سعيدة | https://elearning.univ-saida.dz |
| skikda | جامعة 20 أوت 1955 سكيكدة | https://elearning.univ-skikda.dz |
| sidi-bel-abbes | جامعة جيلالي ليابس سيدي بلعباس | https://elearning.univ-sba.dz |
| guelma | جامعة 8 ماي 1945 قالمة | https://elearning.univ-guelma.dz |
| medea | جامعة يحيى فارس المدية | https://elearning.univ-medea.dz |
| mostaganem | جامعة عبد الحميد بن باديس مستغانم | https://elearning.univ-mosta.dz |
| mascara | جامعة مصطفى اسطمبولي معسكر | https://elearning.univ-mascara.dz |
| bordj-bou-arreridj | جامعة برج بوعريريج | https://elearning.univ-bba.dz ✅ |
| el-tarf | جامعة الشاذلي بن جديد الطارف | https://elearning.univ-eltarf.dz |
| tissemsilt | جامعة تيسمسيلت | https://elearning.univ-tissemsilt.dz |
| el-oued | جامعة الشهيد حمة لخضر الوادي | https://elearning.univ-eloued.dz |
| khenchela | جامعة عباس لغرور خنشلة | https://elearning.univ-khenchela.dz |
| souk-ahras | جامعة محمد الشريف مساعدية سوق أهراس | https://elearning.univ-soukahras.dz |
| tipaza | المركز الجامعي تيبازة | https://elearning.cu-tipaza.dz |
| mila | المركز الجامعي عبد الحفيظ بوالصوف ميلة | https://elearning.univ-mila.dz ✅ |
| ain-defla | جامعة الجيلالي بونعامة خميس مليانة | https://elearning.univ-dbkm.dz |
| naama | جامعة النعامة | https://elearning.cuniv-naama.dz |
| ain-temouchent | جامعة بلحاج بوشعيب عين تموشنت | https://elearning.univ-temouchent.edu.dz |
| ghardaia | جامعة غرداية | https://elearning.univ-ghardaia.dz |
| relizane | جامعة أحمد زبانة غليزان | https://elearning.univ-relizane.dz |

## المراكز الجامعية الصغيرة (ابحث أولا — منصاتها تتغير كثيرا)

| slug | المركز | ابحث في Google عن |
|---|---|---|
| el-bayadh | المركز الجامعي البيض | `elearning cu-elbayadh` |
| illizi | المركز الجامعي إيليزي | `المركز الجامعي إيليزي elearning` |
| tindouf | المركز الجامعي تندوف | `المركز الجامعي تندوف elearning` |
| barika | المركز الجامعي بريكة | `المركز الجامعي بريكة elearning` |
| aflou | المركز الجامعي أفلو | `cu-aflou elearning` |
| maghnia | المركز الجامعي مغنية | `المركز الجامعي مغنية elearning` |
| in-salah | المركز الجامعي عين صالح | `المركز الجامعي عين صالح elearning` |
| timimoun | المركز الجامعي تيميمون | `cu-timimoun elearning` |
| touggourt | جامعة تقرت | `univ-touggourt elearning` |
| el-meghaier | المركز الجامعي المغير | `المركز الجامعي المغير elearning` |
| bordj-badji-mokhtar | المركز الجامعي برج باجي مختار | `برج باجي مختار المركز الجامعي elearning` |

---

## المستودعات الرقمية DSpace (تحميل مباشر بدون حساب ⭐)

هنا تجد **المطبوعات البيداغوجية (Polycopiés)** الرسمية — أفضل مصدر للبداية السريعة:

| الجامعة | الرابط |
|---|---|
| تيزي وزو (257 مطبوعة معتمدة) | https://dspace.ummto.dz ✅ |
| عنابة (قسم Supports de cours) | https://dspace.univ-annaba.dz ✅ |
| سطيف 1 | http://dspace.univ-setif.dz:8888 ✅ |
| قالمة (Polycopié de Cours) | https://dspace.univ-guelma.dz ✅ |
| معسكر | http://dspace.univ-mascara.dz:8080 ✅ |
| وهران USTO | https://dspace.univ-usto.dz ✅ |
| القاعدة لباقي الجامعات | ابحث: `dspace univ-<slug>` |

## صيغ بحث ذهبية في Google 🔎

```
filetype:pdf site:*.dz polycopié analyse fonctionnelle
filetype:pdf site:*.dz cours algèbre L2 mathématiques
filetype:pdf site:*.dz cours topologie licence
filetype:pdf site:*.dz probabilités statistique master
```

> ✅ = تم التحقق منه فعليا أثناء إعداد هذا الدليل. الباقي روابط قياسية معروفة قد تتغير.
