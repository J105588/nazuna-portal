-- 部活動テーブル
CREATE TABLE clubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  members INTEGER,
  schedule VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 投稿テーブル（なずなフォーラム）
CREATE TABLE posts (
  id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reply TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  replied_at TIMESTAMP
);

-- チャットテーブル
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(50) REFERENCES posts(id),
  sender VARCHAR(50),
  message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- お知らせテーブル
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  date DATE DEFAULT CURRENT_DATE,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- アンケートテーブル
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  questions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- アンケート回答テーブル
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id),
  answers JSONB,
  submitted_at TIMESTAMP DEFAULT NOW()
);