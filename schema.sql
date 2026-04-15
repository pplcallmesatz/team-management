CREATE DATABASE IF NOT EXISTS resource_planning;
USE resource_planning;

CREATE TABLE resource_types (
  resource_type_id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL,
  rate_card_min DECIMAL(12,2) NOT NULL,
  rate_card_max DECIMAL(12,2) NOT NULL,
  salary_ctc_min DECIMAL(12,2),
  salary_ctc_max DECIMAL(12,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE resources (
  resource_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  date_of_joining DATE NOT NULL,
  past_experience DECIMAL(4,2) DEFAULT 0,
  resource_type_id INT,
  current_ctc DECIMAL(12,2) NOT NULL,
  status ENUM('Active','Inactive') DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_type_id) REFERENCES resource_types(resource_type_id)
);

CREATE TABLE resource_comments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE
);

CREATE TABLE projects (
  project_id INT AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(150) NOT NULL,
  client_name VARCHAR(150),
  project_owner VARCHAR(120),
  start_date DATE,
  end_date DATE,
  status ENUM('Ongoing','Completed','Upcoming') DEFAULT 'Upcoming',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE allocations (
  allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  project_id INT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  utilization_percentage DECIMAL(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE skills (
  skill_id INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(120) NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_skills (
  resource_skill_id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  skill_id INT NOT NULL,
  level TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_resource_skill (resource_id, skill_id),
  FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

CREATE TABLE projection_scenarios (
  scenario_id INT AUTO_INCREMENT PRIMARY KEY,
  scenario_name VARCHAR(150) NOT NULL,
  start_month CHAR(7) NOT NULL,
  end_month CHAR(7) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scenario_project_demands (
  demand_id INT AUTO_INCREMENT PRIMARY KEY,
  scenario_id INT NOT NULL,
  project_id INT NOT NULL,
  month CHAR(7) NOT NULL,
  demand_from_date DATE NULL,
  demand_to_date DATE NULL,
  resource_type_id INT NOT NULL,
  required_count DECIMAL(8,2) NOT NULL,
  utilization_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id) REFERENCES projection_scenarios(scenario_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (resource_type_id) REFERENCES resource_types(resource_type_id) ON DELETE CASCADE
);


CREATE TABLE performance_trackers (
  performance_id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  project_id INT NOT NULL,
  project_owner_name VARCHAR(120) NOT NULL,
  financial_year VARCHAR(9) NOT NULL,
  quarter ENUM('Q1','Q2','Q3','Q4') NOT NULL,
  comments TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);
