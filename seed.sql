USE resource_planning;

INSERT INTO resource_types (type_name, rate_card_min, rate_card_max, salary_ctc_min, salary_ctc_max, description) VALUES
('Junior', 2500, 3500, 500000, 800000, 'Junior contributor'),
('Designer', 3000, 4500, 600000, 1000000, 'UI/UX Designer'),
('Senior L1', 4500, 6500, 1000000, 1400000, 'Senior level 1'),
('Senior L2', 6000, 8500, 1400000, 1800000, 'Senior level 2'),
('Senior L3', 8000, 11000, 1800000, 2400000, 'Senior level 3'),
('Team Lead', 10000, 14000, 2400000, 3200000, 'Lead resource');

INSERT INTO resources (name, date_of_joining, past_experience, resource_type_id, current_ctc, status, notes) VALUES
('Alice Carter', '2023-01-10', 1.5, 2, 900000, 'Active', 'Strong in design systems'),
('Bob Lee', '2022-07-01', 3.0, 3, 1300000, 'Active', 'Frontend specialist'),
('Charlie Kim', '2020-03-18', 5.0, 4, 1700000, 'Active', 'Architecture + mentoring'),
('Diana Ray', '2019-08-12', 7.0, 5, 2200000, 'Active', 'Complex product work'),
('Evan Cruz', '2018-02-05', 9.0, 6, 2800000, 'Active', 'Program owner'),
('Fiona Park', '2024-06-01', 1.0, 1, 700000, 'Active', 'Junior frontend');

INSERT INTO projects (project_name, client_name, project_owner, start_date, end_date, status, notes) VALUES
('Apollo Revamp', 'Acme Corp', 'Evan Cruz', '2026-01-01', '2026-06-30', 'Ongoing', 'Platform redesign'),
('Orion Mobile', 'Beta Labs', 'Charlie Kim', '2026-02-01', '2026-10-31', 'Ongoing', 'Mobile UX + frontend'),
('Neptune Portal', 'Delta Inc', 'Bob Lee', '2026-04-01', '2026-12-31', 'Upcoming', 'Customer portal');

INSERT INTO allocations (resource_id, project_id, from_date, to_date, utilization_percentage, notes) VALUES
(2, 1, '2026-01-01', '2026-06-30', 70, 'Core frontend'),
(3, 1, '2026-01-01', '2026-06-30', 60, 'Solutioning'),
(1, 2, '2026-02-01', '2026-08-31', 80, 'UX + visual'),
(4, 2, '2026-02-01', '2026-10-31', 50, 'Senior IC'),
(6, 3, '2026-04-01', '2026-12-31', 60, 'Portal support');

INSERT INTO skills (skill_name, category) VALUES
('Figma', 'UI Tools'), ('UX Research', 'UX'), ('Wireframing', 'UX'), ('User Flow', 'UX'),
('Usability Testing', 'UX'), ('Illustration', 'Visual'), ('Icons', 'Visual'), ('Branding', 'Visual'),
('Motion', 'Visual'), ('HTML', 'Frontend'), ('CSS', 'Frontend'), ('JS', 'Frontend');

INSERT INTO resource_skills (resource_id, skill_id, level) VALUES
(1,1,5),(1,2,4),(1,3,5),(2,10,5),(2,11,5),(2,12,4),(3,12,5),(4,2,4),(6,10,3),(6,11,3);

INSERT INTO resource_comments (resource_id, comment_text) VALUES
(1, 'Ready for next design sprint.'),
(2, 'Can support API integration.'),
(3, 'Available for architecture review.');

INSERT INTO projection_scenarios (scenario_name, start_month, end_month, notes) VALUES
('FY 2026 Q2 Plan', '2026-04', '2026-06', 'Quarterly plan for 3 projects');

INSERT INTO scenario_project_demands (scenario_id, project_id, month, demand_from_date, demand_to_date, resource_type_id, required_count, utilization_percentage, notes) VALUES
(1,1,'2026-04','2026-04-01','2026-04-30',3,2,100,'Apollo needs Senior L1'),
(1,1,'2026-05','2026-05-01','2026-05-31',3,3,100,'Apollo scale-up'),
(1,2,'2026-04','2026-04-01','2026-04-30',2,1,100,'Orion needs designer'),
(1,2,'2026-05','2026-05-01','2026-06-30',4,2,100,'Orion needs Senior L2'),
(1,3,'2026-06','2026-06-01','2026-06-30',1,2,100,'Neptune onboarding juniors'),
(1,3,'2026-06','2026-06-01','2026-06-30',2,1,100,'Neptune needs designer');
