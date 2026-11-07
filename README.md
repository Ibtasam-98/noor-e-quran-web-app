# Noor-e-Quran
Zero-dependency PWA (plain HTML/CSS/JS). No `npm install`, no build step.

## Run
    cd noor-e-quran
    python3 -m http.server 8080      # or: npx serve .
Open http://localhost:8080 (localhost is required for geolocation, service worker and install).

## APIs
AlQuran Cloud (text, translations, search, audio CDN cdn.islamic.network, reciters), Aladhan (prayer times, Hijri, Qibla, Asma ul Husna, special days), fawazahmed0 Hadith API (jsDelivr).
Responses are cached in localStorage and by the service worker for offline use.

## Not included in this build
Cloud accounts/sync, word-by-word & tafsir, Quran.com/Sunnah.com (need API keys), stories/quizzes, audio downloads, wallpapers, daily Hadith push (needs server).
# noor-e-quran-web-app
