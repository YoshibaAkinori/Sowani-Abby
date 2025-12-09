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
INSERT INTO `staff` VALUES ('cc69b300-9b97-11f0-b7ae-5a93b150659e','佐野 智里','#FF69B4','マネージャー',10000,900,1,'2025-09-27 11:47:52'),('deabe83a-9b97-11f0-b7ae-5a93b150659e','星野 加奈江','#9370DB','セラピスト',1500,900,1,'2025-09-27 11:48:22'),('f5b5eecc-9b97-11f0-b7ae-5a93b150659e','吉羽 顕功','#4169E1','セラピスト',1500,900,1,'2025-09-27 11:49:01');
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-09 13:33:56
