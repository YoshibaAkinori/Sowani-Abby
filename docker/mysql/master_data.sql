-- MySQL dump 10.13  Distrib 8.0.44, for Linux (aarch64)
--
-- Host: localhost    Database: salon_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `staff_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hourly_wage` int DEFAULT '1500' COMMENT '時給',
  `transport_allowance` int DEFAULT '900' COMMENT '交通費',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES ('cc69b300-9b97-11f0-b7ae-5a93b150659e','佐野 智里','#FF69B4','マネージャー',10000,900,1,'2025-09-27 11:47:52'),('deabe83a-9b97-11f0-b7ae-5a93b150659e','星野 加奈江','#9370DB','セラピスト',1500,900,1,'2025-09-27 11:48:22'),('f5b5eecc-9b97-11f0-b7ae-5a93b150659e','吉羽 顕功','#4169E1','セラピスト',1500,900,0,'2025-09-27 11:49:01');
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `service_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `duration_minutes` int NOT NULL,
  `price` int NOT NULL,
  `first_time_price` int DEFAULT NULL COMMENT '初回料金',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `has_first_time_discount` tinyint(1) DEFAULT '0' COMMENT '初回割引あり',
  `free_option_choices` int DEFAULT '0' COMMENT '自由選択可能なオプション数',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_id`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES ('2ffd7ad2-9eae-11f0-a8d1-362b931374cc','キャビテーション','',60,6000,NULL,'ボディトリート',0,0,1,'2025-10-01 10:05:41'),('7cfc9898-9d10-11f0-8e8d-b2353c7546ec','美骨小顔コルギ(60分)','',60,15000,NULL,'フェイシャル',0,1,1,'2025-09-29 08:44:19'),('937a225d-9d10-11f0-8e8d-b2353c7546ec','美骨小顔コルギ(90分)','',90,19000,NULL,'フェイシャル',0,3,1,'2025-09-29 08:44:56'),('f902f57a-a1f5-11f0-9274-6e14d9ac68da',' [モニター募集] 上半身ケア+小顔コルギ ','',60,0,NULL,'その他',0,0,1,'2025-10-05 14:17:06');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_plans`
--

DROP TABLE IF EXISTS `ticket_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_plans` (
  `plan_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `service_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_sessions` int NOT NULL,
  `price` int NOT NULL,
  `validity_days` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `service_category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '新規' COMMENT 'カテゴリ（新規/会員/体験など）',
  `gender_restriction` enum('all','female','male') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT '性別制限',
  PRIMARY KEY (`plan_id`),
  KEY `idx_service` (`service_id`),
  CONSTRAINT `ticket_plans_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_plans`
--

LOCK TABLES `ticket_plans` WRITE;
/*!40000 ALTER TABLE `ticket_plans` DISABLE KEYS */;
INSERT INTO `ticket_plans` VALUES ('09cd329c-a1f6-11f0-9274-6e14d9ac68da','f902f57a-a1f5-11f0-9274-6e14d9ac68da',' [モニター募集] 上半身ケア+小顔コルギ 3回券',3,15000,365,1,'その他','all'),('0f5d09cb-9d29-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分5回券(新規男性)',5,47500,365,1,'新規','male'),('1cf4c59e-9d29-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分10回券(新規男性)',10,90000,365,1,'新規','male'),('3056ed6e-9d29-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分5回券(新規男性)',5,66500,365,1,'新規','male'),('30dfe7f6-9d27-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分10回券(会員女性)',10,70000,365,1,'会員','female'),('420cf95c-9d11-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分5回券(新規女性)',5,42500,365,1,'新規','female'),('44689095-9d27-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分5回券(会員女性)',5,56500,365,1,'会員','female'),('48fcd553-9d29-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分10回券(新規男性)',10,128000,365,1,'新規','male'),('54321fb1-9d27-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分10回券(会員女性)',10,108000,365,1,'会員','female'),('595f463b-9d1f-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分10回券(新規女性)',10,80000,365,1,'新規','female'),('5b17a109-9d29-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分5回券(会員男性)',5,42500,365,1,'会員','male'),('69a16266-9d29-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分10回券(会員男性)',10,80000,365,1,'会員','male'),('6d51a07c-9eae-11f0-a8d1-362b931374cc','2ffd7ad2-9eae-11f0-a8d1-362b931374cc','キャビテーション3回券',3,16500,365,1,'その他','all'),('7d0b8322-9eae-11f0-a8d1-362b931374cc','2ffd7ad2-9eae-11f0-a8d1-362b931374cc','キャビテーション5回券',5,25000,365,1,'その他','all'),('804feb15-9d29-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分5回券(会員男性)',5,61500,365,1,'会員','male'),('8b1f971c-9eae-11f0-a8d1-362b931374cc','2ffd7ad2-9eae-11f0-a8d1-362b931374cc','キャビテーション8回券',8,36000,365,1,'その他','all'),('916cfc7b-9d29-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分10回券(会員男性)',10,118000,365,1,'会員','male'),('9a8de157-9d24-11f0-8e8d-b2353c7546ec','7cfc9898-9d10-11f0-8e8d-b2353c7546ec','60分5回券(会員女性)',5,37500,365,1,'会員','female'),('a95ddd47-9d22-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分5回券(新規女性)',5,61500,365,1,'新規','female'),('b9fc6517-9d22-11f0-8e8d-b2353c7546ec','937a225d-9d10-11f0-8e8d-b2353c7546ec','90分10回券(新規女性)',10,118000,365,1,'新規','female');
/*!40000 ALTER TABLE `ticket_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `options`
--

DROP TABLE IF EXISTS `options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `options` (
  `option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'その他' COMMENT 'カテゴリ(フェイシャル/ボディ/その他)',
  `duration_minutes` int DEFAULT '0',
  `price` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '説明・効果',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`option_id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `options`
--

LOCK TABLES `options` WRITE;
/*!40000 ALTER TABLE `options` DISABLE KEYS */;
INSERT INTO `options` VALUES ('456e8974-9cd0-11f0-8e8d-b2353c7546ec','石膏パック【リフトアップ・保湿・美白】','フェイシャル',30,4000,NULL,1,'2025-09-29 01:04:38'),('481992c1-9cd0-11f0-8e8d-b2353c7546ec','炭酸パック【抗酸化・抗炎症・保湿】','フェイシャル',30,4000,NULL,1,'2025-09-29 01:04:42'),('4b1dbb70-9cd0-11f0-8e8d-b2353c7546ec','MFIP機器【エイジング・くすみ・むくみ】','フェイシャル',30,4000,NULL,1,'2025-09-29 01:04:47'),('4e4f9f3a-9cd0-11f0-8e8d-b2353c7546ec','ラジオ波フェイス【新陳代謝UP・脂肪燃焼】','フェイシャル',30,4000,NULL,1,'2025-09-29 01:04:52'),('50d04dd7-9cd0-11f0-8e8d-b2353c7546ec','ドライヘッド【眼精疲労・自律神経・脳疲労】','ボディ',30,4000,NULL,1,'2025-09-29 01:04:57'),('613aa78b-9d47-11f0-8e8d-b2353c7546ec','ネックセラピー【スマホ首・首こり・血行促進】','ボディ',30,4000,NULL,1,'2025-09-29 15:17:14'),('6391b43c-9d47-11f0-8e8d-b2353c7546ec','肩甲骨リフレ【姿勢改善・肩こり・可動域UP】','ボディ',30,4000,NULL,1,'2025-09-29 15:17:18'),('660166d8-9d47-11f0-8e8d-b2353c7546ec','背中コルギ【背中疲労・腰痛・肩こり】','ボディ',30,4000,NULL,1,'2025-09-29 15:17:22'),('7029a61f-9d47-11f0-8e8d-b2353c7546ec','美脚リンパ【浮腫・セルライト・疲労回復】','ボディ',30,4000,NULL,1,'2025-09-29 15:17:39'),('78236ed9-9d47-11f0-8e8d-b2353c7546ec','カッピング【背中疲労・冷え・むくみ】','ボディ',30,4000,NULL,1,'2025-09-29 15:17:53'),('7ac088dc-9d47-11f0-8e8d-b2353c7546ec','足つぼ【内臓機能・冷え性・むくみ】','ボディ',30,4000,NULL,1,'2025-09-29 15:17:57'),('d5f10ed4-a2b1-11f0-89d9-420dd1dcc76b','キャビテーション [お腹]','その他',0,0,NULL,1,'2025-10-06 12:41:53'),('e2370141-a2b1-11f0-89d9-420dd1dcc76b','キャビテーション [背中]','その他',0,0,NULL,1,'2025-10-06 12:42:13'),('ffcfa11e-a2b1-11f0-89d9-420dd1dcc76b','キャビテーション [脚]','その他',0,0,NULL,1,'2025-10-06 12:43:03');
/*!40000 ALTER TABLE `options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `coupon_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'クーポン名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `total_duration_minutes` int DEFAULT '0' COMMENT 'クーポン全体の施術時間（分）',
  `base_service_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ベースとなる施術',
  `free_option_count` int DEFAULT '0' COMMENT '自由選択できるオプション数',
  `total_price` int NOT NULL COMMENT 'パック価格',
  `validity_days` int DEFAULT '180' COMMENT '有効期限（日数）',
  `usage_limit` int DEFAULT NULL COMMENT '使用回数上限',
  `used_count` int DEFAULT '0' COMMENT '使用済み回数',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`coupon_id`),
  KEY `idx_service` (`base_service_id`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `coupons_ibfk_1` FOREIGN KEY (`base_service_id`) REFERENCES `services` (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES ('01c2971b-a1f0-11f0-9274-6e14d9ac68da','[当店自慢/精密分析/男女共通] 上半身ケア+小顔コルギ 50分','',90,NULL,0,5000,365,1,0,1,'2025-10-05 13:34:24','2025-10-05 13:34:24'),('2f661023-a1f0-11f0-9274-6e14d9ac68da','[男女共通] 上半身ケア+小顔コルギ+当日選べるオプション 80分','',120,NULL,1,6000,365,1,0,1,'2025-10-05 13:35:40','2025-10-05 13:35:40'),('475e0cb1-a1a9-11f0-9274-6e14d9ac68da',' [男女共通] ドライヘッドスパ 25分','',25,NULL,0,4000,365,NULL,0,1,'2025-10-05 05:08:06','2025-10-05 05:08:56'),('55123bb1-a1f1-11f0-9274-6e14d9ac68da','キャビテーション×ラジオ波 [背中・お腹・脚] 40分','',60,'2ffd7ad2-9eae-11f0-a8d1-362b931374cc',0,6000,365,NULL,0,1,'2025-10-05 13:43:53','2025-10-05 13:43:59'),('5cf093fb-a1f0-11f0-9274-6e14d9ac68da','[男女共通人気NO.1] 上半身ケア+小顔コルギ+背中コルギ 80分','',120,NULL,0,6000,365,1,0,1,'2025-10-05 13:36:57','2025-10-05 13:36:57'),('70497111-a1f0-11f0-9274-6e14d9ac68da','[男女共通人気NO.2] 上半身ケア+小顔コルギ+石膏パック 80分','',120,NULL,0,6000,365,1,0,1,'2025-10-05 13:37:29','2025-10-05 13:37:29'),('7684c24d-a1f1-11f0-9274-6e14d9ac68da','[背中美人コース] キャビテーション×ラジオ波','',60,'2ffd7ad2-9eae-11f0-a8d1-362b931374cc',0,4500,365,1,2,1,'2025-10-05 13:44:49','2025-10-18 01:30:46'),('8215bc1d-a1f0-11f0-9274-6e14d9ac68da','[男女共通人気NO.3] 上半身ケア+小顔コルギ+ドライヘッド 80分','',120,NULL,0,6000,365,1,0,1,'2025-10-05 13:37:59','2025-10-05 13:37:59'),('8969dd43-a1f1-11f0-9274-6e14d9ac68da','[美脚コース] キャビテーション×ラジオ波','',60,'2ffd7ad2-9eae-11f0-a8d1-362b931374cc',0,4500,365,1,0,1,'2025-10-05 13:45:21','2025-10-05 13:45:21'),('8af200b0-a1ef-11f0-9274-6e14d9ac68da','[朝割/女性限定/担当スタッフ:星野] 上半身ケア+小顔コルギ 50分','',90,NULL,0,3000,365,1,0,1,'2025-10-05 13:31:04','2025-10-05 13:31:04'),('9cf74bd6-a1f1-11f0-9274-6e14d9ac68da','[ウエスト集中コース] キャビテーション×ラジオ波','',60,'2ffd7ad2-9eae-11f0-a8d1-362b931374cc',0,4500,365,1,1,1,'2025-10-05 13:45:54','2025-10-13 02:23:43'),('cb459c8b-a1f1-11f0-9274-6e14d9ac68da','[男女共通クーポン] 背中コルギ+下半身ストレッチ 初回8000円','',60,NULL,0,8000,365,1,4,1,'2025-10-05 13:47:11','2025-12-07 12:08:15'),('cebacf97-a1f0-11f0-9274-6e14d9ac68da','[ブライダル] 上半身ケア+小顔コルギ+ボディオプション2つ 120分','',150,NULL,2,11800,365,1,0,1,'2025-10-05 13:40:08','2025-10-05 13:40:08'),('d7e4e9bf-a1ef-11f0-9274-6e14d9ac68da','[当日割り/男女共通] 効果重視!! 即効性有り◆ 上半身ケア+小顔コルギ 50分','',90,NULL,0,4000,365,1,0,1,'2025-10-05 13:33:13','2025-10-05 13:33:13'),('eb4a7ac5-a1f1-11f0-9274-6e14d9ac68da','[ギフトカード持参の方] 美骨小顔コルギ','',90,NULL,0,0,365,1,0,1,'2025-10-05 13:48:05','2025-10-05 13:48:05'),('f6f5af85-a1f0-11f0-9274-6e14d9ac68da','[ブライダル] 上半身ケア+小顔コルギ+キャビテーション 90分','',130,NULL,0,13000,365,1,0,1,'2025-10-05 13:41:15','2025-10-05 13:41:15');
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupon_included_options`
--

DROP TABLE IF EXISTS `coupon_included_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_included_options` (
  `coupon_option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `coupon_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int DEFAULT '1' COMMENT 'オプションの個数',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`coupon_option_id`),
  UNIQUE KEY `unique_coupon_option` (`coupon_id`,`option_id`),
  KEY `idx_coupon` (`coupon_id`),
  KEY `idx_option` (`option_id`),
  CONSTRAINT `coupon_included_options_ibfk_1` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`coupon_id`) ON DELETE CASCADE,
  CONSTRAINT `coupon_included_options_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `options` (`option_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupon_included_options`
--

LOCK TABLES `coupon_included_options` WRITE;
/*!40000 ALTER TABLE `coupon_included_options` DISABLE KEYS */;
INSERT INTO `coupon_included_options` VALUES ('0ffebf61-a2b2-11f0-89d9-420dd1dcc76b','8969dd43-a1f1-11f0-9274-6e14d9ac68da','ffcfa11e-a2b1-11f0-89d9-420dd1dcc76b',1,'2025-10-06 12:43:30'),('1664e4b4-a2b2-11f0-89d9-420dd1dcc76b','9cf74bd6-a1f1-11f0-9274-6e14d9ac68da','d5f10ed4-a2b1-11f0-89d9-420dd1dcc76b',1,'2025-10-06 12:43:41'),('1c8cdc21-a2b2-11f0-89d9-420dd1dcc76b','7684c24d-a1f1-11f0-9274-6e14d9ac68da','e2370141-a2b1-11f0-89d9-420dd1dcc76b',1,'2025-10-06 12:43:51'),('f90d45eb-a1ee-11f0-9274-6e14d9ac68da','475e0cb1-a1a9-11f0-9274-6e14d9ac68da','50d04dd7-9cd0-11f0-8e8d-b2353c7546ec',1,'2025-10-05 13:27:00');
/*!40000 ALTER TABLE `coupon_included_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `limited_offers`
--

DROP TABLE IF EXISTS `limited_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `limited_offers` (
  `offer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `offer_type` enum('service','ticket') COLLATE utf8mb4_unicode_ci DEFAULT 'service' COMMENT 'オファー種別',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'メニュー名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'カテゴリ',
  `gender_restriction` enum('all','female','male') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT '性別制限',
  `base_plan_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '元の回数券プランID',
  `duration_minutes` int DEFAULT '60' COMMENT '施術時間',
  `original_price` int NOT NULL COMMENT '通常価格',
  `special_price` int DEFAULT NULL COMMENT '特別価格（回数券の場合）',
  `total_sessions` int NOT NULL COMMENT '回数',
  `validity_days` int DEFAULT '180' COMMENT '有効期限（回数券の場合）',
  `start_date` date NOT NULL COMMENT '開始日',
  `end_date` date NOT NULL COMMENT '終了日',
  `max_bookings` int DEFAULT NULL COMMENT '最大予約数',
  `max_sales` int DEFAULT NULL COMMENT '最大販売数',
  `current_sales` int DEFAULT '0' COMMENT '現在の販売数',
  `current_bookings` int DEFAULT '0' COMMENT '現在の予約数',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`offer_id`),
  KEY `idx_dates` (`start_date`,`end_date`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `limited_offers`
--

LOCK TABLES `limited_offers` WRITE;
/*!40000 ALTER TABLE `limited_offers` DISABLE KEYS */;
INSERT INTO `limited_offers` VALUES ('05e6f039-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分10回券(新規女性)','',NULL,'female','b9fc6517-9d22-11f0-8e8d-b2353c7546ec',0,118000,108000,10,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:20:47','2025-12-28 13:34:48'),('07799ce8-e3f1-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分10回券(会員男性)','',NULL,'male','69a16266-9d29-11f0-8e8d-b2353c7546ec',0,80000,75000,10,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:28:00','2025-12-28 13:34:48'),('1a64ae84-e3f1-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分5回券(会員男性)','',NULL,'male','804feb15-9d29-11f0-8e8d-b2353c7546ec',0,61500,59000,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:28:31','2025-12-28 13:34:48'),('2c50e929-e3f1-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分10回券(会員男性)','',NULL,'male','916cfc7b-9d29-11f0-8e8d-b2353c7546ec',0,118000,113000,10,365,'2025-12-01','2026-01-31',NULL,NULL,1,0,1,'2025-12-28 13:29:01','2026-01-10 14:11:12'),('2edbc485-e3ee-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分5回券(新規女性)','',NULL,'female','a95ddd47-9d22-11f0-8e8d-b2353c7546ec',0,61500,56500,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:07:37','2025-12-28 13:34:48'),('301b83e6-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分5回券(会員女性)','',NULL,'female','9a8de157-9d24-11f0-8e8d-b2353c7546ec',0,37500,35000,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:21:58','2025-12-28 13:34:48'),('49d725cb-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分10回券(会員女性)','',NULL,'female','30dfe7f6-9d27-11f0-8e8d-b2353c7546ec',0,70000,65000,10,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:22:41','2025-12-28 13:34:48'),('5e9bdd41-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分5回券(会員女性)','',NULL,'female','44689095-9d27-11f0-8e8d-b2353c7546ec',0,56500,51500,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:23:16','2025-12-28 13:34:48'),('7a2faed7-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分10回券(会員女性)','',NULL,'female','54321fb1-9d27-11f0-8e8d-b2353c7546ec',0,108000,100000,10,365,'2025-12-01','2025-01-31',NULL,NULL,0,0,1,'2025-12-28 13:24:03','2025-12-28 13:34:48'),('94255850-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分5回券(新規男性)','',NULL,'male','0f5d09cb-9d29-11f0-8e8d-b2353c7546ec',0,47500,45000,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:24:46','2025-12-28 13:46:10'),('a80ade7f-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分10回券(新規男性)','',NULL,'male','1cf4c59e-9d29-11f0-8e8d-b2353c7546ec',0,90000,85000,10,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:25:19','2025-12-28 13:34:48'),('bbcfc69c-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分5回券(新規男性)','',NULL,'male','3056ed6e-9d29-11f0-8e8d-b2353c7546ec',0,66500,64000,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:25:53','2025-12-28 13:34:48'),('ce6f4ba5-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】90分10回券(新規男性)','',NULL,'male','48fcd553-9d29-11f0-8e8d-b2353c7546ec',0,128000,123000,10,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:26:24','2025-12-28 13:34:48'),('e3f191ee-e3ed-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分5回券(新規女性)','',NULL,'female','420cf95c-9d11-11f0-8e8d-b2353c7546ec',0,42500,37500,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:05:31','2026-01-17 12:45:16'),('e5579ec0-e3ef-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分10回券(新規女性)','',NULL,'female','595f463b-9d1f-11f0-8e8d-b2353c7546ec',0,80000,70000,10,365,'2025-12-31','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:19:53','2025-12-28 13:34:48'),('f1d254e9-e3f0-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分5回券(会員男性)','',NULL,'male','5b17a109-9d29-11f0-8e8d-b2353c7546ec',0,42500,40000,5,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:27:23','2025-12-28 13:48:00'),('ff0ca611-e3ed-11f0-bc8f-86a91b529f23','ticket','【福袋回数券】60分10回券(新規女性)','',NULL,'female','595f463b-9d1f-11f0-8e8d-b2353c7546ec',0,80000,70000,10,365,'2025-12-01','2026-01-31',NULL,NULL,0,0,1,'2025-12-28 13:06:17','2025-12-28 13:34:48');
/*!40000 ALTER TABLE `limited_offers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-18 12:06:00
