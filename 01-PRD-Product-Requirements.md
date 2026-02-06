
# Rave Cave - Product Requirements Document (PRD)
**Version:** 3.4.3  
**Last Updated:** February 3, 2026  
**Owner:** Jodie (Group Account Director, R/GA)

---

## 1. Vision Statement

**Rave Cave** is an AI-powered wine cellar management system that transforms wine inventory tracking into an intelligent, conversational experience. The system combines a Google Sheets database with Gemini AI to provide instant inventory queries, expert sommelier recommendations, and sophisticated wine pairing suggestions—all through a chat interface that feels like texting with a knowledgeable friend.

The name "Rave Cave" embodies the duality of the experience: the precision and control of a professional wine cellar ("Cave") meets the vibrant, immediate energy of modern tech ("Rave"). This is not a spreadsheet tool—it's your personal AI sommelier, available 24/7.

---

## 2. Core Features

### 2.1 Wine Inventory Management

**Add Wine via Photo Recognition**
- User uploads photo of wine label
- Gemini extracts: Producer, Vintage, Wine Name, Cépage, Region, Country, Type
- System auto-generates: Drinking Window (drinkFrom/drinkUntil), Maturity Status, Tasting Notes, Blend %
- Two-step flow:
  1. `stageWine` → Caches extracted details (CacheService, 6hr TTL)
  2. User provides price → `commitWine` → Merges price with cached data → Adds to sheet

### 2.2 AI Sommelier Query Engine
- Natural language inventory search.
- Wine pairing recommendations based on meal description.
- Drinking window intelligence.

### 2.3 Image Processing & Storage
- Hybrid image pipeline: glfx.js for vintage filters.
- Drive ID storage for image retrieval.
