ALTER TABLE match_group_member ADD INDEX user_id_idx(user_id);
ALTER TABLE department_role_member ADD INDEX user_id_idx(user_id);
ALTER TABLE department_role_member ADD INDEX role_id_idx(role_id);
ALTER TABLE user ADD INDEX mai_password_idx(mail, password);
ALTER TABLE user ADD INDEX entry_kana_idx(entry_date, kana);

ALTER TABLE user ADD FULLTEXT INDEX user_name_full_idx(user_name) WITH PARSER ngram;
ALTER TABLE user ADD FULLTEXT INDEX kana_full_idx(kana) WITH PARSER ngram;
ALTER TABLE user ADD FULLTEXT INDEX mail_full_idx(mail) WITH PARSER ngram;
ALTER TABLE user ADD FULLTEXT INDEX goal_full_idx(goal) WITH PARSER ngram;
