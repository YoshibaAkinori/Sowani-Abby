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
-- Table structure for table `booking_history`
--

DROP TABLE IF EXISTS `booking_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_history` (
  `history_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `change_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` json DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `booking_history_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `booking_limited_offers`
--

DROP TABLE IF EXISTS `booking_limited_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_limited_offers` (
  `booking_limited_offer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `offer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_limited_offer_id`),
  UNIQUE KEY `unique_booking_offer` (`booking_id`,`offer_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_offer` (`offer_id`),
  CONSTRAINT `booking_limited_offers_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `booking_limited_offers_ibfk_2` FOREIGN KEY (`offer_id`) REFERENCES `limited_offers` (`offer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `booking_options`
--

DROP TABLE IF EXISTS `booking_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_options` (
  `booking_option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`booking_option_id`),
  UNIQUE KEY `unique_booking_option` (`booking_id`,`option_id`),
  KEY `option_id` (`option_id`),
  CONSTRAINT `booking_options_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  CONSTRAINT `booking_options_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `options` (`option_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `booking_tickets`
--

DROP TABLE IF EXISTS `booking_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_tickets` (
  `booking_ticket_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_ticket_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_ticket_id`),
  UNIQUE KEY `unique_booking_ticket` (`booking_id`,`customer_ticket_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_ticket` (`customer_ticket_id`),
  CONSTRAINT `booking_tickets_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `booking_tickets_ibfk_2` FOREIGN KEY (`customer_ticket_id`) REFERENCES `customer_tickets` (`customer_ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `customer_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_ticket_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coupon_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `limited_offer_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `bed_id` int DEFAULT NULL,
  `type` enum('booking','schedule') COLLATE utf8mb4_unicode_ci DEFAULT 'booking' COMMENT '種別（予約/予定）',
  `status` enum('pending','confirmed','completed','cancelled','no_show','blocked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`),
  KEY `customer_id` (`customer_id`),
  KEY `service_id` (`service_id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  KEY `idx_staff_date` (`staff_id`,`date`),
  KEY `fk_bookings_customer_ticket` (`customer_ticket_id`),
  KEY `fk_bookings_coupon` (`coupon_id`),
  KEY `fk_bookings_limited_offer` (`limited_offer_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`),
  CONSTRAINT `fk_bookings_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`coupon_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bookings_customer_ticket` FOREIGN KEY (`customer_ticket_id`) REFERENCES `customer_tickets` (`customer_ticket_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bookings_limited_offer` FOREIGN KEY (`limited_offer_id`) REFERENCES `limited_offers` (`offer_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `coupon_usage`
--

DROP TABLE IF EXISTS `coupon_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_usage` (
  `usage_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `coupon_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `selected_free_options` json DEFAULT NULL COMMENT '選択された無料オプション',
  `total_discount_amount` int NOT NULL COMMENT '割引総額',
  PRIMARY KEY (`usage_id`),
  KEY `idx_coupon` (`coupon_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_booking` (`payment_id`),
  CONSTRAINT `coupon_usage_ibfk_1` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`coupon_id`),
  CONSTRAINT `coupon_usage_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `fk_coupon_usage_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `customer_tickets`
--

DROP TABLE IF EXISTS `customer_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_tickets` (
  `customer_ticket_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `sessions_remaining` int NOT NULL,
  `purchase_price` int NOT NULL,
  PRIMARY KEY (`customer_ticket_id`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_expiry` (`expiry_date`),
  CONSTRAINT `customer_tickets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `customer_tickets_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `ticket_plans` (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `line_user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name_kana` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name_kana` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('male','female','other','not_specified') COLLATE utf8mb4_unicode_ci DEFAULT 'not_specified' COMMENT '性別',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `is_existing_customer` tinyint(1) NOT NULL DEFAULT '0' COMMENT '既存顧客フラグ（1=システム導入前からの顧客）',
  `base_visit_count` int DEFAULT '0' COMMENT '基準来店回数（システム導入前）',
  `visit_count` int DEFAULT '0' COMMENT '来店回数（回数券使用回数）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  KEY `idx_phone` (`phone_number`),
  KEY `idx_email` (`email`),
  KEY `idx_line_user` (`line_user_id`),
  KEY `idx_is_existing_customer` (`is_existing_customer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_closings`
--

DROP TABLE IF EXISTS `daily_closings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_closings` (
  `closing_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `staff_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `register_ten_thousand` int DEFAULT '0',
  `register_five_thousand` int DEFAULT '0',
  `register_two_thousand` int DEFAULT '0',
  `register_one_thousand` int DEFAULT '0',
  `register_five_hundred` int DEFAULT '0',
  `register_one_hundred` int DEFAULT '0',
  `register_fifty` int DEFAULT '0',
  `register_ten` int DEFAULT '0',
  `register_five` int DEFAULT '0',
  `register_one` int DEFAULT '0',
  `register_total` int DEFAULT '0',
  `bag_ten_thousand` int DEFAULT '0',
  `bag_five_thousand` int DEFAULT '0',
  `bag_two_thousand` int DEFAULT '0',
  `bag_one_thousand` int DEFAULT '0',
  `bag_five_hundred` int DEFAULT '0',
  `bag_one_hundred` int DEFAULT '0',
  `bag_fifty` int DEFAULT '0',
  `bag_ten` int DEFAULT '0',
  `bag_five` int DEFAULT '0',
  `bag_one` int DEFAULT '0',
  `bag_total` int DEFAULT '0',
  `envelope_amount` int DEFAULT '0',
  `expected_envelope` int DEFAULT '0',
  `discrepancy` int DEFAULT '0',
  `cash_sales` int DEFAULT '0',
  `card_sales` int DEFAULT '0',
  `total_sales` int DEFAULT '0',
  `transaction_count` int DEFAULT '0',
  `fixed_amount` int DEFAULT '30000',
  `payments` json DEFAULT NULL,
  `total_payments` int DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`closing_id`),
  UNIQUE KEY `date` (`date`),
  KEY `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `limited_ticket_purchases`
--

DROP TABLE IF EXISTS `limited_ticket_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `limited_ticket_purchases` (
  `purchase_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `offer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `sessions_remaining` int NOT NULL,
  `purchase_price` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_id`),
  KEY `idx_offer` (`offer_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_expiry` (`expiry_date`),
  CONSTRAINT `fk_limited_ticket_purchases_offer` FOREIGN KEY (`offer_id`) REFERENCES `limited_offers` (`offer_id`),
  CONSTRAINT `limited_ticket_purchases_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `line_pending_links`
--

DROP TABLE IF EXISTS `line_pending_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `line_pending_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `line_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` enum('follow','message') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_text` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `linked` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medical_records`
--

DROP TABLE IF EXISTS `medical_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medical_records` (
  `record_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_date` date NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `s3_key` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by_staff_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_id`),
  KEY `booking_id` (`booking_id`),
  KEY `created_by_staff_id` (`created_by_staff_id`),
  KEY `idx_customer_date` (`customer_id`,`record_date`),
  KEY `idx_s3_key` (`s3_key`),
  CONSTRAINT `medical_records_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `medical_records_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  CONSTRAINT `medical_records_ibfk_3` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messaging_log`
--

DROP TABLE IF EXISTS `messaging_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messaging_log` (
  `log_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `related_booking_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_ticket_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `related_booking_id` (`related_booking_id`),
  KEY `related_ticket_id` (`related_ticket_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_sent_at` (`sent_at`),
  CONSTRAINT `messaging_log_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `messaging_log_ibfk_2` FOREIGN KEY (`related_booking_id`) REFERENCES `bookings` (`booking_id`),
  CONSTRAINT `messaging_log_ibfk_3` FOREIGN KEY (`related_ticket_id`) REFERENCES `customer_tickets` (`customer_ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `monthly_targets`
--

DROP TABLE IF EXISTS `monthly_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monthly_targets` (
  `target_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `year` int NOT NULL,
  `month` int NOT NULL,
  `staff_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULLの場合は店舗全体の目標',
  `target_amount` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`target_id`),
  UNIQUE KEY `unique_monthly_target` (`year`,`month`,(coalesce(`staff_id`,_utf8mb4'00000000-0000-0000-0000-000000000000'))),
  KEY `staff_id` (`staff_id`),
  KEY `idx_year_month` (`year`,`month`),
  CONSTRAINT `monthly_targets_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `payment_options`
--

DROP TABLE IF EXISTS `payment_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_options` (
  `payment_option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `payment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'オプション名のスナップショット',
  `option_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'カテゴリのスナップショット',
  `price` int NOT NULL COMMENT '価格のスナップショット',
  `duration_minutes` int DEFAULT '0' COMMENT '時間のスナップショット',
  `quantity` int DEFAULT '1' COMMENT '数量',
  `is_free` tinyint(1) DEFAULT '0' COMMENT '無料オプションフラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_option_id`),
  KEY `idx_payment` (`payment_id`),
  KEY `idx_option` (`option_id`),
  KEY `idx_category` (`option_category`),
  KEY `idx_free` (`is_free`),
  CONSTRAINT `payment_options_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE CASCADE,
  CONSTRAINT `payment_options_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `options` (`option_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '関連予約ID(任意)',
  `staff_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '担当スタッフ',
  `payment_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `service_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'サービス名のスナップショット',
  `service_price` int DEFAULT '0' COMMENT 'サービス価格のスナップショット',
  `service_duration` int DEFAULT '0' COMMENT '施術時間(分)',
  `payment_type` enum('normal','ticket','coupon','limited_offer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `ticket_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用回数券ID',
  `ticket_sessions_at_payment` int DEFAULT NULL COMMENT '支払い時の回数券残り回数',
  `ticket_balance_at_payment` int DEFAULT NULL COMMENT '支払い時の回数券残金',
  `is_ticket_purchase` tinyint(1) DEFAULT '0' COMMENT '回数券購入フラグ',
  `is_remaining_payment` tinyint(1) DEFAULT '0' COMMENT '残金支払いフラグ',
  `is_immediate_use` tinyint(1) DEFAULT '0' COMMENT '購入時初回使用フラグ',
  `coupon_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用クーポンID',
  `limited_offer_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用期間限定ID',
  `service_subtotal` int NOT NULL DEFAULT '0' COMMENT 'サービス小計',
  `options_total` int DEFAULT '0' COMMENT 'オプション合計',
  `discount_amount` int DEFAULT '0' COMMENT '割引額',
  `total_amount` int NOT NULL COMMENT '最終支払額',
  `payment_method` enum('cash','card','mixed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `cash_amount` int DEFAULT '0' COMMENT '現金支払額',
  `card_amount` int DEFAULT '0' COMMENT 'カード支払額',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '備考',
  `related_payment_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_cancelled` tinyint(1) DEFAULT '0' COMMENT 'キャンセル済みフラグ',
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'キャンセル理由',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_amount` int DEFAULT '0' COMMENT '回数券残金支払い額',
  PRIMARY KEY (`payment_id`),
  KEY `booking_id` (`booking_id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_date` (`payment_date`),
  KEY `idx_staff` (`staff_id`),
  KEY `idx_service` (`service_id`),
  KEY `idx_cancelled` (`is_cancelled`),
  KEY `idx_payment_type` (`payment_type`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_related_payment` (`related_payment_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `payments_ibfk_4` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`),
  CONSTRAINT `payments_ibfk_5` FOREIGN KEY (`ticket_id`) REFERENCES `customer_tickets` (`customer_ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `shift_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `staff_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_minutes` int DEFAULT '0' COMMENT '休憩時間（分）',
  `transport_cost` int DEFAULT '0' COMMENT '交通費',
  `hourly_wage` int DEFAULT '900' COMMENT '時給',
  `daily_wage` int DEFAULT '0' COMMENT '日給',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '備考',
  `type` enum('work','holiday','half_day') COLLATE utf8mb4_unicode_ci DEFAULT 'work',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`shift_id`),
  KEY `idx_staff_date` (`staff_id`,`date`),
  KEY `idx_date` (`date`),
  KEY `idx_staff_month` (`staff_id`,`date`),
  CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `ticket_payments`
--

DROP TABLE IF EXISTS `ticket_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_payments` (
  `payment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `ticket_type` enum('regular','limited') COLLATE utf8mb4_unicode_ci DEFAULT 'regular' COMMENT '回数券種別（regular=通常, limited=期間限定/福袋）',
  `customer_ticket_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `amount_paid` int NOT NULL,
  `payment_method` enum('cash','card','transfer','other','mixed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`payment_id`),
  KEY `idx_ticket` (`customer_ticket_id`),
  KEY `idx_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-19 15:48:44
