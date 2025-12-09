FROM mysql:8.0

# タイムゾーン設定
ENV TZ=Asia/Tokyo

# MySQLの設定ファイルをコピー（日本語設定含む）
COPY my.cnf /etc/mysql/conf.d/
RUN chmod 644 /etc/mysql/conf.d/my.cnf

# 初期化SQLをコピー
COPY init/*.sql /docker-entrypoint-initdb.d/