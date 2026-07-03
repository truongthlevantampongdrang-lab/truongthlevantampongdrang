# CLEANUP_CHECKLIST.md

## Trước khi đưa dự án vào Google AI Studio

Nên giữ:
- src/
- public/
- assets/
- scripts/
- .github/workflows/
- index.html
- package.json
- package-lock.json
- tsconfig.json
- vite.config.ts
- README.md
- robots.txt
- sitemap.xml
- manifest.webmanifest
- google*.html
- AI_INSTRUCTIONS.md
- PROMPT_FOR_AI_STUDIO.md
- SEO_TEMPLATE.md
- GITHUB_PAGES_GUIDE.md

Nên xóa trước khi đóng gói ZIP:
- node_modules/
- dist/
- .git/
- .DS_Store
- Thumbs.db
- file .env có chứa API key thật

Có thể giữ:
- .env.example
- README.md

Không đưa lên GitHub công khai:
- API key thật
- mật khẩu
- token GitHub
- thông tin cá nhân nhạy cảm
