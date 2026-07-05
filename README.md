# English Learning Backend

Express.js + TypeScript + MongoDB + Redis backend cho web học tiếng Anh với AI.

## Yêu cầu

- **Node.js** >= 18.x
- **MongoDB** >= 6.0 (cài local hoặc dùng Docker)
- **Redis** >= 7.x (cài local hoặc dùng Docker)
- **OpenAI API Key** (bắt buộc để AI generate dữ liệu)

---

## Cài đặt MongoDB & Redis

### Cách 1: Docker (khuyến nghị)

```bash
# Kéo và chạy MongoDB
docker run -d --name english-mongo \
  -p 27017:27017 \
  -v english-mongo-data:/data/db \
  mongo:7

# Kéo và chạy Redis
docker run -d --name english-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Kiểm tra:**
```bash
docker ps | grep english
# Phải thấy cả 2 container đang chạy
```

**Dừng/Xóa khi cần:**
```bash
docker stop english-mongo english-redis
docker rm english-mongo english-redis
```

### Cách 2: Cài trực tiếp (macOS)

```bash
# Cài MongoDB bằng Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Cài Redis bằng Homebrew
brew install redis
brew services start redis
```

### Cách 3: MongoDB Atlas (cloud miễn phí)

1. Vào https://www.mongodb.com/atlas → đăng ký tài khoản miễn phí
2. Tạo cluster (Free Tier M0)
3. Vào Database → Connect → chọn "Drivers"
4. Copy connection string, thay `<db_password>` bằng password
5. Dán vào file `.env` ở `MONGODB_URI`

### Cách 4: Redis Cloud (cloud miễn phí)

1. Vào https://redis.io/try-free/ → đăng ký
2. Tạo database (Free tier 30MB)
3. Copy `Public endpoint` dán vào `.env` ở `REDIS_URL`

---

## Cài đặt & Chạy

```bash
# 1. Vào thư mục backend
cd backend

# 2. Cài dependencies
npm install

# 3. Copy file env từ mẫu
cp .env .env.local

# 4. Sửa .env.local - điền OPENAI_API_KEY
#    OPENAI_API_KEY=sk-your-actual-key
#    (MongoDB và Redis mặc định localhost, không cần sửa nếu dùng Docker)

# 5. Seed dữ liệu ban đầu bằng AI (tạo 300 từ + 30 hội thoại)
npm run seed

# 6. Chạy dev server
npm run dev

# 7. Terminal khác: chạy queue worker cho background jobs
npm run worker
```

Server chạy tại `http://localhost:5000`.

---

## Cấu trúc thư mục

```
src/
├── config/              # MongoDB, Redis, env
├── models/              # Mongoose schemas (8 models)
├── controllers/         # Business logic
├── services/            # AI + SRS + XP + Streak
├── routes/              # Express routes
├── middleware/           # JWT auth, rate limiting
├── queues/              # BullMQ background jobs
└── scripts/             # Seed dữ liệu
```

---

## API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập → JWT token |
| GET | `/api/auth/me` | Thông tin user hiện tại |
| PATCH | `/api/auth/profile` | Cập nhật profile |

### Vocabulary
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/vocabularies/generate` | AI gen từ mới |
| POST | `/api/vocabularies/generate-batch` | AI gen nhiều từ |
| GET | `/api/vocabularies/my` | Danh sách từ của user |
| GET | `/api/vocabularies/review/today` | Từ cần ôn hôm nay |
| POST | `/api/vocabularies/review` | Gửi kết quả ôn tập (SM-2) |
| GET | `/api/vocabularies/stats` | Thống kê từ vựng |

### Conversations
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/conversations/generate` | AI gen hội thoại |
| GET | `/api/conversations` | Danh sách hội thoại |
| GET | `/api/conversations/:id` | Chi tiết hội thoại |

### Pronunciation
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/pronunciation/score` | Upload audio → AI chấm điểm |
| GET | `/api/pronunciation/history` | Lịch sử luyện phát âm |
| GET | `/api/pronunciation/:id` | Chi tiết 1 lần chấm |

### Shadowing
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/shadowing/score` | Upload audio shadowing → chấm |
| GET | `/api/shadowing/history` | Lịch sử shadowing |

### Roadmap
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/roadmap/generate` | AI gen lộ trình 30 ngày |
| GET | `/api/roadmap/my` | Lộ trình active |
| GET | `/api/roadmap/day/:day` | Bài học ngày cụ thể |
| POST | `/api/roadmap/day/:day/complete` | Hoàn thành ngày |

### Progress
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/progress/stats` | Tổng quan (streak, XP, từ) |
| GET | `/api/progress/calendar` | Heatmap calendar |
| GET | `/api/progress/weekly` | Thống kê tuần |

---

## Scripts

```bash
npm run dev          # Dev server (port 5000)
npm run build        # Build TypeScript
npm run start        # Production
npm run seed         # Seed toàn bộ dữ liệu (300 từ + 30 hội thoại)
npm run seed:vocab   # Chỉ seed từ vựng
npm run seed:conversations  # Chỉ seed hội thoại
npm run worker       # Queue worker (cần chạy riêng)
```

---

## Các biến môi trường (.env)

```env
MONGODB_URI=mongodb://localhost:27017/english-learning
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-change-me
JWT_EXPIRES_IN=30d
PORT=5000
OPENAI_API_KEY=sk-your-openai-api-key
CORS_ORIGIN=http://localhost:3033
```

---

## SM-2 Algorithm (Spaced Repetition)

Từ vựng được lên lịch ôn tập theo thuật toán SuperMemo 2:

| Quality | Ý nghĩa | Interval |
|---------|---------|----------|
| 0 | Quên hoàn toàn | Reset về 0 |
| 1-2 | Nhớ mơ hồ | 1 ngày |
| 3 | Nhớ khó khăn | Tăng interval |
| 4 | Nhớ tốt | Tăng nhanh |
| 5 | Nhớ dễ dàng | Tăng nhanh nhất |

- easeFactor bắt đầu từ 2.5, điều chỉnh sau mỗi lần ôn
- Status vocabulary: NEW → LEARNING → REVIEW → MASTERED
- Từ MASTERED khi interval >= 21 ngày và quality >= 3 liên tục

---

## XP System

| Hoạt động | XP |
|-----------|-----|
| Học 1 từ mới | +10 |
| Ôn 1 từ (nhớ tốt) | +3 |
| Ôn 1 từ (khó nhớ) | +1 |
| Luyện phát âm | +20 |
| Shadowing | +20 |
| Hoàn thành bài học ngày | +50 + (streak × 5) |