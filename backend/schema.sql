-- Smart City Issue Reporting Platform Database Schema
-- MySQL Schema Definition

CREATE DATABASE IF NOT EXISTS smart_city;
USE smart_city;

-- Disable foreign key checks during table creation
SET FOREIGN_KEY_CHECKS = 0;

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('citizen', 'admin') DEFAULT 'citizen',
  phone VARCHAR(15),
  department VARCHAR(50),
  isVerified BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Issues Table
CREATE TABLE IF NOT EXISTS Issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  status ENUM('reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened') DEFAULT 'reported',
  department VARCHAR(50) NOT NULL,
  photos JSON,
  isDuplicate BOOLEAN DEFAULT FALSE,
  duplicateScore FLOAT DEFAULT 0,
  upvoteCount INT DEFAULT 0,
  slaDeadline DATETIME,
  resolutionNotes TEXT,
  resolutionPhotos JSON,
  resolvedAt DATETIME,
  reportedBy INT NOT NULL,
  assignedTo INT,
  verifiedBy INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reportedBy) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedTo) REFERENCES Users(id) ON DELETE SET NULL,
  FOREIGN KEY (verifiedBy) REFERENCES Users(id) ON DELETE SET NULL
);

-- StatusHistories Table
CREATE TABLE IF NOT EXISTS StatusHistories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issueId INT NOT NULL,
  status ENUM('reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened') NOT NULL,
  notes TEXT,
  updatedBy INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (issueId) REFERENCES Issues(id) ON DELETE CASCADE,
  FOREIGN KEY (updatedBy) REFERENCES Users(id) ON DELETE SET NULL
);

-- Upvotes Table
CREATE TABLE IF NOT EXISTS Upvotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issueId INT NOT NULL,
  userId INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_issue_upvote (issueId, userId),
  FOREIGN KEY (issueId) REFERENCES Issues(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
