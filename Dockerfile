# 2025年時点の推奨バージョンを使用
FROM node:22-alpine

# gitとタイムゾーン設定 
RUN apk add --no-cache git tzdata && \ 
	cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \ 
	echo "Asia/Tokyo" > /etc/timezone 

WORKDIR /app

# 必要なパッケージ情報をコピー
COPY package*.json ./

# パッケージのインストール (本番用)
RUN npm ci

# ソースコードを全てコピー
COPY . .

# Next.jsアプリのビルド (本番用に最適化)
RUN npm run build

# 3000番ポートを開放
EXPOSE 3000

# アプリの起動コマンド
CMD ["npm", "start"]