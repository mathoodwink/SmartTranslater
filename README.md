# SmartTranslater

Переводчик выделенного текста **RU ↔ EN** для Windows. Работает в любом приложении через глобальные хоткеи: Telegram, браузер, Word, блокнот и т.д.

[![Release](https://img.shields.io/github/v/release/mathoodwink/SmartTranslater?label=release)](https://github.com/mathoodwink/SmartTranslater/releases)
[![Windows](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/mathoodwink/SmartTranslater/releases)

## Скачать

Перейдите на страницу **[Releases](https://github.com/mathoodwink/SmartTranslater/releases/latest)** и выберите нужный вариант:

| Файл | Для кого | Что делать |
|------|----------|------------|
| **`SmartTranslater-Setup-x.x.x.exe`** | Большинству пользователей | Скачать → запустить → «Далее» → готово |
| **`SmartTranslater-x.x.x-win-x64.zip`** | Portable (без установки) | Скачать → **Извлечь всё** (WinRAR не нужен) → запустить `SmartTranslater.exe` |

> **Важно для portable:** не запускайте exe прямо из архива — сначала распакуйте zip в любую папку.

## Быстрый старт

1. Установите или распакуйте приложение.
2. Запустите SmartTranslater — иконка появится в **трее** (рядом с часами).
3. Выделите текст в любом приложении.
4. Нажмите хоткей:
   - **Просмотр** — маленькое окно с переводом у курсора
   - **Замена** — выделенный текст заменится переводом на месте

Окно настроек открывается через трей → **«Показать окно»**.

## Хоткеи по умолчанию

| Действие | Хоткей |
|----------|--------|
| Просмотр перевода | `Shift + Ъ` |
| Замена текста | `Ctrl + Shift + 2` |

Хоткеи можно изменить в настройках: кликните в поле и нажмите нужное сочетание. Поддерживаются русские буквы и комбо вроде `Q + R` (без Ctrl/Alt).

## Обновления

- **Установленная версия:** трей → **«Проверить обновления»** (или автоматически при выходе новой версии).
- **Portable:** скачайте новый zip с [Releases](https://github.com/mathoodwink/SmartTranslater/releases/latest) и замените папку.

## Требования

- Windows 10 / 11 (64-bit)
- Интернет (перевод через Google)

## Разработка

```bash
git clone https://github.com/mathoodwink/SmartTranslater.git
cd SmartTranslater
npm install
npm run dev
```

Локальная сборка установщика и portable:

```bash
npm run dist
```

Файлы появятся в папке `release/`:
- `SmartTranslater-Setup-1.0.0.exe` — установщик
- `SmartTranslater-1.0.0-win-x64.zip` — portable

## Публикация релиза (для maintainer)

```bash
# 1. Обновите version в package.json
# 2. Закоммитьте изменения
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

GitHub Actions автоматически соберёт и опубликует установщик + portable на странице Releases.

## Лицензия

MIT — см. [LICENSE](LICENSE).
